/**
 * services/digilocker.service.ts
 *
 * DigiLocker API integration for pulling government-issued documents.
 *
 * Architecture:
 *  - DigiLockerProvider interface defines the contract
 *  - MockDigiLockerProvider implements demo-mode responses
 *  - LiveDigiLockerProvider (stubbed) implements the real OAuth2 flow
 *
 * The active provider is selected based on DIGILOCKER_MODE env var.
 * Post-hackathon: set DIGILOCKER_MODE=live and configure OAuth credentials.
 *
 * Environment variables for live mode:
 *  - DIGILOCKER_CLIENT_ID
 *  - DIGILOCKER_CLIENT_SECRET
 *  - DIGILOCKER_REDIRECT_URI
 */

import type { DocumentType } from '../schemas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DigiLockerDocument {
  documentType: DocumentType;
  name: string;
  issueDate: string;
  issuingAuthority: string;
  fields: Record<string, string>;
  base64Data: string;
  mimeType: string;
}

export interface DigiLockerPullResult {
  success: boolean;
  documents: DigiLockerDocument[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

interface DigiLockerProvider {
  pullDocuments(
    userId: string,
    requestedTypes: DocumentType[],
  ): Promise<DigiLockerPullResult>;

  getAuthorizationUrl(userId: string, state: string): string;
  exchangeCode(code: string): Promise<string>;
}

// ---------------------------------------------------------------------------
// Mock Provider (demo mode)
// ---------------------------------------------------------------------------

class MockDigiLockerProvider implements DigiLockerProvider {
  async pullDocuments(
    userId: string,
    requestedTypes: DocumentType[],
  ): Promise<DigiLockerPullResult> {
    const documents: DigiLockerDocument[] = [];
    const errors: string[] = [];

    for (const docType of requestedTypes) {
      const doc = this.generateMockDocument(userId, docType);
      if (doc) {
        documents.push(doc);
      } else {
        errors.push(`Document type "${docType}" not available in DigiLocker for this user.`);
      }
    }

    return { success: errors.length === 0, documents, errors };
  }

  getAuthorizationUrl(_userId: string, state: string): string {
    return `https://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize?state=${state}&response_type=code&client_id=DEMO`;
  }

  async exchangeCode(_code: string): Promise<string> {
    return 'mock_access_token_' + Date.now();
  }

  private generateMockDocument(userId: string, docType: DocumentType): DigiLockerDocument | null {
    const generators: Partial<Record<DocumentType, () => DigiLockerDocument>> = {
      aadhaar: () => ({
        documentType: 'aadhaar',
        name: 'Aadhaar Card',
        issueDate: '2020-01-15',
        issuingAuthority: 'UIDAI',
        fields: {
          uid: 'XXXX-XXXX-' + userId.slice(-4).padStart(4, '0'),
          name: 'Demo User',
          dob: '2002-05-20',
          gender: 'M',
          address: '123, Demo Street, Demo City, Demo State - 400001',
          pincode: '400001',
        },
        base64Data: '',
        mimeType: 'application/xml',
      }),
      income_certificate: () => ({
        documentType: 'income_certificate',
        name: 'Income Certificate',
        issueDate: '2024-11-01',
        issuingAuthority: 'Tehsildar, Demo District',
        fields: {
          holderName: 'Demo User',
          annualIncome: '150000',
          financialYear: '2024-25',
          certificateNumber: 'IC-' + userId.slice(-6),
          district: 'Demo District',
          state: 'MH',
        },
        base64Data: '',
        mimeType: 'application/pdf',
      }),
      marksheet: () => ({
        documentType: 'marksheet',
        name: '12th Marksheet',
        issueDate: '2024-06-15',
        issuingAuthority: 'Maharashtra State Board',
        fields: {
          studentName: 'Demo User',
          rollNumber: 'MH-' + userId.slice(-8),
          totalMarks: '450',
          maxMarks: '500',
          percentage: '90',
          result: 'PASS',
          examYear: '2024',
        },
        base64Data: '',
        mimeType: 'application/pdf',
      }),
      caste_certificate: () => ({
        documentType: 'caste_certificate',
        name: 'Caste Certificate',
        issueDate: '2023-08-10',
        issuingAuthority: 'Sub-Divisional Magistrate, Demo District',
        fields: {
          holderName: 'Demo User',
          caste: 'Scheduled Caste',
          category: 'sc',
          certificateNumber: 'CC-' + userId.slice(-6),
          state: 'MH',
        },
        base64Data: '',
        mimeType: 'application/pdf',
      }),
      domicile_certificate: () => ({
        documentType: 'domicile_certificate',
        name: 'Domicile Certificate',
        issueDate: '2023-05-20',
        issuingAuthority: 'Collector Office, Demo District',
        fields: {
          holderName: 'Demo User',
          state: 'Maharashtra',
          district: 'Demo District',
          residingSince: '2002',
          certificateNumber: 'DC-' + userId.slice(-6),
        },
        base64Data: '',
        mimeType: 'application/pdf',
      }),
    };

    const generator = generators[docType];
    return generator ? generator() : null;
  }
}

// ---------------------------------------------------------------------------
// Live Provider (stubbed — activate post-hackathon)
// ---------------------------------------------------------------------------

class LiveDigiLockerProvider implements DigiLockerProvider {
  async pullDocuments(
    _userId: string,
    _requestedTypes: DocumentType[],
  ): Promise<DigiLockerPullResult> {
    // TODO: Implement real DigiLocker OAuth2 flow:
    //  1. Use stored access token for the user
    //  2. Call GET /api/1/files/issued to list available documents
    //  3. For each requested type, call GET /api/1/files/{uri} to download
    //  4. Parse XML/PDF response into DigiLockerDocument shape
    throw new Error('Live DigiLocker integration not yet implemented. Set DIGILOCKER_MODE=mock.');
  }

  getAuthorizationUrl(userId: string, state: string): string {
    const clientId = process.env.DIGILOCKER_CLIENT_ID;
    const redirectUri = process.env.DIGILOCKER_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new Error('DigiLocker OAuth credentials not configured.');
    }

    return [
      'https://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize',
      `?response_type=code`,
      `&client_id=${clientId}`,
      `&redirect_uri=${encodeURIComponent(redirectUri)}`,
      `&state=${state}`,
    ].join('');
  }

  async exchangeCode(_code: string): Promise<string> {
    // TODO: POST to DigiLocker token endpoint with client credentials
    throw new Error('Live DigiLocker token exchange not yet implemented.');
  }
}

// ---------------------------------------------------------------------------
// Factory + Singleton
// ---------------------------------------------------------------------------

let instance: DigiLockerProvider | null = null;

export function getDigiLockerService(): DigiLockerProvider {
  if (!instance) {
    const mode = process.env.DIGILOCKER_MODE ?? 'mock';
    instance = mode === 'live'
      ? new LiveDigiLockerProvider()
      : new MockDigiLockerProvider();

    console.log(`[DigiLocker] Initialized in ${mode} mode.`);
  }
  return instance;
}
