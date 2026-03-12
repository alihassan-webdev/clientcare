/**
 * Cloud Functions Configuration
 */

export const CONFIG = {
  // Firebase Collections
  USERS_COLLECTION: 'users',
  SYNC_METADATA_COLLECTION: 'syncMetadata',

  // Sync Configuration
  SYNC_DELAY_MS: parseInt(process.env.SYNC_DELAY_MS || '500', 10),
  SYNC_TIMEOUT_MS: 30000, // 30 seconds

  // Feature Flags
  ENABLE_AUTH_TRIGGERS: process.env.ENABLE_AUTH_TRIGGERS !== 'false',
  ENABLE_FIRESTORE_TRIGGERS: process.env.ENABLE_FIRESTORE_TRIGGERS !== 'false',

  // Logging
  LOG_LEVEL: (process.env.LOG_LEVEL || 'info') as
    | 'debug'
    | 'info'
    | 'warn'
    | 'error',

  // Protected UIDs - never sync these (system accounts)
  PROTECTED_UIDS: process.env.PROTECTED_UIDS
    ? process.env.PROTECTED_UIDS.split(',')
    : [],

  // Default user role when creating from Firestore
  DEFAULT_USER_ROLE: 'customer' as const,
};

/**
 * Get environment-specific configuration
 */
export function getConfig(functionName: string) {
  return {
    ...CONFIG,
    functionName,
  };
}
