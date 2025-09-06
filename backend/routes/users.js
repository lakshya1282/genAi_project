const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const notificationService = require('../services/notificationService');
const emailVerificationService = require('../services/emailVerificationService');

const router = express.Router();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Step 1: Register new user (send OTP)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter a valid email address' 
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Hash password for temporary storage
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Prepare user data for temporary storage
    const userData = {
      name: name.trim(),
      password: hashedPassword,
      phone: phone.trim()
    };

    // Send OTP via email verification service
    const result = await emailVerificationService.sendVerificationOTP(
      email.toLowerCase().trim(), 
      'user', 
      userData
    );

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        requiresVerification: true,
        email: email.toLowerCase().trim(),
        expiresIn: result.expiresIn
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing registration', 
      error: error.message 
    });
  }
});

// Step 2: Verify OTP and complete registration
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate required fields
    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and verification code are required' 
      });
    }

    // Verify OTP and complete registration
    const result = await emailVerificationService.verifyOTP(
      email.toLowerCase().trim(), 
      otp.trim(), 
      'user'
    );

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error verifying email', 
      error: error.message 
    });
  }
});

// Resend verification OTP
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    const result = await emailVerificationService.resendVerificationOTP(
      email.toLowerCase().trim(), 
      'user'
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error resending verification code', 
      error: error.message 
    });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, type: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, phone, addresses, preferences } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (addresses) updateData.addresses = addresses;
    if (preferences) updateData.preferences = preferences;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

// Add address
router.post('/addresses', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // If this is the first address or marked as default, make it default
    if (user.addresses.length === 0 || req.body.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
      req.body.isDefault = true;
    }

    user.addresses.push(req.body);
    await user.save();

    res.json({
      success: true,
      message: 'Address added successfully',
      addresses: user.addresses
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding address', error: error.message });
  }
});

// Get user cart - redirected to new Cart API
router.get('/cart', verifyToken, async (req, res) => {
  res.status(410).json({
    success: false,
    message: 'This cart endpoint has been moved. Please use /api/cart instead.',
    redirect: '/api/cart'
  });
});

// Add to cart - redirected to new Cart API
router.post('/cart', verifyToken, async (req, res) => {
  res.status(410).json({
    success: false,
    message: 'This cart endpoint has been moved. Please use /api/cart/items instead.',
    redirect: '/api/cart/items'
  });
});

// Legacy cart routes - redirected to new Cart API
router.put('/cart/:productId', verifyToken, (req, res) => {
  res.status(410).json({
    success: false,
    message: 'This cart endpoint has been moved. Please use /api/cart/items instead.',
    redirect: '/api/cart/items'
  });
});

router.delete('/cart/:productId', verifyToken, (req, res) => {
  res.status(410).json({
    success: false,
    message: 'This cart endpoint has been moved. Please use /api/cart/items/:productId instead.',
    redirect: '/api/cart/items'
  });
});

router.delete('/cart', verifyToken, (req, res) => {
  res.status(410).json({
    success: false,
    message: 'This cart endpoint has been moved. Please use /api/cart/clear instead.',
    redirect: '/api/cart/clear'
  });
});

// Add to wishlist
router.post('/wishlist/:productId', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.wishlist.includes(req.params.productId)) {
      user.wishlist.push(req.params.productId);
      await user.save();
    }

    res.json({
      success: true,
      message: 'Item added to wishlist'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding to wishlist', error: error.message });
  }
});

// Remove from wishlist
router.delete('/wishlist/:productId', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productId);
    await user.save();

    res.json({
      success: true,
      message: 'Item removed from wishlist'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error removing from wishlist', error: error.message });
  }
});

// Get wishlist
router.get('/wishlist', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'wishlist',
      populate: {
        path: 'artisan',
        select: 'name craftType location'
      }
    });

    res.json({
      success: true,
      wishlist: user.wishlist
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching wishlist', error: error.message });
  }
});

module.exports = router;
