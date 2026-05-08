/**
 * validation/layers/AuthorityValidator.ts
 *
 * Layer 3: Verifies that the issuing authority name/stamp on each document
 * matches the expected format for that document type.
 */

import { getGeminiVisionService } from '../../services/geminiVision.service';
import type { LayerResult, DocumentType } from '../../schemas';

// ---------------------------------------------------------------------------
// Expected authority patterns per document type
// ---------------------------------------------------------------------------

const EXPECTED_AUTHORITIES: Partial<Record<DocumentType, string[]>> = {
  aadhaar:                ['UIDAI', 'Unique Identification Authority of India'],
  income_certificate:     ['Tehsildar', 'Sub-Divisional Magistrate', 'SDM', 'Revenue Department', 'Collector'],
  caste_certificate:      ['Sub-Divisional Magistrate', 'SDM', 'Collector', 'District Magistrate'],
  domicile_certificate:   ['Collector', 'District Magistrate', 'Tehsildar'],
  disability_certificate: ['Chief Medical Officer', 'CMO', 'Civil Surgeon', 'District Hospital'],
  bonafide:               ['Principal', 'Registrar', 'Dean', 'Head of Institution'],
  marksheet:              ['Board', 'University', 'Council', 'CBSE', 'ICSE'],
};

export interface AuthorityInput {
  documents: Map<string, { base64: string; mimeType: string; documentType: DocumentType }>;
}

/**
 * Uses Gemini Vision to extract the issuing authority from each document,
 * then matches against known valid authorities for that document type.
 */
export async function runAuthorityValidator(input: AuthorityInput): Promise<LayerResult> {
  const issues: string[] = [];
  const vision = getGeminiVisionService();

  for (const [docKey, { base64, mimeType, documentType }] of input.documents) {
    const expectedPatterns = EXPECTED_AUTHORITIES[documentType];
    if (!expectedPatterns) continue; // no authority check for this type

    try {
      const ocr = await vision.extractDocumentFields(base64, mimeType, documentType);
      const authority = ocr.fields['issuingAuthority'] ?? ocr.fields['authority'] ?? '';

      if (!authority) {
        issues.push(`Document "${docKey}" (${documentType}): could not identify issuing authority.`);
        continue;
      }

      const authorityLower = authority.toLowerCase();
      const matchFound = expectedPatterns.some(pattern =>
        authorityLower.includes(pattern.toLowerCase()),
      );

      if (!matchFound) {
        issues.push(
          `Document "${docKey}" (${documentType}): authority "${authority}" ` +
          `does not match expected patterns [${expectedPatterns.join(', ')}].`,
        );
      }
    } catch (err) {
      issues.push(
        `Document "${docKey}" (${documentType}): authority check failed — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const passed = issues.length === 0;
  return {
    layer: 3,
    name: 'AuthorityValidator',
    passed,
    issues,
    confidence: passed ? 85 : 35,
  };
}
