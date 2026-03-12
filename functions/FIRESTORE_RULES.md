# Firestore Security Rules for Cloud Functions Sync

This document provides recommended Firestore security rules that allow Cloud Functions to sync users while protecting data integrity.

## Basic Rules (Development)

For development and testing:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{uid} {
      // Allow users to read their own document
      allow read: if request.auth.uid == uid;
      
      // Allow users to update their own document
      allow update: if request.auth.uid == uid;
      
      // Allow Cloud Functions to manage users
      // (service account has no auth.uid, only for writes)
      allow write: if request.auth == null;
      
      // Allow admin users to manage all users
      allow read, write, delete: if request.auth.token.admin == true;
    }
    
    // Sync metadata collection (internal use)
    match /syncMetadata/{uid} {
      // Only allow Cloud Functions to write
      allow write: if request.auth == null;
      // No public read access
      allow read: if false;
    }
  }
}
```

## Production Rules (Recommended)

For production deployment with security validation:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{uid} {
      // Read access
      allow read: if request.auth.uid == uid ||                    // Users can read themselves
                     request.auth.token.admin == true ||            // Admins can read anyone
                     isUserAdmin(request.auth.uid);                 // Custom admin check
      
      // Create access
      allow create: if request.auth == null ||                      // Cloud Functions can create
                       request.auth.token.admin == true;            // Admins can create
      
      // Update access
      allow update: if request.auth.uid == uid ||                   // Users can update themselves
                       request.auth.token.admin == true ||          // Admins can update
                       // Cloud Functions can update
                       (request.auth == null && 
                        request.writeFields.hasOnly(['email', 'name', 'updatedAt', 'syncedWithAuth']));
      
      // Delete access
      allow delete: if request.auth == null ||                      // Cloud Functions can delete
                       request.auth.token.admin == true;            // Admins can delete
      
      // Validate required fields on create
      allow create: if hasRequiredFields(['uid', 'email', 'name', 'role']);
      
      // Validate field types
      allow create, update: if isValidUser(request.resource.data);
    }
    
    // Sync metadata collection
    match /syncMetadata/{uid} {
      // Cloud Functions only
      allow read, write: if request.auth == null;
      allow delete: if request.auth == null;
    }
    
    // Other collections
    match /{document=**} {
      // Default deny all
      allow read, write: if false;
    }
  }
  
  // Helper functions
  
  // Check if required fields exist
  function hasRequiredFields(fields) {
    return request.resource.data.keys().hasAll(fields);
  }
  
  // Validate user document structure
  function isValidUser(user) {
    return user.uid is string && 
           user.email is string && 
           user.name is string && 
           user.role in ['admin', 'customer'] &&
           user.createdAt is number &&
           user.updatedAt is number;
  }
  
  // Check if user is admin (custom logic)
  function isUserAdmin(uid) {
    return get(/databases/$(database)/documents/users/$(uid)).data.role == 'admin';
  }
}
```

## Rules for Admin Panel

If your admin panel needs full access:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    match /users/{uid} {
      // Admin can do everything
      allow read, write, delete: if request.auth.token.admin == true;
      
      // Users can read/update themselves
      allow read, update: if request.auth.uid == uid && 
                             !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'createdAt']);
      
      // Cloud Functions sync
      allow create, update, delete: if request.auth == null;
    }
    
    match /syncMetadata/{document=**} {
      allow read, write: if request.auth == null;
    }
  }
}
```

## Testing Your Rules

### Test 1: Cloud Functions Can Create Users

```firestore
// Should PASS
- service account (no auth)
- Write to /users/test-uid
- Data: { uid, email, name, role, createdAt, updatedAt }
```

### Test 2: Cloud Functions Can Delete Users

```firestore
// Should PASS
- service account (no auth)
- Delete from /users/test-uid
```

### Test 3: Users Can't Delete Other Users

```firestore
// Should FAIL
- auth.uid = 'user1'
- Delete from /users/user2
```

### Test 4: Users Can Update Themselves

```firestore
// Should PASS
- auth.uid = 'user1'
- Update /users/user1
- Only updating: email, name
```

### Test 5: Users Can't Change Their Role

```firestore
// Should FAIL
- auth.uid = 'user1'
- Update /users/user1
- Trying to update: role (not allowed)
```

## Debugging Rule Issues

### Enable Debug Logging

In Firebase Console:
1. Go to Firestore → Rules
2. Click "Rules Debugger" tab
3. Run test operations to see rule evaluation

### Common Issues

**Issue**: "Cloud Functions can't create users"
- **Solution**: Ensure `request.auth == null` condition is in create rule

**Issue**: "Users can't see their own data"
- **Solution**: Check if `request.auth.uid == uid` condition is in read rule

**Issue**: "Admin operations blocked"
- **Solution**: Verify `request.auth.token.admin` is set correctly

## Custom Claims for Admin Users

If using custom claims, set them in Cloud Functions:

```typescript
// In your Cloud Functions code
await admin.auth().setCustomUserClaims(uid, { admin: true });
```

Then use in rules:
```firestore
allow read, write: if request.auth.token.admin == true;
```

## Testing Rules Locally

Use Firebase Emulator:

```bash
firebase emulators:start --only firestore

# In another terminal
firebase firestore:delete --all --yes
```

Then test with your client code using the emulator.

## Final Checklist

- [ ] Cloud Functions can create users
- [ ] Cloud Functions can delete users
- [ ] Cloud Functions can update user fields
- [ ] Users can read their own document
- [ ] Users can update their own email/name
- [ ] Users cannot change their role
- [ ] Users cannot delete other users
- [ ] Admins can manage all users
- [ ] Sync metadata is not publicly readable
