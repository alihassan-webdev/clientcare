/**
 * Utility functions for syncing Firebase Auth and Firestore
 * Handles the core synchronization logic with safeguards
 */

import * as admin from 'firebase-admin';
import { CONFIG } from './config.js';
import { logger } from './logger.js';
import { FirestoreUser, SyncSource, SyncMetadata } from './types.js';

/**
 * Check if a sync operation was recently performed to prevent infinite loops
 */
export async function checkRecentSync(
  db: admin.firestore.Firestore,
  userId: string,
  source: SyncSource,
  timeWindowMs: number = 5000
): Promise<boolean> {
  try {
    const metadataDoc = await db
      .collection(CONFIG.SYNC_METADATA_COLLECTION)
      .doc(userId)
      .get();

    if (!metadataDoc.exists) {
      return false;
    }

    const metadata = metadataDoc.data() as SyncMetadata;
    const timeSinceLastSync = Date.now() - metadata.lastSyncedAt;

    if (timeSinceLastSync < timeWindowMs && metadata.syncSource !== source) {
      logger.warn('Recent sync detected, skipping to prevent infinite loop', {
        userId,
        currentSource: source,
        lastSource: metadata.syncSource,
        timeSinceLastSync,
      });
      return true;
    }

    return false;
  } catch (error) {
    logger.error(
      'Error checking recent sync',
      error instanceof Error ? error.message : String(error),
      { userId }
    );
    return false;
  }
}

/**
 * Record a sync operation in metadata collection
 */
export async function recordSync(
  db: admin.firestore.Firestore,
  userId: string,
  source: SyncSource
): Promise<void> {
  try {
    await db
      .collection(CONFIG.SYNC_METADATA_COLLECTION)
      .doc(userId)
      .set(
        {
          lastSyncedAt: Date.now(),
          syncSource: source,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  } catch (error) {
    logger.error(
      'Error recording sync metadata',
      error instanceof Error ? error.message : String(error),
      { userId }
    );
  }
}

/**
 * Create a user in Firestore from Auth user
 */
export async function createFirestoreUser(
  db: admin.firestore.Firestore,
  authUser: admin.auth.UserRecord
): Promise<void> {
  try {
    const userData: FirestoreUser = {
      uid: authUser.uid,
      email: authUser.email || '',
      name: authUser.displayName || authUser.email?.split('@')[0] || 'User',
      role: 'customer',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncedWithAuth: true,
    };

    await db
      .collection(CONFIG.USERS_COLLECTION)
      .doc(authUser.uid)
      .set(userData);

    await recordSync(db, authUser.uid, SyncSource.AUTH);

    logger.info('Created Firestore user from Auth', {
      userId: authUser.uid,
      email: authUser.email,
    });
  } catch (error) {
    logger.error(
      'Error creating Firestore user',
      error instanceof Error ? error.message : String(error),
      { userId: authUser.uid, email: authUser.email }
    );
    throw error;
  }
}

/**
 * Delete a user from Firestore
 */
export async function deleteFirestoreUser(
  db: admin.firestore.Firestore,
  userId: string
): Promise<void> {
  try {
    await db.collection(CONFIG.USERS_COLLECTION).doc(userId).delete();
    await db.collection(CONFIG.SYNC_METADATA_COLLECTION).doc(userId).delete();

    logger.info('Deleted Firestore user', { userId });
  } catch (error) {
    logger.error(
      'Error deleting Firestore user',
      error instanceof Error ? error.message : String(error),
      { userId }
    );
    throw error;
  }
}

/**
 * Create a user in Firebase Auth from Firestore
 */
export async function createAuthUser(
  auth: admin.auth.Auth,
  db: admin.firestore.Firestore,
  firestoreUser: FirestoreUser
): Promise<void> {
  try {
    // Generate a temporary password
    const tempPassword = generateTemporaryPassword();

    const userRecord = await auth.createUser({
      uid: firestoreUser.uid,
      email: firestoreUser.email,
      displayName: firestoreUser.name,
      password: tempPassword,
    });

    await recordSync(db, firestoreUser.uid, SyncSource.FIRESTORE);

    logger.info('Created Auth user from Firestore', {
      userId: firestoreUser.uid,
      email: firestoreUser.email,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    // If user already exists in Auth, just record the sync
    if (errorMessage.includes('already exists')) {
      await recordSync(db, firestoreUser.uid, SyncSource.FIRESTORE);
      logger.info('Auth user already exists, recorded sync', {
        userId: firestoreUser.uid,
      });
      return;
    }

    logger.error(
      'Error creating Auth user',
      errorMessage,
      {
        userId: firestoreUser.uid,
        email: firestoreUser.email,
      }
    );
    throw error;
  }
}

/**
 * Delete a user from Firebase Auth
 */
export async function deleteAuthUser(
  auth: admin.auth.Auth,
  userId: string
): Promise<void> {
  try {
    await auth.deleteUser(userId);
    logger.info('Deleted Auth user', { userId });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    // If user doesn't exist, consider it already deleted
    if (errorMessage.includes('user-not-found')) {
      logger.info('Auth user not found, considered already deleted', {
        userId,
      });
      return;
    }

    logger.error(
      'Error deleting Auth user',
      errorMessage,
      { userId }
    );
    throw error;
  }
}

/**
 * Check if a UID should be protected from sync
 */
export function isProtectedUser(userId: string): boolean {
  return CONFIG.PROTECTED_UIDS.includes(userId);
}

/**
 * Generate a temporary password for newly created users
 * In production, consider using password reset flow
 */
function generateTemporaryPassword(): string {
  const length = 16;
  const charset =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * Update user data in Firestore (partial update)
 */
export async function updateFirestoreUser(
  db: admin.firestore.Firestore,
  userId: string,
  updates: Partial<FirestoreUser>
): Promise<void> {
  try {
    await db
      .collection(CONFIG.USERS_COLLECTION)
      .doc(userId)
      .update({
        ...updates,
        updatedAt: Date.now(),
      });

    logger.debug('Updated Firestore user', { userId, updates });
  } catch (error) {
    logger.error(
      'Error updating Firestore user',
      error instanceof Error ? error.message : String(error),
      { userId }
    );
    throw error;
  }
}

/**
 * Get user from Firestore
 */
export async function getFirestoreUser(
  db: admin.firestore.Firestore,
  userId: string
): Promise<FirestoreUser | null> {
  try {
    const doc = await db
      .collection(CONFIG.USERS_COLLECTION)
      .doc(userId)
      .get();

    return doc.exists ? (doc.data() as FirestoreUser) : null;
  } catch (error) {
    logger.error(
      'Error getting Firestore user',
      error instanceof Error ? error.message : String(error),
      { userId }
    );
    return null;
  }
}

/**
 * Disable a user in both Auth and Firestore
 */
export async function disableUser(
  auth: admin.auth.Auth,
  db: admin.firestore.Firestore,
  userId: string
): Promise<void> {
  try {
    // Disable in Firebase Auth
    await auth.updateUser(userId, { disabled: true });
    logger.info('Disabled Auth user', { userId });

    // Update status in Firestore
    await updateFirestoreUser(db, userId, {
      status: 'disabled',
    });

    logger.info('User disabled in both Auth and Firestore', { userId });
  } catch (error) {
    logger.error(
      'Error disabling user',
      error instanceof Error ? error.message : String(error),
      { userId }
    );
    throw error;
  }
}

/**
 * Enable a user in both Auth and Firestore
 */
export async function enableUser(
  auth: admin.auth.Auth,
  db: admin.firestore.Firestore,
  userId: string
): Promise<void> {
  try {
    // Enable in Firebase Auth
    await auth.updateUser(userId, { disabled: false });
    logger.info('Enabled Auth user', { userId });

    // Update status in Firestore
    await updateFirestoreUser(db, userId, {
      status: 'active',
    });

    logger.info('User enabled in both Auth and Firestore', { userId });
  } catch (error) {
    logger.error(
      'Error enabling user',
      error instanceof Error ? error.message : String(error),
      { userId }
    );
    throw error;
  }
}
