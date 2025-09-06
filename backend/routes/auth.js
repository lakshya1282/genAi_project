const express = require('express');
const emailVerificationService = require('../services/emailVerificationService');
const User = require('../models/User');
const Artisan = require('../models/Artisan');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Unified OTP verification endpoint
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, userType } = req.body;

    // Validate required fields
    if (!email || !otp || !userType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, verification code, and user type are required' 
      });
    }

    // Validate userType
    if (!['user', 'artisan'].includes(userType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user type' 
      });
    }

    // Verify OTP and complete registration
    const result = await emailVerificationService.verifyOTP(
      email.toLowerCase().trim(), 
      otp.trim(), 
      userType
    );

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error verifying code', 
      error: error.message 
    });
  }
});

// Unified resend OTP endpoint
router.post('/resend-otp', async (req, res) => {
  try {
    const { email, userType } = req.body;

    // Validate required fields
    if (!email || !userType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and user type are required' 
      });
    }

    // Validate userType
    if (!['user', 'artisan'].includes(userType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user type' 
      });
    }

    const result = await emailVerificationService.resendVerificationOTP(
      email.toLowerCase().trim(), 
      userType
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error resending verification code', 
      error: error.message 
    });
  }
});

// Check email verification status
router.get('/verification-status/:email/:userType', async (req, res) => {
  try {
    const { email, userType } = req.params;

    // Validate userType
    if (!['user', 'artisan'].includes(userType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user type' 
      });
    }

    // Check if user/artisan exists and is verified
    const existingRecord = userType === 'user' 
      ? await User.findOne({ email: email.toLowerCase() })
      : await Artisan.findOne({ email: email.toLowerCase() });

    if (existingRecord) {
      return res.json({
        success: true,
        exists: true,
        isVerified: existingRecord.isEmailVerified || false,
        verifiedAt: existingRecord.emailVerifiedAt || null
      });
    }

    // Check OTP status
    const otpStatus = await emailVerificationService.getOTPStatus(
      email.toLowerCase(), 
      userType
    );

    res.json({
      success: true,
      exists: false,
      pendingVerification: otpStatus.exists,
      otpExpired: otpStatus.isExpired || false,
      attempts: otpStatus.attempts || 0
    });
  } catch (error) {
    console.error('Verification status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error checking verification status', 
      error: error.message 
    });
  }
});

// Login with email verification check
router.post('/login', async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    // Validate required fields
    if (!email || !password || !userType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, password, and user type are required' 
      });
    }

    // Validate userType
    if (!['user', 'artisan'].includes(userType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user type' 
      });
    }

    // Find user/artisan
    const bcrypt = require('bcryptjs');
    const record = userType === 'user' 
      ? await User.findOne({ email: email.toLowerCase() })
      : await Artisan.findOne({ email: email.toLowerCase() });

    if (!record) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, record.password);
    if (!validPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check if email is verified
    if (!record.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before logging in',
        requiresVerification: true,
        email: record.email,
        userType: userType
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      userType === 'user' 
        ? { id: record._id, email: record.email, type: 'user' }
        : { id: record._id, userType: 'artisan' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    // Return success response
    const responseData = {
      success: true,
      message: 'Login successful',
      token,
      isEmailVerified: true
    };

    if (userType === 'user') {
      responseData.user = {
        id: record._id,
        name: record.name,
        email: record.email,
        phone: record.phone,
        isEmailVerified: record.isEmailVerified,
        authProvider: record.authProvider || 'local',
        picture: record.picture || record.profileImage
      };
    } else {
      responseData.artisan = {
        id: record._id,
        name: record.name,
        email: record.email,
        craftType: record.craftType,
        isEmailVerified: record.isEmailVerified
      };
    }

    res.json(responseData);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error logging in', 
      error: error.message 
    });
  }
});

// Admin endpoint to get OTP statistics (protected route)
router.get('/admin/otp-stats', async (req, res) => {
  try {
    // This should be protected with admin authentication in production
    const OTPVerification = require('../models/OTPVerification');
    
    const stats = await OTPVerification.aggregate([
      {
        $group: {
          _id: {
            userType: '$userType',
            verified: '$verified'
          },
          count: { $sum: 1 },
          avgAttempts: { $avg: '$attempts' }
        }
      }
    ]);

    const totalActive = await OTPVerification.countDocuments({ verified: false });
    const totalExpired = await OTPVerification.countDocuments({ 
      expiresAt: { $lt: new Date() } 
    });

    res.json({
      success: true,
      stats: stats,
      summary: {
        activeOTPs: totalActive,
        expiredOTPs: totalExpired
      }
    });
  } catch (error) {
    console.error('OTP stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching OTP statistics', 
      error: error.message 
    });
  }
});

// Cleanup expired OTPs (admin endpoint)
router.post('/admin/cleanup-otps', async (req, res) => {
  try {
    const cleanedCount = await emailVerificationService.cleanupExpiredOTPs();
    
    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} expired OTP records`
    });
  } catch (error) {
    console.error('OTP cleanup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error cleaning up OTPs', 
      error: error.message 
    });
  }
});

module.exports = router;
