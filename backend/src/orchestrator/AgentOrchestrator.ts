/**
 * orchestrator/AgentOrchestrator.ts
 *
 * Top-level pipeline that chains agents together based on
 * the current application state. Uses the StateMachine to enforce
 * legal transitions and dispatches the correct agent at each stage.
 *
 * Pipeline flow:
 *  PENDING → ProfileAgent → PROFILED
 *  PROFILED → DiscoveryAgent → DISCOVERED
 *  DISCOVERED → DocIntelligenceAgent → VERIFIED
 *  VERIFIED → DraftingAgent → DRAFTED
 *  DRAFTED → (manual submission) → SUBMITTED
 *  SUBMITTED → TrackingAgent → TRACKING / RECEIVED / REJECTED
 *  REJECTED → RejectionAgent → GRIEVANCE_FILED
 *
 * Also supports:
 *  - FamilyMapperAgent (standalone, called explicitly)
 *  - Full pipeline execution (runFullPipeline)
 */

import { getStateMachine } from './StateMachine';
import { getFirestore } from '../config/firestore.config';
import { COLLECTIONS } from '../config/constants';

import { runProfileAgent } from '../agents/ProfileAgent';
import { runDiscoveryAgent } from '../agents/DiscoveryAgent';
import { runDocIntelligenceAgent } from '../agents/DocIntelligenceAgent';
import { runDraftingAgent } from '../agents/DraftingAgent';
import { runTrackingAgent } from '../agents/TrackingAgent';
import { runRejectionAgent } from '../agents/RejectionAgent';
import { runFamilyMapperAgent } from '../agents/FamilyMapperAgent';

import type {
  ApplicationState,
  Application,
  UserProfile,
  ProfileAgentInput,
  ProfileAgentOutput,
  DiscoveryAgentOutput,
  DocAgentOutput,
  DraftingAgentOutput,
  TrackingAgentOutput,
  RejectionAgentOutput,
  FamilyAgentInput,
  FamilyAgentOutput,
} from '../schemas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PipelineResult {
  applicationId: string;
  finalState: ApplicationState;
  stagesCompleted: string[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export class AgentOrchestrator {
  private stateMachine = getStateMachine();

  // -----------------------------------------------------------------------
  // Individual stage runners
  // -----------------------------------------------------------------------

  /**
   * Stage 1: Profile extraction from raw input.
   */
  async runProfiling(input: ProfileAgentInput): Promise<ProfileAgentOutput> {
    const result = await runProfileAgent(input);

    // Only transition if profiling produced a valid result
    if (result.confidenceScore > 0) {
      try {
        // Find or create an application in PENDING state
        const applicationId = await this.ensureApplication(input.userId, 'PENDING');
        await this.stateMachine.transition(
          applicationId, 'PENDING', 'PROFILED', 'AgentOrchestrator',
          `Profile extracted with confidence ${result.confidenceScore}%`,
        );
      } catch (err) {
        console.error('[AgentOrchestrator] Profiling state transition failed:', err);
      }
    }

    return result;
  }

  /**
   * Stage 2: Scholarship discovery based on profile.
   */
  async runDiscovery(userId: string): Promise<DiscoveryAgentOutput> {
    const profile = await this.loadUserProfile(userId);
    const result = await runDiscoveryAgent({ userId, profile });

    if (result.matches.length > 0) {
      try {
        const applicationId = await this.findActiveApplication(userId);
        if (applicationId) {
          await this.stateMachine.transition(
            applicationId, 'PROFILED', 'DISCOVERED', 'AgentOrchestrator',
            `Found ${result.matches.length} matching schemes, total value ₹${result.totalPotentialValue}`,
          );
        }
      } catch (err) {
        console.error('[AgentOrchestrator] Discovery state transition failed:', err);
      }
    }

    return result;
  }

  /**
   * Stage 3: Document intelligence + validation.
   * Transitions: DISCOVERED → DOCS_PENDING → VALIDATING
   */
  async runDocValidation(
    applicationId: string,
    schemeIds: string[],
    documentUrls: Record<string, string>,
  ): Promise<DocAgentOutput> {
    // Move to DOCS_PENDING before starting validation
    try {
      await this.stateMachine.transition(
        applicationId, 'DISCOVERED', 'DOCS_PENDING', 'AgentOrchestrator',
        `Starting document validation for ${Object.keys(documentUrls).length} documents`,
      );
    } catch (err) {
      console.error('[AgentOrchestrator] DOCS_PENDING transition failed:', err);
    }

    const result = await runDocIntelligenceAgent({
      applicationId,
      schemeIds,
      documentUrls,
    });

    if (result.isReady) {
      try {
        await this.stateMachine.transition(
          applicationId, 'DOCS_PENDING', 'VALIDATING', 'AgentOrchestrator',
          `Health score: ${result.healthScore}/100, all documents validated`,
        );
      } catch (err) {
        console.error('[AgentOrchestrator] VALIDATING transition failed:', err);
      }
    }

    return result;
  }

  /**
   * Stage 4: Application drafting + PDF generation.
   * Transitions: VALIDATING → DRAFTING → REVIEW
   */
  async runDrafting(
    applicationId: string,
    userId: string,
    schemeId: string,
  ): Promise<DraftingAgentOutput> {
    // Transition to DRAFTING state
    try {
      await this.stateMachine.transition(
        applicationId, 'VALIDATING', 'DRAFTING', 'AgentOrchestrator',
        `Starting application draft for scheme ${schemeId}`,
      );
    } catch (err) {
      console.error('[AgentOrchestrator] DRAFTING transition failed:', err);
    }

    const profile = await this.loadUserProfile(userId);
    const result = await runDraftingAgent({
      applicationId,
      userId,
      schemeId,
      profile,
    });

    if (result.pdfUrl) {
      try {
        await this.stateMachine.transition(
          applicationId, 'DRAFTING', 'REVIEW', 'AgentOrchestrator',
          `Application PDF generated: ${result.pdfUrl}`,
        );
      } catch (err) {
        console.error('[AgentOrchestrator] REVIEW transition failed:', err);
      }
    }

    return result;
  }

  /**
   * Stage 5: Status tracking after submission.
   */
  async runTracking(
    applicationId: string,
    userId: string,
    schemeId: string,
    submissionReference: string,
  ): Promise<TrackingAgentOutput> {
    return runTrackingAgent({
      applicationId,
      userId,
      schemeId,
      submissionReference,
    });
  }

  /**
   * Stage 6: Rejection analysis + grievance filing.
   */
  async runRejectionHandling(
    applicationId: string,
    userId: string,
    rejectionReason: string,
    rejectionLetterUrl?: string,
  ): Promise<RejectionAgentOutput> {
    return runRejectionAgent({
      applicationId,
      userId,
      rejectionReason,
      rejectionLetterUrl,
    });
  }

  /**
   * Standalone: Family-wide scholarship mapping.
   */
  async runFamilyMapping(input: FamilyAgentInput): Promise<FamilyAgentOutput> {
    return runFamilyMapperAgent(input);
  }

  // -----------------------------------------------------------------------
  // Full Pipeline (end-to-end for a single user + scheme)
  // -----------------------------------------------------------------------

  /**
   * Runs the complete pipeline from profile → discovery → validation → drafting.
   * Stops at any stage that fails or is not ready to proceed.
   */
  async runFullPipeline(params: {
    userId: string;
    rawInput: string;
    inputSource: 'whatsapp' | 'voice' | 'form';
    language: string;
    documentUrls: Record<string, string>;
  }): Promise<PipelineResult> {
    const stagesCompleted: string[] = [];
    const errors: string[] = [];
    let applicationId = '';

    try {
      // Stage 1: Profile
      const profileResult = await this.runProfiling({
        userId: params.userId,
        rawInput: params.rawInput,
        inputSource: params.inputSource,
        language: params.language,
      });
      stagesCompleted.push('PROFILED');

      if (profileResult.confidenceScore < 50) {
        errors.push(`Profile confidence too low: ${profileResult.confidenceScore}%`);
        return {
          applicationId: '',
          finalState: 'PROFILED',
          stagesCompleted,
          errors,
        };
      }

      // Stage 2: Discovery
      const discoveryResult = await this.runDiscovery(params.userId);
      stagesCompleted.push('DISCOVERED');

      if (discoveryResult.matches.length === 0) {
        errors.push('No matching scholarships found.');
        applicationId = (await this.findActiveApplication(params.userId)) ?? '';
        return {
          applicationId,
          finalState: 'DISCOVERED',
          stagesCompleted,
          errors,
        };
      }

      // Use the top recommended scheme
      const topSchemeId = discoveryResult.recommendedStack[0] ?? discoveryResult.matches[0].schemeId;
      applicationId = (await this.findActiveApplication(params.userId)) ?? '';

      if (!applicationId) {
        applicationId = await this.ensureApplication(params.userId, 'DISCOVERED');
      }

      // Stage 3: Document Validation
      const docResult = await this.runDocValidation(
        applicationId,
        [topSchemeId],
        params.documentUrls,
      );
      stagesCompleted.push('VALIDATING');

      if (!docResult.isReady) {
        errors.push(
          `Documents not ready (health score: ${docResult.healthScore}/100). ` +
          `Missing: ${docResult.missingDocuments.join(', ')}`,
        );
        return {
          applicationId,
          finalState: 'DOCS_PENDING', // stay at DOCS_PENDING if docs aren't validated
          stagesCompleted,
          errors,
        };
      }

      // Stage 4: Drafting
      const draftResult = await this.runDrafting(applicationId, params.userId, topSchemeId);
      stagesCompleted.push('REVIEW');

      if (!draftResult.pdfUrl) {
        errors.push('PDF generation failed.');
      }

      return {
        applicationId,
        finalState: 'REVIEW',
        stagesCompleted,
        errors,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`Pipeline error: ${errMsg}`);
      return {
        applicationId,
        finalState: stagesCompleted.length > 0
          ? (stagesCompleted[stagesCompleted.length - 1] as ApplicationState)
          : 'PENDING',
        stagesCompleted,
        errors,
      };
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private async loadUserProfile(userId: string): Promise<UserProfile> {
    const db = getFirestore();
    const doc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
    if (!doc.exists) {
      throw new Error(`User profile not found for userId: ${userId}`);
    }
    return doc.data() as UserProfile;
  }

  private async findActiveApplication(userId: string): Promise<string | null> {
    const db = getFirestore();
    const snapshot = await db
      .collection(COLLECTIONS.APPLICATIONS)
      .where('userId', '==', userId)
      .where('state', 'not-in', ['RECEIVED', 'REJECTED', 'GRIEVANCE_FILED'])
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].id;
  }

  private async ensureApplication(userId: string, initialState: ApplicationState): Promise<string> {
    const existing = await this.findActiveApplication(userId);
    if (existing) return existing;

    const db = getFirestore();
    const ref = db.collection(COLLECTIONS.APPLICATIONS).doc();
    const now = new Date().toISOString();

    await ref.set({
      userId,
      state: initialState,
      createdAt: now,
      updatedAt: now,
    });

    return ref.id;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: AgentOrchestrator | null = null;

export function getAgentOrchestrator(): AgentOrchestrator {
  if (!instance) {
    instance = new AgentOrchestrator();
  }
  return instance;
}
