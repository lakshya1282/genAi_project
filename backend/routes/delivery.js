const express = require('express');
const deliveryService = require('../services/deliveryService');
const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

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

// Create delivery (when artisan ships order)
router.post('/create', verifyArtisanToken, async (req, res) => {
  try {
    const { orderId, shippingData } = req.body;

    if (!orderId || !shippingData?.courierName) {
      return res.status(400).json({ 
        message: 'Order ID and courier name are required' 
      });
    }

    // Verify order belongs to artisan
    const order = await Order.findOne({
      _id: orderId,
      'items.artisan': req.artisan.id,
      orderStatus: { $in: ['confirmed', 'processing'] }
    });

    if (!order) {
      return res.status(404).json({ 
        message: 'Order not found or not ready for shipping' 
      });
    }

    const result = await deliveryService.createDelivery(orderId, shippingData);

    if (result.success) {
      res.json({
        success: true,
        message: 'Delivery created successfully',
        trackingNumber: result.trackingNumber,
        estimatedDelivery: result.estimatedDelivery,
        delivery: result.delivery
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to create delivery',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error creating delivery', 
      error: error.message 
    });
  }
});

// Track delivery by tracking number (public endpoint)
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    if (!trackingNumber) {
      return res.status(400).json({ message: 'Tracking number is required' });
    }

    const result = await deliveryService.trackDelivery(trackingNumber);

    if (result.success) {
      res.json({
        success: true,
        tracking: result.tracking
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error tracking delivery', 
      error: error.message 
    });
  }
});

// Update delivery status (artisan or system)
router.put('/update-status', verifyArtisanToken, async (req, res) => {
  try {
    const { trackingNumber, status, location, description } = req.body;

    if (!trackingNumber || !status) {
      return res.status(400).json({ 
        message: 'Tracking number and status are required' 
      });
    }

    // Verify delivery belongs to artisan
    const delivery = await Delivery.findOne({ 
      trackingNumber,
      'sender.artisan': req.artisan.id 
    });

    if (!delivery) {
      return res.status(404).json({ 
        message: 'Delivery not found or access denied' 
      });
    }

    const result = await deliveryService.updateDeliveryStatus(
      trackingNumber, 
      status, 
      location || {}, 
      description || '',
      'artisan'
    );

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        delivery: result.delivery
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating delivery status', 
      error: error.message 
    });
  }
});

// Get artisan's deliveries
router.get('/artisan/deliveries', verifyArtisanToken, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc'
    };

    const result = await deliveryService.getArtisanDeliveries(req.artisan.id, filters);

    if (result.success) {
      res.json({
        success: true,
        deliveries: result.deliveries,
        pagination: result.pagination
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error fetching deliveries',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching artisan deliveries', 
      error: error.message 
    });
  }
});

// Get delivery statistics
router.get('/artisan/stats', verifyArtisanToken, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const result = await deliveryService.getDeliveryStats(
      req.artisan.id, 
      dateFrom, 
      dateTo
    );

    if (result.success) {
      res.json({
        success: true,
        stats: result.stats
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error fetching delivery statistics',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching delivery statistics', 
      error: error.message 
    });
  }
});

// Report delivery issue
router.post('/report-issue', async (req, res) => {
  try {
    const { trackingNumber, type, description, reportedBy, contactInfo } = req.body;

    if (!trackingNumber || !type || !description) {
      return res.status(400).json({ 
        message: 'Tracking number, issue type, and description are required' 
      });
    }

    const issueData = {
      type,
      description,
      reportedBy: reportedBy || 'customer',
      contactInfo: contactInfo || ''
    };

    const result = await deliveryService.reportDeliveryIssue(trackingNumber, issueData);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        issueId: result.issueId
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error reporting delivery issue', 
      error: error.message 
    });
  }
});

// Get delivery by ID (for authenticated users)
router.get('/:deliveryId', verifyToken, async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const delivery = await Delivery.findById(deliveryId)
      .populate({
        path: 'order',
        populate: {
          path: 'user',
          select: 'name email phone'
        }
      })
      .populate('sender.artisan', 'name craftType location');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Check if user has access to this delivery
    const hasAccess = delivery.order.user._id.toString() === req.user.id ||
                     (req.user.type === 'artisan' && delivery.sender.artisan._id.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      delivery: {
        ...delivery.toObject(),
        progressPercentage: delivery.progressPercentage,
        isDelayed: delivery.isDelayed(),
        trackingUrl: delivery.trackingUrl
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching delivery', 
      error: error.message 
    });
  }
});

// Update delivery attempt (for couriers/delivery agents)
router.post('/attempt/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { status, reason, receivedBy, signature, photo } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Attempt status is required' });
    }

    const delivery = await Delivery.findOne({ trackingNumber });
    
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    const attemptNumber = delivery.deliveryAttempts.length + 1;
    
    delivery.deliveryAttempts.push({
      attemptNumber,
      timestamp: new Date(),
      status,
      reason: reason || '',
      receivedBy: receivedBy || '',
      signature: signature || '',
      photo: photo || ''
    });

    // Update overall status based on attempt
    let newStatus = delivery.currentStatus;
    if (status === 'delivered') {
      newStatus = 'delivered';
    } else if (status === 'failed') {
      newStatus = 'failed_delivery';
    }

    if (newStatus !== delivery.currentStatus) {
      await deliveryService.updateDeliveryStatus(
        trackingNumber,
        newStatus,
        {},
        `Delivery attempt ${attemptNumber}: ${status}`,
        'courier'
      );
    }

    await delivery.save();

    res.json({
      success: true,
      message: 'Delivery attempt recorded',
      attemptNumber,
      status: newStatus
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error recording delivery attempt', 
      error: error.message 
    });
  }
});

// Get user's deliveries
router.get('/user/deliveries', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    let query = {};
    
    // Find deliveries through orders
    const userOrders = await Order.find({ user: req.user.id }).select('_id');
    const orderIds = userOrders.map(order => order._id);
    
    query.order = { $in: orderIds };

    if (status && status !== 'all') {
      query.currentStatus = status;
    }

    const deliveries = await Delivery.find(query)
      .populate({
        path: 'order',
        select: 'orderNumber total'
      })
      .populate('sender.artisan', 'name craftType')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalCount = await Delivery.countDocuments(query);

    res.json({
      success: true,
      deliveries: deliveries.map(delivery => ({
        ...delivery.toObject(),
        progressPercentage: delivery.progressPercentage,
        isDelayed: delivery.isDelayed(),
        trackingUrl: delivery.trackingUrl
      })),
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
        totalCount
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching user deliveries', 
      error: error.message 
    });
  }
});

// Submit delivery feedback
router.post('/feedback/:trackingNumber', verifyToken, async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Valid rating (1-5) is required' });
    }

    const delivery = await Delivery.findOne({ trackingNumber })
      .populate('order');

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }

    // Check if user can provide feedback
    if (delivery.order.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if delivery is completed
    if (delivery.currentStatus !== 'delivered') {
      return res.status(400).json({ message: 'Cannot provide feedback for incomplete delivery' });
    }

    // Check if feedback already exists
    if (delivery.feedback.rating) {
      return res.status(400).json({ message: 'Feedback already submitted' });
    }

    delivery.feedback = {
      rating,
      comment: comment || '',
      submittedAt: new Date()
    };

    await delivery.save();

    res.json({
      success: true,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error submitting feedback', 
      error: error.message 
    });
  }
});

module.exports = router;
