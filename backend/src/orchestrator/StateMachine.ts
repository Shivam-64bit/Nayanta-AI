/**
 * orchestrator/StateMachine.ts
 *
 * Defines all valid application state transitions.
 * Enforces illegal-transition guards at runtime.
 * Persists every transition to Firestore with timestamp, agent name, and note.
 */

import { getFirestore } from '../config/firestore.config';
import { COLLECTIONS } from '../config/constants';
import type { ApplicationState, StateTransition } from '../schemas';

// ---------------------------------------------------------------------------
// Valid Transition Map
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: ReadonlyMap<ApplicationState, readonly ApplicationState[]> = new Map([
  ['PENDING',          ['PROFILED']],
  ['PROFILED',         ['DISCOVERED']],
  ['DISCOVERED',       ['DOCS_PENDING']],
  ['DOCS_PENDING',     ['VALIDATING']],
  ['VALIDATING',       ['DRAFTING', 'DOCS_PENDING']],       // back to DOCS_PENDING if validation fails
  ['DRAFTING',         ['REVIEW']],
  ['REVIEW',           ['SUBMITTED', 'DRAFTING']],           // back to DRAFTING if review rejects
  ['SUBMITTED',        ['TRACKING', 'REJECTED']],
  ['TRACKING',         ['RECEIVED', 'REJECTED']],
  ['RECEIVED',         ['RENEWAL_DUE']],
  ['REJECTED',         ['GRIEVANCE_FILED']],
  ['GRIEVANCE_FILED',  ['RESOLVED']],
  ['RESOLVED',         []],
  ['RENEWAL_DUE',      ['PENDING']],                         // restart cycle
]);

// ---------------------------------------------------------------------------
// StateMachine
// ---------------------------------------------------------------------------

export class StateMachine {
  /**
   * Checks whether a transition from `from` to `to` is legal.
   */
  canTransition(from: ApplicationState, to: ApplicationState): boolean {
    const allowed = VALID_TRANSITIONS.get(from);
    return allowed !== undefined && allowed.includes(to);
  }

  /**
   * Returns the list of valid next states from the given state.
   */
  getValidNextStates(from: ApplicationState): readonly ApplicationState[] {
    return VALID_TRANSITIONS.get(from) ?? [];
  }

  /**
   * Executes a state transition:
   *  1. Validates the transition is legal
   *  2. Builds a StateTransition record
   *  3. Atomically updates the Application document in Firestore
   *  4. Appends to the state_transitions audit collection
   *
   * @throws Error if the transition is illegal
   */
  async transition(
    applicationId: string,
    from: ApplicationState,
    to: ApplicationState,
    agentName: string,
    note?: string,
  ): Promise<StateTransition> {
    if (!this.canTransition(from, to)) {
      const allowed = this.getValidNextStates(from).join(', ') || 'none';
      throw new Error(
        `Illegal state transition: ${from} → ${to}. Valid transitions from ${from}: [${allowed}]`,
      );
    }

    const record: StateTransition = {
      from,
      to,
      timestamp: new Date().toISOString(),
      agentName,
      ...(note ? { note } : {}),
    };

    const db = getFirestore();
    const batch = db.batch();

    // 1. Update the application document's state + append to stateHistory
    const appRef = db.collection(COLLECTIONS.APPLICATIONS).doc(applicationId);
    batch.update(appRef, {
      state: to,
      updatedAt: record.timestamp,
      stateHistory: admin_arrayUnion(record),
    });

    // 2. Write to the dedicated state transitions audit collection
    const transitionRef = db.collection(COLLECTIONS.STATE_TRANSITIONS).doc();
    batch.set(transitionRef, {
      applicationId,
      ...record,
    });

    await batch.commit();

    console.log(`[StateMachine] ${applicationId}: ${from} → ${to} (by ${agentName})`);
    return record;
  }
}

// ---------------------------------------------------------------------------
// Firestore FieldValue helper (avoids importing admin at top-level)
// ---------------------------------------------------------------------------

function admin_arrayUnion(value: unknown) {
  // Dynamic import to avoid circular dependency with firestore.config
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const admin = require('firebase-admin');
  return admin.firestore.FieldValue.arrayUnion(value);
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

let instance: StateMachine | null = null;

export function getStateMachine(): StateMachine {
  if (!instance) {
    instance = new StateMachine();
  }
  return instance;
}
