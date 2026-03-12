# Firebase Auth & Firestore Synchronization Cloud Functions

A production-ready implementation of real-time synchronization between Firebase Authentication and Firestore using Cloud Functions with TypeScript.

## Overview

This solution ensures that your Firebase Authentication users and Firestore user database always stay in sync. Any user created, updated, or deleted in either system is automatically reflected in the other.

### Key Features

✅ **Bi-directional Synchronization**
- Auth → Firestore: When user is created/deleted in Auth
- Firestore → Auth: When user document is created/deleted in Firestore

✅ **Infinite Loop Protection**
- Metadata tracking prevents infinite sync loops
- Configurable sync delay to prevent race conditions

✅ **Comprehensive Error Handling**
- Graceful error recovery
- Detailed logging for debugging
- Non-blocking error handling (functions complete even on errors)

✅ **Production Ready**
- TypeScript for type safety
- Structured logging
- Protected user accounts (system users)
- Fully commented code

✅ **Optional Manual Operations**
- Manual sync callable function
- Sync status checker for debugging

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 Firebase System                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐        ┌──────────────────────┐   │
│  │  Firebase Auth       │        │  Firestore Database  │   │
│  │  (Authentication)    │◄──────►│  (users collection)  │   │
│  │                      │        │                      │   │
│  │  - onCreate          │        │  - onCreate          │   │
│  │  - onDelete          │        │  - onDelete          │   │
│  │  - updateUser        │        │  - onUpdate          │   │
│  └──────────────────────┘        └──────────────────────┘   │
│           ▲                               ▲                  │
│           │                               │                  │
│      Trigger 1 & 2                   Trigger 3, 4 & 5       │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│          Cloud Functions (TypeScript)                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  syncUtils.ts - Core synchronization logic          │   │
│  │  ├─ checkRecentSync()     - Prevent loops           │   │
│  │  ├─ recordSync()          - Track metadata          │   │
│  │  ├─ createFirestoreUser() - Auth → Firestore       │   │
│  │  ├─ deleteFirestoreUser() - Auth → Firestore       │   │
│  │  ├─ createAuthUser()      - Firestore → Auth      │   │
│  │  ├─ deleteAuthUser()      - Firestore → Auth      │   │
│  │  └─ updateFirestoreUser() - Update operations     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  logger.ts - Structured logging                      │   │
│  │  config.ts - Configuration management               │   │
│  │  types.ts  - TypeScript type definitions            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Synchronization Flow

#### Flow 1: Create User in Firebase Auth

```
User created in Firebase Auth
           ↓
onAuthUserCreated() trigger fires
           ↓
✓ Check recent sync (prevent loop)
✓ Check protected users
           ↓
Create user document in Firestore
           ↓
Record sync metadata
           ↓
✓ Sync complete
```

#### Flow 2: Create User from Admin Panel (Firestore)

```
Admin creates user in Firestore
           ↓
onFirestoreUserCreated() trigger fires
           ↓
✓ Check recent sync (prevent loop)
✓ Check protected users
✓ Validate required fields
           ↓
Create user in Firebase Auth
           ↓
Record sync metadata
           ↓
✓ Sync complete
```

#### Infinite Loop Prevention

```
User created in Auth
           ↓
onAuthUserCreated() → Creates in Firestore
           ↓
onFirestoreUserCreated() is triggered
           ↓
checkRecentSync() detects Auth → Firestore sync
           ↓
✓ Skip to prevent loop
           ↓
No duplicate Auth user created
```

## File Structure

```
functions/
├── src/
│   ├── index.ts              # Main Cloud Functions (482 lines)
│   │   ├── onAuthUserCreated()
│   │   ├── onAuthUserDeleted()
│   │   ├── onFirestoreUserCreated()
│   │   ├── onFirestoreUserDeleted()
│   │   ├── onFirestoreUserUpdated()
│   │   ├── syncAllUsers()
│   │   └── getSyncStatus()
│   │
│   ├── syncUtils.ts          # Sync utilities (298 lines)
│   │   ├── checkRecentSync()
│   │   ├── recordSync()
│   │   ├── createFirestoreUser()
│   │   ├── deleteFirestoreUser()
│   │   ├── createAuthUser()
│   │   ├── deleteAuthUser()
│   │   ├── updateFirestoreUser()
│   │   ├── getFirestoreUser()
│   │   └── isProtectedUser()
│   │
│   ├── types.ts              # Type definitions
│   │   ├── FirestoreUser
│   │   ├── SyncMetadata
│   │   ├── SyncSource enum
│   │   ├── LogLevel enum
│   │   └── LogContext
│   │
│   ├── config.ts             # Configuration
│   │   ├── CONFIG object
│   │   ├── USERS_COLLECTION
│   │   ├── SYNC_METADATA_COLLECTION
│   │   ├── SYNC_DELAY_MS
│   │   └── Environment variables
│   │
│   └── logger.ts             # Logging utility (68 lines)
│       ├── Logger class
│       ├── debug()
│       ├── info()
│       ├── warn()
│       └── error()
│
├── package.json              # Dependencies (firebase-admin, firebase-functions)
├── tsconfig.json             # TypeScript configuration
├── .env.example              # Environment variables template
├── README.md                 # This file
└── DEPLOYMENT.md             # Deployment guide
```

## Firestore Schema

### users Collection

```json
{
  "uid": "firebase-auto-generated-uid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "customer|admin",
  "createdAt": 1704067200000,
  "updatedAt": 1704067200000,
  "syncedWithAuth": true
}
```

### syncMetadata Collection

Internal collection for tracking sync operations (auto-managed):

```json
{
  "lastSyncedAt": 1704067200000,
  "syncSource": "auth|firestore",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Configuration

### Environment Variables (functions/.env.local)

```env
# Logging level: debug, info, warn, error
LOG_LEVEL=info

# Enable/Disable specific triggers
ENABLE_AUTH_TRIGGERS=true
ENABLE_FIRESTORE_TRIGGERS=true

# Sync delay in milliseconds (default: 500ms)
SYNC_DELAY_MS=500

# Protected UIDs (comma-separated)
# These users won't be synced
PROTECTED_UIDS=system-admin,service-account
```

### Configurable Behavior

Edit `functions/src/config.ts`:

```typescript
export const CONFIG = {
  // Collection names
  USERS_COLLECTION: 'users',
  SYNC_METADATA_COLLECTION: 'syncMetadata',

  // Sync configuration
  SYNC_DELAY_MS: 500,           // Time window for loop detection
  SYNC_TIMEOUT_MS: 30000,       // Function timeout

  // Feature flags
  ENABLE_AUTH_TRIGGERS: true,
  ENABLE_FIRESTORE_TRIGGERS: true,

  // Default settings
  DEFAULT_USER_ROLE: 'customer',
};
```

## Triggers Explained

### Trigger 1: onAuthUserCreated
**When**: User is created in Firebase Authentication  
**What**: Creates a corresponding document in Firestore `users` collection  
**Files**: `index.ts:76-114`, `syncUtils.ts:createFirestoreUser()`  

### Trigger 2: onAuthUserDeleted
**When**: User is deleted from Firebase Authentication  
**What**: Deletes the corresponding document from Firestore  
**Files**: `index.ts:127-165`, `syncUtils.ts:deleteFirestoreUser()`  

### Trigger 3: onFirestoreUserCreated
**When**: New user document is created in Firestore  
**What**: Creates the user in Firebase Authentication  
**Files**: `index.ts:178-217`, `syncUtils.ts:createAuthUser()`  

### Trigger 4: onFirestoreUserDeleted
**When**: User document is deleted from Firestore  
**What**: Deletes the user from Firebase Authentication  
**Files**: `index.ts:230-268`, `syncUtils.ts:deleteAuthUser()`  

### Trigger 5: onFirestoreUserUpdated
**When**: User document is updated in Firestore  
**What**: Syncs name and email changes to Firebase Auth  
**Files**: `index.ts:281-336`, `syncUtils.ts:updateFirestoreUser()`  

## Callable Functions

### syncAllUsers()

Manually trigger a complete sync of all users from Auth to Firestore.

**Usage**:
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const result = await httpsCallable(getFunctions(), 'syncAllUsers')();
console.log(result.data);
// Returns: { status: 'success', syncedCount: 10, errorCount: 0, totalProcessed: 10 }
```

**When to use**:
- Initial setup
- Fixing sync issues
- Recovering from failed deployments

### getSyncStatus()

Check the sync status of a specific user.

**Usage**:
```typescript
const result = await httpsCallable(getFunctions(), 'getSyncStatus')({
  userId: 'user-uid'
});
console.log(result.data);
// Returns: { syncedStatus: 'synced'|'out_of_sync', existsInAuth: boolean, existsInFirestore: boolean, ... }
```

**When to use**:
- Debugging sync issues
- Verifying user creation
- Admin panel diagnostics

## Error Handling

All functions include comprehensive error handling:

1. **Try-Catch Blocks**: Wrapped around all async operations
2. **Logged Errors**: All errors are logged with context
3. **Non-Blocking**: Errors are logged but don't stop function execution
4. **User Feedback**: Functions return status objects with error information

**Error Logging Example**:
```
[2024-01-01T00:00:00.000Z] [ERROR] Error creating Firestore user | 
{
  "functionName": "onAuthUserCreated",
  "userId": "abc123",
  "email": "user@example.com",
  "timestamp": 1704067200000
}
Firebase error: FAILED_PRECONDITION
```

## Logging

The logger provides structured logging with context:

```typescript
logger.info('Auth user created, syncing to Firestore', {
  functionName: 'onAuthUserCreated',
  userId: 'abc123',
  email: 'user@example.com',
  timestamp: Date.now(),
});

// Output:
// [2024-01-01T00:00:00.000Z] [INFO] Auth user created, syncing to Firestore | 
// {"functionName":"onAuthUserCreated","userId":"abc123","email":"user@example.com",...}
```

### Log Levels

- **debug**: Detailed diagnostic information (default: not shown)
- **info**: General informational messages (✓ default)
- **warn**: Warning messages (sync skipped, etc.)
- **error**: Error messages with stack traces

## Security Considerations

### 1. Firestore Rules

Ensure your Firestore rules allow Cloud Functions to sync:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow Cloud Functions to manage users
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid || request.auth.token.admin == true;
      // Allow service account (Cloud Functions) to write
      allow write: if request.auth.uid == null;
    }
    
    // Sync metadata (internal use only)
    match /syncMetadata/{uid} {
      allow read, write: if request.auth.uid == null;
    }
  }
}
```

### 2. Protected Users

Prevent sync of system accounts:

```env
# In functions/.env.local
PROTECTED_UIDS=firebase-admin-uid,service-account-uid
```

### 3. Authentication

The `syncAllUsers` callable function requires authentication. Add role-based access:

```typescript
// Check if caller is admin
const adminClaims = context.auth?.token.admin;
if (!adminClaims) {
  throw new functions.https.HttpsError('permission-denied', 'Admin only');
}
```

## Performance Tips

1. **Adjust Sync Delay**: Lower for faster sync, higher for more reliability
2. **Disable Unused Triggers**: Comment out unused functions to reduce invocations
3. **Batch Operations**: Use manual sync for bulk user imports
4. **Monitor Logs**: Watch for performance bottlenecks

## Troubleshooting

### Functions Not Triggering

1. Verify deployment: `firebase functions:list`
2. Check logs: `firebase functions:log`
3. Verify Firestore rules allow writes
4. Ensure Blaze plan is active (required for Cloud Functions)

### Infinite Loop Detection

If you see logs with "Recent sync detected, skipping":
1. This is normal and prevents loops
2. Check `SYNC_DELAY_MS` if you want to adjust
3. Verify `syncMetadata` collection is being created

### Users Not Syncing

1. Check if triggers are enabled in config.ts
2. Verify user is not in `PROTECTED_UIDS`
3. Check Firestore permissions
4. Use `getSyncStatus` to diagnose

## License

This implementation is provided as part of the Client Care application.

## Support

For issues or questions:
1. Check `firebase functions:log` for errors
2. Review this README and DEPLOYMENT.md
3. Consult Firebase documentation: https://firebase.google.com/docs/functions
