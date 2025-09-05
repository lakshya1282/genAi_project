const express = require('express');
const Product = require('../models/Product');
const Artisan = require('../models/Artisan');
const router = express.Router();

// Get all products with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      artisan,
      search,
      priceMin,
      priceMax,
      location,
      craftType,
      materials,
      isCustomizable,
      inStock = true,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let filter = { isActive: true };
    
    // Basic filters
    if (category && category !== 'all') filter.category = category;
    if (artisan) filter.artisan = artisan;
    if (isCustomizable !== undefined) filter.isCustomizable = isCustomizable === 'true';
    
    // Price range filter
    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = parseFloat(priceMin);
      if (priceMax) filter.price.$lte = parseFloat(priceMax);
    }
    
    // Stock filter
    if (inStock === 'true') {
      filter.quantityAvailable = { $gt: 0 };
    }
    
    // Materials filter
    if (materials) {
      const materialArray = materials.split(',').map(m => m.trim());
      filter.materials = { $in: materialArray };
    }
    
    // Search functionality with improved matching
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } },
        { materials: { $in: [searchRegex] } }
      ];
    }
    
    // Location and craft type filters (via artisan)
    let artisanFilter = {};
    if (location) {
      artisanFilter['location.city'] = { $regex: location, $options: 'i' };
    }
    if (craftType && craftType !== 'all') {
      artisanFilter.craftType = craftType;
    }
    
    let query = Product.find(filter);
    
    // If we have artisan filters, we need to use aggregation
    if (Object.keys(artisanFilter).length > 0) {
      const aggregationPipeline = [
        { $match: filter },
        {
          $lookup: {
            from: 'artisans',
            localField: 'artisan',
            foreignField: '_id',
            as: 'artisanInfo'
          }
        },
        { $unwind: '$artisanInfo' },
        { $match: artisanFilter },
        {
          $addFields: {
            artisan: '$artisanInfo'
          }
        },
        { $unset: 'artisanInfo' }
      ];
      
      // Add sorting
      const sortOptions = {};
      if (sortBy === 'price') {
        sortOptions.price = sortOrder === 'desc' ? -1 : 1;
      } else if (sortBy === 'rating') {
        sortOptions['artisan.rating'] = sortOrder === 'desc' ? -1 : 1;
      } else if (sortBy === 'popularity') {
        sortOptions.views = sortOrder === 'desc' ? -1 : 1;
      } else {
        sortOptions.createdAt = sortOrder === 'desc' ? -1 : 1;
      }
      
      aggregationPipeline.push({ $sort: sortOptions });
      aggregationPipeline.push({ $skip: skip });
      aggregationPipeline.push({ $limit: parseInt(limit) });
      
      const products = await Product.aggregate(aggregationPipeline);
      const totalCount = await Product.aggregate([
        ...aggregationPipeline.slice(0, -2), // Remove skip and limit
        { $count: 'total' }
      ]);
      
      const total = totalCount[0]?.total || 0;
      
      res.json({
        success: true,
        products,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          hasNext: page < Math.ceil(total / parseInt(limit)),
          hasPrev: page > 1,
          totalCount: total
        },
        filters: {
          applied: { category, priceMin, priceMax, location, craftType, materials, isCustomizable, inStock, search },
          sortBy,
          sortOrder
        }
      });
    } else {
      // Simple query without artisan filters
      const sortOptions = {};
      if (sortBy === 'price') {
        sortOptions.price = sortOrder === 'desc' ? -1 : 1;
      } else if (sortBy === 'popularity') {
        sortOptions.views = sortOrder === 'desc' ? -1 : 1;
      } else {
        sortOptions.createdAt = sortOrder === 'desc' ? -1 : 1;
      }
      
      const products = await Product.find(filter)
        .populate('artisan', 'name location craftType rating')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-aiEnhancedDescription -aiGeneratedTags -marketingContent'); // Exclude AI fields

      const total = await Product.countDocuments(filter);
      
      // Add additional computed fields
      const enhancedProducts = products.map(product => ({
        ...product.toObject(),
        isOutOfStock: product.quantityAvailable === 0,
        stockStatus: product.quantityAvailable === 0 ? 'Out of Stock' : 
                    product.quantityAvailable <= product.lowStockThreshold ? 'Low Stock' : 'In Stock',
        stockDisplay: `Only ${product.quantityAvailable} left in stock`
      }));

      res.json({
        success: true,
        products: enhancedProducts,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          hasNext: page < Math.ceil(total / parseInt(limit)),
          hasPrev: page > 1,
          totalCount: total
        },
        filters: {
          applied: { category, priceMin, priceMax, materials, isCustomizable, inStock, search },
          sortBy,
          sortOrder
        }
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('artisan', 'name location craftType rating story socialMedia');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Increment views
    product.views += 1;
    await product.save();

    // Add stock display info
    const productData = product.toObject();
    productData.stockDisplay = `Only ${product.quantityAvailable} left in stock`;
    productData.isAvailable = product.isActive && product.quantityAvailable > 0;

    res.json(productData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new product
router.post('/', async (req, res) => {
  try {
    const productData = req.body;
    const product = new Product(productData);
    await product.save();
    
    const populatedProduct = await Product.findById(product._id)
      .populate('artisan', 'name location craftType');

    res.status(201).json({
      message: 'Product created successfully',
      product: populatedProduct
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('artisan', 'name location craftType');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get products by artisan
router.get('/artisan/:artisanId', async (req, res) => {
  try {
    const products = await Product.find({ 
      artisan: req.params.artisanId,
      isActive: true
    }).populate('artisan', 'name location craftType');
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get product filter options for frontend
router.get('/filters/options', async (req, res) => {
  try {
    // Get unique categories
    const categories = await Product.distinct('category', { isActive: true });
    
    // Get unique materials
    const materials = await Product.distinct('materials', { isActive: true });
    
    // Get unique craft types from artisans
    const craftTypes = await Artisan.distinct('craftType');
    
    // Get unique locations
    const locations = await Artisan.distinct('location.city');
    
    // Get price range
    const priceStats = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          avgPrice: { $avg: '$price' }
        }
      }
    ]);
    
    const priceRange = priceStats[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 };

    res.json({
      success: true,
      filterOptions: {
        categories: categories.filter(Boolean).sort(),
        materials: materials.flat().filter(Boolean).sort(),
        craftTypes: craftTypes.filter(Boolean).sort(),
        locations: locations.filter(Boolean).sort(),
        priceRange,
        sortOptions: [
          { value: 'createdAt', label: 'Newest First' },
          { value: 'price', label: 'Price' },
          { value: 'popularity', label: 'Most Popular' },
          { value: 'rating', label: 'Highest Rated' }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get search suggestions
router.get('/search/suggestions', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }
    
    const searchRegex = new RegExp(query, 'i');
    
    // Get product name suggestions
    const productSuggestions = await Product.find({
      isActive: true,
      name: searchRegex
    })
    .select('name category')
    .limit(5);
    
    // Get tag suggestions
    const tagSuggestions = await Product.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$tags' },
      { $match: { tags: searchRegex } },
      { $group: { _id: '$tags' } },
      { $limit: 5 }
    ]);
    
    // Get material suggestions
    const materialSuggestions = await Product.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$materials' },
      { $match: { materials: searchRegex } },
      { $group: { _id: '$materials' } },
      { $limit: 3 }
    ]);
    
    const suggestions = {
      products: productSuggestions.map(p => ({ name: p.name, category: p.category, type: 'product' })),
      tags: tagSuggestions.map(t => ({ name: t._id, type: 'tag' })),
      materials: materialSuggestions.map(m => ({ name: m._id, type: 'material' }))
    };
    
    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get featured/trending products
router.get('/featured/trending', async (req, res) => {
  try {
    const { type = 'popular', limit = 8 } = req.query;
    
    let sortOptions = {};
    let matchStage = { isActive: true, quantityAvailable: { $gt: 0 } };
    
    switch (type) {
      case 'popular':
        sortOptions = { views: -1, likes: -1 };
        break;
      case 'recent':
        sortOptions = { createdAt: -1 };
        break;
      case 'highly-rated':
        // Sort by artisan rating
        const pipeline = [
          { $match: matchStage },
          {
            $lookup: {
              from: 'artisans',
              localField: 'artisan',
              foreignField: '_id',
              as: 'artisanInfo'
            }
          },
          { $unwind: '$artisanInfo' },
          { $sort: { 'artisanInfo.rating': -1 } },
          { $limit: parseInt(limit) },
          {
            $addFields: {
              artisan: {
                _id: '$artisanInfo._id',
                name: '$artisanInfo.name',
                location: '$artisanInfo.location',
                craftType: '$artisanInfo.craftType',
                rating: '$artisanInfo.rating'
              }
            }
          },
          { $unset: 'artisanInfo' }
        ];
        
        const ratedProducts = await Product.aggregate(pipeline);
        
        return res.json({
          success: true,
          products: ratedProducts
        });
      case 'discount':
        // For future implementation of discounts
        sortOptions = { price: 1 };
        break;
      default:
        sortOptions = { views: -1 };
    }
    
    const products = await Product.find(matchStage)
      .populate('artisan', 'name location craftType rating')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .select('-aiEnhancedDescription -aiGeneratedTags -marketingContent');
    
    res.json({
      success: true,
      products: products.map(product => ({
        ...product.toObject(),
        isOutOfStock: product.quantityAvailable === 0
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get related products
router.get('/:id/related', async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const currentProduct = await Product.findById(req.params.id);
    if (!currentProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Find products with similar attributes
    const relatedProducts = await Product.find({
      _id: { $ne: req.params.id },
      isActive: true,
      quantityAvailable: { $gt: 0 },
      $or: [
        { category: currentProduct.category },
        { artisan: currentProduct.artisan },
        { materials: { $in: currentProduct.materials } },
        { tags: { $in: currentProduct.tags } }
      ]
    })
    .populate('artisan', 'name location craftType rating')
    .sort({ views: -1, createdAt: -1 })
    .limit(parseInt(limit))
    .select('-aiEnhancedDescription -aiGeneratedTags -marketingContent');
    
    res.json({
      success: true,
      products: relatedProducts.map(product => ({
        ...product.toObject(),
        isOutOfStock: product.quantityAvailable === 0
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Like product
router.post('/:id/like', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.likes += 1;
    await product.save();

    res.json({ 
      success: true,
      message: 'Product liked', 
      likes: product.likes 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get product statistics for public view
router.get('/:id/stats', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('artisan', 'name location craftType rating totalProducts');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const stats = {
      views: product.views,
      likes: product.likes,
      quantityAvailable: product.quantityAvailable,
      isCustomizable: product.isCustomizable,
      craftingTime: product.craftingTime,
      artisanStats: {
        name: product.artisan.name,
        rating: product.artisan.rating,
        totalProducts: product.artisan.totalProducts,
        location: product.artisan.location
      }
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
