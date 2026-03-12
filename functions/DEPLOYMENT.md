# Firebase Cloud Functions Deployment Guide

This guide walks you through setting up and deploying the Firebase Cloud Functions for real-time synchronization between Firebase Authentication and Firestore.

## Prerequisites

1. **Firebase CLI** - Install from https://firebase.google.com/docs/cli
   ```bash
   npm install -g firebase-tools
   ```

2. **Node.js 18+** - Required for Cloud Functions runtime
   ```bash
   node --version  # Should be v18 or higher
   ```

3. **Firebase Project** - Must be created in Firebase Console
   - Project ID: `client-care-6e7f2`

4. **Firebase Authentication** - Must be enabled in Firebase Console
   - Go to: Firebase Console → Authentication → Sign-in method
   - Enable at least one sign-in provider

## Setup Instructions

### Step 1: Initialize Firebase Project (if not already done)

```bash
# From the root of your project
firebase init functions

# Select your project when prompted
# Choose TypeScript when asked
# Answer 'Yes' to ESLint
```

### Step 2: Copy Functions Files

If you already have the functions directory created, the files are already in place:

```
functions/
├── src/
│   ├── index.ts          # Main Cloud Functions code
│   ├── types.ts          # TypeScript type definitions
│   ├── config.ts         # Configuration
│   ├── logger.ts         # Logging utility
│   └── syncUtils.ts      # Sync helper functions
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── .env.example          # Environment variables example
```

### Step 3: Install Dependencies

```bash
cd functions
npm install
cd ..
```

### Step 4: Configure Environment Variables

Create `.env.local` in the functions directory:

```bash
cp functions/.env.example functions/.env.local
```

Edit `functions/.env.local`:

```env
# Cloud Functions Environment Variables
FIREBASE_PROJECT_ID=client-care-6e7f2
FIREBASE_DATABASE_URL=https://client-care-6e7f2.firebaseio.com
FIREBASE_STORAGE_BUCKET=client-care-6e7f2.firebasestorage.app

# Logging level: debug, info, warn, error
LOG_LEVEL=info

# Enable/Disable specific triggers
ENABLE_AUTH_TRIGGERS=true
ENABLE_FIRESTORE_TRIGGERS=true

# Sync delays (in milliseconds) to prevent race conditions
SYNC_DELAY_MS=500

# Protected UIDs (comma-separated) - these users won't be synced
# Example: PROTECTED_UIDS=system-user-1,system-user-2
PROTECTED_UIDS=
```

### Step 5: Authenticate with Firebase

```bash
firebase login
```

This will open a browser for authentication.

### Step 6: Test Locally (Optional)

You can test the functions locally using the emulator:

```bash
# From the root directory
firebase emulators:start --only functions,firestore,auth

# In another terminal, you can run tests
cd functions
npm run build
npm run serve
```

### Step 7: Deploy to Firebase

#### Option A: Deploy All Functions

```bash
firebase deploy --only functions
```

#### Option B: Deploy Specific Functions

```bash
# Deploy only Auth triggers
firebase deploy --only functions:onAuthUserCreated,functions:onAuthUserDeleted

# Deploy only Firestore triggers
firebase deploy --only functions:onFirestoreUserCreated,functions:onFirestoreUserDeleted,functions:onFirestoreUserUpdated

# Deploy callable functions
firebase deploy --only functions:syncAllUsers,functions:getSyncStatus
```

#### Option C: Deploy with Different Region

By default, functions are deployed to `us-central1`. To change:

Edit `functions/src/index.ts` and add `.region('europe-west1')` to each function:

```typescript
export const onAuthUserCreated = functions
  .region('europe-west1')
  .auth.user()
  .onCreate(async (user) => {
    // ... function code
  });
```

### Step 8: Verify Deployment

```bash
# Check deployed functions
firebase functions:list

# View recent logs
firebase functions:log

# Watch logs in real-time
firebase functions:log --lines 100
```

## Testing the Synchronization

### Test 1: Create User in Firebase Auth

Using Firebase Console:

1. Go to Firebase Console → Authentication
2. Click "Add user" or use the "Create user" button
3. Enter email and password
4. Check Firestore → users collection for the new document

**Expected Result**: User document should appear in Firestore `users` collection with:
- uid (auto-generated Firebase UID)
- email
- name (derived from email)
- role: "customer"
- createdAt timestamp
- updatedAt timestamp
- syncedWithAuth: true

### Test 2: Delete User from Firebase Auth

1. Go to Firebase Console → Authentication
2. Select a user and delete it
3. Check Firestore → users collection

**Expected Result**: Corresponding user document should be deleted from Firestore

### Test 3: Create User from Admin Panel

In your Admin Panel (Firestore):

1. Add a new user document to the `users` collection:
   ```json
   {
     "uid": "custom-user-id",
     "email": "newuser@example.com",
     "name": "New User",
     "role": "customer",
     "createdAt": 1234567890,
     "updatedAt": 1234567890
   }
   ```

2. Check Firebase Console → Authentication

**Expected Result**: User should appear in Firebase Authentication

### Test 4: Update User Name/Email

1. Update user document in Firestore
2. Check Firebase Console → Authentication

**Expected Result**: Changes should sync to Firebase Auth

### Test 5: Call Manual Sync

From your application code:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const syncAllUsers = httpsCallable(functions, 'syncAllUsers');

try {
  const result = await syncAllUsers();
  console.log('Sync result:', result.data);
} catch (error) {
  console.error('Sync error:', error);
}
```

**Expected Result**: All users should be synchronized between Auth and Firestore

## Monitoring and Troubleshooting

### View Logs

```bash
# View last 50 lines of logs
firebase functions:log

# View logs for specific function
firebase functions:log --region=us-central1

# View logs in real-time
firebase functions:log --lines 100 --follow
```

### Common Issues

#### Issue: "Infinite Loop" - Functions Keep Triggering

**Solution**: The code includes safeguards. Check:

1. Verify `SYNC_DELAY_MS` is set appropriately (default: 500ms)
2. Check logs for "Recent sync detected" messages
3. Verify `syncMetadata` collection is being created

#### Issue: "User Already Exists"

**Solution**: This is expected when a user exists in both Auth and Firestore. The function will:
- Log a warning
- Record the sync metadata
- Continue without creating duplicates

#### Issue: "Permission Denied"

**Solution**: 
1. Check Firestore Rules - they may be blocking writes
2. Make sure Cloud Functions service account has proper permissions
3. In Firebase Console, go to Settings → Service Accounts → Firebase Admin SDK
4. Ensure the default service account has these roles:
   - Editor
   - Firebase Authentication Admin
   - Firestore Editor

#### Issue: Functions Not Triggering

**Solution**:
1. Verify functions were deployed: `firebase functions:list`
2. Check if triggers are enabled in `config.ts`
3. Review function logs for errors: `firebase functions:log`
4. Ensure Firestore rules allow Cloud Functions to access collections

### Performance Tuning

**Adjust sync delay** in `functions/.env.local`:

```env
# Faster sync (more aggressive, uses more resources)
SYNC_DELAY_MS=100

# Default sync
SYNC_DELAY_MS=500

# Slower sync (more conservative, cheaper)
SYNC_DELAY_MS=2000
```

**Disable unused triggers** in `functions/.env.local`:

```env
# Only enable what you need
ENABLE_AUTH_TRIGGERS=true
ENABLE_FIRESTORE_TRIGGERS=true
```

## Cost Considerations

Cloud Functions pricing is based on:
- **Invocation count**: Each trigger = 1 invocation
- **Compute time**: Duration of function execution
- **Outbound network**: Data transferred out

**To minimize costs**:
1. Increase `SYNC_DELAY_MS` (trades latency for cost)
2. Disable unused triggers
3. Optimize function code
4. Monitor and limit user creation/deletion rates

## Updating Cloud Functions

To update deployed functions:

```bash
# Make changes to functions/src/
# Rebuild TypeScript
cd functions && npm run build && cd ..

# Deploy updated functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:onAuthUserCreated
```

## Rollback

To rollback to a previous version:

```bash
# Firebase keeps the 5 most recent deployments
# Redeploy the previous version by reverting code changes and deploying again

# OR, you can disable functions by commenting them out in index.ts
# and redeploying
```

## Production Checklist

Before going live:

- [ ] Test all 5 triggers in local emulator
- [ ] Verify infinite loop protection is working
- [ ] Test with multiple concurrent users
- [ ] Monitor function logs for errors
- [ ] Verify Firestore rules are secure
- [ ] Test with production data
- [ ] Document any custom configurations
- [ ] Set up monitoring/alerting for failed invocations
- [ ] Train team on manual sync procedure
- [ ] Create backup of Firestore data

## Getting Help

- **Firebase Documentation**: https://firebase.google.com/docs/functions
- **Cloud Functions Pricing**: https://firebase.google.com/pricing
- **Troubleshooting Guide**: https://firebase.google.com/docs/functions/troubleshooting
