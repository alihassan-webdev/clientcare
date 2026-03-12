# Firebase Real-time User Synchronization System - Deployment Guide

This guide walks you through deploying the Firebase-based user synchronization system for your ticket portal admin panel.

## Overview

The system automatically synchronizes user data between:
- **Firebase Authentication** - Manages user credentials and authentication
- **Firestore** - Stores user profiles and metadata
- **Cloud Functions** - Keeps both systems in sync bidirectionally
- **Admin Panel** - React UI with real-time updates using Firestore listeners

## Prerequisites

- Firebase CLI installed (`npm install -g firebase-tools`)
- A Firebase project created at [console.firebase.google.com](https://console.firebase.google.com)
- Node.js 18+ installed
- Access to your Firebase project with appropriate permissions

## Step 1: Set Up Firebase Project

1. Create or select your Firebase project in the [Firebase Console](https://console.firebase.google.com)
2. Enable the following services:
   - **Authentication**: Email/Password provider
   - **Firestore Database**: Create a database in your preferred region
   - **Cloud Functions**: Deploy functions using Node.js 18 runtime

## Step 2: Configure Local Environment

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Authenticate with Firebase:
   ```bash
   firebase login
   ```

3. In your project root, initialize Firebase (if not already done):
   ```bash
   firebase init
   ```

4. Select your Firebase project when prompted

5. Create a `.env.local` file in your project root with your Firebase config (found in Project Settings):
   ```env
   VITE_FIREBASE_API_KEY=AIzaSyALqbMTOHLkMSJDtIzAx3PCNR2v5TkU1zs
   VITE_FIREBASE_AUTH_DOMAIN=client-care-6e7f2.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=client-care-6e7f2
   VITE_FIREBASE_STORAGE_BUCKET=client-care-6e7f2.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=830917027489
   VITE_FIREBASE_APP_ID=1:830917027489:web:bd0d1a387b13242694f2e0
   ```

6. Configure Cloud Functions environment variables in `functions/.env`:
   ```env
   SYNC_DELAY_MS=500
   ENABLE_AUTH_TRIGGERS=true
   ENABLE_FIRESTORE_TRIGGERS=true
   LOG_LEVEL=info
   PROTECTED_UIDS=
   ```

## Step 3: Deploy Firestore Security Rules

Security rules protect your data and ensure only authorized users can modify user records.

1. Review the `firestore.rules` file in your project root

2. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

**What the rules do:**
- **Admins** can read, create, update, and delete user records
- **Customers** can only read and update their own profile (limited fields)
- **Cloud Functions** can access via service account authentication
- All other access is denied by default

## Step 4: Deploy Cloud Functions

Cloud Functions keep Firebase Authentication and Firestore synchronized automatically.

1. Navigate to functions directory:
   ```bash
   cd functions
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Deploy functions:
   ```bash
   cd ..
   firebase deploy --only functions
   ```

**What the functions do:**

### Authentication ↔ Firestore Synchronization

- **onAuthUserCreated**: When a user is created in Firebase Console → Creates document in Firestore
- **onAuthUserDeleted**: When a user is deleted from Firebase Console → Removes document from Firestore
- **onFirestoreUserCreated**: When a user document is created in Firestore → Creates Auth user with temporary password
- **onFirestoreUserDeleted**: When a user document is deleted in Firestore → Deletes Auth user
- **onFirestoreUserUpdated**: When user fields change in Firestore → Syncs email/name to Firebase Auth

### Callable Functions (for Admin Panel)

- **deleteUserSecure**: Securely delete user from both Auth and Firestore
- **syncAllUsers**: Manually sync all Auth users to Firestore (useful for initial setup)
- **getSyncStatus**: Check synchronization status of a specific user

## Step 5: Deploy Frontend Application

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

3. Your app will be available at: `https://your-project.web.app`

## Step 6: Create Initial Admin User

You have two options:

### Option A: Via Firebase Console (Recommended for first user)

1. Go to Firebase Console → Authentication → Users
2. Click "Add User"
3. Enter email and password
4. Cloud Function `onAuthUserCreated` automatically creates the Firestore document
5. Go to Firestore → users collection, find the user, and manually set `role: "admin"`

### Option B: Via Admin Panel

1. Deploy the app and log in with any created user
2. Create additional users through the Admin Panel
3. Assign admin role to the first user

## Step 7: Verify Synchronization

1. **Test Auth → Firestore Sync**:
   - Create a user in Firebase Console
   - Go to Firestore and verify a `users/{uid}` document was created
   - Check Cloud Functions logs for success message

2. **Test Firestore → Auth Sync**:
   - Create a user document in Firestore (users collection)
   - Check Firebase Authentication to verify user was created
   - Check Cloud Functions logs

3. **Test Admin Panel Real-time Updates**:
   - Log in to the admin panel
   - Open Firebase Console in another window
   - Delete a user from Firestore
   - Verify it's removed from the admin panel instantly (real-time listener)

## Monitoring and Debugging

### View Cloud Function Logs

```bash
firebase functions:log
```

Or view in Firebase Console → Cloud Functions → Logs

### Check for Sync Issues

Use the `getSyncStatus` callable function to check if a user exists in both systems:

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const getSyncStatus = httpsCallable(functions, 'getSyncStatus');

const result = await getSyncStatus({ userId: 'user-uid-here' });
console.log(result.data);
// Output: { 
//   userId, 
//   existsInAuth, 
//   existsInFirestore, 
//   syncedStatus, 
//   authUser, 
//   firestoreUser 
// }
```

### Manual Sync

If you need to manually sync all users from Auth to Firestore:

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const syncAllUsers = httpsCallable(functions, 'syncAllUsers');

const result = await syncAllUsers();
console.log(result.data);
// Output: { status: 'success', syncedCount, errorCount, totalProcessed }
```

## Protected System Accounts

To protect certain admin accounts from accidental deletion, add their UIDs to the `PROTECTED_UIDS` environment variable:

```env
PROTECTED_UIDS=admin-uid-1,admin-uid-2,system-uid
```

These accounts cannot be deleted or have their roles modified by any user or function.

## Important Security Notes

1. **API Keys are Public**: The Firebase API key in `src/firebase.ts` is public by design (it's for the client SDK). The actual security comes from:
   - Firestore security rules
   - Authentication state
   - Cloud Functions validation

2. **Service Account**: Cloud Functions use a service account (deployed automatically by Firebase) to bypass Firestore rules for internal sync operations.

3. **No Passwords in Firestore**: User passwords are managed by Firebase Auth only. Firestore documents never contain passwords.

4. **Token-based Access**: All client operations require a valid Firebase ID token obtained via authentication.

## Troubleshooting

### "onAuthUserCreated not triggered"
- Ensure `ENABLE_AUTH_TRIGGERS=true` in functions/.env
- Redeploy: `firebase deploy --only functions`

### "Firestore real-time listener not working"
- Check browser console for errors
- Verify Firestore rules allow read access
- Check network connectivity

### "Cloud Function timeout"
- Increase timeout: Modify functions config
- Check Firestore operations are completing
- Review function logs for bottlenecks

### "Permission denied" errors
- Check your Firestore rules (firestore.rules)
- Verify user role is set correctly in Firestore
- Ensure authentication token is valid

### "User created but not showing in admin panel"
- Wait 2-3 seconds (real-time listener propagation)
- Click "Refresh" button in admin panel
- Check browser console for errors
- Verify user document exists in Firestore

## Performance Optimization

1. **Real-time Listener Limits**: Each open connection counts as one listener. Limit concurrent admins in the admin panel.

2. **Firestore Billing**: Real-time listeners consume read operations on connection and document change. Monitor your usage in Firebase Console.

3. **Cloud Function Performance**: Functions run in the background. For large syncs, consider:
   - Using the `syncAllUsers` callable function during off-peak hours
   - Increasing function memory allocation in firebase.json

## Next Steps

1. Set up custom claims for role-based access control
2. Implement email verification for new users
3. Add password reset functionality
4. Set up automated backups
5. Configure monitoring and alerts in Cloud Monitoring

## Support

For issues:
1. Check Cloud Functions logs: `firebase functions:log`
2. Review Firestore security rules in Firebase Console
3. Check browser console for client-side errors
4. Review the project README.md for architecture details
