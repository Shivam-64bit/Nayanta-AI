/**
 * agents/RejectionAgent.ts
 *
 * Handles scholarship rejections end-to-end:
 *  1. Parses rejection letter via Gemini Flash
 *  2. Generates plain-language explanation (no bureaucratic jargon)
 *  3. Files CPGRAMS grievance with structured evidence
 *  4. Identifies fixable fields and recommends reapply strategy
 */

import { BaseAgent } from './BaseAgent';
import { getGeminiService } from '../services/gemini.service';
import { getCpgramsService } from '../services/cpgrams.service';
import { getFirestore } from '../config/firestore.config';
import { getStateMachine } from '../orchestrator/StateMachine';
import { COLLECTIONS } from '../config/constants';
import { z } from 'zod';
import type {
  RejectionAgentInput,
  RejectionAgentOutput,
  Application,
  UserProfile,
} from '../schemas';

// Gemini analysis response
const RejectionAnalysisSchema = z.object({
  rejectionCategory: z.string(),
  plainExplanation: z.string(),
  fixableIssues: z.array(z.object({
    field: z.string(),
    issue: z.string(),
    fix: z.string(),
  })),
  reapplyRecommended: z.boolean(),
  grievanceJustification: z.string(),
  legalBasis: z.string().optional(),
});

class RejectionAgent extends BaseAgent<RejectionAgentInput, RejectionAgentOutput> {
  protected readonly agentName = 'RejectionAgent';

  async run(input: RejectionAgentInput): Promise<RejectionAgentOutput> {
    const db = getFirestore();
    const gemini = getGeminiService();

    // Step 1: Load application and user context
    const appDoc = await db.collection(COLLECTIONS.APPLICATIONS).doc(input.applicationId).get();
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(input.userId).get();

    const application = appDoc.exists ? (appDoc.data() as Application) : null;
    const user = userDoc.exists ? (userDoc.data() as UserProfile) : null;

    // Step 2: Analyze rejection reason via Gemini
    const prompt = this.buildAnalysisPrompt(input, application, user);
    const analysis = await gemini.generateStructured(prompt, RejectionAnalysisSchema, {
      systemInstruction: [
        'You are a legal aid advisor specializing in Indian government scholarship rejections.',
        'Always explain rejection reasons in simple, jargon-free language.',
        'Identify specific fixable issues and provide actionable remediation steps.',
        'Assess whether a formal grievance is warranted based on the rejection reason.',
      ].join(' '),
    });

    // Step 3: File CPGRAMS grievance if warranted
    let grievanceId: string | undefined;

    if (analysis.reapplyRecommended || analysis.grievanceJustification.length > 0) {
      const cpgrams = getCpgramsService();
      const grievanceResult = await cpgrams.fileGrievance({
        userId: input.userId,
        applicationId: input.applicationId,
        schemeName: application?.schemeId ?? 'Unknown Scheme',
        rejectionReason: input.rejectionReason,
        applicantName: user?.name ?? 'Unknown',
        applicantPhone: user?.phone ?? '',
        evidence: [
          analysis.grievanceJustification,
          ...analysis.fixableIssues.map(i => `${i.field}: ${i.issue} → ${i.fix}`),
        ],
      });

      if (grievanceResult.success) {
        grievanceId = grievanceResult.grievanceId ?? undefined;

        // Transition state to GRIEVANCE_FILED
        if (application) {
          const stateMachine = getStateMachine();
          try {
            await stateMachine.transition(
              input.applicationId,
              'REJECTED',
              'GRIEVANCE_FILED',
              this.agentName,
              `Grievance filed: ${grievanceResult.referenceNumber}`,
            );
          } catch (err) {
            console.error(`[RejectionAgent] State transition failed:`, err);
          }
        }
      }
    }

    // Step 4: Update application in Firestore
    await db.collection(COLLECTIONS.APPLICATIONS).doc(input.applicationId).update({
      rejectionReason: analysis.plainExplanation,
      grievanceId: grievanceId ?? null,
      updatedAt: new Date().toISOString(),
    });

    return {
      applicationId: input.applicationId,
      plainLanguageExplanation: analysis.plainExplanation,
      grievanceId,
      reapplyRecommended: analysis.reapplyRecommended,
      fixedFields: analysis.fixableIssues.map(i => i.field),
    };
  }

  fallbackResponse(input: RejectionAgentInput): RejectionAgentOutput {
    return {
      applicationId: input.applicationId,
      plainLanguageExplanation: 'We could not analyze this rejection at this time. Please contact support.',
      reapplyRecommended: false,
      fixedFields: [],
    };
  }

  // -----------------------------------------------------------------------
  // Prompt builder
  // -----------------------------------------------------------------------

  private buildAnalysisPrompt(
    input: RejectionAgentInput,
    application: Application | null,
    user: UserProfile | null,
  ): string {
    return [
      `Analyze the following scholarship application rejection and provide actionable guidance.`,
      ``,
      `=== REJECTION ===`,
      `Reason given: "${input.rejectionReason}"`,
      input.rejectionLetterUrl ? `Rejection letter URL: ${input.rejectionLetterUrl}` : '',
      ``,
      `=== APPLICANT ===`,
      user ? `Name: ${user.name}, Category: ${user.category}, Income: ₹${user.income}` : 'Applicant details unavailable.',
      user ? `State: ${user.state}, Course: ${user.course}, Marks: ${user.marks}%` : '',
      ``,
      `=== APPLICATION ===`,
      application ? `Scheme: ${application.schemeId}, Submitted: ${application.createdAt}` : 'Application details unavailable.',
      ``,
      `=== INSTRUCTIONS ===`,
      `Return JSON with:`,
      `- "rejectionCategory": e.g. "Income Exceeds Limit", "Missing Document", "Category Mismatch"`,
      `- "plainExplanation": simple, jargon-free explanation of why the application was rejected`,
      `- "fixableIssues": array of { field, issue, fix } — concrete actionable fixes`,
      `- "reapplyRecommended": boolean — should the student reapply after fixing issues?`,
      `- "grievanceJustification": why a formal grievance is warranted (empty string if not)`,
      `- "legalBasis": relevant law or regulation that supports the grievance (optional)`,
    ].filter(Boolean).join('\n');
  }
}

// ---------------------------------------------------------------------------
// Exported runner
// ---------------------------------------------------------------------------

const agent = new RejectionAgent();

export async function runRejectionAgent(input: RejectionAgentInput): Promise<RejectionAgentOutput> {
  return agent.execute(input);
}
