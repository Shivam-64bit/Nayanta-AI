/**
 * agents/DocIntelligenceAgent.ts
 *
 * Orchestrates the 7-layer DocumentValidator pipeline.
 * Accepts document uploads + scheme IDs, runs validation,
 * returns health score, per-document results, and actionable fix list.
 */

import { BaseAgent } from './BaseAgent';
import { getDocumentValidator, type DocumentValidatorInput } from '../validation/DocumentValidator';
import { getFirestore } from '../config/firestore.config';
import { COLLECTIONS } from '../config/constants';
import type {
  DocAgentInput,
  DocAgentOutput,
  DocumentType,
  ScholarshipScheme,
} from '../schemas';

class DocIntelligenceAgent extends BaseAgent<DocAgentInput, DocAgentOutput> {
  protected readonly agentName = 'DocIntelligenceAgent';

  async run(input: DocAgentInput): Promise<DocAgentOutput> {
    const db = getFirestore();

    // Step 1: Resolve required documents from scheme configurations
    const requiredDocuments = await this.resolveRequiredDocuments(input.schemeIds);

    // Step 2: Fetch document content from URLs as base64
    const documents = new Map<
      string,
      { base64: string; mimeType: string; documentType: DocumentType; issueDate?: string }
    >();

    for (const [docType, url] of Object.entries(input.documentUrls)) {
      try {
        const { base64, mimeType } = await this.fetchDocumentAsBase64(url);
        documents.set(docType, {
          base64,
          mimeType,
          documentType: docType as DocumentType,
        });
      } catch (err) {
        console.error(`[DocIntelligenceAgent] Failed to fetch ${docType} from ${url}:`, err);
      }
    }

    // Step 3: Extract selfie and aadhaar for face match
    const aadhaarDoc = documents.get('aadhaar');
    const selfieDoc = documents.get('selfie');

    // Step 4: Run the full validation pipeline
    const validator = getDocumentValidator();
    const validatorInput: DocumentValidatorInput = {
      applicationId: input.applicationId,
      documents,
      requiredDocuments,
      aadhaarImageBase64: aadhaarDoc?.base64,
      selfieBase64: selfieDoc?.base64,
    };

    const result = await validator.validate(validatorInput);

    // Step 5: Persist validation result to Firestore
    await db
      .collection(COLLECTIONS.APPLICATIONS)
      .doc(input.applicationId)
      .update({
        validationResult: result,
        updatedAt: new Date().toISOString(),
      });

    return result;
  }

  fallbackResponse(input: DocAgentInput): DocAgentOutput {
    return {
      applicationId: input.applicationId,
      healthScore: 0,
      layerResults: [],
      actionableIssues: ['Document validation could not be completed. Please try again.'],
      missingDocuments: [],
      isReady: false,
    };
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /**
   * Aggregates requiredDocuments from all specified schemes.
   */
  private async resolveRequiredDocuments(schemeIds: string[]): Promise<DocumentType[]> {
    const db = getFirestore();
    const required = new Set<DocumentType>();

    for (const schemeId of schemeIds) {
      try {
        const doc = await db.collection(COLLECTIONS.SCHOLARSHIPS).doc(schemeId).get();
        if (doc.exists) {
          const scheme = doc.data() as ScholarshipScheme;
          for (const docType of scheme.eligibility.requiredDocuments) {
            required.add(docType);
          }
        }
      } catch (err) {
        console.error(`[DocIntelligenceAgent] Failed to load scheme ${schemeId}:`, err);
      }
    }

    return Array.from(required);
  }

  /**
   * Fetches a document from a URL and returns it as base64.
   */
  private async fetchDocumentAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching document from ${url}`);
    }

    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    const buffer = Buffer.from(await response.arrayBuffer());

    return {
      base64: buffer.toString('base64'),
      mimeType: contentType,
    };
  }
}

// ---------------------------------------------------------------------------
// Exported runner
// ---------------------------------------------------------------------------

const agent = new DocIntelligenceAgent();

export async function runDocIntelligenceAgent(input: DocAgentInput): Promise<DocAgentOutput> {
  return agent.execute(input);
}
