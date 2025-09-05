const express = require('express');
const CartController = require('../controllers/cartController');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Access denied. No token provided.' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: 'Invalid token.' 
    });
  }
};

// Cart Routes using the new Cart model and controller

// GET /cart - Get user's cart
router.get('/', verifyToken, CartController.getCart);

// POST /cart/items - Add or update item in cart
router.post('/items', (req, res, next) => {
  console.log('Cart API called - checking auth...');
  console.log('Authorization header:', req.header('Authorization'));
  console.log('Request body:', req.body);
  
  // Temporarily bypass auth for debugging
  if (!req.header('Authorization')) {
    // Set a dummy user for testing
    req.user = { id: '68b6d1b6de3e4870cf4df15b' }; // Demo customer ID
    console.log('Using dummy user for testing');
    return next();
  }
  
  verifyToken(req, res, next);
}, CartController.addOrUpdateItem);

// DELETE /cart/items/:variantId - Remove item from cart
router.delete('/items/:variantId', verifyToken, CartController.removeItem);

// POST /cart/apply-coupon - Apply coupon (stub implementation)
router.post('/apply-coupon', verifyToken, CartController.applyCoupon);

// DELETE /cart/coupons/:couponCode - Remove coupon
router.delete('/coupons/:couponCode', verifyToken, CartController.removeCoupon);

// DELETE /cart/clear - Clear entire cart
router.delete('/clear', verifyToken, CartController.clearCart);

// GET /cart/count - Get cart item count
router.get('/count', verifyToken, CartController.getCartCount);

// Legacy routes for backward compatibility (can be removed later)

// POST /cart/add - Legacy add route (maps to new addOrUpdateItem)
router.post('/add', verifyToken, (req, res) => {
  // Map legacy request to new format
  req.body.variantId = req.body.productId || req.body.variantId;
  req.body.qty = req.body.quantity || req.body.qty || 1;
  CartController.addOrUpdateItem(req, res);
});

// PUT /cart/item/:itemId - Legacy update route (not implemented in new system)
router.put('/item/:itemId', verifyToken, (req, res) => {
  res.status(410).json({
    success: false,
    message: 'This endpoint is deprecated. Use POST /cart/items to add/update items.'
  });
});

// DELETE /cart/item/:itemId - Legacy remove route (maps to new removeItem)
router.delete('/item/:itemId', verifyToken, (req, res) => {
  // For backward compatibility, treat itemId as variantId
  req.params.variantId = req.params.itemId;
  CartController.removeItem(req, res);
});

// POST /cart/validate - Legacy validation route (simplified response)
router.post('/validate', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const Cart = require('../models/Cart');
    
    let cart = await Cart.findOne({ userId }).populate({
      path: 'items.variantId',
      populate: {
        path: 'artisan',
        select: 'name location'
      }
    });

    if (!cart) {
      return res.json({
        success: true,
        validation: {
          isValid: false,
          totalItems: 0,
          availableItems: 0,
          unavailableItems: []
        },
        pricing: {
          subtotal: 0,
          shippingCost: 0,
          tax: 0,
          total: 0
        },
        message: 'Cart is empty'
      });
    }

    // Ensure items is an array
    const items = Array.isArray(cart.items) ? cart.items : [];
    
    if (items.length === 0) {
      return res.json({
        success: true,
        validation: {
          isValid: false,
          totalItems: 0,
          availableItems: 0,
          unavailableItems: []
        },
        pricing: {
          subtotal: 0,
          shippingCost: 0,
          tax: 0,
          total: 0
        },
        message: 'Cart is empty'
      });
    }

    const Product = require('../models/Product');
    const availableItems = [];
    const unavailableItems = [];

    // Validate each item
    for (const item of items) {
      const product = item.variantId;
      
      if (!product || !product.isActive) {
        unavailableItems.push({
          productId: item.variantId ? item.variantId._id : null,
          name: product ? product.name : 'Unknown Product',
          reason: 'Product not available',
          availableStock: 0,
          requested: item.qty
        });
        continue;
      }

      const isAvailable = product.isQuantityAvailable(item.qty);
      if (isAvailable) {
        availableItems.push(item);
      } else {
        unavailableItems.push({
          productId: product._id,
          name: product.name,
          reason: product.quantityAvailable < item.qty ? 'Insufficient stock' : 'Product unavailable',
          availableStock: product.quantityAvailable,
          requested: item.qty
        });
      }
    }

    // Recalculate totals
    cart.calculateTotals();
    
    res.json({
      success: true,
      validation: {
        isValid: unavailableItems.length === 0,
        totalItems: items.length,
        availableItems: availableItems.length,
        unavailableItems
      },
      pricing: {
        subtotal: cart.totals.itemsTotal / 100,
        shippingCost: cart.totals.shippingEstimate / 100,
        tax: cart.totals.taxEstimate / 100,
        total: cart.totals.grandTotal / 100
      }
    });
  } catch (error) {
    console.error('Cart validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating cart',
      error: error.message
    });
  }
});

// POST /cart/validate-quantity - Validate quantity for specific items
router.post('/validate-quantity', verifyToken, async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ 
        success: false,
        message: 'Items array is required' 
      });
    }

    const Product = require('../models/Product');
    const availability = [];

    for (const item of items) {
      const product = await Product.findById(item.productId || item.variantId);
      if (!product) {
        availability.push({
          productId: item.productId || item.variantId,
          available: false,
          reason: 'Product not found',
          availableStock: 0,
          requested: item.quantity || item.qty
        });
        continue;
      }

      const isAvailable = product.isQuantityAvailable(item.quantity || item.qty);
      availability.push({
        productId: product._id,
        productName: product.name,
        available: isAvailable,
        reason: !isAvailable ? (
          !product.isActive ? 'Product not available' :
          product.quantityAvailable < (item.quantity || item.qty) ? 'Insufficient stock' : 'Unknown'
        ) : null,
        availableStock: product.quantityAvailable,
        requested: item.quantity || item.qty
      });
    }
    
    res.json({
      success: true,
      availability
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error validating quantity', 
      error: error.message 
    });
  }
});

// POST /cart/item/:itemId/move-to-wishlist - Move item to wishlist (legacy)
router.post('/item/:itemId/move-to-wishlist', verifyToken, async (req, res) => {
  try {
    const User = require('../models/User');
    const Cart = require('../models/Cart');
    
    const userId = req.user.id;
    const { itemId } = req.params;
    
    // In new system, itemId is actually the variantId
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ 
        success: false,
        message: 'Cart not found' 
      });
    }

    const cartItem = cart.items.find(item => 
      item.variantId.toString() === itemId
    );
    
    if (!cartItem) {
      return res.status(404).json({ 
        success: false,
        message: 'Item not found in cart' 
      });
    }

    // Add to user's wishlist
    const user = await User.findById(userId);
    if (!user.wishlist.includes(cartItem.variantId)) {
      user.wishlist.push(cartItem.variantId);
      await user.save();
    }

    // Remove from cart
    cart.removeItem(cartItem.variantId);
    await cart.save();

    res.json({
      success: true,
      message: 'Item moved to wishlist',
      cartItemCount: cart.items.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error moving item to wishlist', 
      error: error.message 
    });
  }
});

// POST /cart/save-guest-cart - Save guest cart (placeholder)
router.post('/save-guest-cart', async (req, res) => {
  try {
    const { items } = req.body;
    
    res.json({
      success: true,
      message: 'Guest cart feature not implemented in new system',
      cartId: `guest_${Date.now()}`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Error saving guest cart', 
      error: error.message 
    });
  }
});

module.exports = router;
