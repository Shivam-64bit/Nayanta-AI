/**
 * agents/DraftingAgent.ts
 *
 * Builds a complete scholarship application using Gemini Flash:
 *  1. Loads scheme rubric and requirements
 *  2. Constructs a structured prompt with profile + scheme + rubric
 *  3. Generates application text and cover letter
 *  4. Produces a submission-ready PDF via pdf.service
 */

import { BaseAgent } from './BaseAgent';
import { getGeminiService } from '../services/gemini.service';
import { getPdfService } from '../services/pdf.service';
import { getFirestore } from '../config/firestore.config';
import { COLLECTIONS } from '../config/constants';
import { z } from 'zod';
import type {
  DraftingAgentInput,
  DraftingAgentOutput,
  ScholarshipScheme,
  MatchedScholarship,
} from '../schemas';

// Gemini output shape for application drafting
const DraftResponseSchema = z.object({
  applicationText: z.string(),
  coverLetter: z.string(),
  filledFields: z.record(z.string(), z.string()),
  warningFields: z.array(z.string()),
});

class DraftingAgent extends BaseAgent<DraftingAgentInput, DraftingAgentOutput> {
  protected readonly agentName = 'DraftingAgent';

  async run(input: DraftingAgentInput): Promise<DraftingAgentOutput> {
    const db = getFirestore();

    // Step 1: Load scheme details
    const schemeDoc = await db.collection(COLLECTIONS.SCHOLARSHIPS).doc(input.schemeId).get();
    if (!schemeDoc.exists) {
      throw new Error(`Scheme ${input.schemeId} not found in Firestore.`);
    }
    const scheme = { id: schemeDoc.id, ...schemeDoc.data() } as ScholarshipScheme;

    // Step 2: Build structured Gemini prompt
    const gemini = getGeminiService();
    const prompt = this.buildDraftingPrompt(input, scheme);

    const draftResult = await gemini.generateStructured(prompt, DraftResponseSchema, {
      systemInstruction: [
        'You are an expert scholarship application writer for Indian government scholarships.',
        'Write formal, structured applications — not freeform prose.',
        'Use clear sections, proper salutations, and reference specific eligibility criteria.',
        'Include all required personal details and supporting evidence references.',
      ].join(' '),
      temperature: 0.3,
    });

    // Step 3: Generate PDF
    const matchedScholarship: MatchedScholarship = {
      schemeId: scheme.id,
      schemeName: scheme.name,
      annualAmount: scheme.annualAmount,
      matchScore: 0,
      eligibilityReasons: [],
      ineligibilityReasons: [],
      successProbability: 0,
      quotaUrgency: 'low',
      requiresGeminiEvaluation: false,
    };

    const pdfService = getPdfService();
    const pdfResult = await pdfService.generateApplicationPdf({
      applicationId: input.applicationId,
      userId: input.userId,
      profile: input.profile,
      scheme: matchedScholarship,
      applicationText: draftResult.applicationText,
      coverLetter: draftResult.coverLetter,
    });

    // Step 4: Update application in Firestore
    await db.collection(COLLECTIONS.APPLICATIONS).doc(input.applicationId).update({
      draftedApplicationUrl: pdfResult.pdfUrl,
      updatedAt: new Date().toISOString(),
    });

    return {
      applicationId: input.applicationId,
      pdfUrl: pdfResult.pdfUrl,
      filledFields: draftResult.filledFields,
      warningFields: draftResult.warningFields,
    };
  }

  fallbackResponse(input: DraftingAgentInput): DraftingAgentOutput {
    return {
      applicationId: input.applicationId,
      pdfUrl: '',
      filledFields: {},
      warningFields: ['Application drafting failed. Please retry.'],
    };
  }

  // -----------------------------------------------------------------------
  // Prompt builder
  // -----------------------------------------------------------------------

  private buildDraftingPrompt(input: DraftingAgentInput, scheme: ScholarshipScheme): string {
    const { profile } = input;

    return [
      `Draft a complete scholarship application for the following scheme and applicant.`,
      ``,
      `=== SCHEME ===`,
      `Name: ${scheme.name}`,
      `Authority: ${scheme.authority}`,
      `Type: ${scheme.type}`,
      `Annual Amount: ₹${scheme.annualAmount.toLocaleString('en-IN')}`,
      `Description: ${scheme.description}`,
      `Required Documents: ${scheme.eligibility.requiredDocuments.join(', ')}`,
      `Portal: ${scheme.portalUrl}`,
      ``,
      `=== APPLICANT ===`,
      `Name: ${profile.name}`,
      `DOB: ${profile.dob}`,
      `Category: ${profile.category.toUpperCase()}`,
      `Income: ₹${profile.income.toLocaleString('en-IN')}`,
      `State: ${profile.state}`,
      `Course: ${profile.course}`,
      `Institute: ${profile.institute}`,
      `Marks: ${profile.marks}%`,
      profile.isDisabled ? `Disability: ${profile.disabilityPercentage}%` : '',
      profile.isBplCardHolder ? `BPL Card Holder: Yes` : '',
      ``,
      `=== INSTRUCTIONS ===`,
      `Return a JSON object with:`,
      `- "applicationText": the full formal application text with proper sections`,
      `- "coverLetter": a concise cover letter addressed to the scheme authority`,
      `- "filledFields": a key-value map of all form fields filled (e.g. "applicantName": "value")`,
      `- "warningFields": array of field names where data may be incomplete or uncertain`,
    ].filter(Boolean).join('\n');
  }
}

// ---------------------------------------------------------------------------
// Exported runner
// ---------------------------------------------------------------------------

const agent = new DraftingAgent();

export async function runDraftingAgent(input: DraftingAgentInput): Promise<DraftingAgentOutput> {
  return agent.execute(input);
}
