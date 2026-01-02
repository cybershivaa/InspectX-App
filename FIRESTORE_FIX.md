# Fix Firebase Permissions Error

The "Missing or insufficient permissions" error is happening because your Firestore security rules are blocking access.

## Quick Fix (For Development)

### Option 1: Update Rules via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `inspectx-325dc`
3. Click on **Firestore Database** in the left sidebar
4. Click on the **Rules** tab at the top
5. Replace the existing rules with the development rules from `firestore-dev.rules`:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // DEVELOPMENT ONLY - Allow all authenticated users to read/write
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

6. Click **Publish** button

### Option 2: Using Firebase CLI (If installed)

```bash
# Install Firebase CLI if not installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not already done)
firebase init firestore

# Deploy the rules
firebase deploy --only firestore:rules
```

## After Updating Rules

1. Refresh your browser at http://localhost:9002
2. Login with: admin@inspectx.com / admin123
3. Dashboard should now load without permission errors

## Production Rules

For production, use the rules from `firestore.rules` file which has proper role-based access control.

## Current Issue

Your Firestore database currently has restrictive security rules that don't allow authenticated users to read/write data. The development rules above will allow any authenticated user to access the database, which is suitable for development but should be replaced with production rules before going live.
