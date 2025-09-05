const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware to verify JWT token for customers
const verifyCustomerToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid token.' });
  }
};

// GET /api/coupons/available - Get available coupons for customer
router.get('/available', verifyCustomerToken, async (req, res) => {
  try {
    // Demo coupons - in real app, these would come from a Coupons collection
    const availableCoupons = [
      {
        id: 'WELCOME10',
        code: 'WELCOME10',
        title: 'Welcome Offer',
        description: '10% off on your first order',
        discount: 10,
        type: 'percentage',
        minOrderValue: 500,
        maxDiscount: 200,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        termsAndConditions: [
          'Valid for new customers only',
          'Cannot be combined with other offers',
          'Minimum order value ₹500'
        ],
        isActive: true
      },
      {
        id: 'FLAT100',
        code: 'FLAT100',
        title: 'Flat ₹100 Off',
        description: 'Flat ₹100 off on orders above ₹1000',
        discount: 100,
        type: 'fixed',
        minOrderValue: 1000,
        maxDiscount: 100,
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        termsAndConditions: [
          'Valid on orders above ₹1000',
          'Cannot be combined with other offers',
          'Valid for limited time'
        ],
        isActive: true
      },
      {
        id: 'ARTISAN20',
        code: 'ARTISAN20',
        title: 'Artisan Special',
        description: '20% off on handcrafted items',
        discount: 20,
        type: 'percentage',
        minOrderValue: 800,
        maxDiscount: 500,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        termsAndConditions: [
          'Valid on handcrafted products only',
          'Maximum discount ₹500',
          'Minimum order value ₹800'
        ],
        isActive: true
      },
      {
        id: 'FESTIVAL25',
        code: 'FESTIVAL25',
        title: 'Festival Sale',
        description: '25% off on festival collection',
        discount: 25,
        type: 'percentage',
        minOrderValue: 1500,
        maxDiscount: 1000,
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
        termsAndConditions: [
          'Valid on festival collection only',
          'Maximum discount ₹1000',
          'Limited time offer'
        ],
        isActive: true
      }
    ];

    res.json({
      success: true,
      coupons: availableCoupons
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching coupons', error: error.message });
  }
});

// GET /api/coupons/my-coupons - Get user's collected coupons
router.get('/my-coupons', verifyCustomerToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('coupons');
    
    const coupons = user.coupons.map(coupon => ({
      id: coupon._id,
      code: coupon.code,
      discount: coupon.discount,
      type: coupon.type,
      expiresAt: coupon.expiresAt,
      isUsed: coupon.isUsed,
      usedAt: coupon.usedAt,
      isExpired: new Date() > new Date(coupon.expiresAt)
    }));

    const activeCoupons = coupons.filter(c => !c.isUsed && !c.isExpired);
    const usedCoupons = coupons.filter(c => c.isUsed);
    const expiredCoupons = coupons.filter(c => !c.isUsed && c.isExpired);

    res.json({
      success: true,
      coupons: {
        active: activeCoupons,
        used: usedCoupons,
        expired: expiredCoupons,
        total: coupons.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching my coupons', error: error.message });
  }
});

// POST /api/coupons/collect - Collect a coupon
router.post('/collect', verifyCustomerToken, async (req, res) => {
  try {
    const { couponCode } = req.body;
    
    if (!couponCode) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const user = await User.findById(req.user.id);
    
    // Check if user already has this coupon
    const existingCoupon = user.coupons.find(c => c.code === couponCode.toUpperCase());
    if (existingCoupon) {
      return res.status(400).json({ success: false, message: 'You already have this coupon' });
    }

    // Demo coupon validation - in real app, validate against Coupons collection
    const validCoupons = {
      'WELCOME10': { discount: 10, type: 'percentage', expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      'FLAT100': { discount: 100, type: 'fixed', expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
      'ARTISAN20': { discount: 20, type: 'percentage', expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      'FESTIVAL25': { discount: 25, type: 'percentage', expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) }
    };

    const couponData = validCoupons[couponCode.toUpperCase()];
    if (!couponData) {
      return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    }

    // Add coupon to user's collection
    user.coupons.push({
      code: couponCode.toUpperCase(),
      discount: couponData.discount,
      type: couponData.type,
      expiresAt: couponData.expiresAt,
      isUsed: false
    });

    await user.save();

    res.json({
      success: true,
      message: 'Coupon collected successfully!',
      coupon: {
        code: couponCode.toUpperCase(),
        discount: couponData.discount,
        type: couponData.type,
        expiresAt: couponData.expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error collecting coupon', error: error.message });
  }
});

// POST /api/coupons/validate - Validate coupon for checkout
router.post('/validate', verifyCustomerToken, async (req, res) => {
  try {
    const { couponCode, orderTotal } = req.body;
    
    if (!couponCode) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const user = await User.findById(req.user.id);
    const coupon = user.coupons.find(c => c.code === couponCode.toUpperCase() && !c.isUsed);
    
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found or already used' });
    }

    if (new Date() > new Date(coupon.expiresAt)) {
      return res.status(400).json({ success: false, message: 'Coupon has expired' });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = Math.round((orderTotal * coupon.discount) / 100);
      // Apply max discount limits based on coupon
      if (coupon.code === 'WELCOME10') discountAmount = Math.min(discountAmount, 200);
      if (coupon.code === 'ARTISAN20') discountAmount = Math.min(discountAmount, 500);
      if (coupon.code === 'FESTIVAL25') discountAmount = Math.min(discountAmount, 1000);
    } else {
      discountAmount = coupon.discount;
    }

    res.json({
      success: true,
      isValid: true,
      discountAmount,
      coupon: {
        code: coupon.code,
        discount: coupon.discount,
        type: coupon.type,
        expiresAt: coupon.expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error validating coupon', error: error.message });
  }
});

module.exports = router;
