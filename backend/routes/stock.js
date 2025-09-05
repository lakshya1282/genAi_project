const express = require('express');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware to verify JWT token (optional for stock info)
const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Continue without user info if token is invalid
    }
  }
  
  next();
};

// GET /stock/:productId - Get real-time stock information
router.get('/:productId', optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user?.id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const stockInfo = product.getStockInfoForUser(userId);
    
    res.json({
      success: true,
      stockInfo: {
        productId: product._id,
        productName: product.name,
        ...stockInfo,
        lastUpdated: new Date(),
        pricePerUnit: product.price
      }
    });
  } catch (error) {
    console.error('Get stock info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock information',
      error: error.message
    });
  }
});

// POST /stock/:productId/check - Check if specific quantity is available
router.post('/:productId/check', optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = req.user?.id;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity is required'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const stockInfo = product.getStockInfoForUser(userId);
    const isAvailable = product.isQuantityAvailable(quantity, userId);
    
    res.json({
      success: true,
      availability: {
        productId: product._id,
        requestedQuantity: quantity,
        isAvailable,
        availableStock: stockInfo.availableStock,
        totalStock: stockInfo.totalStock,
        reservedByOthers: stockInfo.reservedByOthers,
        userReservation: stockInfo.userReservation,
        stockStatus: stockInfo.stockStatus,
        reason: !isAvailable ? (
          !product.isActive ? 'Product not available' :
          stockInfo.isOutOfStock ? 'Out of stock' :
          stockInfo.availableStock < quantity ? `Only ${stockInfo.availableStock} available` : 'Unknown'
        ) : null,
        maxQuantityAvailable: stockInfo.availableStock,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Check stock availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking stock availability',
      error: error.message
    });
  }
});

// POST /stock/:productId/reserve - Reserve stock temporarily
router.post('/:productId/reserve', optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, reason = 'cart', durationMinutes = 15 } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to reserve stock'
      });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity is required'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    try {
      await product.reserveStockForUser(userId, quantity, reason, durationMinutes);
      const stockInfo = product.getStockInfoForUser(userId);
      
      res.json({
        success: true,
        message: `${quantity} items reserved successfully`,
        reservation: {
          productId: product._id,
          quantity,
          reason,
          expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
          stockInfo
        }
      });
    } catch (reservationError) {
      const stockInfo = product.getStockInfoForUser(userId);
      res.status(400).json({
        success: false,
        message: reservationError.message,
        stockInfo
      });
    }
  } catch (error) {
    console.error('Reserve stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reserving stock',
      error: error.message
    });
  }
});

// DELETE /stock/:productId/release - Release reserved stock
router.delete('/:productId/release', optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to release stock'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await product.releaseStockForUser(userId, reason);
    const stockInfo = product.getStockInfoForUser(userId);
    
    res.json({
      success: true,
      message: 'Stock reservation released successfully',
      stockInfo
    });
  } catch (error) {
    console.error('Release stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Error releasing stock',
      error: error.message
    });
  }
});

// GET /stock/:productId/history - Get stock history (admin/artisan only)
router.get('/:productId/history', optionalAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user?.id;

    const product = await Product.findById(productId).populate('artisan', 'name');
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user is the artisan who owns this product
    if (!userId || product.artisan._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only the product owner can view stock history'
      });
    }

    res.json({
      success: true,
      stockHistory: product.stockHistory,
      currentStock: {
        total: product.quantityAvailable + product.quantitySold,
        available: product.quantityAvailable,
        reserved: 0 // No reservation system in current implementation
      }
    });
  } catch (error) {
    console.error('Get stock history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock history',
      error: error.message
    });
  }
});

module.exports = router;
