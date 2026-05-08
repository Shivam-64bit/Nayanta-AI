/**
 * validation/layers/FreshnessValidator.ts
 *
 * Layer 2: Checks the issue date of each document against
 * scheme-specific validity windows. Flags expired documents.
 */

import type { LayerResult, DocumentType } from '../../schemas';

// ---------------------------------------------------------------------------
// Default validity windows (in months) per document type.
// Schemes may override these via their eligibility config.
// ---------------------------------------------------------------------------

const DEFAULT_VALIDITY_MONTHS: Partial<Record<DocumentType, number>> = {
  income_certificate:     12,
  bonafide:               6,
  caste_certificate:      60,  // typically valid for 5 years
  disability_certificate: 60,
  domicile_certificate:   60,
  fee_receipt:            6,
  marksheet:              120, // effectively permanent within education context
  aadhaar:                120, // no expiry but re-check after 10 years
  bank_passbook:          6,
};

export interface FreshnessInput {
  /** Map of documentType → issue date (ISO string) */
  documents: Map<string, { issueDate: string; documentType: DocumentType }>;
  /** Optional scheme-specific validity overrides (in months) */
  schemeValidityOverrides?: Partial<Record<DocumentType, number>>;
}

/**
 * Validates that each document was issued within its required validity window.
 */
export function runFreshnessValidator(input: FreshnessInput): LayerResult {
  const issues: string[] = [];
  const now = new Date();

  for (const [docKey, { issueDate, documentType }] of input.documents) {
    const validityMonths =
      input.schemeValidityOverrides?.[documentType] ??
      DEFAULT_VALIDITY_MONTHS[documentType];

    if (validityMonths === undefined) {
      // No validity constraint for this document type
      continue;
    }

    const issueDateParsed = new Date(issueDate);
    if (isNaN(issueDateParsed.getTime())) {
      issues.push(`Document "${docKey}" has an invalid issue date: "${issueDate}".`);
      continue;
    }

    const expiryDate = new Date(issueDateParsed);
    expiryDate.setMonth(expiryDate.getMonth() + validityMonths);

    if (now > expiryDate) {
      const monthsExpired = Math.ceil(
        (now.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
      );
      issues.push(
        `Document "${docKey}" (${documentType}) expired ${monthsExpired} month(s) ago. ` +
        `Issued: ${issueDate}, valid for ${validityMonths} months.`,
      );
    }
  }

  const passed = issues.length === 0;
  return {
    layer: 2,
    name: 'FreshnessValidator',
    passed,
    issues,
    confidence: passed ? 95 : 30,
  };
}
