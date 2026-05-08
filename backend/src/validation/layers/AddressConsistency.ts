/**
 * validation/layers/AddressConsistency.ts
 *
 * Layer 6: Verifies that address fields are consistent across
 * all uploaded documents using Gemini Vision OCR.
 */

import { getGeminiVisionService } from '../../services/geminiVision.service';
import type { LayerResult } from '../../schemas';

export interface AddressConsistencyInput {
  documents: Map<string, { base64: string; mimeType: string; documentType: string }>;
}

/**
 * Extracts address information from each document and checks
 * for consistency in state, district, and pincode.
 */
export async function runAddressConsistency(input: AddressConsistencyInput): Promise<LayerResult> {
  const issues: string[] = [];
  const vision = getGeminiVisionService();

  // Step 1: Extract address fields from each document
  const addressData: Array<{ docType: string; state?: string; district?: string; pincode?: string }> = [];

  for (const [docKey, { base64, mimeType, documentType }] of input.documents) {
    try {
      const ocr = await vision.extractDocumentFields(base64, mimeType, documentType);
      addressData.push({
        docType: docKey,
        state: ocr.fields['state']?.toLowerCase().trim(),
        district: ocr.fields['district']?.toLowerCase().trim(),
        pincode: ocr.fields['pincode']?.trim(),
      });
    } catch (err) {
      issues.push(
        `Document "${docKey}": address extraction failed — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (addressData.length < 2) {
    return {
      layer: 6,
      name: 'AddressConsistency',
      passed: issues.length === 0,
      issues: issues.length > 0 ? issues : ['Insufficient documents for address cross-validation.'],
      confidence: 50,
    };
  }

  // Step 2: Compare address fields across documents
  const reference = addressData[0];

  for (const target of addressData.slice(1)) {
    if (reference.state && target.state && reference.state !== target.state) {
      issues.push(
        `State mismatch: "${reference.docType}" has "${reference.state}" but "${target.docType}" has "${target.state}".`,
      );
    }

    if (reference.district && target.district && reference.district !== target.district) {
      issues.push(
        `District mismatch: "${reference.docType}" has "${reference.district}" but "${target.docType}" has "${target.district}".`,
      );
    }

    if (reference.pincode && target.pincode && reference.pincode !== target.pincode) {
      issues.push(
        `Pincode mismatch: "${reference.docType}" has "${reference.pincode}" but "${target.docType}" has "${target.pincode}".`,
      );
    }
  }

  const passed = issues.length === 0;
  return {
    layer: 6,
    name: 'AddressConsistency',
    passed,
    issues,
    confidence: passed ? 85 : 35,
  };
}
