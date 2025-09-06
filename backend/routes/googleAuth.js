const express = require('express');
const { passport, generateJWTToken } = require('../config/passport');
const auth = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Check if Google OAuth is configured
const isGoogleOAuthConfigured = () => {
  return process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
};

// @route   GET /api/auth/google/signup
// @desc    Start Google OAuth signup flow
// @access  Public
router.get('/google/signup', (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return res.status(500).json({
      success: false,
      message: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.'
    });
  }
  
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    state: 'signup' // Pass signup context
  })(req, res, next);
});

// @route   GET /api/auth/google/login
// @desc    Start Google OAuth login flow
// @access  Public
router.get('/google/login', (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return res.status(500).json({
      success: false,
      message: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.'
    });
  }
  
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    state: 'login' // Pass login context
  })(req, res, next);
});

// @route   GET /api/auth/google (legacy - defaults to login)
// @desc    Start Google OAuth flow (legacy support)
// @access  Public
router.get('/google', (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return res.status(500).json({
      success: false,
      message: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.'
    });
  }
  
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    state: 'login' // Default to login for legacy route
  })(req, res, next);
});

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback', (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    const clientURL = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${clientURL}/login?error=oauth_not_configured`);
  }
  
  passport.authenticate('google', { 
    session: false // We'll use JWT instead of sessions for API consistency
  }, (err, user, info) => {
    // Custom callback to handle different error types
    if (err) {
      console.error('🚫 Google OAuth error:', err.message);
      const clientURL = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
      
      if (err.message === 'EXISTING_EMAIL') {
        // Email already exists - redirect with specific error
        const errorURL = `${clientURL}/login?error=existing_email&message=${encodeURIComponent(err.userMessage)}&provider=${err.existingProvider || 'unknown'}`;
        console.log('➡️ Redirecting with existing email error:', errorURL);
        return res.redirect(errorURL);
      } else if (err.message === 'USER_NOT_FOUND') {
        // User not found during login - redirect to signup
        const errorURL = `${clientURL}/signup?error=user_not_found&message=${encodeURIComponent(err.userMessage)}`;
        console.log('➡️ Redirecting with user not found error:', errorURL);
        return res.redirect(errorURL);
      } else {
        // Generic OAuth error
        const errorURL = `${clientURL}/login?error=google_auth_failed&message=${encodeURIComponent('Authentication failed. Please try again.')}`;
        console.log('➡️ Redirecting with generic error:', errorURL);
        return res.redirect(errorURL);
      }
    }
    
    if (!user) {
      // No user returned (shouldn't happen with our logic, but just in case)
      const clientURL = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorURL = `${clientURL}/login?error=auth_failed&message=${encodeURIComponent('Authentication failed. Please try again.')}`;
      console.log('➡️ Redirecting - no user returned:', errorURL);
      return res.redirect(errorURL);
    }
    
    // Success - attach user to request and continue
    req.user = user;
    next();
  })(req, res, next);
}, 
  (req, res) => {
    try {
      const isNewUser = req.user.createdAt && (Date.now() - new Date(req.user.createdAt).getTime()) < 5000; // Created within last 5 seconds
      const userType = req.user.userType || (req.user.craftType !== undefined ? 'artisan' : 'user');
      
      console.log(`🔑 Google OAuth callback - ${userType} authenticated:`, {
        id: req.user._id,
        email: req.user.email,
        authProvider: req.user.authProvider,
        userType: userType,
        hasPhone: !!req.user.phone,
        hasCraftType: userType === 'artisan' ? !!req.user.craftType : 'N/A',
        isNewUser: isNewUser
      });
      
      // Generate JWT token
      const token = generateJWTToken(req.user);
      console.log(`🎫 JWT token generated for ${userType}:`, req.user.email);
      
      // Determine redirect URL based on environment
      const clientURL = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
      console.log('🔗 Client URL for redirect:', clientURL);
      
      // Check if user/artisan needs to complete profile
      let needsProfile;
      if (userType === 'artisan') {
        needsProfile = !req.user.phone || !req.user.craftType;
      } else {
        needsProfile = !req.user.phone;
      }
      console.log(`📝 Profile completion needed for ${userType}:`, needsProfile);
      
      if (needsProfile) {
        // Redirect to profile completion page with token
        const message = isNewUser ? `Welcome! Please complete your ${userType} profile.` : `Please complete your ${userType} profile.`;
        const baseURL = userType === 'artisan' ? '/artisan/complete-profile' : '/complete-profile';
        const redirectURL = `${clientURL}${baseURL}?token=${token}&provider=google&message=${encodeURIComponent(message)}&new_user=${isNewUser}&user_type=${userType}`;
        console.log(`➡️ Redirecting ${userType} to profile completion:`, redirectURL);
        res.redirect(redirectURL);
      } else {
        // Profile is complete - redirect to appropriate dashboard
        const message = isNewUser ? 'Welcome to Artisan Marketplace!' : 'Welcome back!';
        let baseURL;
        if (userType === 'artisan') {
          baseURL = '/artisan/dashboard';
        } else {
          baseURL = '/oauth/callback'; // Regular user callback handler
        }
        const redirectURL = `${clientURL}${baseURL}?token=${token}&provider=google&message=${encodeURIComponent(message)}&new_user=${isNewUser}&user_type=${userType}`;
        console.log(`➡️ Redirecting ${userType} to dashboard:`, redirectURL);
        res.redirect(redirectURL);
      }
      
    } catch (error) {
      console.error('❌ Google OAuth callback error:', {
        message: error.message,
        stack: error.stack,
        user: req.user ? req.user.email : 'No user'
      });
      
      const clientURL = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorURL = `${clientURL}/login?error=auth_callback_failed`;
      console.log('➡️ Redirecting to login with error:', errorURL);
      res.redirect(errorURL);
    }
  }
);

// @route   GET /api/auth/google/profile
// @desc    Get current user profile (for Google OAuth users)
// @access  Private
router.get('/google/profile', auth, async (req, res) => {
  try {
    const user = req.user;
    
    // Return user profile information
    res.json({
      success: true,
      user: {
        id: user.userId || user.id,
        name: user.name,
        email: user.email,
        picture: user.picture || user.profileImage,
        authProvider: user.authProvider || 'local',
        isEmailVerified: true, // Google users are always verified
        phone: user.phone,
        addresses: user.addresses || [],
        preferences: user.preferences || {},
        createdAt: user.createdAt
      }
    });
    
  } catch (error) {
    console.error('Get Google profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message
    });
  }
});

// @route   POST /api/auth/google/complete-profile
// @desc    Complete profile for Google OAuth users (add phone number)
// @access  Private
router.post('/google/complete-profile', auth, async (req, res) => {
  try {
    const { phone, addresses } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }
    
    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      {
        phone: phone.trim(),
        ...(addresses && { addresses })
      },
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Profile completed successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        picture: updatedUser.picture || updatedUser.profileImage,
        authProvider: updatedUser.authProvider,
        isEmailVerified: updatedUser.isEmailVerified
      }
    });
    
  } catch (error) {
    console.error('Complete Google profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing profile',
      error: error.message
    });
  }
});

// @route   POST /api/auth/google/unlink
// @desc    Unlink Google account (convert back to local auth)
// @access  Private
router.post('/google/unlink', auth, async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to unlink Google account'
      });
    }
    
    // Hash the new password
    
    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Update user to remove Google linkage
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $unset: { googleId: 1, picture: 1 },
        password: hashedPassword,
        authProvider: 'local'
      },
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Google account unlinked successfully. You can now sign in with email and password.'
    });
    
  } catch (error) {
    console.error('Unlink Google account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unlinking Google account',
      error: error.message
    });
  }
});

module.exports = router;
