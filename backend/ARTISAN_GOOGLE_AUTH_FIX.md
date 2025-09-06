# 🛠️ Artisan Google Authentication Fix

## Problem Description
When artisans attempted to log in through Google OAuth, they were being redirected to the marketplace page showing "profile already complete" instead of being properly authenticated as artisans and redirected to their dashboard.

## Root Cause Analysis
1. **Missing Google OAuth support for Artisans**: The original implementation only supported regular users (User model), not artisans (Artisan model).
2. **Incomplete model schema**: The Artisan model lacked Google OAuth fields (`googleId`, `authProvider`, `picture`).  
3. **Single user type authentication**: Passport.js was configured only for User authentication.
4. **Wrong redirect logic**: All Google OAuth users were treated as regular users and redirected to the marketplace.

## Solution Implemented

### 🔧 1. Extended Artisan Model
**File**: `models/Artisan.js`
- Added Google OAuth fields:
  - `googleId`: String (sparse index for uniqueness)
  - `authProvider`: Enum ['local', 'google'] 
  - `picture`: String (Google profile picture URL)
- Made password optional when using Google OAuth
- Added database index for `googleId`

### 🔧 2. Updated Passport Configuration  
**File**: `config/passport.js`
- Added Artisan model import
- Enhanced Google strategy to handle both User and Artisan authentication
- Implemented dynamic model selection based on `userType` parameter
- Added user type parsing from state parameter (JSON format)
- Enhanced JWT token generation to support both user types
- Added email conflict detection between User and Artisan models

### 🔧 3. Created Artisan Google OAuth Routes
**File**: `routes/artisanGoogleAuth.js`
- `/api/artisan/auth/google/signup` - Start artisan signup flow
- `/api/artisan/auth/google/login` - Start artisan login flow  
- `/api/artisan/auth/google/profile` - Get artisan profile (protected)
- `/api/artisan/auth/google/complete-profile` - Complete artisan profile
- `/api/artisan/auth/google/unlink` - Unlink Google account

### 🔧 4. Enhanced Main Google OAuth Callback
**File**: `routes/googleAuth.js`
- Added user type detection logic
- Implemented dynamic redirect URLs based on user type:
  - **Artisans**: `/artisan/dashboard` or `/artisan/complete-profile`
  - **Users**: `/marketplace` or `/complete-profile`
- Enhanced profile completion logic for artisans (checks `craftType` and `phone`)

### 🔧 5. Updated Server Configuration
**File**: `server.js`
- Mounted artisan Google OAuth routes at `/api/artisan/auth`

## 🎯 Expected Behavior After Fix

### New Artisan Google OAuth Flow:
1. **Artisan clicks**: "Sign in with Google" on artisan login page
2. **Frontend redirects**: `GET /api/artisan/auth/google/login`
3. **Google OAuth**: User grants permissions  
4. **Google redirects**: `GET /api/auth/google/callback` (unified callback)
5. **System detects**: `userType: 'artisan'` from state parameter
6. **Artisan created/found**: In Artisan collection with Google OAuth fields
7. **Profile check**: If `craftType` or `phone` missing → profile completion
8. **Redirect**:
   - **Complete profile**: `/artisan/complete-profile?token=...&user_type=artisan`
   - **Profile ready**: `/artisan/dashboard?token=...&user_type=artisan`

### Existing Artisan Google OAuth Flow:
1. **Artisan clicks**: "Sign in with Google" 
2. **System finds**: Existing artisan with `googleId`
3. **Profile check**: `craftType` and `phone` present
4. **Direct redirect**: `/artisan/dashboard?token=...&user_type=artisan` ✅

## 🔗 API Endpoints

### Artisan Google OAuth Endpoints:
```
GET  /api/artisan/auth/google/signup         # Start artisan signup
GET  /api/artisan/auth/google/login          # Start artisan login  
GET  /api/artisan/auth/google/profile        # Get artisan profile [Protected]
POST /api/artisan/auth/google/complete-profile # Complete profile [Protected]
POST /api/artisan/auth/google/unlink         # Unlink Google account [Protected]
```

### Unified Callback:
```
GET  /api/auth/google/callback               # Handles both users & artisans
```

## 🧪 Testing

Run the test script to verify the implementation:
```bash
node test-artisan-google-auth.js
```

### Test Coverage:
- ✅ Artisan model schema validation
- ✅ Passport configuration verification  
- ✅ Route implementation checking
- ✅ Server configuration validation
- ✅ Main callback updates verification
- ✅ Google OAuth field validation

## 🔒 Security Features

1. **Email Conflict Detection**: Prevents users from signing up as artisans with existing user emails and vice versa
2. **User Type Isolation**: Clear separation between User and Artisan authentication flows
3. **JWT Token Security**: Proper user type encoding in tokens (`type: 'artisan'`, `userType: 'artisan'`)
4. **Profile Validation**: Ensures artisans complete required fields (`craftType`, `phone`)

## 🚀 Frontend Integration

Update your frontend to use artisan-specific Google OAuth URLs:

```javascript
// For artisan login page
const artisanGoogleLoginUrl = '/api/artisan/auth/google/login';

// For artisan signup page  
const artisanGoogleSignupUrl = '/api/artisan/auth/google/signup';
```

## 🔧 Configuration

Ensure your `.env` file has Google OAuth credentials:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLIENT_URL=http://localhost:3000
```

## ✅ Fix Verification

After implementing this fix:
1. **Artisan Google Login** → Redirects to `/artisan/dashboard` (if profile complete)
2. **Artisan Google Signup** → Redirects to `/artisan/complete-profile` (if missing fields)
3. **No more "profile already complete" errors** for artisans
4. **Proper JWT tokens** with `userType: 'artisan'`
5. **Email conflict prevention** between users and artisans

---

## 📞 Support

If you encounter any issues with artisan Google authentication:
1. Check browser console for redirect URLs
2. Verify JWT token contains `userType: 'artisan'`
3. Ensure Google OAuth credentials are configured
4. Run `node test-artisan-google-auth.js` to validate setup

**Fix Author**: AI Assistant  
**Date**: 2025-09-06  
**Status**: ✅ Implemented and Tested
