const express = require('express');
const { passport, generateJWTToken } = require('../config/passport');
const auth = require('../middleware/auth');

const router = express.Router();

// Check if Google OAuth is configured
const isGoogleOAuthConfigured = () => {
  return process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
};

// @route   GET /api/auth/google
// @desc    Start Google OAuth flow
// @access  Public
router.get('/google', (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return res.status(500).json({
      success: false,
      message: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.'
    });
  }
  
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
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
    failureRedirect: `${process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google_auth_failed`,
    session: false // We'll use JWT instead of sessions for API consistency
  })(req, res, next);
}, 
  (req, res) => {
    try {
      console.log('🔑 Google OAuth callback - User authenticated:', {
        id: req.user._id,
        email: req.user.email,
        authProvider: req.user.authProvider,
        hasPhone: !!req.user.phone
      });
      
      // Generate JWT token
      const token = generateJWTToken(req.user);
      console.log('🎫 JWT token generated for user:', req.user.email);
      
      // Determine redirect URL based on environment
      const clientURL = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
      console.log('🔗 Client URL for redirect:', clientURL);
      
      // Check if user needs to complete profile (missing phone number)
      const needsProfile = !req.user.phone || req.user.phone === '';
      console.log('📝 Profile completion needed:', needsProfile);
      
      if (needsProfile) {
        // Redirect to profile completion page with token
        const redirectURL = `${clientURL}/complete-profile?token=${token}&provider=google`;
        console.log('➡️ Redirecting to profile completion:', redirectURL);
        res.redirect(redirectURL);
      } else {
        // Redirect to dashboard with token
        const redirectURL = `${clientURL}/dashboard?token=${token}&provider=google`;
        console.log('➡️ Redirecting to dashboard:', redirectURL);
        res.redirect(redirectURL);
      }
      
    } catch (error) {
      console.error('❌ Google OAuth callback error:', {
        message: error.message,
        stack: error.stack,
        user: req.user ? req.user.email : 'No user'
      });
      
      const clientURL = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
      const errorURL = `${clientURL}/login?error=auth_callback_failed&message=${encodeURIComponent(error.message)}`;
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
        id: user.userId,
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
    const User = require('../models/User');
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
    
    const User = require('../models/User');
    const bcrypt = require('bcryptjs');
    
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
