const express = require('express');
const { passport, generateJWTToken } = require('../config/passport');
const auth = require('../middleware/auth');
const Artisan = require('../models/Artisan');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Check if Google OAuth is configured
const isGoogleOAuthConfigured = () => {
  return process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
};

// @route   GET /api/artisan/auth/google/signup
// @desc    Start Google OAuth signup flow for artisans
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
    state: JSON.stringify({ flow: 'signup', userType: 'artisan' }) // Pass artisan context
  })(req, res, next);
});

// @route   GET /api/artisan/auth/google/login
// @desc    Start Google OAuth login flow for artisans
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
    state: JSON.stringify({ flow: 'login', userType: 'artisan' }) // Pass artisan context
  })(req, res, next);
});

// Note: The actual Google OAuth callback is handled by the main /api/auth/google/callback
// That callback will automatically redirect artisans to /artisan/dashboard or /artisan/complete-profile
// based on the userType in the state parameter

// @route   GET /api/artisan/auth/google/profile
// @desc    Get current artisan profile (for Google OAuth artisans)
// @access  Private
router.get('/google/profile', auth, async (req, res) => {
  try {
    const artisan = req.user;
    
    // Return artisan profile information
    res.json({
      success: true,
      artisan: {
        id: artisan.userId || artisan.id,
        name: artisan.name,
        email: artisan.email,
        picture: artisan.picture || artisan.profileImage,
        authProvider: artisan.authProvider || 'local',
        isEmailVerified: true, // Google users are always verified
        phone: artisan.phone,
        craftType: artisan.craftType,
        location: artisan.location,
        bio: artisan.bio,
        story: artisan.story,
        socialMedia: artisan.socialMedia || {},
        createdAt: artisan.createdAt
      }
    });
    
  } catch (error) {
    console.error('Get Artisan Google profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching artisan profile',
      error: error.message
    });
  }
});

// @route   POST /api/artisan/auth/google/complete-profile
// @desc    Complete profile for Google OAuth artisans (add craftType, phone, etc.)
// @access  Private
router.post('/google/complete-profile', auth, async (req, res) => {
  try {
    const { phone, craftType, location, bio, story, socialMedia } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }
    
    if (!craftType) {
      return res.status(400).json({
        success: false,
        message: 'Craft type is required'
      });
    }
    
    // Update artisan profile
    const updatedArtisan = await Artisan.findByIdAndUpdate(
      req.user.userId,
      {
        phone: phone.trim(),
        craftType,
        ...(location && { location }),
        ...(bio && { bio: bio.trim() }),
        ...(story && { story: story.trim() }),
        ...(socialMedia && { socialMedia })
      },
      { new: true }
    );
    
    if (!updatedArtisan) {
      return res.status(404).json({
        success: false,
        message: 'Artisan not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Artisan profile completed successfully',
      artisan: {
        id: updatedArtisan._id,
        name: updatedArtisan.name,
        email: updatedArtisan.email,
        phone: updatedArtisan.phone,
        craftType: updatedArtisan.craftType,
        picture: updatedArtisan.picture || updatedArtisan.profileImage,
        authProvider: updatedArtisan.authProvider,
        isEmailVerified: updatedArtisan.isEmailVerified
      }
    });
    
  } catch (error) {
    console.error('Complete Artisan Google profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing artisan profile',
      error: error.message
    });
  }
});

// @route   POST /api/artisan/auth/google/unlink
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
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Update artisan to remove Google linkage
    const updatedArtisan = await Artisan.findByIdAndUpdate(
      req.user.userId,
      {
        $unset: { googleId: 1, picture: 1 },
        password: hashedPassword,
        authProvider: 'local'
      },
      { new: true }
    );
    
    if (!updatedArtisan) {
      return res.status(404).json({
        success: false,
        message: 'Artisan not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Google account unlinked successfully. You can now sign in with email and password.'
    });
    
  } catch (error) {
    console.error('Unlink Artisan Google account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unlinking Google account',
      error: error.message
    });
  }
});

module.exports = router;
