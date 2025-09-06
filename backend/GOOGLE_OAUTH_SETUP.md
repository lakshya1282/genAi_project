# Google OAuth Setup Guide

This guide explains how to set up and use Google OAuth authentication in your Artisan Marketplace backend.

## 🚀 Quick Start

Google OAuth has been successfully integrated into your backend! Here's what you need to do to get it working:

## 📋 Prerequisites

1. **Google Cloud Console Account**: You need access to [Google Cloud Console](https://console.cloud.google.com/)
2. **Node.js Dependencies**: Already installed ✅
   - `passport`
   - `passport-google-oauth20`
   - `express-session`
   - `connect-mongo`

## 🔧 Setup Instructions

### 1. Google Cloud Console Configuration

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create or Select Project**:
   - Click on project dropdown → "New Project" (or select existing)
   - Name: "Artisan Marketplace" or your preferred name

3. **Enable Google+ API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API" or "Google OAuth2 API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Configure consent screen if prompted:
     - User Type: External (for testing) or Internal (for organization)
     - App name: "Artisan Marketplace"
     - User support email: Your email
     - Developer contact info: Your email

5. **Configure OAuth Client**:
   - Application type: "Web application"
   - Name: "Artisan Marketplace Backend"
   - Authorized redirect URIs:
     - `http://localhost:5000/api/auth/google/callback` (development)
     - `https://yourdomain.com/api/auth/google/callback` (production)

6. **Get Credentials**:
   - Copy the **Client ID** and **Client Secret**

### 2. Environment Variables Setup

Update your `.env` file with the following variables:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Session Configuration
SESSION_SECRET=your_random_session_secret_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Client URL (for redirects)
CLIENT_URL=http://localhost:3000
```

### 3. Test the Setup

Start your server:
```bash
npm run dev
```

The following endpoints are now available:

- **Start OAuth Flow**: `GET /api/auth/google`
- **OAuth Callback**: `GET /api/auth/google/callback`
- **Get Profile**: `GET /api/auth/google/profile`
- **Complete Profile**: `POST /api/auth/google/complete-profile`
- **Unlink Account**: `POST /api/auth/google/unlink`

## 🔄 Authentication Flow

### 1. Client-Side Integration

**Frontend Login Button**:
```html
<a href="http://localhost:5000/api/auth/google">
  <button>Sign in with Google</button>
</a>
```

**Or using JavaScript**:
```javascript
// Redirect to Google OAuth
window.location.href = 'http://localhost:5000/api/auth/google';
```

### 2. Authentication Process

1. **User clicks "Sign in with Google"** → Redirected to Google
2. **User authorizes app** → Google redirects to callback URL
3. **Backend processes OAuth** → Creates/updates user account
4. **Redirects with JWT token**:
   - New users: `/complete-profile?token=xxx&provider=google`
   - Existing users: `/dashboard?token=xxx&provider=google`

### 3. Handle Redirect on Frontend

```javascript
// On your complete-profile or dashboard page
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const provider = urlParams.get('provider');

if (token && provider === 'google') {
  // Store token in localStorage or cookie
  localStorage.setItem('authToken', token);
  
  // Make authenticated requests
  fetchUserProfile();
}
```

## 📡 API Endpoints

### 1. Start Google OAuth
```http
GET /api/auth/google
```
Redirects user to Google OAuth consent screen.

### 2. Get User Profile (Protected)
```http
GET /api/auth/google/profile
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@gmail.com",
    "picture": "https://lh3.googleusercontent.com/...",
    "authProvider": "google",
    "isEmailVerified": true,
    "phone": "",
    "addresses": [],
    "preferences": {},
    "createdAt": "2023-..."
  }
}
```

### 3. Complete Profile (Protected)
```http
POST /api/auth/google/complete-profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "phone": "+1234567890",
  "addresses": [
    {
      "type": "home",
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "country": "USA",
      "pincode": "10001",
      "isDefault": true
    }
  ]
}
```

### 4. Unlink Google Account (Protected)
```http
POST /api/auth/google/unlink
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "password": "new_password_for_local_auth"
}
```

## 🔐 Security Features

### 1. **Account Linking**
- If user has existing local account with same email, Google account gets linked
- User can sign in with either method

### 2. **Email Verification**
- Google accounts are automatically verified
- `isEmailVerified: true` and `emailVerifiedAt` are set

### 3. **Profile Pictures**
- Google profile picture automatically imported
- Stored in `picture` field

### 4. **JWT Integration**
- Google OAuth users get same JWT tokens as local users
- Existing auth middleware works seamlessly

## 🎯 User Experience Flow

### New Google User:
1. Click "Sign in with Google"
2. Authorize on Google
3. Redirected to `/complete-profile` (missing phone)
4. Complete profile → Access dashboard

### Existing Google User:
1. Click "Sign in with Google"
2. Authorize on Google
3. Redirected to `/dashboard` (profile complete)

### Existing Local User:
1. Click "Sign in with Google" (same email)
2. Accounts automatically linked
3. Can use both authentication methods

## 🐛 Troubleshooting

### Common Issues:

1. **"Error: GoogleStrategy requires a clientID option"**
   - Check `GOOGLE_CLIENT_ID` in `.env` file

2. **"Error: GoogleStrategy requires a clientSecret option"**
   - Check `GOOGLE_CLIENT_SECRET` in `.env` file

3. **"redirect_uri_mismatch"**
   - Verify redirect URI in Google Console matches exactly
   - Check: `http://localhost:5000/api/auth/google/callback`

4. **"Access blocked: This app's request is invalid"**
   - Complete OAuth consent screen configuration
   - Add your email to test users (if in testing mode)

5. **Session/Cookie Issues**:
   - Check `SESSION_SECRET` is set
   - Verify MongoDB connection (sessions stored in DB)

### Debug Mode:
Enable detailed logging by setting:
```env
NODE_ENV=development
```

Check server logs for detailed OAuth flow information.

## 📱 Frontend Integration Examples

### React Example:
```jsx
const GoogleLoginButton = () => {
  const handleGoogleLogin = () => {
    window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/google`;
  };

  return (
    <button onClick={handleGoogleLogin} className="google-btn">
      <img src="/google-icon.svg" alt="Google" />
      Continue with Google
    </button>
  );
};
```

### Handle OAuth Callback:
```jsx
// In your callback component or main app
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const error = urlParams.get('error');
  
  if (token) {
    localStorage.setItem('authToken', token);
    // Redirect to appropriate page
    navigate('/dashboard');
  } else if (error) {
    setError('Authentication failed');
  }
}, []);
```

## 🔄 Database Schema Changes

The User model has been updated with these new fields:

```javascript
{
  // Existing fields...
  
  // New Google OAuth fields
  googleId: String,           // Google account ID
  authProvider: String,       // 'local' or 'google'
  picture: String,           // Google profile picture URL
  
  // Password now optional for Google users
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Not required if Google user
    }
  }
}
```

## 🚀 Production Deployment

### 1. Update Redirect URIs:
```
https://yourdomain.com/api/auth/google/callback
```

### 2. Environment Variables:
```env
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret
CLIENT_URL=https://yourfrontend.com
NODE_ENV=production
```

### 3. HTTPS Required:
- Google OAuth requires HTTPS in production
- Session cookies will be secure

---

## ✅ What's Included

- ✅ Google OAuth Strategy (Passport.js)
- ✅ User account creation and linking
- ✅ JWT token generation for OAuth users
- ✅ Profile completion flow
- ✅ Account unlinking functionality
- ✅ Session management with MongoDB
- ✅ Enhanced auth middleware
- ✅ Error handling and redirects
- ✅ Database schema updates
- ✅ Environment configuration

Your Google OAuth integration is now complete and ready to use! 🎉
