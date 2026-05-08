/**
 * validation/DocumentValidator.ts
 *
 * Orchestrates all 7 validation layers sequentially.
 * Aggregates per-layer results into a single DocumentValidationResult
 * with an overall health score (0–100) and actionable fix list.
 */

import { runCrossDocConsistency } from './layers/CrossDocConsistency';
import { runFreshnessValidator } from './layers/FreshnessValidator';
import { runAuthorityValidator } from './layers/AuthorityValidator';
import { runFaceMatch } from './layers/FaceMatch';
import { runDigitalSignature } from './layers/DigitalSignature';
import { runAddressConsistency } from './layers/AddressConsistency';
import { runQrBarcodeValidator } from './layers/QRBarcodeValidator';
import type {
  DocumentValidationResult,
  LayerResult,
  DocumentType,
} from '../schemas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DocumentValidatorInput {
  applicationId: string;
  /**
   * Map of document key → document data.
   * Key format: documentType (e.g. "aadhaar", "income_certificate")
   */
  documents: Map<
    string,
    {
      base64: string;
      mimeType: string;
      documentType: DocumentType;
      issueDate?: string;
    }
  >;
  /** Document types required by the scheme */
  requiredDocuments: DocumentType[];
  /** Optional: Aadhaar photo base64 for face match (Layer 4) */
  aadhaarImageBase64?: string;
  /** Optional: Live selfie base64 for face match (Layer 4) */
  selfieBase64?: string;
}

// Layer weight for health score calculation
const LAYER_WEIGHTS: Record<number, number> = {
  1: 20,  // CrossDocConsistency
  2: 15,  // FreshnessValidator
  3: 15,  // AuthorityValidator
  4: 15,  // FaceMatch
  5: 10,  // DigitalSignature
  6: 15,  // AddressConsistency
  7: 10,  // QRBarcodeValidator
};

// ---------------------------------------------------------------------------
// Document Validator
// ---------------------------------------------------------------------------

export class DocumentValidator {
  /**
   * Runs all 7 validation layers sequentially against the provided documents.
   * Returns an aggregated result with health score, per-layer results,
   * actionable issues, and readiness assessment.
   */
  async validate(input: DocumentValidatorInput): Promise<DocumentValidationResult> {
    const layerResults: LayerResult[] = [];

    // --- Layer 1: Cross-Document Consistency ---
    const crossDocInput = { documents: new Map<string, { base64: string; mimeType: string }>() };
    for (const [key, doc] of input.documents) {
      crossDocInput.documents.set(key, { base64: doc.base64, mimeType: doc.mimeType });
    }
    layerResults.push(await this.safeRunLayer(
      () => runCrossDocConsistency(crossDocInput), 1, 'CrossDocConsistency',
    ));

    // --- Layer 2: Freshness Validator ---
    const freshnessInput = {
      documents: new Map<string, { issueDate: string; documentType: DocumentType }>(),
    };
    for (const [key, doc] of input.documents) {
      if (doc.issueDate) {
        freshnessInput.documents.set(key, { issueDate: doc.issueDate, documentType: doc.documentType });
      }
    }
    layerResults.push(this.safeRunLayerSync(
      () => runFreshnessValidator(freshnessInput), 2, 'FreshnessValidator',
    ));

    // --- Layer 3: Authority Validator ---
    const authorityInput = {
      documents: new Map<string, { base64: string; mimeType: string; documentType: DocumentType }>(),
    };
    for (const [key, doc] of input.documents) {
      authorityInput.documents.set(key, {
        base64: doc.base64,
        mimeType: doc.mimeType,
        documentType: doc.documentType,
      });
    }
    layerResults.push(await this.safeRunLayer(
      () => runAuthorityValidator(authorityInput), 3, 'AuthorityValidator',
    ));

    // --- Layer 4: Face Match ---
    if (input.aadhaarImageBase64 && input.selfieBase64) {
      layerResults.push(await this.safeRunLayer(
        () => runFaceMatch({
          aadhaarImageBase64: input.aadhaarImageBase64!,
          selfieBase64: input.selfieBase64!,
        }),
        4,
        'FaceMatch',
      ));
    } else {
      layerResults.push({
        layer: 4,
        name: 'FaceMatch',
        passed: false,
        issues: ['Aadhaar photo or selfie not provided for face matching.'],
        confidence: 0,
      });
    }

    // --- Layer 5: Digital Signature ---
    layerResults.push(await this.safeRunLayer(
      () => runDigitalSignature({ documents: authorityInput.documents }),
      5,
      'DigitalSignature',
    ));

    // --- Layer 6: Address Consistency ---
    const addressInput = {
      documents: new Map<string, { base64: string; mimeType: string; documentType: string }>(),
    };
    for (const [key, doc] of input.documents) {
      addressInput.documents.set(key, {
        base64: doc.base64,
        mimeType: doc.mimeType,
        documentType: doc.documentType,
      });
    }
    layerResults.push(await this.safeRunLayer(
      () => runAddressConsistency(addressInput), 6, 'AddressConsistency',
    ));

    // --- Layer 7: QR/Barcode Validator ---
    layerResults.push(await this.safeRunLayer(
      () => runQrBarcodeValidator({ documents: authorityInput.documents }),
      7,
      'QRBarcodeValidator',
    ));

    // --- Compute aggregates ---
    const healthScore = this.computeHealthScore(layerResults);
    const actionableIssues = layerResults.flatMap(lr => lr.issues);
    const missingDocuments = this.findMissingDocuments(input);
    const isReady = healthScore >= 70 && missingDocuments.length === 0;

    return {
      applicationId: input.applicationId,
      healthScore,
      layerResults,
      actionableIssues,
      missingDocuments,
      isReady,
    };
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private computeHealthScore(results: LayerResult[]): number {
    let totalWeight = 0;
    let weightedScore = 0;

    for (const lr of results) {
      const weight = LAYER_WEIGHTS[lr.layer] ?? 10;
      totalWeight += weight;
      weightedScore += lr.passed ? weight * (lr.confidence / 100) : 0;
    }

    return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;
  }

  private findMissingDocuments(input: DocumentValidatorInput): DocumentType[] {
    const uploadedTypes = new Set<DocumentType>();
    for (const [, doc] of input.documents) {
      uploadedTypes.add(doc.documentType);
    }
    return input.requiredDocuments.filter(dt => !uploadedTypes.has(dt));
  }

  /**
   * Wraps an async layer function in try-catch to ensure
   * one layer failure doesn't stop the entire validation pipeline.
   */
  private async safeRunLayer(
    fn: () => Promise<LayerResult>,
    layer: number,
    name: string,
  ): Promise<LayerResult> {
    try {
      return await fn();
    } catch (err) {
      console.error(`[DocumentValidator] Layer ${layer} (${name}) crashed:`, err);
      return {
        layer,
        name,
        passed: false,
        issues: [`Layer ${name} encountered an internal error: ${err instanceof Error ? err.message : String(err)}`],
        confidence: 0,
      };
    }
  }

  private safeRunLayerSync(
    fn: () => LayerResult,
    layer: number,
    name: string,
  ): LayerResult {
    try {
      return fn();
    } catch (err) {
      console.error(`[DocumentValidator] Layer ${layer} (${name}) crashed:`, err);
      return {
        layer,
        name,
        passed: false,
        issues: [`Layer ${name} encountered an internal error: ${err instanceof Error ? err.message : String(err)}`],
        confidence: 0,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

let instance: DocumentValidator | null = null;

export function getDocumentValidator(): DocumentValidator {
  if (!instance) {
    instance = new DocumentValidator();
  }
  return instance;
}
