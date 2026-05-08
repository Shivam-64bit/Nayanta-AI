/**
 * validation/layers/QRBarcodeValidator.ts
 *
 * Layer 7: Extracts and validates embedded QR/barcode data
 * against the printed text on the document.
 */

import { getGeminiVisionService } from '../../services/geminiVision.service';
import type { LayerResult, DocumentType } from '../../schemas';

// Document types that commonly have QR codes or barcodes
const QR_EXPECTED_TYPES: ReadonlySet<DocumentType> = new Set([
  'aadhaar',
  'income_certificate',
  'caste_certificate',
  'domicile_certificate',
  'marksheet',
]);

export interface QrBarcodeInput {
  documents: Map<string, { base64: string; mimeType: string; documentType: DocumentType }>;
}

/**
 * For each document type that typically contains a QR code,
 * extracts the QR data and validates it against the printed text.
 */
export async function runQrBarcodeValidator(input: QrBarcodeInput): Promise<LayerResult> {
  const issues: string[] = [];
  const vision = getGeminiVisionService();

  for (const [docKey, { base64, mimeType, documentType }] of input.documents) {
    if (!QR_EXPECTED_TYPES.has(documentType)) continue;

    try {
      const result = await vision.extractQrBarcode(base64, mimeType);

      if (!result.found) {
        issues.push(
          `Document "${docKey}" (${documentType}): expected QR/barcode but none was found.`,
        );
        continue;
      }

      if (!result.matchesPrintedText) {
        issues.push(
          `Document "${docKey}" (${documentType}): QR/barcode data does not match printed text. ` +
          `Confidence: ${result.confidence}%. This may indicate tampering.`,
        );
      }
    } catch (err) {
      issues.push(
        `Document "${docKey}" (${documentType}): QR/barcode check failed — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const passed = issues.length === 0;
  return {
    layer: 7,
    name: 'QRBarcodeValidator',
    passed,
    issues,
    confidence: passed ? 90 : 30,
  };
}
