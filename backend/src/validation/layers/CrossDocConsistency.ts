/**
 * validation/layers/CrossDocConsistency.ts
 *
 * Layer 1: Compares name, DOB, and address across all uploaded documents
 * using Gemini Vision OCR. Flags inconsistencies between documents.
 */

import { getGeminiVisionService } from '../../services/geminiVision.service';
import type { LayerResult } from '../../schemas';

export interface CrossDocInput {
  /** Map of documentType → base64 image data */
  documents: Map<string, { base64: string; mimeType: string }>;
}

/**
 * Extracts key identity fields from each document via OCR,
 * then cross-references name, DOB, and address for consistency.
 */
export async function runCrossDocConsistency(input: CrossDocInput): Promise<LayerResult> {
  const issues: string[] = [];
  const vision = getGeminiVisionService();

  // Step 1: OCR each document to extract key fields
  const extractedFields: Record<string, Record<string, string>> = {};

  for (const [docType, { base64, mimeType }] of input.documents) {
    try {
      const ocr = await vision.extractDocumentFields(base64, mimeType, docType);
      extractedFields[docType] = ocr.fields;
    } catch (err) {
      issues.push(`Failed to OCR ${docType}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const docTypes = Object.keys(extractedFields);
  if (docTypes.length < 2) {
    return {
      layer: 1,
      name: 'CrossDocConsistency',
      passed: issues.length === 0,
      issues: issues.length > 0 ? issues : ['Insufficient documents for cross-validation (need at least 2).'],
      confidence: issues.length === 0 ? 50 : 30,
    };
  }

  // Step 2: Compare key fields across all document pairs
  const referenceDoc = docTypes[0];
  const referenceFields = extractedFields[referenceDoc];

  for (const targetDoc of docTypes.slice(1)) {
    const targetFields = extractedFields[targetDoc];

    for (const field of ['name', 'dob', 'address'] as const) {
      const refValue = referenceFields[field]?.toLowerCase().trim();
      const targetValue = targetFields[field]?.toLowerCase().trim();

      if (refValue && targetValue && refValue !== targetValue) {
        issues.push(
          `Field "${field}" mismatch: ${referenceDoc} has "${referenceFields[field]}" but ${targetDoc} has "${targetFields[field]}".`,
        );
      }
    }
  }

  const passed = issues.length === 0;
  return {
    layer: 1,
    name: 'CrossDocConsistency',
    passed,
    issues,
    confidence: passed ? 90 : 40,
  };
}
