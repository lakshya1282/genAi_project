const express = require('express');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
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
    if (decoded.userType && decoded.userType !== 'customer') {
      return res.status(403).json({ success: false, message: 'Access denied. Customer token required.' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid token.' });
  }
};

// ======================
// PROFILE MANAGEMENT
// ======================

// GET /api/customer/profile - Get user profile
router.get('/profile', verifyCustomerToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        addresses: user.addresses,
        preferences: user.preferences,
        accountSettings: user.accountSettings,
        joinedDate: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching profile', error: error.message });
  }
});

// PUT /api/customer/profile - Update user profile
router.put('/profile', verifyCustomerToken, async (req, res) => {
  try {
    const { name, phone, profileImage, preferences, accountSettings } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (phone) updateData.phone = phone;
    if (profileImage) updateData.profileImage = profileImage;
    if (preferences) updateData.preferences = { ...updateData.preferences, ...preferences };
    if (accountSettings) updateData.accountSettings = { ...updateData.accountSettings, ...accountSettings };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        preferences: user.preferences,
        accountSettings: user.accountSettings
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating profile', error: error.message });
  }
});

// ======================
// ADDRESS MANAGEMENT
// ======================

// GET /api/customer/addresses - Get user addresses
router.get('/addresses', verifyCustomerToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('addresses');
    res.json({
      success: true,
      addresses: user.addresses || []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching addresses', error: error.message });
  }
});

// POST /api/customer/addresses - Add new address
router.post('/addresses', verifyCustomerToken, async (req, res) => {
  try {
    const { type, street, city, state, country, pincode, isDefault } = req.body;
    
    if (!street || !city || !state || !pincode) {
      return res.status(400).json({ success: false, message: 'Street, city, state, and pincode are required' });
    }

    const user = await User.findById(req.user.id);
    
    // If this is set as default, unset other defaults
    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    user.addresses.push({
      type: type || 'home',
      street,
      city,
      state,
      country: country || 'India',
      pincode,
      isDefault: isDefault || user.addresses.length === 0
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      addresses: user.addresses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding address', error: error.message });
  }
});

// PUT /api/customer/addresses/:addressId - Update address
router.put('/addresses/:addressId', verifyCustomerToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const address = user.addresses.id(req.params.addressId);
    
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    const { type, street, city, state, country, pincode, isDefault } = req.body;
    
    if (type) address.type = type;
    if (street) address.street = street;
    if (city) address.city = city;
    if (state) address.state = state;
    if (country) address.country = country;
    if (pincode) address.pincode = pincode;
    
    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
      address.isDefault = true;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Address updated successfully',
      addresses: user.addresses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating address', error: error.message });
  }
});

// DELETE /api/customer/addresses/:addressId - Delete address
router.delete('/addresses/:addressId', verifyCustomerToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const address = user.addresses.id(req.params.addressId);
    
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    const wasDefault = address.isDefault;
    address.deleteOne();

    // If deleted address was default, make first remaining address default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Address deleted successfully',
      addresses: user.addresses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting address', error: error.message });
  }
});

// ======================
// WISHLIST MANAGEMENT
// ======================

// GET /api/customer/wishlist - Get user wishlist
router.get('/wishlist', verifyCustomerToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'wishlist',
      populate: {
        path: 'artisan',
        select: 'name location'
      }
    });

    res.json({
      success: true,
      wishlist: user.wishlist.map(product => ({
        id: product._id,
        name: product.name,
        price: product.price,
        images: product.images,
        quantityAvailable: product.quantityAvailable,
        isActive: product.isActive,
        artisan: product.artisan,
        addedDate: product.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching wishlist', error: error.message });
  }
});

// POST /api/customer/wishlist - Add product to wishlist
router.post('/wishlist', verifyCustomerToken, async (req, res) => {
  try {
    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const user = await User.findById(req.user.id);
    
    if (user.wishlist.includes(productId)) {
      return res.status(400).json({ success: false, message: 'Product already in wishlist' });
    }

    user.wishlist.push(productId);
    await user.save();

    res.json({
      success: true,
      message: 'Product added to wishlist',
      wishlistCount: user.wishlist.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding to wishlist', error: error.message });
  }
});

// DELETE /api/customer/wishlist/:productId - Remove product from wishlist
router.delete('/wishlist/:productId', verifyCustomerToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.wishlist.includes(req.params.productId)) {
      return res.status(404).json({ success: false, message: 'Product not in wishlist' });
    }

    user.wishlist.pull(req.params.productId);
    await user.save();

    res.json({
      success: true,
      message: 'Product removed from wishlist',
      wishlistCount: user.wishlist.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error removing from wishlist', error: error.message });
  }
});

// ======================
// RECENTLY VIEWED
// ======================

// GET /api/customer/recently-viewed - Get recently viewed products
router.get('/recently-viewed', verifyCustomerToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    const user = await User.findById(req.user.id).populate({
      path: 'recentlyViewed.product',
      populate: {
        path: 'artisan',
        select: 'name location profileImage businessName'
      }
    });

    // Filter out null/deleted products and sort by most recent first
    const validRecentlyViewed = user.recentlyViewed
      .filter(item => item.product) // Filter out null products (deleted items)
      .sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt))
      .slice(skip, skip + limit);

    const recentlyViewed = validRecentlyViewed.map(item => {
      const product = item.product;
      return {
        id: product._id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        discount: product.discount,
        images: product.images || [],
        mainImage: product.images && product.images.length > 0 ? product.images[0] : null,
        category: product.category,
        subcategory: product.subcategory,
        quantityAvailable: product.quantityAvailable,
        isActive: product.isActive,
        rating: product.averageRating || 0,
        reviewCount: product.totalReviews || 0,
        tags: product.tags || [],
        description: product.description ? product.description.substring(0, 150) + '...' : '',
        artisan: {
          id: product.artisan._id,
          name: product.artisan.name,
          businessName: product.artisan.businessName || product.artisan.name,
          location: product.artisan.location,
          profileImage: product.artisan.profileImage
        },
        viewedAt: item.viewedAt,
        isInStock: product.quantityAvailable > 0,
        hasDiscount: product.discount && product.discount > 0,
        formattedPrice: `₹${product.price}`,
        formattedOriginalPrice: product.originalPrice ? `₹${product.originalPrice}` : null,
        viewedAgo: getTimeAgo(item.viewedAt)
      };
    });

    // Count total recently viewed items (excluding deleted products)
    const totalRecentlyViewed = user.recentlyViewed
      .filter(item => item.product).length;

    res.json({
      success: true,
      recentlyViewed,
      pagination: {
        current: page,
        total: Math.ceil(totalRecentlyViewed / limit),
        totalCount: totalRecentlyViewed,
        hasMore: (skip + limit) < totalRecentlyViewed
      },
      summary: {
        totalItems: totalRecentlyViewed,
        itemsInPage: recentlyViewed.length,
        lastViewedAt: recentlyViewed.length > 0 ? recentlyViewed[0].viewedAt : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching recently viewed', error: error.message });
  }
});

// Helper function to format time ago
function getTimeAgo(date) {
  const now = new Date();
  const viewedDate = new Date(date);
  const diffInSeconds = Math.floor((now - viewedDate) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hr ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} day${Math.floor(diffInSeconds / 86400) > 1 ? 's' : ''} ago`;
  return viewedDate.toLocaleDateString();
}

// POST /api/customer/recently-viewed - Add product to recently viewed
router.post('/recently-viewed', verifyCustomerToken, async (req, res) => {
  try {
    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const user = await User.findById(req.user.id);
    
    // Remove if already exists
    user.recentlyViewed = user.recentlyViewed.filter(item => 
      item.product.toString() !== productId
    );
    
    // Add to beginning
    user.recentlyViewed.unshift({
      product: productId,
      viewedAt: new Date()
    });
    
    // Keep only last 50 items
    if (user.recentlyViewed.length > 50) {
      user.recentlyViewed = user.recentlyViewed.slice(0, 50);
    }

    await user.save();

    res.json({
      success: true,
      message: 'Product added to recently viewed',
      totalRecentlyViewed: user.recentlyViewed.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding to recently viewed', error: error.message });
  }
});

// DELETE /api/customer/recently-viewed/:productId - Remove specific item from recently viewed
router.delete('/recently-viewed/:productId', verifyCustomerToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const initialCount = user.recentlyViewed.length;
    
    // Remove the specific product from recently viewed
    user.recentlyViewed = user.recentlyViewed.filter(item => 
      item.product.toString() !== req.params.productId
    );
    
    if (user.recentlyViewed.length === initialCount) {
      return res.status(404).json({ success: false, message: 'Product not found in recently viewed' });
    }

    await user.save();

    res.json({
      success: true,
      message: 'Product removed from recently viewed',
      totalRecentlyViewed: user.recentlyViewed.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error removing from recently viewed', error: error.message });
  }
});

// DELETE /api/customer/recently-viewed - Clear all recently viewed items
router.delete('/recently-viewed', verifyCustomerToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const clearedCount = user.recentlyViewed.length;
    
    user.recentlyViewed = [];
    await user.save();

    res.json({
      success: true,
      message: 'Recently viewed cleared successfully',
      clearedCount,
      totalRecentlyViewed: 0
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error clearing recently viewed', error: error.message });
  }
});

// ======================
// MY ACTIVITY (REVIEWS)
// ======================

// GET /api/customer/my-reviews - Get user's reviews
router.get('/my-reviews', verifyCustomerToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({
      user: req.user.id,
      'reviews.0': { $exists: true }
    })
    .populate('reviews.product', 'name images')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

    const reviews = [];
    orders.forEach(order => {
      order.reviews.forEach(review => {
        reviews.push({
          id: review._id,
          product: review.product,
          rating: review.rating,
          comment: review.comment,
          reviewDate: review.reviewDate,
          orderNumber: order.orderNumber,
          orderDate: order.createdAt
        });
      });
    });

    const totalReviews = await Order.aggregate([
      { $match: { user: req.user.id, 'reviews.0': { $exists: true } } },
      { $unwind: '$reviews' },
      { $count: 'total' }
    ]);

    res.json({
      success: true,
      reviews,
      pagination: {
        current: page,
        total: Math.ceil((totalReviews[0]?.total || 0) / limit),
        totalCount: totalReviews[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching reviews', error: error.message });
  }
});

// ======================
// ORDER HISTORY
// ======================

// GET /api/customer/orders - Get customer orders
router.get('/orders', verifyCustomerToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ user: req.user.id })
      .populate('items.product', 'name images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments({ user: req.user.id });

    res.json({
      success: true,
      orders: orders.map(order => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        items: order.items,
        totalAmount: order.totalAmount,
        deliveryAddress: order.deliveryAddress,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      })),
      pagination: {
        current: page,
        total: Math.ceil(totalOrders / limit),
        totalCount: totalOrders
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching orders', error: error.message });
  }
});

// ======================
// LANGUAGE SETTINGS
// ======================

// PUT /api/customer/language - Update user language preference
router.put('/language', verifyCustomerToken, async (req, res) => {
  try {
    const { language } = req.body;
    
    if (!language) {
      return res.status(400).json({ success: false, message: 'Language code is required' });
    }
    
    // Validate language code against allowed values
    const allowedLanguages = ['en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'or', 'pa', 'as'];
    if (!allowedLanguages.includes(language)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid language code. Allowed languages: ' + allowedLanguages.join(', ')
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 'preferences.language': language },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      message: 'Language updated successfully',
      language: user.preferences.language,
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Language update error:', error);
    res.status(500).json({ success: false, message: 'Error updating language', error: error.message });
  }
});

// ======================
// ENHANCED SETTINGS MENU
// ======================

// GET /api/customer/settings-menu - Get enhanced customer settings menu structure
router.get('/settings-menu', verifyCustomerToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Count user's data for menu badges
    const wishlistCount = user.wishlist?.length || 0;
    const addressesCount = user.addresses?.length || 0;
    const recentlyViewedCount = user.recentlyViewed?.length || 0;
    
    // Count active coupons
    const activeCouponsCount = user.coupons ? 
      user.coupons.filter(c => !c.isUsed && new Date() <= new Date(c.expiresAt)).length : 0;
    
    // Count user reviews
    const reviewsCount = await require('../models/Order').aggregate([
      { $match: { user: user._id, 'reviews.0': { $exists: true } } },
      { $unwind: '$reviews' },
      { $count: 'total' }
    ]);
    const totalReviews = reviewsCount[0]?.total || 0;

    const settingsMenu = {
      userInfo: {
        name: user.name,
        email: user.email,
        profileImage: user.profileImage || null,
        memberSince: user.createdAt
      },
      menuSections: [
        {
          id: 'profile_settings',
          title: 'Profile Settings',
          description: 'Update your personal information',
          icon: '👤',
          endpoint: '/api/customer/profile',
          badge: null,
          priority: 1
        },
        {
          id: 'orders',
          title: 'Orders',
          description: 'View your order history and track deliveries',
          icon: '📦',
          endpoint: '/api/customer/orders',
          badge: null,
          priority: 2
        },
        {
          id: 'wishlist',
          title: 'Wishlist',
          description: 'Manage your saved products',
          icon: '❤️',
          endpoint: '/api/customer/wishlist',
          badge: wishlistCount > 0 ? wishlistCount.toString() : null,
          priority: 3
        },
        {
          id: 'coupons',
          title: 'Coupons',
          description: 'View and use your discount coupons',
          icon: '🎫',
          endpoint: '/api/coupons/my-coupons',
          badge: activeCouponsCount > 0 ? activeCouponsCount.toString() : null,
          priority: 4
        },
        {
          id: 'help_centre',
          title: 'Help Centre',
          description: 'Get support and find answers to your questions',
          icon: '❓',
          endpoint: '/api/help-center/faq',
          badge: null,
          priority: 5
        },
        {
          id: 'recently_viewed',
          title: 'Recently Viewed',
          description: 'Products you recently looked at',
          icon: '👁️',
          endpoint: '/api/customer/recently-viewed',
          badge: recentlyViewedCount > 0 ? recentlyViewedCount.toString() : null,
          priority: 6
        },
        {
          id: 'language',
          title: 'Language',
          description: 'Change your preferred language',
          icon: '🌐',
          endpoint: '/api/customer/language',
          badge: user.preferences?.language?.toUpperCase() || 'EN',
          priority: 7,
          currentValue: user.preferences?.language || 'en',
          options: [
            { code: 'en', name: 'English', nativeName: 'English' },
            { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
            { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
            { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
            { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
            { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
            { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
            { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
            { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
            { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
            { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
            { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' }
          ]
        }
      ],
      accountSettingsSection: {
        id: 'account_settings',
        title: 'Account Settings',
        description: 'Manage your account preferences and security',
        icon: '⚙️',
        priority: 8,
        subsections: [
          {
            id: 'edit_profile',
            title: 'Edit Profile',
            description: 'Update personal information and profile picture',
            endpoint: '/api/customer/profile',
            icon: '✏️'
          },
          {
            id: 'saved_addresses',
            title: 'Saved Addresses',
            description: 'Manage your delivery addresses',
            endpoint: '/api/customer/addresses',
            icon: '📍',
            badge: addressesCount > 0 ? addressesCount.toString() : null
          },
          {
            id: 'language_settings',
            title: 'Language',
            description: 'Select your preferred language',
            endpoint: '/api/customer/language',
            icon: '🌐',
            currentValue: user.preferences?.language || 'en'
          },
          {
            id: 'notifications',
            title: 'Notification Preferences',
            description: 'Configure your notification settings',
            endpoint: '/api/customer/settings',
            icon: '🔔',
            currentSettings: user.preferences?.notifications || {}
          },
          {
            id: 'privacy',
            title: 'Privacy Settings',
            description: 'Control your privacy and data settings',
            endpoint: '/api/customer/settings',
            icon: '🔒',
            currentSettings: user.accountSettings?.privacy || {}
          },
          {
            id: 'security',
            title: 'Security Settings',
            description: 'Two-factor authentication and security options',
            endpoint: '/api/customer/settings',
            icon: '🛡️',
            currentSettings: {
              twoFactorAuth: user.accountSettings?.twoFactorAuth || false,
              newsletter: user.accountSettings?.newsletter || true
            }
          }
        ]
      },
      myActivitySection: {
        id: 'my_activity',
        title: 'My Activity',
        description: 'View your reviews and interactions',
        icon: '📝',
        priority: 9,
        subsections: [
          {
            id: 'posted_reviews',
            title: 'Posted Reviews',
            description: 'Reviews you have written for products',
            endpoint: '/api/customer/my-reviews',
            icon: '⭐',
            badge: totalReviews > 0 ? totalReviews.toString() : null
          }
        ]
      },
      logoutSection: {
        id: 'logout',
        title: 'Logout',
        description: 'Sign out of your account',
        icon: '🚪',
        priority: 10,
        action: 'logout'
      },
      quickActions: [
        {
          id: 'edit_profile_quick',
          title: 'Edit Profile',
          endpoint: '/api/customer/profile',
          icon: '✏️'
        },
        {
          id: 'view_orders_quick',
          title: 'View Orders',
          endpoint: '/api/customer/orders',
          icon: '📦'
        },
        {
          id: 'manage_addresses_quick',
          title: 'Manage Addresses',
          endpoint: '/api/customer/addresses',
          icon: '📍'
        }
      ]
    };

    res.json({
      success: true,
      settingsMenu,
      metadata: {
        lastUpdated: new Date(),
        menuVersion: '1.0',
        userType: 'customer',
        totalMenuItems: settingsMenu.menuSections.length + 
                       settingsMenu.accountSettingsSection.subsections.length + 
                       settingsMenu.myActivitySection.subsections.length + 1 // +1 for logout
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching settings menu', error: error.message });
  }
});

// ======================
// ACCOUNT SETTINGS
// ======================

// PUT /api/customer/settings - Update account settings
router.put('/settings', verifyCustomerToken, async (req, res) => {
  try {
    const { language, currency, notifications, privacy, newsletter, twoFactorAuth } = req.body;
    
    const updateData = {};
    
    if (language) {
      updateData['preferences.language'] = language;
    }
    
    if (currency) {
      updateData['preferences.currency'] = currency;
    }
    
    if (notifications) {
      if (notifications.email !== undefined) updateData['preferences.notifications.email'] = notifications.email;
      if (notifications.sms !== undefined) updateData['preferences.notifications.sms'] = notifications.sms;
      if (notifications.push !== undefined) updateData['preferences.notifications.push'] = notifications.push;
      if (notifications.marketing !== undefined) updateData['preferences.notifications.marketing'] = notifications.marketing;
    }
    
    if (privacy) {
      if (privacy.showProfile !== undefined) updateData['accountSettings.privacy.showProfile'] = privacy.showProfile;
      if (privacy.showOrders !== undefined) updateData['accountSettings.privacy.showOrders'] = privacy.showOrders;
    }
    
    if (newsletter !== undefined) {
      updateData['accountSettings.newsletter'] = newsletter;
    }
    
    if (twoFactorAuth !== undefined) {
      updateData['accountSettings.twoFactorAuth'] = twoFactorAuth;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        language: user.preferences.language,
        currency: user.preferences.currency,
        notifications: user.preferences.notifications,
        privacy: user.accountSettings.privacy,
        newsletter: user.accountSettings.newsletter,
        twoFactorAuth: user.accountSettings.twoFactorAuth
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating settings', error: error.message });
  }
});

module.exports = router;
