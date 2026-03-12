# Firebase Real-time User Synchronization System - Setup Guide

This is an online ticket portal admin panel with a **Firebase-based real-time user synchronization system**. 

## System Architecture

```
Firebase Authentication        Firestore Database
    ↑        ↓                    ↑        ↓
    └── Cloud Functions ────────┘
           (Auto-sync)
           
           ↓
        
    Admin Panel UI (React)
    ↓
Real-time Listeners (onSnapshot)
```

The system maintains perfect synchronization between user data stored in Firebase Authentication and Firestore. Changes in either system automatically update the other.

## Quick Start (Local Development)

### 1. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install Cloud Functions dependencies
cd functions && npm install && cd ..
```

### 2. Configure Firebase

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)

2. Copy your Firebase config from Project Settings and create `.env.local`:
```bash
cp .env.example .env.local
```

3. Edit `.env.local` with your Firebase credentials:
```env
VITE_FIREBASE_API_KEY=<your-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<your-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<your-storage-bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
VITE_FIREBASE_APP_ID=<your-app-id>
```

### 3. Configure Cloud Functions (Optional for local development)

For production deployment, configure `functions/.env`:
```bash
cp functions/.env.example functions/.env
```

Edit with your preferences (most defaults are fine).

### 4. Set Up Firebase Locally (Optional)

For testing without deploying to Firebase:

```bash
# Install Firebase Emulator Suite
npm install -g firebase-tools

# Start emulator
firebase emulators:start
```

Then in `.env.local`, set:
```env
VITE_USE_FIREBASE_EMULATOR=true
```

### 5. Start Development Server

```bash
npm run dev
```

Visit http://localhost:5173 and log in with a Firebase user.

## System Features

### Real-time User Synchronization

✅ **Bidirectional Sync**
- Create user in Firebase Console → Auto-creates in Firestore
- Create user in Firestore → Auto-creates in Firebase Auth
- Update user in Firestore → Updates Firebase Auth profile
- Delete user → Removes from both systems

✅ **Real-time Admin Panel**
- Uses Firestore real-time listeners (onSnapshot)
- Users appear instantly when created
- Users disappear instantly when deleted
- UI always shows latest state

✅ **Automatic Loop Prevention**
- Metadata tracking prevents infinite sync loops
- Each sync operation records its source
- Prevents duplicate syncs within 5 second window

### Admin Panel Capabilities

- **View all users** with filtering and search
- **Add new users** (creates in Auth + Firestore automatically)
- **Edit user details** (name, email, phone, company, role)
- **Delete users** (secure Cloud Function removes from both systems)
- **Real-time updates** (instantly see changes made elsewhere)
- **Protected accounts** (system accounts cannot be modified)

## How It Works

### User Creation Flow

#### From Admin Panel:
1. Admin enters user details and clicks "Add User"
2. Client creates user in Firebase Authentication
3. Client creates user document in Firestore
4. Real-time listener automatically updates admin panel
5. Done!

#### From Firebase Console:
1. Admin/Developer creates user in Firebase Console
2. Cloud Function `onAuthUserCreated` triggers automatically
3. Function creates matching document in Firestore
4. Real-time listener in admin panel shows new user
5. Done!

### User Deletion Flow

#### From Admin Panel:
1. Admin clicks delete user
2. Client calls Cloud Function `deleteUserSecure`
3. Function removes from Firestore
4. Function removes from Firebase Auth
5. Real-time listener removes user from admin panel
6. Done!

#### From Firebase Console:
1. Admin/Developer deletes user from Firebase Console
2. Cloud Function `onAuthUserDeleted` triggers automatically
3. Function removes corresponding Firestore document
4. Real-time listener in admin panel shows deletion
5. Done!

## Project Structure

```
project-root/
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx          # Auth state + real-time Firestore listeners
│   ├── pages/
│   │   ├── AdminSettings.tsx        # Admin user management UI
│   │   └── Login.tsx                # Login page
│   ├── firebase.ts                  # Firebase client configuration
│   └── types/
│       └── index.ts                 # TypeScript types (User, UserRole, etc)
├── functions/
│   ├── src/
│   │   ├── index.ts                 # Cloud Functions (triggers + callable functions)
│   │   ├── syncUtils.ts             # Sync helper functions
│   │   ├── config.ts                # Functions configuration
│   │   ├── logger.ts                # Logging utility
│   │   └── types.ts                 # TypeScript types
│   └── package.json
├── firestore.rules                  # Firestore security rules
├── firebase.json                    # Firebase configuration
├── .env.example                     # Frontend environment template
├── functions/.env.example           # Cloud Functions environment template
├── SETUP.md                         # This file
├── DEPLOYMENT_GUIDE.md              # Deployment instructions
└── README.md                        # Project overview
```

## Configuration Files

### Frontend Configuration (`.env.local`)

Create this file locally with your Firebase credentials:

```env
# Firebase Config (get from Firebase Project Settings)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=project-id
VITE_FIREBASE_STORAGE_BUCKET=project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=12345
VITE_FIREBASE_APP_ID=1:12345:web:abc...

# Optional: Use Firebase Emulator locally
VITE_USE_FIREBASE_EMULATOR=false
```

### Cloud Functions Configuration (`functions/.env`)

For Cloud Functions deployment:

```env
# Sync timing (milliseconds)
SYNC_DELAY_MS=500

# Enable bidirectional sync
ENABLE_AUTH_TRIGGERS=true
ENABLE_FIRESTORE_TRIGGERS=true

# Logging level
LOG_LEVEL=info

# Protect system accounts (comma-separated UIDs)
PROTECTED_UIDS=

# Collection names (usually don't change)
USERS_COLLECTION=users
SYNC_METADATA_COLLECTION=syncMetadata
```

## Testing the System

### Test 1: Create User via Admin Panel

1. Log in to admin panel
2. Click "Add User"
3. Fill in details and click "Add User"
4. User should appear in list instantly
5. Go to Firebase Console → Firestore → users collection
6. Verify document was created with same UID

### Test 2: Create User via Firebase Console

1. Go to Firebase Console → Authentication
2. Click "Add User" and create a test user
3. Go back to admin panel
4. Within 2-3 seconds, user should appear in the list
5. Go to Firebase Console → Firestore → users collection
6. Verify document was created automatically

### Test 3: Delete User

1. In admin panel, hover over a user and click delete button
2. Confirm deletion
3. User disappears immediately from the list
4. Go to Firebase Console → Firestore
5. Verify the user document no longer exists
6. Go to Firebase Console → Authentication
7. Verify the user is no longer in the users list

### Test 4: Edit User

1. Click edit icon on a user
2. Change name or email
3. Click "Save Changes"
4. Changes appear immediately in the list
5. Go to Firebase Console → Firestore → users collection
6. Verify the document was updated

### Test 5: Real-time Updates

1. Open admin panel in one window
2. Open Firebase Console (Firestore) in another window
3. In Firestore, delete or add a user document
4. Verify it instantly updates in the admin panel (2-3 second delay)

## Common Tasks

### Add a Protected System Account

Protected accounts cannot be deleted or modified:

1. Create a user in Firebase Console
2. Note the user's UID
3. Add to `functions/.env`:
   ```env
   PROTECTED_UIDS=uid-1,uid-2,system-uid
   ```
4. Redeploy: `firebase deploy --only functions`

### View Cloud Function Logs

```bash
firebase functions:log
```

### Check User Synchronization Status

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const getSyncStatus = httpsCallable(functions, 'getSyncStatus');

const result = await getSyncStatus({ userId: 'user-uid' });
console.log(result.data);
// { userId, existsInAuth, existsInFirestore, syncedStatus, ... }
```

### Manually Sync All Users

Useful if you manually created users in Firebase Console:

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const syncAllUsers = httpsCallable(functions, 'syncAllUsers');

const result = await syncAllUsers();
console.log(result.data);
// { status: 'success', syncedCount, errorCount, totalProcessed }
```

## Troubleshooting

### Real-time Listener Not Updating

**Problem**: User list doesn't update when changes happen elsewhere

**Solutions**:
1. Check browser console for errors
2. Verify Firestore rules allow read access
3. Check internet connection
4. Click "Refresh" button to manually reconnect listener
5. Check if user is in correct Firestore collection

### Cloud Function Not Triggering

**Problem**: User created in one system doesn't appear in other

**Solutions**:
1. Check Cloud Functions logs: `firebase functions:log`
2. Verify triggers are enabled: `ENABLE_AUTH_TRIGGERS=true`
3. Check Firestore rules don't block function access
4. Redeploy functions: `firebase deploy --only functions`

### Permission Denied Errors

**Problem**: Getting permission denied when accessing users

**Solutions**:
1. Verify user has admin role in Firestore
2. Check Firestore security rules (firestore.rules)
3. Ensure authentication token is valid
4. Check user exists in Firestore users collection

### User Not Showing After Creation

**Problem**: User created but doesn't appear in admin panel

**Solutions**:
1. Wait 2-3 seconds (real-time listener propagation)
2. Click "Refresh" button to manually sync
3. Check browser console for errors
4. Verify user document exists in Firestore
5. Check user's role is "admin" or "customer"

## Security Considerations

✅ **What's Secure:**
- Firebase API key is public (designed for client SDK)
- Actual security comes from Firestore rules and Auth
- Passwords stored only in Firebase Auth, never in Firestore
- Cloud Functions use service account (server-side)
- Role-based access control via Firestore

⚠️ **Important:**
- Never commit real Firebase credentials to git
- Use `.env.local` for local development
- Always enable Firestore security rules before production
- Review firestore.rules before deploying
- Implement email verification for new accounts
- Set up audit logging in production

## Next Steps

1. **Deploy to Production**: See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
2. **Enable Email Verification**: Firebase Console → Authentication → Templates
3. **Set Up Password Reset**: Configure email template in Firebase
4. **Add Custom Claims**: For advanced role-based access control
5. **Configure Backups**: Enable automated Firestore backups
6. **Monitor Performance**: Set up alerts in Firebase Console

## Support & Documentation

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Cloud Functions Documentation](https://firebase.google.com/docs/functions)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
