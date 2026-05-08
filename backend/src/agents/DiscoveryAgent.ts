/**
 * agents/DiscoveryAgent.ts
 *
 * Matches a UserProfile against the scholarship database:
 *  1. Calls deterministic rule engine match (Person 3's eligibility engine)
 *  2. For borderline matches, calls Gemini Flash for nuanced reasoning
 *  3. Scores, ranks, and generates plain-language eligibility reasons
 */

import { BaseAgent } from './BaseAgent';
import { getGeminiService } from '../services/gemini.service';
import { getFirestore } from '../config/firestore.config';
import { COLLECTIONS } from '../config/constants';
import { z } from 'zod';
import type {
  DiscoveryAgentInput,
  DiscoveryAgentOutput,
  MatchedScholarship,
  UserProfile,
  ScholarshipScheme,
} from '../schemas';

// Gemini response shape for borderline evaluation
const GeminiBorderlineSchema = z.object({
  eligible: z.boolean(),
  score: z.number().min(0).max(100),
  reasoning: z.string(),
  successProbability: z.number().min(0).max(100),
});

class DiscoveryAgent extends BaseAgent<DiscoveryAgentInput, DiscoveryAgentOutput> {
  protected readonly agentName = 'DiscoveryAgent';

  async run(input: DiscoveryAgentInput): Promise<DiscoveryAgentOutput> {
    const { profile } = input;

    // Step 1: Load all active scholarship schemes from Firestore
    const schemes = await this.loadActiveSchemes();

    // Step 2: Deterministic eligibility matching
    const matches: MatchedScholarship[] = [];

    for (const scheme of schemes) {
      const result = this.evaluateEligibility(profile, scheme);

      if (result.matchScore === 0) continue; // completely ineligible

      // Step 3: For borderline matches, use Gemini for nuanced evaluation
      if (result.requiresGeminiEvaluation) {
        const geminiResult = await this.geminiEvaluate(profile, scheme, result);
        matches.push(geminiResult);
      } else {
        matches.push(result);
      }
    }

    // Step 4: Sort by match score (descending), then by amount
    matches.sort((a, b) => b.matchScore - a.matchScore || b.annualAmount - a.annualAmount);

    // Step 5: Build recommended stack (top non-conflicting schemes)
    const recommendedStack = this.buildNonConflictingStack(matches, schemes);

    const totalPotentialValue = matches
      .filter(m => m.matchScore >= 60)
      .reduce((sum, m) => sum + m.annualAmount, 0);

    return {
      matches,
      totalPotentialValue,
      recommendedStack,
    };
  }

  fallbackResponse(_input: DiscoveryAgentInput): DiscoveryAgentOutput {
    return {
      matches: [],
      totalPotentialValue: 0,
      recommendedStack: [],
    };
  }

  // -----------------------------------------------------------------------
  // Deterministic eligibility engine
  // -----------------------------------------------------------------------

  private evaluateEligibility(profile: UserProfile, scheme: ScholarshipScheme): MatchedScholarship {
    const eligibilityReasons: string[] = [];
    const ineligibilityReasons: string[] = [];
    let score = 100;
    let requiresGemini = false;

    // Category check
    if (scheme.eligibility.categories.includes(profile.category)) {
      eligibilityReasons.push(`Category ${profile.category.toUpperCase()} is eligible.`);
    } else {
      ineligibilityReasons.push(`Category ${profile.category.toUpperCase()} is not in eligible list.`);
      score -= 50;
    }

    // Income check
    if (profile.income <= scheme.eligibility.maxIncome) {
      eligibilityReasons.push(`Family income ₹${profile.income.toLocaleString('en-IN')} is within the limit.`);
    } else {
      const overBy = profile.income - scheme.eligibility.maxIncome;
      if (overBy < scheme.eligibility.maxIncome * 0.1) {
        // Borderline — within 10% over the limit
        requiresGemini = true;
        ineligibilityReasons.push(`Income exceeds limit by ₹${overBy.toLocaleString('en-IN')} (borderline).`);
        score -= 15;
      } else {
        ineligibilityReasons.push(`Income ₹${profile.income.toLocaleString('en-IN')} exceeds max ₹${scheme.eligibility.maxIncome.toLocaleString('en-IN')}.`);
        score -= 40;
      }
    }

    // Marks check
    if (profile.marks >= scheme.eligibility.minMarks) {
      eligibilityReasons.push(`Marks ${profile.marks}% meet the minimum ${scheme.eligibility.minMarks}%.`);
    } else {
      const deficit = scheme.eligibility.minMarks - profile.marks;
      if (deficit <= 5) {
        requiresGemini = true;
        score -= 10;
      } else {
        score -= 30;
      }
      ineligibilityReasons.push(`Marks ${profile.marks}% below required ${scheme.eligibility.minMarks}%.`);
    }

    // Course level check
    if (profile.courseLevel && scheme.eligibility.courseLevels.includes(profile.courseLevel)) {
      eligibilityReasons.push(`Course level ${profile.courseLevel} is eligible.`);
    } else if (profile.courseLevel) {
      ineligibilityReasons.push(`Course level ${profile.courseLevel} not in eligible list.`);
      score -= 25;
    }

    // State check
    if (!scheme.eligibility.states || scheme.eligibility.states.length === 0 || scheme.eligibility.states.includes(profile.state)) {
      eligibilityReasons.push(`State ${profile.state} is eligible.`);
    } else {
      ineligibilityReasons.push(`State ${profile.state} not in eligible states.`);
      score -= 50;
    }

    // Age check
    if (scheme.eligibility.minAge || scheme.eligibility.maxAge) {
      const age = this.calculateAge(profile.dob);
      if (scheme.eligibility.minAge && age < scheme.eligibility.minAge) {
        ineligibilityReasons.push(`Age ${age} below minimum ${scheme.eligibility.minAge}.`);
        score -= 30;
      }
      if (scheme.eligibility.maxAge && age > scheme.eligibility.maxAge) {
        ineligibilityReasons.push(`Age ${age} above maximum ${scheme.eligibility.maxAge}.`);
        score -= 30;
      }
    }

    score = Math.max(0, Math.min(100, score));

    return {
      schemeId: scheme.id,
      schemeName: scheme.name,
      annualAmount: scheme.annualAmount,
      matchScore: score,
      eligibilityReasons,
      ineligibilityReasons,
      successProbability: score >= 80 ? 75 : score >= 60 ? 50 : 20,
      quotaUrgency: this.assessUrgency(scheme),
      requiresGeminiEvaluation: requiresGemini,
    };
  }

  // -----------------------------------------------------------------------
  // Gemini borderline evaluation
  // -----------------------------------------------------------------------

  private async geminiEvaluate(
    profile: UserProfile,
    scheme: ScholarshipScheme,
    preliminary: MatchedScholarship,
  ): Promise<MatchedScholarship> {
    const gemini = getGeminiService();

    const prompt = [
      `You are an expert Indian scholarship eligibility advisor.`,
      `A student has a borderline eligibility for a scholarship. Evaluate whether they should still apply.`,
      ``,
      `Student Profile:`,
      `- Category: ${profile.category}, Income: ₹${profile.income}, Marks: ${profile.marks}%`,
      `- State: ${profile.state}, Course: ${profile.course} (${profile.courseLevel ?? 'unknown level'})`,
      ``,
      `Scheme: ${scheme.name}`,
      `- Max Income: ₹${scheme.eligibility.maxIncome}, Min Marks: ${scheme.eligibility.minMarks}%`,
      `- Eligible Categories: ${scheme.eligibility.categories.join(', ')}`,
      ``,
      `Issues flagged: ${preliminary.ineligibilityReasons.join('; ')}`,
      ``,
      `Return JSON with: eligible (boolean), score (0–100), reasoning (string), successProbability (0–100).`,
    ].join('\n');

    try {
      const result = await gemini.generateStructured(prompt, GeminiBorderlineSchema);
      return {
        ...preliminary,
        matchScore: result.score,
        successProbability: result.successProbability,
        eligibilityReasons: [...preliminary.eligibilityReasons, `Gemini assessment: ${result.reasoning}`],
        requiresGeminiEvaluation: true,
      };
    } catch {
      // If Gemini fails, return the deterministic result
      return preliminary;
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private async loadActiveSchemes(): Promise<ScholarshipScheme[]> {
    const db = getFirestore();
    const snapshot = await db
      .collection(COLLECTIONS.SCHOLARSHIPS)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ScholarshipScheme);
  }

  private calculateAge(dob: string): number {
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  private assessUrgency(scheme: ScholarshipScheme): 'high' | 'medium' | 'low' {
    if (!scheme.deadline) return 'low';
    const daysLeft = Math.ceil(
      (new Date(scheme.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (daysLeft <= 7) return 'high';
    if (daysLeft <= 30) return 'medium';
    return 'low';
  }

  private buildNonConflictingStack(
    matches: MatchedScholarship[],
    schemes: ScholarshipScheme[],
  ): string[] {
    const selected: string[] = [];
    const selectedIds = new Set<string>();
    const schemeMap = new Map(schemes.map(s => [s.id, s]));

    for (const match of matches) {
      if (match.matchScore < 60) continue;

      const scheme = schemeMap.get(match.schemeId);
      if (!scheme) continue;

      const hasConflict = scheme.eligibility.conflictsWith.some(id => selectedIds.has(id));
      if (!hasConflict) {
        selected.push(match.schemeId);
        selectedIds.add(match.schemeId);
      }
    }

    return selected;
  }
}

// ---------------------------------------------------------------------------
// Exported runner
// ---------------------------------------------------------------------------

const agent = new DiscoveryAgent();

export async function runDiscoveryAgent(input: DiscoveryAgentInput): Promise<DiscoveryAgentOutput> {
  return agent.execute(input);
}
