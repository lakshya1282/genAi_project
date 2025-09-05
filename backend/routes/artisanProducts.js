const express = require('express');
const Product = require('../models/Product');
const Artisan = require('../models/Artisan');
const inventoryService = require('../services/inventoryService');
const notificationService = require('../services/notificationService');
const multer = require('multer');
const path = require('path');
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
    if (decoded.userType !== 'artisan') {
      return res.status(403).json({ message: 'Access denied. Artisan token required.' });
    }
    req.artisan = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/products/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files
  }
});

// Get artisan's products
router.get('/', verifyArtisanToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'all',
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = { artisan: req.artisan.id };

    // Filter by status
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'outOfStock') {
      query.quantityAvailable = 0;
    } else if (status === 'lowStock') {
      query.$expr = { $lte: ['$quantityAvailable', '$lowStockThreshold'] };
    }

    // Filter by category
    if (category && category !== 'all') {
      query.category = category;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-aiEnhancedDescription -aiGeneratedTags -marketingContent'); // Exclude AI fields for listing

    const totalCount = await Product.countDocuments(query);

    // Add inventory information
    const productsWithInventory = products.map(product => ({
      ...product.toObject(),
      availableStock: product.quantityAvailable,
      isLowStock: product.quantityAvailable <= product.lowStockThreshold,
      stockValue: product.quantityAvailable * product.price,
      stockStatus: product.quantityAvailable === 0 ? 'Out of Stock' : 
                  product.quantityAvailable <= product.lowStockThreshold ? 'Low Stock' : 'In Stock'
    }));

    res.json({
      success: true,
      products: productsWithInventory,
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

// Get single product for editing
router.get('/:productId', verifyArtisanToken, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.productId,
      artisan: req.artisan.id
    });

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

// Create new product
router.post('/', verifyArtisanToken, upload.array('images', 10), async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      materials,
      dimensions,
      isCustomizable,
      customizationOptions,
      quantityAvailable,
      lowStockThreshold,
      craftingTime,
      tags,
      specialInstructions
    } = req.body;

    // Validation
    if (!name || !description || !price || !category) {
      return res.status(400).json({ 
        message: 'Name, description, price, and category are required' 
      });
    }

    if (price <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0' });
    }

    if (quantityAvailable < 0) {
      return res.status(400).json({ message: 'Stock cannot be negative' });
    }

    // Process uploaded images
    const imageUrls = req.files ? req.files.map(file => `/uploads/products/${file.filename}`) : [];

    // Parse arrays from form data
    const parsedMaterials = materials ? (Array.isArray(materials) ? materials : materials.split(',').map(m => m.trim())) : [];
    const parsedTags = tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [];
    const parsedCustomizationOptions = customizationOptions ? 
      (Array.isArray(customizationOptions) ? customizationOptions : customizationOptions.split(',').map(o => o.trim())) : [];

    // Parse dimensions
    let parsedDimensions = {};
    if (dimensions) {
      if (typeof dimensions === 'string') {
        try {
          parsedDimensions = JSON.parse(dimensions);
        } catch (e) {
          parsedDimensions = {};
        }
      } else {
        parsedDimensions = dimensions;
      }
    }

    const productData = {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category,
      artisan: req.artisan.id,
      materials: parsedMaterials,
      dimensions: parsedDimensions,
      isCustomizable: isCustomizable === 'true' || isCustomizable === true,
      customizationOptions: parsedCustomizationOptions,
      quantityAvailable: parseInt(quantityAvailable) || 1,
      lowStockThreshold: parseInt(lowStockThreshold) || 5,
      craftingTime,
      tags: parsedTags,
      images: imageUrls,
      isActive: true
    };

    // Validate required artisan exists
    const artisan = await Artisan.findById(req.artisan.id);
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan not found' });
    }

    const product = new Product(productData);
    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate('artisan', 'name location craftType rating');

    // Update artisan's product count
    await Artisan.findByIdAndUpdate(req.artisan.id, {
      $inc: { totalProducts: 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: {
        ...populatedProduct.toObject(),
        availableStock: populatedProduct.quantityAvailable,
        isLowStock: populatedProduct.quantityAvailable <= populatedProduct.lowStockThreshold,
        stockValue: populatedProduct.quantityAvailable * populatedProduct.price
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error creating product', 
      error: error.message 
    });
  }
});

// Update product
router.put('/:productId', verifyArtisanToken, upload.array('newImages', 10), async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      materials,
      dimensions,
      isCustomizable,
      customizationOptions,
      quantityAvailable,
      lowStockThreshold,
      craftingTime,
      tags,
      isActive,
      existingImages, // Array of existing image URLs to keep
      removeImages // Array of image URLs to remove
    } = req.body;

    const product = await Product.findOne({
      _id: req.params.productId,
      artisan: req.artisan.id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Process new uploaded images
    const newImageUrls = req.files ? req.files.map(file => `/uploads/products/${file.filename}`) : [];

    // Handle image management
    let finalImages = [];
    
    // Add existing images that are not being removed
    if (existingImages) {
      const keepImages = Array.isArray(existingImages) ? existingImages : existingImages.split(',');
      const removeImagesList = removeImages ? (Array.isArray(removeImages) ? removeImages : removeImages.split(',')) : [];
      
      finalImages = product.images.filter(img => 
        keepImages.includes(img) && !removeImagesList.includes(img)
      );
    } else {
      finalImages = product.images;
    }

    // Add new images
    finalImages = [...finalImages, ...newImageUrls];

    // Parse arrays from form data
    const parsedMaterials = materials ? (Array.isArray(materials) ? materials : materials.split(',').map(m => m.trim())) : product.materials;
    const parsedTags = tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : product.tags;
    const parsedCustomizationOptions = customizationOptions ? 
      (Array.isArray(customizationOptions) ? customizationOptions : customizationOptions.split(',').map(o => o.trim())) : product.customizationOptions;

    // Parse dimensions
    let parsedDimensions = product.dimensions;
    if (dimensions) {
      if (typeof dimensions === 'string') {
        try {
          parsedDimensions = JSON.parse(dimensions);
        } catch (e) {
          // Keep existing dimensions if parsing fails
        }
      } else {
        parsedDimensions = dimensions;
      }
    }

    // Validate price and stock changes
    if (price !== undefined && price <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0' });
    }

    if (quantityAvailable !== undefined && quantityAvailable < 0) {
      return res.status(400).json({ message: 'Stock cannot be negative' });
    }

    // Update product
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (price !== undefined) updateData.price = parseFloat(price);
    if (category !== undefined) updateData.category = category;
    if (materials !== undefined) updateData.materials = parsedMaterials;
    if (dimensions !== undefined) updateData.dimensions = parsedDimensions;
    if (isCustomizable !== undefined) updateData.isCustomizable = isCustomizable === 'true' || isCustomizable === true;
    if (customizationOptions !== undefined) updateData.customizationOptions = parsedCustomizationOptions;
    if (quantityAvailable !== undefined) updateData.quantityAvailable = parseInt(quantityAvailable);
    if (lowStockThreshold !== undefined) updateData.lowStockThreshold = parseInt(lowStockThreshold);
    if (craftingTime !== undefined) updateData.craftingTime = craftingTime;
    if (tags !== undefined) updateData.tags = parsedTags;
    if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true;
    
    updateData.images = finalImages;
    updateData.updatedAt = new Date();

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.productId,
      updateData,
      { new: true, runValidators: true }
    ).populate('artisan', 'name location craftType rating');

    // Send low stock notification if applicable
    if (quantityAvailable !== undefined && updatedProduct.quantityAvailable <= updatedProduct.lowStockThreshold) {
      await inventoryService.notifyLowStock(updatedProduct);
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      product: {
        ...updatedProduct.toObject(),
        availableStock: updatedProduct.quantityAvailable,
        isLowStock: updatedProduct.quantityAvailable <= updatedProduct.lowStockThreshold,
        stockValue: updatedProduct.quantityAvailable * updatedProduct.price
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating product', 
      error: error.message 
    });
  }
});

// Delete/Deactivate product
router.delete('/:productId', verifyArtisanToken, async (req, res) => {
  try {
    const { permanently = false } = req.query;

    const product = await Product.findOne({
      _id: req.params.productId,
      artisan: req.artisan.id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (permanently === 'true') {
      // Check if product has any pending orders
      const Order = require('../models/Order');
      const pendingOrders = await Order.find({
        'items.product': req.params.productId,
        orderStatus: { $nin: ['delivered', 'cancelled'] }
      });

      if (pendingOrders.length > 0) {
        return res.status(400).json({ 
          message: 'Cannot permanently delete product with pending orders' 
        });
      }

      await Product.findByIdAndDelete(req.params.productId);
      
      // Update artisan's product count
      await Artisan.findByIdAndUpdate(req.artisan.id, {
        $inc: { totalProducts: -1 }
      });

      res.json({
        success: true,
        message: 'Product deleted permanently'
      });
    } else {
      // Soft delete (deactivate)
      product.isActive = false;
      await product.save();

      res.json({
        success: true,
        message: 'Product deactivated successfully'
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error deleting product', 
      error: error.message 
    });
  }
});

// Duplicate product
router.post('/:productId/duplicate', verifyArtisanToken, async (req, res) => {
  try {
    const originalProduct = await Product.findOne({
      _id: req.params.productId,
      artisan: req.artisan.id
    });

    if (!originalProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Create duplicate with modifications
    const duplicateData = originalProduct.toObject();
    delete duplicateData._id;
    delete duplicateData.__v;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    delete duplicateData.views;
    delete duplicateData.likes;

    duplicateData.name = `${duplicateData.name} (Copy)`;
    duplicateData.quantityAvailable = req.body.quantityAvailable || duplicateData.quantityAvailable;
    duplicateData.price = req.body.price || duplicateData.price;
    duplicateData.isActive = false; // Start as inactive

    const duplicateProduct = new Product(duplicateData);
    await duplicateProduct.save();

    const populatedDuplicate = await Product.findById(duplicateProduct._id)
      .populate('artisan', 'name location craftType rating');

    res.status(201).json({
      success: true,
      message: 'Product duplicated successfully',
      product: {
        ...populatedDuplicate.toObject(),
        availableStock: populatedDuplicate.quantityAvailable,
        isLowStock: populatedDuplicate.quantityAvailable <= populatedDuplicate.lowStockThreshold,
        stockValue: populatedDuplicate.quantityAvailable * populatedDuplicate.price
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error duplicating product', 
      error: error.message 
    });
  }
});

// Toggle product active status
router.patch('/:productId/toggle-status', verifyArtisanToken, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.productId,
      artisan: req.artisan.id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.isActive = !product.isActive;
    await product.save();

    res.json({
      success: true,
      message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: product.isActive
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error toggling product status', 
      error: error.message 
    });
  }
});

// Bulk operations
router.post('/bulk-operations', verifyArtisanToken, async (req, res) => {
  try {
    const { operation, productIds, data } = req.body;

    if (!operation || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ 
        message: 'Operation and product IDs are required' 
      });
    }

    // Verify all products belong to artisan
    const products = await Product.find({
      _id: { $in: productIds },
      artisan: req.artisan.id
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ 
        message: 'Some products not found or access denied' 
      });
    }

    let updateQuery = {};
    let message = '';

    switch (operation) {
      case 'activate':
        updateQuery = { isActive: true };
        message = 'Products activated successfully';
        break;
      case 'deactivate':
        updateQuery = { isActive: false };
        message = 'Products deactivated successfully';
        break;
      case 'updateCategory':
        if (!data?.category) {
          return res.status(400).json({ message: 'Category is required for bulk category update' });
        }
        updateQuery = { category: data.category };
        message = 'Product categories updated successfully';
        break;
      case 'updateTags':
        if (!data?.tags || !Array.isArray(data.tags)) {
          return res.status(400).json({ message: 'Tags array is required for bulk tag update' });
        }
        updateQuery = { $addToSet: { tags: { $each: data.tags } } };
        message = 'Tags added to products successfully';
        break;
      case 'updateCraftingTime':
        if (!data?.craftingTime) {
          return res.status(400).json({ message: 'Crafting time is required' });
        }
        updateQuery = { craftingTime: data.craftingTime };
        message = 'Crafting time updated successfully';
        break;
      default:
        return res.status(400).json({ message: 'Invalid operation' });
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds }, artisan: req.artisan.id },
      updateQuery
    );

    res.json({
      success: true,
      message,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error performing bulk operation', 
      error: error.message 
    });
  }
});

// Get product performance analytics
router.get('/:productId/analytics', verifyArtisanToken, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const product = await Product.findOne({
      _id: req.params.productId,
      artisan: req.artisan.id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get order analytics for this product
    const Order = require('../models/Order');
    let dateQuery = {};
    if (dateFrom || dateTo) {
      dateQuery.createdAt = {};
      if (dateFrom) dateQuery.createdAt.$gte = new Date(dateFrom);
      if (dateTo) dateQuery.createdAt.$lte = new Date(dateTo);
    }

    const orderStats = await Order.aggregate([
      { $match: { 'items.product': product._id, ...dateQuery } },
      { $unwind: '$items' },
      { $match: { 'items.product': product._id } },
      {
        $group: {
          _id: null,
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$items.total' }
        }
      }
    ]);

    const stats = orderStats[0] || {
      totalSold: 0,
      totalRevenue: 0,
      orderCount: 0,
      avgOrderValue: 0
    };

    // Calculate performance metrics
    const analytics = {
      productInfo: {
        name: product.name,
        category: product.category,
        price: product.price,
        currentStock: product.quantityAvailable,
        totalViews: product.views,
        totalLikes: product.likes
      },
      salesMetrics: {
        totalSold: stats.totalSold,
        totalRevenue: stats.totalRevenue,
        orderCount: stats.orderCount,
        avgOrderValue: stats.avgOrderValue,
        conversionRate: product.views > 0 ? ((stats.orderCount / product.views) * 100).toFixed(2) : 0
      },
      inventoryMetrics: {
        currentStock: product.quantityAvailable,
        availableStock: product.quantityAvailable,
        reservedStock: 0, // No reservation system in current implementation
        lowStockThreshold: product.lowStockThreshold,
        stockValue: product.quantityAvailable * product.price,
        isLowStock: product.isLowStock,
        isOutOfStock: product.isOutOfStock
      },
      engagementMetrics: {
        views: product.views,
        likes: product.likes,
        likeRate: product.views > 0 ? ((product.likes / product.views) * 100).toFixed(2) : 0
      }
    };

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching product analytics', 
      error: error.message 
    });
  }
});

// Upload additional images to existing product
router.post('/:productId/images', verifyArtisanToken, upload.array('images', 5), async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.productId,
      artisan: req.artisan.id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const newImageUrls = req.files.map(file => `/uploads/products/${file.filename}`);
    
    // Add new images to existing ones
    product.images.push(...newImageUrls);
    await product.save();

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      newImages: newImageUrls,
      totalImages: product.images.length
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error uploading images', 
      error: error.message 
    });
  }
});

// Remove specific image from product
router.delete('/:productId/images', verifyArtisanToken, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }

    const product = await Product.findOne({
      _id: req.params.productId,
      artisan: req.artisan.id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const imageIndex = product.images.indexOf(imageUrl);
    if (imageIndex === -1) {
      return res.status(404).json({ message: 'Image not found in product' });
    }

    product.images.splice(imageIndex, 1);
    await product.save();

    res.json({
      success: true,
      message: 'Image removed successfully',
      remainingImages: product.images.length
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error removing image', 
      error: error.message 
    });
  }
});

// Get product creation form data (categories, materials, etc.)
router.get('/form-data/options', verifyArtisanToken, async (req, res) => {
  try {
    const formData = {
      categories: [
        'Pottery', 
        'Weaving', 
        'Jewelry', 
        'Woodwork', 
        'Metalwork', 
        'Textiles', 
        'Paintings', 
        'Sculptures', 
        'Other'
      ],
      craftingTimes: [
        '1-3 days',
        '1 week',
        '2 weeks',
        '1 month',
        '2+ months'
      ],
      commonMaterials: [
        'Wood', 'Metal', 'Clay', 'Fabric', 'Glass', 'Stone', 'Leather', 
        'Paper', 'Bamboo', 'Cotton', 'Silk', 'Wool', 'Silver', 'Gold',
        'Copper', 'Bronze', 'Ceramic', 'Jute', 'Hemp'
      ],
      popularTags: [
        'handmade', 'traditional', 'eco-friendly', 'vintage', 'modern',
        'decorative', 'functional', 'gift', 'wedding', 'festival',
        'home-decor', 'jewelry', 'art', 'craft', 'unique'
      ],
      sizeUnits: ['cm', 'inches', 'mm'],
      weightUnits: ['grams', 'kg', 'pounds']
    };

    res.json({
      success: true,
      formData
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching form data', 
      error: error.message 
    });
  }
});

// Get artisan's product summary dashboard
router.get('/dashboard/summary', verifyArtisanToken, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    let dateQuery = {};
    if (dateFrom || dateTo) {
      dateQuery.createdAt = {};
      if (dateFrom) dateQuery.createdAt.$gte = new Date(dateFrom);
      if (dateTo) dateQuery.createdAt.$lte = new Date(dateTo);
    }

    // Get product counts by status
    const productStats = await Product.aggregate([
      { $match: { artisan: req.artisan.id, ...dateQuery } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: { $sum: { $cond: ['$isActive', 1, 0] } },
          outOfStockProducts: { $sum: { $cond: [{ $eq: ['$quantityAvailable', 0] }, 1, 0] } },
          lowStockProducts: { $sum: { $cond: [{ $lte: ['$quantityAvailable', '$lowStockThreshold'] }, 1, 0] } },
          totalInventoryValue: { $sum: { $multiply: ['$quantityAvailable', '$price'] } },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          avgPrice: { $avg: '$price' }
        }
      }
    ]);

    const stats = productStats[0] || {
      totalProducts: 0,
      activeProducts: 0,
      outOfStockProducts: 0,
      lowStockProducts: 0,
      totalInventoryValue: 0,
      totalViews: 0,
      totalLikes: 0,
      avgPrice: 0
    };

    // Get top performing products
    const topProducts = await Product.find({
      artisan: req.artisan.id,
      isActive: true
    })
    .sort({ views: -1 })
    .limit(5)
    .select('name price views likes quantityAvailable');

    // Get recent products
    const recentProducts = await Product.find({
      artisan: req.artisan.id,
      ...dateQuery
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name price category quantityAvailable isActive createdAt');

    res.json({
      success: true,
      summary: {
        productStats: stats,
        topProducts,
        recentProducts
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching dashboard summary', 
      error: error.message 
    });
  }
});

module.exports = router;
