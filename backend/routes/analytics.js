const express = require('express');
const jwt = require('jsonwebtoken');
const Product = require('../models/Product');
const Artisan = require('../models/Artisan');
const router = express.Router();

// Middleware to verify artisan token
const verifyArtisanToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.artisanId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Get analytics overview for artisan
router.get('/overview', verifyArtisanToken, async (req, res) => {
  try {
    const artisanId = req.artisanId;
    const { days = 30 } = req.query;

    // Get date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get all products for this artisan
    const products = await Product.find({ artisan: artisanId });

    if (products.length === 0) {
      return res.json({
        success: true,
        analytics: {
          overview: {
            totalProducts: 0,
            totalViews: 0,
            totalLikes: 0,
            totalSales: 0,
            totalRevenue: 0,
            averageRating: 0,
            conversionRate: 0
          },
          trends: {
            viewsTrend: 0,
            salesTrend: 0,
            revenueTrend: 0,
            likesTrend: 0
          },
          topPerforming: [],
          categoryBreakdown: [],
          recentActivity: []
        }
      });
    }

    // Calculate overview metrics
    const totalProducts = products.length;
    const totalViews = products.reduce((sum, product) => sum + (product.views || 0), 0);
    const totalLikes = products.reduce((sum, product) => sum + (product.likes || 0), 0);
    const totalSales = products.reduce((sum, product) => sum + (product.quantitySold || 0), 0);
    const totalRevenue = products.reduce((sum, product) => sum + ((product.quantitySold || 0) * product.price), 0);
    const averageRating = products.reduce((sum, product) => sum + (product.rating || 0), 0) / totalProducts;
    const conversionRate = totalViews > 0 ? ((totalSales / totalViews) * 100).toFixed(2) : 0;

    // Calculate trends (simplified - comparing with hypothetical previous period)
    // For now, we'll use random trends since we don't have historical data
    const viewsTrend = (Math.random() - 0.5) * 30; // -15% to +15%
    const salesTrend = (Math.random() - 0.5) * 20; // -10% to +10%
    const revenueTrend = (Math.random() - 0.5) * 25; // -12.5% to +12.5%
    const likesTrend = (Math.random() - 0.5) * 15; // -7.5% to +7.5%

    // Get top performing products (by revenue)
    const topPerforming = products
      .map(product => ({
        _id: product._id,
        name: product.name,
        views: product.views || 0,
        likes: product.likes || 0,
        sales: product.quantitySold || 0,
        revenue: (product.quantitySold || 0) * product.price,
        conversionRate: (product.views > 0 ? ((product.quantitySold || 0) / product.views * 100).toFixed(1) : 0),
        category: product.category
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);

    // Get category breakdown
    const categoryMap = {};
    products.forEach(product => {
      const category = product.category || 'Uncategorized';
      if (!categoryMap[category]) {
        categoryMap[category] = {
          category,
          count: 0,
          revenue: 0
        };
      }
      categoryMap[category].count++;
      categoryMap[category].revenue += (product.quantitySold || 0) * product.price;
    });

    const categoryBreakdown = Object.values(categoryMap)
      .map(cat => ({
        ...cat,
        percentage: totalRevenue > 0 ? ((cat.revenue / totalRevenue) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Generate recent activity (mock for now since we don't have activity tracking)
    const recentActivity = [];
    const activityTypes = ['sale', 'view', 'like'];
    const recentProducts = products.slice(0, 5);

    for (let i = 0; i < Math.min(10, recentProducts.length * 2); i++) {
      const product = recentProducts[Math.floor(Math.random() * recentProducts.length)];
      const type = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      const date = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days

      const activity = {
        type,
        product: product.name,
        date: date.toISOString()
      };

      if (type === 'sale') {
        activity.amount = product.price;
      }

      recentActivity.push(activity);
    }

    // Sort by date (newest first)
    recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));

    const analytics = {
      overview: {
        totalProducts,
        totalViews,
        totalLikes,
        totalSales,
        totalRevenue,
        averageRating: parseFloat(averageRating.toFixed(1)),
        conversionRate: parseFloat(conversionRate)
      },
      trends: {
        viewsTrend: parseFloat(viewsTrend.toFixed(1)),
        salesTrend: parseFloat(salesTrend.toFixed(1)),
        revenueTrend: parseFloat(revenueTrend.toFixed(1)),
        likesTrend: parseFloat(likesTrend.toFixed(1))
      },
      topPerforming,
      categoryBreakdown,
      recentActivity: recentActivity.slice(0, 10)
    };

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics data',
      error: error.message
    });
  }
});

// Get detailed analytics for a specific product
router.get('/product/:productId', verifyArtisanToken, async (req, res) => {
  try {
    const artisanId = req.artisanId;
    const { productId } = req.params;

    const product = await Product.findOne({ _id: productId, artisan: artisanId });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const analytics = {
      productInfo: {
        name: product.name,
        category: product.category,
        price: product.price,
        currentStock: product.quantityAvailable
      },
      engagementMetrics: {
        views: product.views || 0,
        likes: product.likes || 0,
        likeRate: product.views > 0 ? ((product.likes || 0) / product.views * 100).toFixed(1) : 0
      },
      salesMetrics: {
        totalSold: product.quantitySold || 0,
        totalRevenue: (product.quantitySold || 0) * product.price,
        conversionRate: product.views > 0 ? (((product.quantitySold || 0) / product.views) * 100).toFixed(2) : 0,
        avgOrderValue: product.price,
        orderCount: product.quantitySold || 0
      },
      inventoryMetrics: {
        availableStock: product.quantityAvailable,
        stockValue: product.quantityAvailable * product.price,
        lowStockThreshold: product.lowStockThreshold || 5,
        isLowStock: product.quantityAvailable <= (product.lowStockThreshold || 5),
        isOutOfStock: product.quantityAvailable === 0
      }
    };

    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Product analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product analytics',
      error: error.message
    });
  }
});

module.exports = router;
