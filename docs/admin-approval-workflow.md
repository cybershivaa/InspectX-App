# Admin Approval Workflow

## Overview
The application now implements an admin approval system for new user registrations. Users cannot directly create accounts; instead, they must request access, and an admin must approve their request before they can log in.

## User Flow

### 1. Signup Request
- Users visit `/signup` page
- Fill out the registration form:
  - Full Name
  - Email Address
  - Password (minimum 8 characters)
  - Confirm Password
  - Role Selection (Inspector or Client)
- Upon submission, the request is saved to the `pendingUsers` collection in Firestore
- User receives a success message and is redirected to the login page

### 2. Admin Review
- Admin logs in and navigates to the Admin Panel
- Selects the "Pending Requests" tab
- Views all pending user registration requests with:
  - User Name
  - Email
  - Requested Role
  - Request Date/Time

### 3. Admin Approval
- Admin clicks "Approve" button for a pending request
- Approval dialog shows user details for verification
- Upon confirmation:
  - Firebase Authentication account is created with the user's provided password
  - User document is created in Firestore `users` collection
  - Pending request is removed from `pendingUsers` collection
- User can now log in with their credentials

### 4. Admin Rejection (Optional)
- Admin can reject a request by clicking "Reject"
- The pending request is removed from the `pendingUsers` collection
- User must submit a new request to try again

## Technical Implementation

### Database Collections

#### pendingUsers Collection
```typescript
{
  id: string;           // Auto-generated document ID
  name: string;         // User's full name
  email: string;        // User's email address
  password: string;     // User's password (will be used during approval)
  role: 'Inspector' | 'Client';
  status: 'pending';
  requestedAt: Timestamp;
}
```

#### users Collection (created after approval)
```typescript
{
  id: string;           // Firebase Auth UID
  name: string;
  email: string;
  role: 'Inspector' | 'Client' | 'Admin';
  avatar: string;       // Profile picture URL (empty by default)
}
```

### Key Files

1. **Signup Page**: `src/app/(auth)/signup/page.tsx`
   - Form for new user registration
   - Validates password strength and confirmation
   - Submits to `requestSignup` action

2. **Login Page**: `src/app/(auth)/login/page.tsx`
   - Login form only (signup removed)
   - "Request Access" link to signup page

3. **Admin Panel**: `src/app/(app)/admin/admin-client-page.tsx`
   - "Pending Requests" tab
   - Approve/Reject functionality
   - Creates Firebase Auth user on approval

4. **User Actions**: `src/app/actions/users.ts`
   - `requestSignup`: Saves pending user request
   - `approveUser`: Creates user account
   - `rejectUser`: Removes pending request

### Security Features

1. **Email Validation**: Checks if email is already registered
2. **Duplicate Prevention**: Prevents multiple pending requests with same email
3. **Password Requirements**: Minimum 8 characters
4. **Role Restrictions**: Users can only request Inspector or Client roles (not Admin)
5. **Admin-Only Approval**: Only authenticated admin users can approve requests

## User Notifications

### Signup Success
- Message: "Your request has been sent to the admin for approval. You will be notified once approved."
- Automatically redirects to login page after 2 seconds

### Approval Success (Admin)
- Message: "Account created for [email]. The user can now login with their credentials."

### Login Before Approval
- If a user tries to log in before approval, they will see an error because their account doesn't exist yet in the Firebase Auth system.

## Future Enhancements

1. **Email Notifications**: Send email to user when their request is approved/rejected
2. **Request Comments**: Allow admin to add notes when rejecting
3. **Approval History**: Track who approved which requests and when
4. **Bulk Approval**: Approve multiple requests at once
5. **Request Expiry**: Auto-reject requests older than X days
