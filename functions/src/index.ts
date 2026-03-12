/**
 * Firebase Cloud Functions for Real-time Synchronization
 * Syncs Firebase Authentication users with Firestore database
 *
 * Triggers:
 * 1. onCreate (Auth) - Create Firestore user when Auth user is created
 * 2. onDelete (Auth) - Delete Firestore user when Auth user is deleted
 * 3. onCreate (Firestore) - Create Auth user when Firestore user is created
 * 4. onDelete (Firestore) - Delete Auth user when Firestore user is deleted
 * 5. onUpdate (Firestore) - Sync user updates to Auth
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {
  checkRecentSync,
  createFirestoreUser,
  deleteFirestoreUser,
  createAuthUser,
  deleteAuthUser,
  isProtectedUser,
  getFirestoreUser,
  disableUser,
  enableUser,
} from './syncUtils.js';
import { logger } from './logger.js';
import { CONFIG } from './config.js';
import { SyncSource } from './types.js';

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

/**
 * TRIGGER 1: Firebase Authentication onCreate
 * When a new user is created in Firebase Authentication,
 * automatically create a corresponding document in Firestore
 *
 * Requirements: New user in Auth → Create in Firestore
 */
export const onAuthUserCreated = functions.auth.user().onCreate(
  async (user) => {
    const functionName = 'onAuthUserCreated';
    const context = {
      functionName,
      userId: user.uid,
      email: user.email,
      timestamp: Date.now(),
    };

    try {
      logger.info('Auth user created, syncing to Firestore', context);

      // Prevent infinite loop
      if (await checkRecentSync(db, user.uid, SyncSource.AUTH)) {
        logger.warn('Skipping sync due to recent operation', context);
        return { status: 'skipped', reason: 'recent_sync' };
      }

      // Protect system accounts
      if (isProtectedUser(user.uid)) {
        logger.warn('Skipping protected user', context);
        return { status: 'skipped', reason: 'protected_user' };
      }

      // Create Firestore user
      await createFirestoreUser(db, user);

      logger.info('Successfully synced Auth user to Firestore', context);
      return { status: 'success' };
    } catch (error) {
      logger.error(
        'Error in onAuthUserCreated',
        error instanceof Error ? error.message : String(error),
        context
      );
      // Don't throw - let the function complete but log the error
      return { status: 'error', error: String(error) };
    }
  }
);

/**
 * TRIGGER 2: Firebase Authentication onDelete
 * When a user is deleted from Firebase Authentication,
 * automatically delete the corresponding Firestore document
 *
 * Requirements: User deleted from Auth → Delete from Firestore
 */
export const onAuthUserDeleted = functions.auth.user().onDelete(
  async (user) => {
    const functionName = 'onAuthUserDeleted';
    const context = {
      functionName,
      userId: user.uid,
      email: user.email,
      timestamp: Date.now(),
    };

    try {
      logger.info('Auth user deleted, syncing to Firestore', context);

      // Prevent infinite loop
      if (await checkRecentSync(db, user.uid, SyncSource.AUTH)) {
        logger.warn('Skipping sync due to recent operation', context);
        return { status: 'skipped', reason: 'recent_sync' };
      }

      // Protect system accounts
      if (isProtectedUser(user.uid)) {
        logger.warn('Skipping protected user', context);
        return { status: 'skipped', reason: 'protected_user' };
      }

      // Delete Firestore user
      await deleteFirestoreUser(db, user.uid);

      logger.info('Successfully synced Auth user deletion to Firestore', context);
      return { status: 'success' };
    } catch (error) {
      logger.error(
        'Error in onAuthUserDeleted',
        error instanceof Error ? error.message : String(error),
        context
      );
      // Log but don't throw
      return { status: 'error', error: String(error) };
    }
  }
);

/**
 * TRIGGER 3: Firestore onCreate
 * When a new user document is created in Firestore,
 * automatically create a corresponding user in Firebase Authentication
 *
 * Requirements: New user in Firestore → Create in Auth
 */
export const onFirestoreUserCreated = functions.firestore
  .document(`${CONFIG.USERS_COLLECTION}/{userId}`)
  .onCreate(async (snapshot, context) => {
    const userId = context.params.userId;
    const firestoreUser = snapshot.data();

    const functionContext = {
      functionName: 'onFirestoreUserCreated',
      userId,
      email: firestoreUser.email,
      timestamp: Date.now(),
    };

    try {
      logger.info(
        'Firestore user created, syncing to Firebase Auth',
        functionContext
      );

      // Prevent infinite loop
      if (await checkRecentSync(db, userId, SyncSource.FIRESTORE)) {
        logger.warn('Skipping sync due to recent operation', functionContext);
        return { status: 'skipped', reason: 'recent_sync' };
      }

      // Protect system accounts
      if (isProtectedUser(userId)) {
        logger.warn('Skipping protected user', functionContext);
        return { status: 'skipped', reason: 'protected_user' };
      }

      // Validate required fields
      if (!firestoreUser.email) {
        logger.error(
          'Missing required email field',
          undefined,
          functionContext
        );
        return { status: 'error', reason: 'missing_email' };
      }

      // Create Auth user
      await createAuthUser(auth, db, firestoreUser);

      logger.info(
        'Successfully synced Firestore user to Firebase Auth',
        functionContext
      );
      return { status: 'success' };
    } catch (error) {
      logger.error(
        'Error in onFirestoreUserCreated',
        error instanceof Error ? error.message : String(error),
        functionContext
      );
      return { status: 'error', error: String(error) };
    }
  });

/**
 * TRIGGER 4: Firestore onDelete
 * When a user document is deleted from Firestore,
 * automatically delete the corresponding user from Firebase Authentication
 *
 * Requirements: User deleted from Firestore → Delete from Auth
 */
export const onFirestoreUserDeleted = functions.firestore
  .document(`${CONFIG.USERS_COLLECTION}/{userId}`)
  .onDelete(async (snapshot, context) => {
    const userId = context.params.userId;

    const functionContext = {
      functionName: 'onFirestoreUserDeleted',
      userId,
      timestamp: Date.now(),
    };

    try {
      logger.info(
        'Firestore user deleted, syncing to Firebase Auth',
        functionContext
      );

      // Prevent infinite loop
      if (await checkRecentSync(db, userId, SyncSource.FIRESTORE)) {
        logger.warn('Skipping sync due to recent operation', functionContext);
        return { status: 'skipped', reason: 'recent_sync' };
      }

      // Protect system accounts
      if (isProtectedUser(userId)) {
        logger.warn('Skipping protected user', functionContext);
        return { status: 'skipped', reason: 'protected_user' };
      }

      // Delete Auth user
      await deleteAuthUser(auth, userId);

      logger.info(
        'Successfully synced Firestore user deletion to Firebase Auth',
        functionContext
      );
      return { status: 'success' };
    } catch (error) {
      logger.error(
        'Error in onFirestoreUserDeleted',
        error instanceof Error ? error.message : String(error),
        functionContext
      );
      return { status: 'error', error: String(error) };
    }
  });

/**
 * TRIGGER 5: Firestore onUpdate
 * When a user document is updated in Firestore,
 * sync the changes to Firebase Authentication
 *
 * Note: Auth only supports email and displayName updates
 */
export const onFirestoreUserUpdated = functions.firestore
  .document(`${CONFIG.USERS_COLLECTION}/{userId}`)
  .onUpdate(async (change, context) => {
    const userId = context.params.userId;
    const previousData = change.before.data();
    const newData = change.after.data();

    const functionContext = {
      functionName: 'onFirestoreUserUpdated',
      userId,
      email: newData.email,
      timestamp: Date.now(),
    };

    try {
      // Check if only sync metadata changed
      const syncMetadataChanged =
        previousData.syncedWithAuth !== newData.syncedWithAuth;

      if (syncMetadataChanged && Object.keys(previousData).length === Object.keys(newData).length) {
        logger.debug('Only sync metadata changed, skipping Auth update', functionContext);
        return { status: 'skipped', reason: 'only_metadata_changed' };
      }

      logger.info('Firestore user updated, syncing to Firebase Auth', functionContext);

      // Prevent infinite loop
      if (await checkRecentSync(db, userId, SyncSource.FIRESTORE)) {
        logger.warn('Skipping sync due to recent operation', functionContext);
        return { status: 'skipped', reason: 'recent_sync' };
      }

      // Protect system accounts
      if (isProtectedUser(userId)) {
        logger.warn('Skipping protected user', functionContext);
        return { status: 'skipped', reason: 'protected_user' };
      }

      // Prepare updates for Auth (only supported fields)
      const authUpdates: admin.auth.UpdateRequest = {};
      let hasUpdates = false;

      // Email can change
      if (previousData.email !== newData.email && newData.email) {
        authUpdates.email = newData.email;
        hasUpdates = true;
      }

      // Display name can change
      if (previousData.name !== newData.name && newData.name) {
        authUpdates.displayName = newData.name;
        hasUpdates = true;
      }

      if (!hasUpdates) {
        logger.debug('No Auth-relevant changes detected', functionContext);
        return { status: 'skipped', reason: 'no_relevant_changes' };
      }

      // Update Auth user
      await auth.updateUser(userId, authUpdates);

      logger.info(
        'Successfully synced Firestore user update to Firebase Auth',
        functionContext
      );
      return { status: 'success', updates: authUpdates };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // If user doesn't exist in Auth, still consider it a success
      if (errorMessage.includes('user-not-found')) {
        logger.warn('Auth user not found, cannot sync updates', functionContext);
        return { status: 'skipped', reason: 'user_not_in_auth' };
      }

      logger.error(
        'Error in onFirestoreUserUpdated',
        errorMessage,
        functionContext
      );
      return { status: 'error', error: errorMessage };
    }
  });

/**
 * Helper function to check if user is admin
 * Checks both custom claims and Firestore role
 */
async function isUserAdmin(auth: admin.auth.Auth, db: admin.firestore.Firestore, uid: string): Promise<boolean> {
  try {
    // Check custom claims first (faster)
    const user = await auth.getUser(uid);
    if (user.customClaims?.admin === true) {
      return true;
    }

    // Fallback: check Firestore role
    const userDoc = await db.collection(CONFIG.USERS_COLLECTION).doc(uid).get();
    return userDoc.exists && userDoc.data()?.role === 'admin';
  } catch (error) {
    logger.warn('Error checking admin status', {
      userId: uid,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * OPTIONAL: Manual Sync Callable Function
 * Can be called from the admin panel to manually sync all users
 * Useful for fixing sync issues or initial setup
 * REQUIRES: Admin role
 */
export const syncAllUsers = functions.https.onCall(
  async (data, context) => {
    // Check if caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to call this function'
      );
    }

    // Check if caller is admin
    const adminStatus = await isUserAdmin(auth, db, context.auth.uid);
    if (!adminStatus) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can manually sync users'
      );
    }

    const functionContext = {
      functionName: 'syncAllUsers',
      callerId: context.auth.uid,
      timestamp: Date.now(),
    };

    try {
      logger.info('Manual sync initiated', functionContext);

      // Get all Auth users
      const authUsers = await auth.listUsers(1000);
      let syncedCount = 0;
      let errorCount = 0;

      // Sync each Auth user to Firestore
      for (const authUser of authUsers.users) {
        try {
          const firestoreUser = await getFirestoreUser(db, authUser.uid);

          if (!firestoreUser) {
            // User exists in Auth but not in Firestore, create in Firestore
            await createFirestoreUser(db, authUser);
            syncedCount++;
          }
        } catch (err) {
          logger.error(
            'Error syncing user in manual sync',
            err instanceof Error ? err.message : String(err),
            { userId: authUser.uid }
          );
          errorCount++;
        }
      }

      logger.info('Manual sync completed', {
        ...functionContext,
        syncedCount,
        errorCount,
        totalProcessed: authUsers.users.length,
      });

      return {
        status: 'success',
        syncedCount,
        errorCount,
        totalProcessed: authUsers.users.length,
      };
    } catch (error) {
      logger.error(
        'Error in syncAllUsers',
        error instanceof Error ? error.message : String(error),
        functionContext
      );
      throw new functions.https.HttpsError(
        'internal',
        'Error syncing users'
      );
    }
  }
);

/**
 * OPTIONAL: Secure Delete User Callable Function
 * Called from admin panel to securely delete a user from both Auth and Firestore
 * This ensures both systems stay synchronized
 * REQUIRES: Admin role
 */
export const deleteUserSecure = functions.https.onCall(
  async (data, context) => {
    // Check if caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to delete users'
      );
    }

    // Check if caller is admin
    const adminStatus = await isUserAdmin(auth, db, context.auth.uid);
    if (!adminStatus) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can delete users'
      );
    }

    const userId = data.userId as string;

    if (!userId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'userId is required'
      );
    }

    // Prevent self-deletion
    if (userId === context.auth.uid) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'You cannot delete your own account'
      );
    }

    const functionContext = {
      functionName: 'deleteUserSecure',
      userId,
      callerId: context.auth.uid,
      timestamp: Date.now(),
    };

    try {
      logger.info('Secure user deletion initiated', functionContext);

      // Check if user is protected
      if (isProtectedUser(userId)) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'This account is protected and cannot be deleted'
        );
      }

      // Delete from Firestore first
      await deleteFirestoreUser(db, userId);
      logger.info('Deleted user from Firestore', functionContext);

      // Then delete from Auth
      // This might already trigger the onAuthUserDeleted function, but we do it explicitly here
      try {
        await deleteAuthUser(auth, userId);
        logger.info('Deleted user from Firebase Auth', functionContext);
      } catch (authError) {
        logger.warn('Auth user already deleted or does not exist', functionContext);
      }

      logger.info('User successfully deleted from both Firestore and Auth', functionContext);
      return {
        status: 'success',
        message: 'User deleted successfully',
        userId,
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('Error in deleteUserSecure', errorMessage, functionContext);
      throw new functions.https.HttpsError(
        'internal',
        'Error deleting user'
      );
    }
  }
);

/**
 * OPTIONAL: Disable User Callable Function
 * Disables a user in both Firebase Auth and Firestore
 * Disabled users cannot log in
 * REQUIRES: Admin role
 */
export const disableUserSecure = functions.https.onCall(
  async (data, context) => {
    // Check if caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to disable users'
      );
    }

    // Check if caller is admin
    const adminStatus = await isUserAdmin(auth, db, context.auth.uid);
    if (!adminStatus) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can disable users'
      );
    }

    const userId = data.userId as string;

    if (!userId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'userId is required'
      );
    }

    // Prevent self-disabling
    if (userId === context.auth.uid) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'You cannot disable your own account'
      );
    }

    const functionContext = {
      functionName: 'disableUserSecure',
      userId,
      callerId: context.auth.uid,
      timestamp: Date.now(),
    };

    try {
      logger.info('Secure user disable initiated', functionContext);

      // Check if user is protected
      if (isProtectedUser(userId)) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'This account is protected and cannot be disabled'
        );
      }

      // Disable user in both Auth and Firestore
      await disableUser(auth, db, userId);

      logger.info('User successfully disabled', functionContext);
      return {
        status: 'success',
        message: 'User disabled successfully',
        userId,
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('Error in disableUserSecure', errorMessage, functionContext);
      throw new functions.https.HttpsError(
        'internal',
        'Error disabling user'
      );
    }
  }
);

/**
 * OPTIONAL: Enable User Callable Function
 * Enables a user in both Firebase Auth and Firestore
 * Enabled users can log in again
 * REQUIRES: Admin role
 */
export const enableUserSecure = functions.https.onCall(
  async (data, context) => {
    // Check if caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to enable users'
      );
    }

    // Check if caller is admin
    const adminStatus = await isUserAdmin(auth, db, context.auth.uid);
    if (!adminStatus) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can enable users'
      );
    }

    const userId = data.userId as string;

    if (!userId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'userId is required'
      );
    }

    const functionContext = {
      functionName: 'enableUserSecure',
      userId,
      callerId: context.auth.uid,
      timestamp: Date.now(),
    };

    try {
      logger.info('Secure user enable initiated', functionContext);

      // Check if user is protected
      if (isProtectedUser(userId)) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'This account is protected and cannot be enabled (should already be enabled)'
        );
      }

      // Enable user in both Auth and Firestore
      await enableUser(auth, db, userId);

      logger.info('User successfully enabled', functionContext);
      return {
        status: 'success',
        message: 'User enabled successfully',
        userId,
      };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('Error in enableUserSecure', errorMessage, functionContext);
      throw new functions.https.HttpsError(
        'internal',
        'Error enabling user'
      );
    }
  }
);

/**
 * OPTIONAL: Get Sync Status Callable Function
 * Returns the sync status for a specific user
 */
export const getSyncStatus = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const userId = data.userId as string;

    if (!userId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'userId is required'
      );
    }

    try {
      const authUser = await auth.getUser(userId).catch(() => null);
      const firestoreUser = await getFirestoreUser(db, userId);

      return {
        userId,
        existsInAuth: !!authUser,
        existsInFirestore: !!firestoreUser,
        syncedStatus: !!authUser && !!firestoreUser ? 'synced' : 'out_of_sync',
        authUser: authUser
          ? {
              uid: authUser.uid,
              email: authUser.email,
              displayName: authUser.displayName,
            }
          : null,
        firestoreUser: firestoreUser
          ? {
              uid: firestoreUser.uid,
              email: firestoreUser.email,
              name: firestoreUser.name,
              role: firestoreUser.role,
            }
          : null,
      };
    } catch (error) {
      logger.error(
        'Error in getSyncStatus',
        error instanceof Error ? error.message : String(error),
        { userId }
      );
      throw new functions.https.HttpsError(
        'internal',
        'Error getting sync status'
      );
    }
  }
);
