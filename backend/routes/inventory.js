const express = require('express');
const inventoryService = require('../services/inventoryService');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware to verify artisan JWT token
const verifyArtisanToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'artisan') {
      return res.status(403).json({ message: 'Access denied. Artisan token required.' });
    }
    req.artisan = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Get inventory summary for artisan
router.get('/summary', verifyArtisanToken, async (req, res) => {
  try {
    const summary = await inventoryService.getInventorySummary(req.artisan.id);
    
    if (summary.success) {
      res.json({
        success: true,
        summary: summary.summary
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error fetching inventory summary',
        error: summary.error
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching inventory summary', error: error.message });
  }
});

// Get low stock products
router.get('/low-stock', verifyArtisanToken, async (req, res) => {
  try {
    const result = await inventoryService.getLowStockProducts(req.artisan.id);
    
    if (result.success) {
      res.json({
        success: true,
        products: result.products,
        count: result.products.length
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error fetching low stock products',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching low stock products', error: error.message });
  }
});

// Update stock for a specific product
router.put('/product/:productId/stock', verifyArtisanToken, async (req, res) => {
  try {
    const { stock } = req.body;
    
    if (typeof stock !== 'number' || stock < 0) {
      return res.status(400).json({ message: 'Stock must be a non-negative number' });
    }

    const result = await inventoryService.updateStock(req.params.productId, stock, req.artisan.id);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          oldStock: result.oldStock,
          newStock: result.newStock,
          isOutOfStock: result.isOutOfStock
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Error updating stock'
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error updating stock', error: error.message });
  }
});

// Bulk update stock for multiple products
router.put('/bulk-update', verifyArtisanToken, async (req, res) => {
  try {
    const { updates } = req.body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: 'Updates array is required' });
    }

    // Validate updates
    for (const update of updates) {
      if (!update.productId || typeof update.newStock !== 'number' || update.newStock < 0) {
        return res.status(400).json({ 
          message: 'Each update must have productId and newStock (non-negative number)' 
        });
      }
    }

    const results = await inventoryService.bulkUpdateStock(updates, req.artisan.id);
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;
    
    res.json({
      success: true,
      message: `Updated ${successCount} products successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Error performing bulk update', error: error.message });
  }
});

// Get product details with inventory info
router.get('/product/:productId', verifyArtisanToken, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.productId,
      artisan: req.artisan.id
    }).select('name quantityAvailable lowStockThreshold isOutOfStock price views likes createdAt');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      success: true,
      product: {
        ...product.toObject(),
        availableStock: product.quantityAvailable,
        isLowStock: product.quantityAvailable <= product.lowStockThreshold,
        stockValue: product.quantityAvailable * product.price
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
});

// Update product inventory settings (low stock threshold)
router.put('/product/:productId/settings', verifyArtisanToken, async (req, res) => {
  try {
    const { lowStockThreshold } = req.body;
    
    if (typeof lowStockThreshold !== 'number' || lowStockThreshold < 0) {
      return res.status(400).json({ message: 'Low stock threshold must be a non-negative number' });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.productId, artisan: req.artisan.id },
      { lowStockThreshold },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      success: true,
      message: 'Inventory settings updated successfully',
      product: {
        id: product._id,
        name: product.name,
        lowStockThreshold: product.lowStockThreshold,
        quantityAvailable: product.quantityAvailable,
        isLowStock: product.quantityAvailable <= product.lowStockThreshold
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating inventory settings', error: error.message });
  }
});

// Get stock movement history (for future implementation)
router.get('/product/:productId/history', verifyArtisanToken, async (req, res) => {
  try {
    // This would require a StockMovement model to track changes
    // For now, return placeholder data
    res.json({
      success: true,
      message: 'Stock history feature coming soon',
      history: []
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock history', error: error.message });
  }
});

// Check stock availability for specific products
router.post('/check-availability', verifyArtisanToken, async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    const availability = await inventoryService.checkStockAvailability(items);
    
    res.json({
      success: true,
      availability,
      summary: {
        total: availability.length,
        available: availability.filter(item => item.available).length,
        unavailable: availability.filter(item => !item.available).length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking availability', error: error.message });
  }
});

// Get artisan's products with inventory info
router.get('/products', verifyArtisanToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, filter = 'all', sort = 'name' } = req.query;
    
    let query = { artisan: req.artisan.id, isActive: true };
    
    // Apply filters
    switch (filter) {
      case 'lowStock':
        query.$expr = { $lte: ['$quantityAvailable', '$lowStockThreshold'] };
        break;
      case 'outOfStock':
        query.quantityAvailable = 0;
        break;
      case 'inStock':
        query.stock = { $gt: 0 };
        break;
    }
    
    // Determine sort order
    let sortOptions = {};
    switch (sort) {
      case 'stock':
        sortOptions.stock = 1;
        break;
      case 'lowStock':
        sortOptions = { stock: 1, lowStockThreshold: -1 };
        break;
      case 'name':
      default:
        sortOptions.name = 1;
        break;
    }
    
    const products = await Product.find(query)
      .select('name stock reservedStock lowStockThreshold isOutOfStock price images views likes createdAt')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const totalCount = await Product.countDocuments(query);
    
    const productsWithInventoryInfo = products.map(product => ({
      ...product.toObject(),
      availableStock: product.availableStock,
      isLowStock: product.isLowStock,
      stockValue: product.stock * product.price
    }));
    
    res.json({
      success: true,
      products: productsWithInventoryInfo,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
        totalCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

module.exports = router;
