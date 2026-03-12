# Firebase User Management System - Complete Setup Guide

This guide covers the implementation of a secure Firebase user management system with authentication sync, admin disable/enable functionality, and real-time Firestore updates.

## System Overview

The implementation includes:

### 1. **Authentication Sync (Cloud Functions)**
- ✅ `onAuthUserCreated`: Auto-creates Firestore doc when user created in Firebase Auth
- ✅ `onAuthUserDeleted`: Auto-deletes Firestore doc when user deleted from Auth
- ✅ `onFirestoreUserCreated`: Auto-creates Auth user when Firestore doc created
- ✅ `onFirestoreUserDeleted`: Auto-deletes Auth user when Firestore doc deleted
- ✅ `onFirestoreUserUpdated`: Syncs email/name changes from Firestore to Auth

### 2. **Admin User Management (Callable Functions)**
- ✅ `deleteUserSecure`: Admin-only function to delete users (requires ADMIN role)
- ✅ `disableUserSecure`: Admin-only function to disable users (requires ADMIN role)
- ✅ `enableUserSecure`: Admin-only function to enable users (requires ADMIN role)
- ✅ `syncAllUsers`: Admin-only manual sync function (requires ADMIN role)
- ✅ `getSyncStatus`: Check sync status between Auth and Firestore

### 3. **Admin Panel Features**
- ✅ Real-time user list (Firestore onSnapshot listener)
- ✅ Add new users (creates Auth user + Firestore doc)
- ✅ Edit user details (name, email, phone, company, role)
- ✅ **Disable User** (prevents login, keeps account intact)
- ✅ **Enable User** (re-enable disabled users)
- ✅ User status indicator (Active/Disabled)
- ✅ Protected accounts (cannot be modified)

### 4. **Security**
- ✅ Firestore security rules restrict all operations to admins/users/Cloud Functions
- ✅ Cloud Functions verify admin role before allowing user management
- ✅ Login checks for disabled users (auth/user-disabled error)
- ✅ Self-protection (cannot delete/disable own account)
- ✅ Protected user accounts (system accounts)

---

## Deployment Steps

### Step 1: Deploy Firestore Security Rules

1. Open [Firebase Console](https://console.firebase.google.com)
2. Select your project: **client-care-6e7f2**
3. Go to **Firestore Database** → **Rules** tab
4. Replace the entire rules with content from `firestore.rules` file
5. Click **Publish**

**Expected Rules Structure:**
```
- Allow Cloud Functions (request.auth == null) to create/update/delete users
- Allow admins (request.auth.token.admin == true) full access
- Allow users to read/update only their own document (safe fields only)
- Restrict all other collections
```

### Step 2: Deploy Cloud Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

**Expected Output:**
```
✔ Deploy complete!

Function URL (syncAllUsers): https://us-central1-client-care-6e7f2.cloudfunctions.net/syncAllUsers
Function URL (deleteUserSecure): https://us-central1-client-care-6e7f2.cloudfunctions.net/deleteUserSecure
Function URL (disableUserSecure): https://us-central1-client-care-6e7f2.cloudfunctions.net/disableUserSecure
Function URL (enableUserSecure): https://us-central1-client-care-6e7f2.cloudfunctions.net/enableUserSecure
```

### Step 3: Deploy Frontend

```bash
npm install
npm run build
firebase deploy --only hosting
```

---

## Setting Up Admin Users

For the admin role checks to work optimally, set custom claims on admin users:

### Option A: Via Firebase Console (Manual)

1. Go to **Authentication** → **Users**
2. Click on an admin user
3. In the right panel, click **Custom claims**
4. Add JSON:
```json
{
  "admin": true
}
```
5. Click **Save**

### Option B: Via Cloud Function (Automated)

Create a setup function:

```typescript
// In functions/src/index.ts
export const setAdminClaim = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');
  
  const { userId } = data;
  
  // Only superadmin can set claims (check from Firestore)
  const superAdmin = await getFirestoreUser(db, context.auth.uid);
  if (superAdmin?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can set admin claims');
  }
  
  await admin.auth().setCustomUserClaims(userId, { admin: true });
  return { success: true, message: `Admin claim set for ${userId}` };
});
```

---

## Testing the System

### Test 1: User Creation Flow

1. **Log in as Admin** to the admin panel
2. **Add New User**:
   - Name: "Test User"
   - Email: "test@example.com"
   - Password: "Password123!"
   - Role: "Customer"
3. **Verify**:
   - User appears in admin panel (real-time)
   - User appears in Firebase Auth
   - Firestore doc created at `/users/{uid}`
   - User status shows "Active"

**Expected Result**: ✅ User created in Auth, Firestore, and appears in admin panel

---

### Test 2: Disable User Flow

1. **In admin panel**, click **Power icon** on a user
2. **Confirm Disable** dialog
3. **Verify**:
   - User status changes to "Disabled"
   - Firebase Auth user is disabled (checked: `disabled: true`)
   - Firestore document shows `status: "disabled"`
   - User cannot log in (error: "This account has been disabled")

**Command to test login**:
```javascript
// In browser console
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase';

try {
  await signInWithEmailAndPassword(auth, 'test@example.com', 'Password123!');
} catch (error) {
  console.log(error.code); // Should be: auth/user-disabled
}
```

**Expected Result**: ✅ User disabled in Auth, Firestore updated, login fails

---

### Test 3: Enable User Flow

1. **In admin panel**, click **Check icon** on a disabled user
2. **Confirm Enable** dialog
3. **Verify**:
   - User status changes back to "Active"
   - Firebase Auth user is enabled (checked: `disabled: false`)
   - Firestore document shows `status: "active"`
   - User can log in again

**Expected Result**: ✅ User re-enabled, can log in

---

### Test 4: Admin-Only Protection

1. **Log in as non-admin** (if possible, or test via API)
2. **Try calling a Cloud Function** (disable/enable/delete):
   ```javascript
   const disableUserSecure = httpsCallable(functions, 'disableUserSecure');
   await disableUserSecure({ userId: 'some-user-id' });
   ```
3. **Verify**: Error "Only admins can disable users" (permission-denied)

**Expected Result**: ✅ Non-admins blocked from admin functions

---

### Test 5: Real-time Sync

1. **Open admin panel in 2 browser tabs**
2. **In Tab 1**: Disable a user
3. **In Tab 2**: User should disappear from active users or change status automatically (no refresh needed)
4. **In Tab 1**: Add a new user
5. **In Tab 2**: New user should appear immediately

**Expected Result**: ✅ Real-time updates without manual refresh

---

### Test 6: Protection Features

1. **Try to delete own account**: Should show error "You cannot delete your own account"
2. **Try to disable own account**: Should show error "You cannot disable your own account"
3. **Try to modify protected user**: Should show error "This account is protected"

**Expected Result**: ✅ All protections working

---

### Test 7: Firestore Rules

Test via Firebase Console → Firestore → Rules → **Rules Debugger**:

**Test Case 1** (Cloud Functions can create):
- Simulator: Firestore Emulator (request.auth = null)
- Operation: Create at `/users/test-uid`
- Data: `{ uid, email, name, role, status, createdAt, updatedAt }`
- Expected: ✅ PASS

**Test Case 2** (Non-admin cannot create):
- Simulator: Authenticated user (request.auth.uid = user1)
- Operation: Create at `/users/test-uid`
- Data: `{ ... }`
- Expected: ❌ FAIL (permission-denied)

**Test Case 3** (Admin can manage all users):
- Simulator: Authenticated user with custom claim `admin: true`
- Operation: Update `/users/other-user-id`
- Expected: ✅ PASS

---

## Firebase Configuration Checklist

- [ ] Firestore rules deployed (`firestore.rules`)
- [ ] Cloud Functions deployed
- [ ] Admin users have custom claim `admin: true` set
- [ ] Firebase project has `client-care-6e7f2` as project ID
- [ ] Authentication enabled in Firebase Console
- [ ] Firestore database created
- [ ] Cloud Functions region set to `us-central1`

---

## Monitoring & Debugging

### Check Cloud Function Logs

```bash
firebase functions:log
```

Look for successful syncs and any errors:
```
2024-XX-XX Synchronized Auth user to Firestore
2024-XX-XX User disabled in both Auth and Firestore
```

### Check Firestore Data

In Firebase Console → Firestore → Collections:
- Open `/users/{uid}` document
- Verify fields: `uid`, `email`, `name`, `role`, **`status`**, `createdAt`, `updatedAt`
- Verify status is either "active" or "disabled"

### Check Auth Settings

In Firebase Console → Authentication → Users:
- Click on a user
- Check "User Disabled" toggle matches Firestore `status` field
- Verify custom claims are set on admin users

---

## Troubleshooting

### Issue: "Permission denied" when trying to disable users

**Solution**: Ensure the calling user has `admin: true` custom claim
```bash
firebase auth:import users.json --hash-algo=scrypt # Set admin claims
```

### Issue: Disabled user can still log in

**Solution**: Verify Firestore rules allow Cloud Functions to update status
- Check: `allow update: if request.auth == null` in rules

### Issue: Real-time listener shows old data

**Solution**: Clear browser localStorage and refresh
```javascript
localStorage.removeItem('cc_users');
location.reload();
```

### Issue: Cloud Functions not triggering on user creation

**Solution**: Verify functions are deployed
```bash
firebase deploy --only functions
firebase functions:log
```

---

## Feature Summary

| Feature | Status | Location |
|---------|--------|----------|
| User Creation | ✅ Done | AuthContext.addUser |
| User Disable | ✅ Done | AuthContext.disableUser + Cloud Function |
| User Enable | ✅ Done | AuthContext.enableUser + Cloud Function |
| Real-time Sync | ✅ Done | AuthContext setupRealtimeListener |
| Admin Panel UI | ✅ Done | AdminSettings.tsx |
| Firestore Rules | ✅ Done | firestore.rules |
| Cloud Functions | ✅ Done | functions/src/index.ts |
| Status Field | ✅ Done | User type + FirestoreUser type |

---

## Security Guarantees

✅ **Only Admins** can manage users (delete/disable/enable via Cloud Functions)  
✅ **Cloud Functions** automatically sync Auth ↔ Firestore  
✅ **Disabled users** cannot log in (blocked at Auth level)  
✅ **Users** cannot modify role, status, or delete themselves  
✅ **Protected accounts** cannot be deleted or disabled  
✅ **Real-time updates** ensure admin panel stays current  
✅ **Firestore rules** enforce all access control

---

## Support

For Cloud Function errors, check:
1. `firebase functions:log` - Function execution logs
2. Firebase Console → Cloud Functions → Logs
3. Browser Console → Network tab → Check API responses

For Firestore issues:
1. Firebase Console → Firestore → Rules Debugger
2. Check custom claims are set on admin users
3. Verify `request.auth == null` rules for Cloud Functions
