const express = require('express');
const Product = require('../models/Product');
const Artisan = require('../models/Artisan');
const router = express.Router();

// Enhanced product search with advanced filtering
router.get('/search', async (req, res) => {
  try {
    const {
      q, // search query
      category,
      minPrice,
      maxPrice,
      priceRange,
      location,
      materials,
      craftingTime,
      occasion,
      difficulty,
      isCustomizable,
      sortBy,
      sortOrder,
      page = 1,
      limit = 12
    } = req.query;

    // Build search query
    let searchQuery = { isActive: true };

    // Text search
    if (q) {
      searchQuery.$text = { $search: q };
    }

    // Category filter
    if (category && category !== 'all') {
      searchQuery.category = category;
    }

    // Price filters
    if (minPrice || maxPrice) {
      searchQuery.price = {};
      if (minPrice) searchQuery.price.$gte = Number(minPrice);
      if (maxPrice) searchQuery.price.$lte = Number(maxPrice);
    }

    // Price range filter
    if (priceRange && priceRange !== 'all') {
      searchQuery.priceRange = priceRange;
    }

    // Materials filter
    if (materials) {
      const materialArray = materials.split(',').map(m => m.trim());
      searchQuery.materials = { $in: materialArray };
    }

    // Crafting time filter
    if (craftingTime && craftingTime !== 'all') {
      searchQuery.craftingTime = craftingTime;
    }

    // Occasion filter
    if (occasion && occasion !== 'all') {
      searchQuery.occasion = occasion;
    }

    // Difficulty filter
    if (difficulty && difficulty !== 'all') {
      searchQuery.difficulty = difficulty;
    }

    // Customizable filter
    if (isCustomizable === 'true') {
      searchQuery.isCustomizable = true;
    }

    // Build aggregation pipeline for location filtering
    let pipeline = [];

    if (location && location !== 'all') {
      // First lookup artisan info
      pipeline.push({
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanInfo'
        }
      });

      // Filter by location
      pipeline.push({
        $match: {
          ...searchQuery,
          $or: [
            { 'artisanInfo.location.city': { $regex: location, $options: 'i' } },
            { 'artisanInfo.location.state': { $regex: location, $options: 'i' } }
          ]
        }
      });
    } else {
      pipeline.push({ $match: searchQuery });
      
      // Add artisan lookup for response
      pipeline.push({
        $lookup: {
          from: 'artisans',
          localField: 'artisan',
          foreignField: '_id',
          as: 'artisanInfo'
        }
      });
    }

    // Sorting
    let sortStage = {};
    switch (sortBy) {
      case 'price':
        sortStage.price = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'popularity':
        sortStage.views = -1;
        break;
      case 'rating':
        sortStage.likes = -1;
        break;
      case 'newest':
        sortStage.createdAt = -1;
        break;
      case 'sales':
        sortStage.quantitySold = -1;
        break;
      default:
        if (q) {
          sortStage.score = { $meta: 'textScore' };
        } else {
          sortStage.createdAt = -1;
        }
    }

    pipeline.push({ $sort: sortStage });

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: Number(limit) });

    // Execute aggregation
    const products = await Product.aggregate(pipeline);

    // Get total count for pagination
    const countPipeline = [...pipeline];
    countPipeline.pop(); // Remove limit
    countPipeline.pop(); // Remove skip
    countPipeline.push({ $count: 'total' });

    const countResult = await Product.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      products: products.map(product => ({
        ...product,
        artisan: product.artisanInfo[0]
      })),
      pagination: {
        current: Number(page),
        total: Math.ceil(total / Number(limit)),
        count: products.length,
        totalProducts: total
      }
    });

  } catch (error) {
    console.error('Enhanced search error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error searching products', 
      error: error.message 
    });
  }
});

// Get filter options for frontend
router.get('/filters', async (req, res) => {
  try {
    // Get all unique values for filters
    const [categories, materials, locations, priceRanges] = await Promise.all([
      Product.distinct('category', { isActive: true }),
      Product.distinct('materials', { isActive: true }),
      Artisan.aggregate([
        {
          $group: {
            _id: null,
            cities: { $addToSet: '$location.city' },
            states: { $addToSet: '$location.state' }
          }
        }
      ]),
      Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            avgPrice: { $avg: '$price' }
          }
        }
      ])
    ]);

    const locationData = locations[0] || { cities: [], states: [] };
    const priceData = priceRanges[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 };

    res.json({
      success: true,
      filters: {
        categories,
        materials: materials.flat().filter(m => m), // Remove null/undefined
        locations: {
          cities: locationData.cities.filter(c => c),
          states: locationData.states.filter(s => s)
        },
        priceRanges: ['budget', 'mid-range', 'premium', 'luxury'],
        craftingTimes: ['1-3 days', '1 week', '2 weeks', '1 month', '2+ months'],
        occasions: ['daily-use', 'festive', 'wedding', 'gifting', 'home-decor', 'office'],
        difficulties: ['beginner', 'intermediate', 'expert'],
        priceData
      }
    });

  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching filter options', 
      error: error.message 
    });
  }
});

// Get trending products
router.get('/trending', async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const trendingProducts = await Product.find({ isActive: true })
      .populate('artisan', 'name location')
      .sort({ views: -1, likes: -1, quantitySold: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      products: trendingProducts,
      message: 'Trending products fetched successfully'
    });

  } catch (error) {
    console.error('Get trending products error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching trending products', 
      error: error.message 
    });
  }
});

// Get product recommendations based on user behavior
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 8 } = req.query;

    // This is a simple recommendation algorithm
    // In production, you'd want a more sophisticated ML-based approach
    
    const User = require('../models/User');
    const user = await User.findById(userId).populate('recentlyViewed.product');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get categories from recently viewed products
    const viewedCategories = user.recentlyViewed
      .map(item => item.product?.category)
      .filter(category => category);

    // Get recommendations based on viewed categories and wishlist
    const recommendations = await Product.find({
      isActive: true,
      _id: { $nin: [...user.wishlist, ...user.recentlyViewed.map(item => item.product?._id)] },
      $or: [
        { category: { $in: viewedCategories } },
        { tags: { $in: user.preferences?.favoriteCategories || [] } }
      ]
    })
    .populate('artisan', 'name location')
    .sort({ views: -1, likes: -1 })
    .limit(Number(limit));

    res.json({
      success: true,
      products: recommendations,
      message: 'Recommendations fetched successfully'
    });

  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching recommendations', 
      error: error.message 
    });
  }
});

// Update product views (for tracking popularity)
router.post('/view/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    await Product.findByIdAndUpdate(
      productId,
      { $inc: { views: 1 } },
      { new: true }
    );

    res.json({
      success: true,
      message: 'View count updated'
    });

  } catch (error) {
    console.error('Update view count error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating view count', 
      error: error.message 
    });
  }
});

module.exports = router;
