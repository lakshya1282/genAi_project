const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
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

// Get all orders for artisan
router.get('/', verifyArtisanToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      dateFrom, 
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = {
      'items.artisan': req.artisan.id
    };

    // Filter by status
    if (status && status !== 'all') {
      query.orderStatus = status;
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Search in order number or customer name
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        // We'll need to populate user to search by name - handled in aggregation
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const orders = await Order.find(query)
      .populate({
        path: 'user',
        select: 'name email phone'
      })
      .populate({
        path: 'items.product',
        select: 'name images price'
      })
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter orders to only show items from this artisan
    const filteredOrders = orders.map(order => {
      const artisanItems = order.items.filter(item => 
        item.artisan.toString() === req.artisan.id
      );
      
      const artisanTotal = artisanItems.reduce((sum, item) => sum + item.total, 0);

      return {
        ...order.toObject(),
        items: artisanItems,
        artisanTotal,
        totalItems: artisanItems.length
      };
    }).filter(order => order.items.length > 0);

    const totalCount = await Order.countDocuments(query);

    res.json({
      success: true,
      orders: filteredOrders,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
        totalCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// Get specific order details for artisan
router.get('/:orderId', verifyArtisanToken, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      'items.artisan': req.artisan.id
    })
    .populate('user', 'name email phone')
    .populate({
      path: 'items.product',
      select: 'name images price description'
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Filter to show only this artisan's items
    const artisanItems = order.items.filter(item => 
      item.artisan.toString() === req.artisan.id
    );

    const artisanTotal = artisanItems.reduce((sum, item) => sum + item.total, 0);

    res.json({
      success: true,
      order: {
        ...order.toObject(),
        items: artisanItems,
        artisanTotal
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
});

// Update order status
router.put('/:orderId/status', verifyArtisanToken, async (req, res) => {
  try {
    const { status, note, trackingNumber } = req.body;
    
    const validStatuses = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findOne({
      _id: req.params.orderId,
      'items.artisan': req.artisan.id
    }).populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if status transition is valid
    const currentStatus = order.orderStatus;
    const statusHierarchy = ['placed', 'confirmed', 'processing', 'shipped', 'delivered'];
    
    if (status === 'cancelled') {
      if (['shipped', 'delivered'].includes(currentStatus)) {
        return res.status(400).json({ 
          message: 'Cannot cancel order that has been shipped or delivered' 
        });
      }
    } else if (statusHierarchy.indexOf(status) < statusHierarchy.indexOf(currentStatus)) {
      return res.status(400).json({ 
        message: 'Cannot move to a previous status' 
      });
    }

    // Update order status
    order.orderStatus = status;
    
    if (trackingNumber && status === 'shipped') {
      order.trackingNumber = trackingNumber;
    }

    // Add to status history
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Order ${status} by artisan`
    });

    // Set delivery dates
    if (status === 'shipped') {
      order.shippedAt = new Date();
    } else if (status === 'delivered') {
      order.actualDelivery = new Date();
    }

    await order.save();

    // Send notification to customer
    await notificationService.notifyOrderStatusUpdate(order._id, status, note);

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order: {
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        trackingNumber: order.trackingNumber
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
});

// Get order statistics for artisan dashboard
router.get('/stats/summary', verifyArtisanToken, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    let dateQuery = {};
    if (dateFrom || dateTo) {
      dateQuery.createdAt = {};
      if (dateFrom) dateQuery.createdAt.$gte = new Date(dateFrom);
      if (dateTo) dateQuery.createdAt.$lte = new Date(dateTo);
    }

    const pipeline = [
      {
        $match: {
          'items.artisan': req.artisan.id,
          ...dateQuery
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.artisan': req.artisan.id
        }
      },
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
          totalValue: { $sum: '$items.total' },
          orders: { $addToSet: '$_id' }
        }
      }
    ];

    const stats = await Order.aggregate(pipeline);
    
    // Calculate summary
    const summary = {
      totalOrders: 0,
      totalRevenue: 0,
      byStatus: {
        placed: { count: 0, value: 0 },
        confirmed: { count: 0, value: 0 },
        processing: { count: 0, value: 0 },
        shipped: { count: 0, value: 0 },
        delivered: { count: 0, value: 0 },
        cancelled: { count: 0, value: 0 }
      }
    };

    stats.forEach(stat => {
      summary.totalOrders += stat.orders.length;
      summary.totalRevenue += stat.totalValue;
      summary.byStatus[stat._id] = {
        count: stat.orders.length,
        value: stat.totalValue
      };
    });

    // Get recent orders
    const recentOrders = await Order.find({
      'items.artisan': req.artisan.id,
      ...dateQuery
    })
    .populate('user', 'name')
    .populate('items.product', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

    const filteredRecentOrders = recentOrders.map(order => {
      const artisanItems = order.items.filter(item => 
        item.artisan.toString() === req.artisan.id
      );
      
      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: order.user.name,
        status: order.orderStatus,
        date: order.createdAt,
        items: artisanItems.length,
        total: artisanItems.reduce((sum, item) => sum + item.total, 0)
      };
    });

    res.json({
      success: true,
      summary,
      recentOrders: filteredRecentOrders
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order statistics', error: error.message });
  }
});

// Bulk update order statuses
router.put('/bulk/status', verifyArtisanToken, async (req, res) => {
  try {
    const { orderIds, status, note } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: 'Order IDs array is required' });
    }

    const validStatuses = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const results = [];

    for (const orderId of orderIds) {
      try {
        const order = await Order.findOne({
          _id: orderId,
          'items.artisan': req.artisan.id
        });

        if (!order) {
          results.push({
            orderId,
            success: false,
            message: 'Order not found'
          });
          continue;
        }

        order.orderStatus = status;
        order.statusHistory.push({
          status,
          timestamp: new Date(),
          note: note || `Bulk update to ${status}`
        });

        await order.save();

        // Send notification
        await notificationService.notifyOrderStatusUpdate(orderId, status, note);

        results.push({
          orderId,
          success: true,
          orderNumber: order.orderNumber
        });
      } catch (error) {
        results.push({
          orderId,
          success: false,
          message: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      message: `Updated ${successCount} of ${orderIds.length} orders`,
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Error bulk updating orders', error: error.message });
  }
});

// Add note to order
router.post('/:orderId/notes', verifyArtisanToken, async (req, res) => {
  try {
    const { note } = req.body;

    if (!note || note.trim().length === 0) {
      return res.status(400).json({ message: 'Note is required' });
    }

    const order = await Order.findOne({
      _id: req.params.orderId,
      'items.artisan': req.artisan.id
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Add note to status history
    order.statusHistory.push({
      status: order.orderStatus,
      timestamp: new Date(),
      note: note.trim()
    });

    await order.save();

    res.json({
      success: true,
      message: 'Note added successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding note', error: error.message });
  }
});

// Get order delivery timeline
router.get('/:orderId/timeline', verifyArtisanToken, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      'items.artisan': req.artisan.id
    }).select('orderNumber orderStatus statusHistory createdAt shippedAt actualDelivery estimatedDelivery trackingNumber');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const timeline = [
      {
        status: 'placed',
        timestamp: order.createdAt,
        completed: true,
        note: 'Order placed by customer'
      }
    ];

    // Add status history
    order.statusHistory.forEach(history => {
      timeline.push({
        status: history.status,
        timestamp: history.timestamp,
        completed: true,
        note: history.note
      });
    });

    // Add future statuses if not completed
    const statusOrder = ['confirmed', 'processing', 'shipped', 'delivered'];
    const currentStatusIndex = statusOrder.indexOf(order.orderStatus);
    
    if (order.orderStatus !== 'cancelled' && order.orderStatus !== 'delivered') {
      statusOrder.slice(currentStatusIndex + 1).forEach(status => {
        timeline.push({
          status,
          timestamp: null,
          completed: false,
          note: `Pending ${status}`
        });
      });
    }

    res.json({
      success: true,
      timeline,
      currentStatus: order.orderStatus,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order timeline', error: error.message });
  }
});

// Export orders data (for reporting)
router.get('/export/data', verifyArtisanToken, async (req, res) => {
  try {
    const { format = 'json', dateFrom, dateTo } = req.query;

    let dateQuery = {};
    if (dateFrom || dateTo) {
      dateQuery.createdAt = {};
      if (dateFrom) dateQuery.createdAt.$gte = new Date(dateFrom);
      if (dateTo) dateQuery.createdAt.$lte = new Date(dateTo);
    }

    const orders = await Order.find({
      'items.artisan': req.artisan.id,
      ...dateQuery
    })
    .populate('user', 'name email phone')
    .populate('items.product', 'name category')
    .sort({ createdAt: -1 });

    const exportData = orders.map(order => {
      const artisanItems = order.items.filter(item => 
        item.artisan.toString() === req.artisan.id
      );
      
      return {
        orderNumber: order.orderNumber,
        customerName: order.user.name,
        customerEmail: order.user.email,
        orderDate: order.createdAt,
        status: order.orderStatus,
        items: artisanItems.map(item => ({
          product: item.product.name,
          category: item.product.category,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        })),
        totalValue: artisanItems.reduce((sum, item) => sum + item.total, 0),
        shippingAddress: order.shippingAddress,
        trackingNumber: order.trackingNumber
      };
    });

    if (format === 'csv') {
      // Convert to CSV format (simplified)
      const csvHeaders = 'Order Number,Customer,Email,Date,Status,Total Value,Tracking\n';
      const csvData = exportData.map(order => 
        `${order.orderNumber},${order.customerName},${order.customerEmail},${order.orderDate},${order.status},${order.totalValue},${order.trackingNumber || ''}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
      res.send(csvHeaders + csvData);
    } else {
      res.json({
        success: true,
        data: exportData,
        totalRecords: exportData.length
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error exporting orders', error: error.message });
  }
});

module.exports = router;
