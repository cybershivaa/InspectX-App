# Firebase Admin SDK Setup Guide

## Purpose
Enable permanent deletion of users from both Firestore database AND Firebase Authentication when admin deletes a user.

## Current Status
- ✅ **Firestore deletion**: Working (user removed from database)
- ⚠️ **Firebase Auth deletion**: Requires Firebase Admin SDK setup

## Why This Matters
Without Admin SDK:
- User deleted from Firestore ✅
- User email still exists in Firebase Auth ❌
- Email shows as "already in use" when trying to re-register ❌

With Admin SDK:
- User deleted from both Firestore AND Firebase Auth ✅
- Email becomes available for re-registration ✅

## Setup Instructions

### Step 1: Generate Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **inspectx-325dc**
3. Click on **⚙️ Settings** (gear icon) > **Project Settings**
4. Navigate to **Service Accounts** tab
5. Click **Generate New Private Key** button
6. Download the JSON file (keep it secure!)

### Step 2: Add Environment Variables

1. Open your `.env.local` file (create if doesn't exist)
2. Add the following variables from the downloaded JSON:

```bash
# Copy these from your service account JSON file
FIREBASE_ADMIN_PROJECT_ID=inspectx-325dc
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@inspectx-325dc.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key_Here_With_Newlines\n-----END PRIVATE KEY-----\n"
```

**Important**: 
- Keep newlines (`\n`) in the private key
- Wrap the entire key in double quotes
- DO NOT commit this file to git (.env.local is in .gitignore)

### Step 3: Install Dependencies

```bash
npm install
```

The `firebase-admin` package is already added to package.json.

### Step 4: Restart Development Server

```bash
npm run dev
```

### Step 5: Test User Deletion

1. Login as Admin
2. Go to Admin Panel > Users tab
3. Click "..." menu on any user
4. Click "Delete"
5. Confirm deletion

**Expected Results:**
- ✅ User removed from Firestore
- ✅ User removed from Firebase Authentication
- ✅ Email becomes available for new registration
- ✅ Toast shows: "User has been permanently deleted from both database and authentication"

## Troubleshooting

### If Admin SDK is not configured:
You'll see: "User deleted from database, but Firebase Auth deletion requires Admin SDK setup"
- User is deleted from Firestore ✅
- User email still exists in Auth ❌
- Need to complete setup steps above

### If Admin SDK fails:
You'll see: "User deleted from database, but Auth deletion failed: [error message]"
- Check environment variables are correct
- Verify private key format (keep `\n` for newlines)
- Check Firebase console for service account permissions

### Manual Alternative (if Admin SDK setup is not possible):
1. Go to Firebase Console > Authentication
2. Find the user by email
3. Click "..." menu
4. Click "Delete account"

## Security Notes

⚠️ **IMPORTANT**:
- Service account key has full admin access to your Firebase project
- Never commit `.env.local` to git
- Never share the private key publicly
- Rotate keys periodically for security
- Use environment variable in production (Vercel, etc.)

## Files Modified

- `package.json` - Added firebase-admin dependency
- `src/lib/firebase-admin.ts` - Admin SDK initialization
- `src/app/actions/users.ts` - deleteUser with Auth deletion
- `src/app/(app)/admin/admin-client-page.tsx` - Updated delete handler
- `.env.example` - Template for environment variables
