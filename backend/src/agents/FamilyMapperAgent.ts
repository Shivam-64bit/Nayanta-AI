/**
 * agents/FamilyMapperAgent.ts
 *
 * Runs the DiscoveryAgent for each household member independently,
 * deduplicates results, and ranks the household-level scholarship stack.
 */

import { BaseAgent } from './BaseAgent';
import { runDiscoveryAgent } from './DiscoveryAgent';
import type {
  FamilyAgentInput,
  FamilyAgentOutput,
  MatchedScholarship,
  UserProfile,
} from '../schemas';

class FamilyMapperAgent extends BaseAgent<FamilyAgentInput & { userId: string }, FamilyAgentOutput> {
  protected readonly agentName = 'FamilyMapperAgent';

  async run(input: FamilyAgentInput & { userId: string }): Promise<FamilyAgentOutput> {
    const perMemberMatches: Record<string, MatchedScholarship[]> = {};
    let householdTotalPotentialValue = 0;

    // Step 1: Run DiscoveryAgent for each household member
    for (const member of input.members) {
      try {
        const discoveryResult = await runDiscoveryAgent({
          userId: member.userId,
          profile: member,
        });

        perMemberMatches[member.userId] = discoveryResult.matches;
        householdTotalPotentialValue += discoveryResult.totalPotentialValue;
      } catch (err) {
        console.error(
          `[FamilyMapperAgent] Discovery failed for member ${member.userId}:`,
          err instanceof Error ? err.message : err,
        );
        perMemberMatches[member.userId] = [];
      }
    }

    // Step 2: Deduplicate — if multiple members match the same scheme,
    // keep only the member with the highest match score
    this.deduplicateAcrossMembers(perMemberMatches);

    // Step 3: Build application order — prioritize by:
    //   a) Scheme deadline urgency
    //   b) Total potential value per member
    //   c) Success probability
    const applicationOrder = this.buildApplicationOrder(perMemberMatches, input.members);

    // Recalculate total after deduplication
    householdTotalPotentialValue = 0;
    for (const matches of Object.values(perMemberMatches)) {
      for (const match of matches) {
        if (match.matchScore >= 60) {
          householdTotalPotentialValue += match.annualAmount;
        }
      }
    }

    return {
      perMemberMatches,
      householdTotalPotentialValue,
      applicationOrder,
    };
  }

  fallbackResponse(_input: FamilyAgentInput & { userId: string }): FamilyAgentOutput {
    return {
      perMemberMatches: {},
      householdTotalPotentialValue: 0,
      applicationOrder: [],
    };
  }

  // -----------------------------------------------------------------------
  // Deduplication
  // -----------------------------------------------------------------------

  /**
   * If multiple family members match the same scheme, keep only the member
   * with the highest match score for that scheme.
   */
  private deduplicateAcrossMembers(
    perMemberMatches: Record<string, MatchedScholarship[]>,
  ): void {
    // Build a map of schemeId → { memberId, matchScore }
    const bestClaimants = new Map<string, { memberId: string; matchScore: number }>();

    for (const [memberId, matches] of Object.entries(perMemberMatches)) {
      for (const match of matches) {
        const existing = bestClaimants.get(match.schemeId);
        if (!existing || match.matchScore > existing.matchScore) {
          bestClaimants.set(match.schemeId, { memberId, matchScore: match.matchScore });
        }
      }
    }

    // Remove duplicate scheme matches from non-best claimants
    for (const [memberId, matches] of Object.entries(perMemberMatches)) {
      perMemberMatches[memberId] = matches.filter(match => {
        const best = bestClaimants.get(match.schemeId);
        return best?.memberId === memberId;
      });
    }
  }

  // -----------------------------------------------------------------------
  // Application ordering
  // -----------------------------------------------------------------------

  private buildApplicationOrder(
    perMemberMatches: Record<string, MatchedScholarship[]>,
    members: UserProfile[],
  ): string[] {
    // Flatten all (memberId, schemeId) pairs with their scores
    const entries: Array<{
      key: string; // "memberId:schemeId"
      urgency: number;
      score: number;
      amount: number;
    }> = [];

    for (const [memberId, matches] of Object.entries(perMemberMatches)) {
      for (const match of matches) {
        if (match.matchScore < 60) continue;

        const urgencyScore = match.quotaUrgency === 'high' ? 3 : match.quotaUrgency === 'medium' ? 2 : 1;

        entries.push({
          key: `${memberId}:${match.schemeId}`,
          urgency: urgencyScore,
          score: match.matchScore,
          amount: match.annualAmount,
        });
      }
    }

    // Sort by urgency desc, then score desc, then amount desc
    entries.sort((a, b) =>
      b.urgency - a.urgency || b.score - a.score || b.amount - a.amount,
    );

    return entries.map(e => e.key);
  }
}

// ---------------------------------------------------------------------------
// Exported runner
// ---------------------------------------------------------------------------

const agent = new FamilyMapperAgent();

export async function runFamilyMapperAgent(input: FamilyAgentInput): Promise<FamilyAgentOutput> {
  // FamilyAgentInput uses primaryUserId — map it to userId for BaseAgent
  return agent.execute({ ...input, userId: input.primaryUserId });
}
