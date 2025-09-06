const express = require('express');
const Order = require('../models/Order');
const Artisan = require('../models/Artisan');
const Product = require('../models/Product');

const router = express.Router();

// Middleware to verify JWT token for artisans
const verifyArtisanToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Access denied. No token provided.',
      errorType: 'NO_TOKEN'
    });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's an artisan token
    if (decoded.type !== 'artisan' && decoded.userType !== 'artisan') {
      console.log('🚫 Access denied - User token used for artisan endpoint:', {
        tokenType: decoded.type || decoded.userType,
        email: decoded.email,
        endpoint: req.originalUrl
      });
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. This endpoint requires artisan login. Please log in as an artisan to continue.',
        errorType: 'WRONG_USER_TYPE',
        userType: decoded.type || decoded.userType,
        requiredType: 'artisan'
      });
    }
    
    req.artisan = decoded;
    next();
  } catch (error) {
    console.error('🔴 Token verification failed:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token format.',
        errorType: 'INVALID_TOKEN'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token has expired. Please log in again.',
        errorType: 'TOKEN_EXPIRED'
      });
    }
    
    res.status(400).json({ 
      success: false,
      message: 'Token verification failed.',
      errorType: 'TOKEN_ERROR'
    });
  }
};

// Get recent orders (last 10) - must come before /:orderId route
router.get('/orders/recent', verifyArtisanToken, async (req, res) => {
  try {
    const orders = await Order.find({
      'items.artisan': req.artisan.id
    })
    .populate('user', 'name email')
    .populate({
      path: 'items.product',
      select: 'name images price'
    })
    .sort({ createdAt: -1 })
    .limit(10);

    // Filter items to only show this artisan's products
    const filteredOrders = orders.map(order => ({
      ...order.toObject(),
      items: order.items.filter(item => item.artisan.toString() === req.artisan.id)
    }));

    res.json({
      success: true,
      orders: filteredOrders
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recent orders', error: error.message });
  }
});

// Get all orders for artisan's products
router.get('/orders', verifyArtisanToken, async (req, res) => {
  try {
    const orders = await Order.find({
      'items.artisan': req.artisan.id
    })
    .populate('user', 'name email phone')
    .populate({
      path: 'items.product',
      select: 'name images price'
    })
    .sort({ createdAt: -1 });

    // Filter items to only show this artisan's products
    const filteredOrders = orders.map(order => ({
      ...order.toObject(),
      items: order.items.filter(item => item.artisan.toString() === req.artisan.id)
    }));

    res.json({
      success: true,
      orders: filteredOrders
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// Get specific order details
router.get('/orders/:orderId', verifyArtisanToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('user', 'name email phone')
      .populate({
        path: 'items.product',
        select: 'name images price description'
      });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if this artisan has items in the order
    const artisanItems = order.items.filter(item => 
      item.artisan.toString() === req.artisan.id
    );

    if (artisanItems.length === 0) {
      return res.status(403).json({ message: 'Access denied. No items from this artisan in the order.' });
    }

    res.json({
      success: true,
      order: {
        ...order.toObject(),
        items: artisanItems
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
});

// Update order status (for specific items)
router.put('/orders/:orderId/status', verifyArtisanToken, async (req, res) => {
  try {
    const { status, note } = req.body;
    
    const validStatuses = ['confirmed', 'preparing', 'shipped', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if this artisan has items in the order
    const hasArtisanItems = order.items.some(item => 
      item.artisan.toString() === req.artisan.id
    );

    if (!hasArtisanItems) {
      return res.status(403).json({ message: 'Access denied. No items from this artisan in the order.' });
    }

    // Update overall order status
    order.orderStatus = status;
    order.statusHistory.push({
      status,
      note: note || `Status updated by artisan to ${status}`,
      updatedBy: req.artisan.id
    });

    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
});

// Get comprehensive artisan dashboard with product management options
router.get('/dashboard', verifyArtisanToken, async (req, res) => {
  try {
    const artisan = await Artisan.findById(req.artisan.id);
    
    // Get order statistics
    const orders = await Order.find({
      'items.artisan': req.artisan.id
    });

    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => 
      ['pending', 'confirmed', 'preparing'].includes(order.orderStatus)
    ).length;
    
    const completedOrders = orders.filter(order => 
      order.orderStatus === 'delivered'
    ).length;

    // Calculate total revenue
    let totalRevenue = 0;
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.artisan.toString() === req.artisan.id) {
          totalRevenue += item.total;
        }
      });
    });

    // Get product statistics
    const products = await Product.find({ artisan: req.artisan.id });
    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.isActive).length;
    const outOfStockProducts = products.filter(p => p.quantityAvailable === 0).length;
    const lowStockProducts = products.filter(p => p.quantityAvailable <= p.lowStockThreshold && p.quantityAvailable > 0).length;
    
    // Calculate inventory value
    const inventoryValue = products.reduce((total, product) => {
      return total + (product.quantityAvailable * product.price);
    }, 0);

    // Get recent products (last 5)
    const recentProducts = await Product.find({ artisan: req.artisan.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name price quantityAvailable isActive createdAt images');

    // Get top performing products
    const topProducts = await Product.find({ 
      artisan: req.artisan.id, 
      isActive: true 
    })
    .sort({ views: -1, likes: -1 })
    .limit(3)
    .select('name price views likes quantityAvailable images');

    res.json({
      success: true,
      dashboard: {
        artisan: {
          id: artisan._id,
          name: artisan.name,
          email: artisan.email,
          craftType: artisan.craftType,
          location: artisan.location,
          rating: artisan.rating,
          totalSales: artisan.totalSales || totalRevenue,
          joinedDate: artisan.createdAt
        },
        stats: {
          orders: {
            total: totalOrders,
            pending: pendingOrders,
            completed: completedOrders,
            revenue: totalRevenue
          },
          products: {
            total: totalProducts,
            active: activeProducts,
            inactive: totalProducts - activeProducts,
            outOfStock: outOfStockProducts,
            lowStock: lowStockProducts,
            inventoryValue
          }
        },
        recentActivity: {
          recentProducts,
          topProducts
        },
        quickActions: [
          {
            id: 'create-product',
            title: 'Create New Product',
            description: 'Add a new product to your catalog',
            endpoint: 'POST /api/artisan/products/',
            action: 'create',
            icon: 'plus',
            color: 'primary',
            enabled: true
          },
          {
            id: 'manage-products',
            title: 'Manage Products',
            description: 'View and edit your existing products',
            endpoint: 'GET /api/artisan/products/',
            action: 'view',
            icon: 'grid',
            color: 'secondary',
            enabled: true
          },
          {
            id: 'view-orders',
            title: 'View Orders',
            description: 'Check your recent orders and fulfillment status',
            endpoint: 'GET /api/artisan/orders/',
            action: 'view',
            icon: 'shopping-bag',
            color: 'info',
            badge: pendingOrders > 0 ? pendingOrders.toString() : null
          },
          {
            id: 'inventory-alerts',
            title: 'Inventory Alerts',
            description: 'Check products with low or no stock',
            endpoint: 'GET /api/artisan/products/?status=lowStock',
            action: 'view',
            icon: 'alert-triangle',
            color: 'warning',
            badge: (outOfStockProducts + lowStockProducts) > 0 ? (outOfStockProducts + lowStockProducts).toString() : null,
            enabled: true
          },
          {
            id: 'analytics',
            title: 'Product Analytics',
            description: 'View detailed analytics for your products',
            endpoint: 'GET /api/artisan/products/dashboard/summary',
            action: 'view',
            icon: 'bar-chart',
            color: 'success',
            enabled: true
          },
          {
            id: 'bulk-operations',
            title: 'Bulk Operations',
            description: 'Perform actions on multiple products at once',
            endpoint: 'POST /api/artisan/products/bulk-operations',
            action: 'manage',
            icon: 'layers',
            color: 'info',
            enabled: totalProducts > 1
          }
        ],
        productCategories: [
          'Pottery', 'Weaving', 'Jewelry', 'Woodwork', 'Metalwork', 
          'Textiles', 'Paintings', 'Sculptures', 'Other'
        ],
        alerts: [
          ...(outOfStockProducts > 0 ? [{
            type: 'error',
            title: 'Out of Stock Products',
            message: `${outOfStockProducts} product(s) are out of stock`,
            action: 'View Products',
            endpoint: '/api/artisan/products/?status=outOfStock'
          }] : []),
          ...(lowStockProducts > 0 ? [{
            type: 'warning',
            title: 'Low Stock Alert',
            message: `${lowStockProducts} product(s) are running low on stock`,
            action: 'View Products',
            endpoint: '/api/artisan/products/?status=lowStock'
          }] : []),
          ...(pendingOrders > 0 ? [{
            type: 'info',
            title: 'Pending Orders',
            message: `You have ${pendingOrders} order(s) awaiting fulfillment`,
            action: 'View Orders',
            endpoint: '/api/artisan/orders/'
          }] : [])
        ],
        tips: [
          {
            title: 'Optimize Your Product Listings',
            content: 'Add high-quality images and detailed descriptions to increase sales',
            show: totalProducts > 0 && activeProducts < totalProducts
          },
          {
            title: 'Create Your First Product',
            content: 'Start selling by adding your first handcrafted product to the marketplace',
            show: totalProducts === 0
          },
          {
            title: 'Keep Inventory Updated',
            content: 'Regularly update your stock levels to avoid overselling',
            show: (outOfStockProducts + lowStockProducts) > 0
          },
          {
            title: 'Respond to Orders Quickly',
            content: 'Quick response to orders improves customer satisfaction and ratings',
            show: pendingOrders > 0
          }
        ].filter(tip => tip.show)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
  }
});

module.exports = router;
