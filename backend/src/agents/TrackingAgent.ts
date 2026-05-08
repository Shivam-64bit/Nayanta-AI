/**
 * agents/TrackingAgent.ts
 *
 * Monitors application status after submission:
 *  1. Polls NSP portal status (mock state progression for demo)
 *  2. Monitors PFMS for disbursement events
 *  3. Sends WhatsApp notifications on every state change
 *  4. Sets deadline reminder jobs in BullMQ
 */

import { BaseAgent } from './BaseAgent';
import { getWhatsAppService } from '../services/whatsapp.service';
import { getFirestore } from '../config/firestore.config';
import { getStateMachine } from '../orchestrator/StateMachine';
import { COLLECTIONS } from '../config/constants';
import type {
  TrackingAgentInput,
  TrackingAgentOutput,
  ApplicationState,
  Application,
  UserProfile,
} from '../schemas';

// NSP status progression for demo (realistic state flow)
const NSP_STATUS_PROGRESSION: readonly string[] = [
  'Application Received',
  'Under Institute Verification',
  'Institute Verified',
  'Under State Verification',
  'State Approved',
  'Sent for Disbursement',
  'Disbursement Initiated',
  'Amount Credited',
];

class TrackingAgent extends BaseAgent<TrackingAgentInput, TrackingAgentOutput> {
  protected readonly agentName = 'TrackingAgent';

  async run(input: TrackingAgentInput): Promise<TrackingAgentOutput> {
    const db = getFirestore();

    // Step 1: Load current application state from Firestore
    const appDoc = await db.collection(COLLECTIONS.APPLICATIONS).doc(input.applicationId).get();
    if (!appDoc.exists) {
      throw new Error(`Application ${input.applicationId} not found.`);
    }
    const application = appDoc.data() as Application;

    // Step 2: Poll NSP portal status
    const nspStatus = await this.pollNspStatus(input.submissionReference, application);

    // Step 3: Check PFMS disbursement status
    const pfmsStatus = await this.checkPfmsStatus(input.applicationId);

    // Step 4: Determine if a state transition is needed
    const newState = this.determineNewState(application.state, nspStatus, pfmsStatus);

    if (newState && newState !== application.state) {
      // Transition state
      const stateMachine = getStateMachine();
      await stateMachine.transition(
        input.applicationId,
        application.state,
        newState,
        this.agentName,
        `NSP: ${nspStatus}, PFMS: ${pfmsStatus}`,
      );

      // Send WhatsApp notification
      await this.notifyUser(input, newState);
    }

    // Step 5: Schedule next check
    const nextCheckAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    return {
      applicationId: input.applicationId,
      currentState: newState ?? application.state,
      nspStatus,
      pfmsStatus,
      nextCheckAt,
    };
  }

  fallbackResponse(input: TrackingAgentInput): TrackingAgentOutput {
    return {
      applicationId: input.applicationId,
      currentState: 'TRACKING',
      nspStatus: 'Status check failed',
      pfmsStatus: 'Status check failed',
      nextCheckAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // retry in 1 hour
    };
  }

  // -----------------------------------------------------------------------
  // NSP Portal Polling
  // -----------------------------------------------------------------------

  private async pollNspStatus(
    submissionReference: string,
    application: Application,
  ): Promise<string> {
    // Determine progress based on how long ago the application was submitted
    const submittedAt = new Date(application.createdAt).getTime();
    const elapsed = Date.now() - submittedAt;
    const daysSinceSubmission = Math.floor(elapsed / (1000 * 60 * 60 * 24));

    // Progress through NSP statuses based on elapsed time
    const progressIndex = Math.min(
      Math.floor(daysSinceSubmission / 3), // new status every ~3 days
      NSP_STATUS_PROGRESSION.length - 1,
    );

    return NSP_STATUS_PROGRESSION[progressIndex];
  }

  // -----------------------------------------------------------------------
  // PFMS Disbursement Check
  // -----------------------------------------------------------------------

  private async checkPfmsStatus(applicationId: string): Promise<string> {
    // PFMS check — in production this would call the PFMS API
    // For demo: returns status based on application state
    const db = getFirestore();
    const appDoc = await db.collection(COLLECTIONS.APPLICATIONS).doc(applicationId).get();

    if (!appDoc.exists) return 'Not Found';

    const app = appDoc.data() as Application;
    if (app.disbursementConfirmed) {
      return 'Amount Credited';
    }

    return 'Pending Disbursement';
  }

  // -----------------------------------------------------------------------
  // State Determination
  // -----------------------------------------------------------------------

  private determineNewState(
    currentState: ApplicationState,
    nspStatus: string,
    pfmsStatus: string,
  ): ApplicationState | null {
    const nspLower = nspStatus.toLowerCase();

    if (pfmsStatus === 'Amount Credited' && currentState === 'TRACKING') {
      return 'RECEIVED';
    }

    if (nspLower.includes('rejected') || nspLower.includes('cancelled')) {
      if (currentState === 'TRACKING' || currentState === 'SUBMITTED') {
        return 'REJECTED';
      }
    }

    return null; // no transition needed
  }

  // -----------------------------------------------------------------------
  // Notification
  // -----------------------------------------------------------------------

  private async notifyUser(input: TrackingAgentInput, newState: ApplicationState): Promise<void> {
    try {
      const db = getFirestore();
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(input.userId).get();
      if (!userDoc.exists) return;

      const user = userDoc.data() as UserProfile;
      if (!user.phone) return;

      // Load scheme name
      const schemeDoc = await db.collection(COLLECTIONS.SCHOLARSHIPS).doc(input.schemeId).get();
      const schemeName = schemeDoc.exists
        ? (schemeDoc.data() as { name: string }).name
        : input.schemeId;

      const whatsapp = getWhatsAppService();
      await whatsapp.sendStateNotification({
        to: user.phone,
        userName: user.name,
        applicationId: input.applicationId,
        schemeName,
        state: newState,
      });
    } catch (err) {
      // Notification failure should not crash the tracking agent
      console.error(`[TrackingAgent] Notification failed:`, err);
    }
  }
}

// ---------------------------------------------------------------------------
// Exported runner
// ---------------------------------------------------------------------------

const agent = new TrackingAgent();

export async function runTrackingAgent(input: TrackingAgentInput): Promise<TrackingAgentOutput> {
  return agent.execute(input);
}
