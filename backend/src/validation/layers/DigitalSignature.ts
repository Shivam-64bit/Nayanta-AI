/**
 * validation/layers/DigitalSignature.ts
 *
 * Layer 5: Checks for the presence and validity of digital signatures
 * on documents where they are required by the scheme.
 */

import { getGeminiVisionService } from '../../services/geminiVision.service';
import type { LayerResult, DocumentType } from '../../schemas';

// Document types that typically require digital signatures
const REQUIRES_SIGNATURE: ReadonlySet<DocumentType> = new Set([
  'income_certificate',
  'caste_certificate',
  'domicile_certificate',
  'disability_certificate',
  'bonafide',
]);

export interface DigitalSignatureInput {
  documents: Map<string, { base64: string; mimeType: string; documentType: DocumentType }>;
}

/**
 * Uses Gemini Vision to detect whether digitally-signed documents
 * contain valid signatures or official stamps.
 */
export async function runDigitalSignature(input: DigitalSignatureInput): Promise<LayerResult> {
  const issues: string[] = [];
  const vision = getGeminiVisionService();

  for (const [docKey, { base64, mimeType, documentType }] of input.documents) {
    if (!REQUIRES_SIGNATURE.has(documentType)) continue;

    try {
      const ocr = await vision.extractDocumentFields(base64, mimeType, documentType);
      const extractedText = ocr.extractedText.toLowerCase();

      // Check for signature / stamp indicators in the extracted text
      const hasSignatureIndicator =
        extractedText.includes('digitally signed') ||
        extractedText.includes('digital signature') ||
        extractedText.includes('e-signed') ||
        extractedText.includes('signed by') ||
        extractedText.includes('seal') ||
        extractedText.includes('stamp') ||
        extractedText.includes('authorized signatory');

      if (!hasSignatureIndicator) {
        issues.push(
          `Document "${docKey}" (${documentType}): no digital signature or official stamp detected. ` +
          `This document type requires an authorized signature.`,
        );
      }
    } catch (err) {
      issues.push(
        `Document "${docKey}" (${documentType}): signature check failed — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const passed = issues.length === 0;
  return {
    layer: 5,
    name: 'DigitalSignature',
    passed,
    issues,
    confidence: passed ? 80 : 40,
  };
}
