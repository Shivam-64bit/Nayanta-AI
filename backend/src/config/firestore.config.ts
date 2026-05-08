/**
 * config/firestore.config.ts
 *
 * Initializes the Firebase Admin SDK and exports a Firestore client.
 * Credentials are loaded from Secret Manager in production,
 * or from GOOGLE_APPLICATION_CREDENTIALS env var in local development.
 */

import * as admin from 'firebase-admin';
import { getSecret } from './secrets.config';

let firestoreInstance: admin.firestore.Firestore | null = null;

export async function initializeFirestore(): Promise<void> {
  if (admin.apps.length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID environment variable is not set.');
  }

  if (process.env.NODE_ENV === 'production') {
    const serviceAccountJson = await getSecret('firebase-service-account');
    const serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
    });
  } else {
    // Local dev: relies on GOOGLE_APPLICATION_CREDENTIALS env var pointing to a key file
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  }

  const db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  firestoreInstance = db;
}

export function getFirestore(): admin.firestore.Firestore {
  if (!firestoreInstance) {
    throw new Error(
      'Firestore has not been initialized. Call initializeFirestore() before accessing the client.',
    );
  }
  return firestoreInstance;
}
