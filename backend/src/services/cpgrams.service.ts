/**
 * services/cpgrams.service.ts
 *
 * CPGRAMS (Centralized Public Grievance Redress and Monitoring System) integration.
 *
 * Architecture:
 *  - CpgramsProvider interface defines the contract
 *  - MockCpgramsProvider generates realistic grievance references for demo
 *  - LiveCpgramsProvider (stubbed) implements the real API integration
 *
 * Active provider selected via CPGRAMS_MODE env var.
 *
 * Environment variables for live mode:
 *  - CPGRAMS_API_URL
 *  - CPGRAMS_API_KEY
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GrievanceFilingInput {
  userId: string;
  applicationId: string;
  schemeName: string;
  rejectionReason: string;
  applicantName: string;
  applicantPhone: string;
  evidence: string[];          // list of supporting facts
}

export interface GrievanceFilingResult {
  success: boolean;
  grievanceId: string | null;
  referenceNumber: string | null;
  filedAt: string | null;
  expectedResolutionDays: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

interface CpgramsProvider {
  fileGrievance(input: GrievanceFilingInput): Promise<GrievanceFilingResult>;
  checkStatus(grievanceId: string): Promise<{ status: string; updatedAt: string }>;
}

// ---------------------------------------------------------------------------
// Mock Provider (demo mode)
// ---------------------------------------------------------------------------

class MockCpgramsProvider implements CpgramsProvider {
  async fileGrievance(input: GrievanceFilingInput): Promise<GrievanceFilingResult> {
    // Generate a realistic CPGRAMS-style reference number
    const year = new Date().getFullYear();
    const seq = Math.floor(Math.random() * 900000) + 100000;
    const referenceNumber = `CPGRM/${year}/${seq}`;
    const grievanceId = `GRV-${input.applicationId}-${Date.now().toString(36)}`;

    console.log(
      `[CPGRAMS/Mock] Grievance filed for application ${input.applicationId}: ${referenceNumber}`,
    );

    return {
      success: true,
      grievanceId,
      referenceNumber,
      filedAt: new Date().toISOString(),
      expectedResolutionDays: 30,
    };
  }

  async checkStatus(grievanceId: string): Promise<{ status: string; updatedAt: string }> {
    // Simulate a status check — returns "under review" for demo
    console.log(`[CPGRAMS/Mock] Status check for ${grievanceId}: UNDER_REVIEW`);
    return {
      status: 'UNDER_REVIEW',
      updatedAt: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Live Provider (stubbed — activate post-hackathon)
// ---------------------------------------------------------------------------

class LiveCpgramsProvider implements CpgramsProvider {
  private getConfig() {
    const apiUrl = process.env.CPGRAMS_API_URL;
    const apiKey = process.env.CPGRAMS_API_KEY;

    if (!apiUrl || !apiKey) {
      throw new Error('CPGRAMS credentials not configured. Set CPGRAMS_API_URL and CPGRAMS_API_KEY.');
    }
    return { apiUrl, apiKey };
  }

  async fileGrievance(_input: GrievanceFilingInput): Promise<GrievanceFilingResult> {
    // TODO: Implement real CPGRAMS API integration:
    //  1. POST to CPGRAMS grievance filing endpoint
    //  2. Include scheme details, rejection reason, evidence
    //  3. Parse response for grievance reference number
    //  4. Store reference in Firestore
    const _config = this.getConfig();
    throw new Error('Live CPGRAMS integration not yet implemented. Set CPGRAMS_MODE=mock.');
  }

  async checkStatus(_grievanceId: string): Promise<{ status: string; updatedAt: string }> {
    const _config = this.getConfig();
    throw new Error('Live CPGRAMS status check not yet implemented.');
  }
}

// ---------------------------------------------------------------------------
// Factory + Singleton
// ---------------------------------------------------------------------------

let instance: CpgramsProvider | null = null;

export function getCpgramsService(): CpgramsProvider {
  if (!instance) {
    const mode = process.env.CPGRAMS_MODE ?? 'mock';
    instance = mode === 'live'
      ? new LiveCpgramsProvider()
      : new MockCpgramsProvider();

    console.log(`[CPGRAMS] Initialized in ${mode} mode.`);
  }
  return instance;
}
