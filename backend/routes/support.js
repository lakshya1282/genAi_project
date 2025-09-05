const express = require('express');
const Support = require('../models/Support');
const Order = require('../models/Order');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
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

// Create support ticket
router.post('/tickets', verifyToken, async (req, res) => {
  try {
    const {
      type,
      subject,
      description,
      category,
      subcategory,
      orderId,
      productId,
      priority,
      attachments
    } = req.body;

    if (!type || !subject || !description || !category) {
      return res.status(400).json({
        message: 'Type, subject, description, and category are required'
      });
    }

    // Get customer info for better support
    const customerOrders = await Order.find({ user: req.user.id });
    const totalOrders = customerOrders.length;
    const totalSpent = customerOrders.reduce((sum, order) => sum + order.total, 0);
    const accountAge = Math.round((new Date() - new Date(req.user.createdAt)) / (1000 * 60 * 60 * 24)); // days
    const previousTickets = await Support.countDocuments({ customer: req.user.id });

    // Determine if ticket should be marked as urgent
    const isUrgent = type === 'payment_issue' || 
                     priority === 'urgent' ||
                     (type === 'order_issue' && totalSpent > 10000);

    // Determine artisan if order/product related
    let artisanId = null;
    if (orderId) {
      const order = await Order.findById(orderId);
      if (order && order.items.length > 0) {
        artisanId = order.items[0].artisan;
      }
    } else if (productId) {
      const Product = require('../models/Product');
      const product = await Product.findById(productId);
      if (product) {
        artisanId = product.artisan;
      }
    }

    const ticket = new Support({
      type,
      subject,
      description,
      category,
      subcategory: subcategory || '',
      customer: req.user.id,
      artisan: artisanId,
      order: orderId || null,
      product: productId || null,
      priority: priority || (isUrgent ? 'high' : 'medium'),
      isUrgent,
      attachments: attachments || [],
      customerInfo: {
        totalOrders,
        totalSpent,
        accountAge,
        previousTickets
      }
    });

    // Add initial message
    await ticket.addMessage(
      'customer',
      description,
      {
        id: req.user.id,
        name: req.user.name || 'Customer',
        email: req.user.email
      }
    );

    await ticket.save();

    // Auto-assign based on category (simplified logic)
    const autoAssignmentMap = {
      'payment': 'payment_team',
      'shipping': 'logistics_team',
      'product': 'product_team',
      'technical': 'tech_team',
      'order': 'order_team'
    };

    if (autoAssignmentMap[category]) {
      await ticket.assignTo(autoAssignmentMap[category], `${category.charAt(0).toUpperCase() + category.slice(1)} Team`);
      ticket.automation.autoAssigned = true;
      await ticket.save();
    }

    // Send notification emails
    await notificationService.sendSupportTicketCreated(ticket._id);

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error creating support ticket', 
      error: error.message 
    });
  }
});

// Get user's tickets
router.get('/tickets', verifyToken, async (req, res) => {
  try {
    const { 
      status, 
      type, 
      priority, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = { customer: req.user.id };

    if (status && status !== 'all') query.status = status;
    if (type && type !== 'all') query.type = type;
    if (priority && priority !== 'all') query.priority = priority;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tickets = await Support.find(query)
      .populate('order', 'orderNumber total')
      .populate('product', 'name images')
      .populate('artisan', 'name craftType')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalCount = await Support.countDocuments(query);

    res.json({
      success: true,
      tickets: tickets.map(ticket => ({
        ...ticket.toObject(),
        ageInHours: ticket.ageInHours,
        unreadCount: ticket.unreadCount
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
      message: 'Error fetching support tickets', 
      error: error.message 
    });
  }
});

// Get specific ticket details
router.get('/tickets/:ticketNumber', verifyToken, async (req, res) => {
  try {
    const { ticketNumber } = req.params;

    const ticket = await Support.findOne({ 
      ticketNumber,
      customer: req.user.id 
    })
    .populate('order')
    .populate('product', 'name images price description')
    .populate('artisan', 'name craftType location email phone');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Mark messages as read by customer
    ticket.messages.forEach(msg => {
      if (!msg.readBy.find(r => r.user === 'customer')) {
        msg.readBy.push({ user: 'customer', readAt: new Date() });
      }
    });

    await ticket.save();

    res.json({
      success: true,
      ticket: {
        ...ticket.toObject(),
        ageInHours: ticket.ageInHours
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching ticket details', 
      error: error.message 
    });
  }
});

// Add message to ticket
router.post('/tickets/:ticketNumber/messages', verifyToken, async (req, res) => {
  try {
    const { ticketNumber } = req.params;
    const { message, attachments } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const ticket = await Support.findOne({ 
      ticketNumber,
      customer: req.user.id 
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (ticket.status === 'closed') {
      return res.status(400).json({ message: 'Cannot add messages to closed ticket' });
    }

    await ticket.addMessage(
      'customer',
      message.trim(),
      {
        id: req.user.id,
        name: req.user.name || 'Customer',
        email: req.user.email
      },
      attachments || []
    );

    // Update ticket status if it was resolved
    if (ticket.status === 'resolved') {
      ticket.status = 'open';
      await ticket.save();
    }

    // Send notification
    await notificationService.sendSupportTicketUpdated(ticket._id, 'customer_response');

    res.json({
      success: true,
      message: 'Message added successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error adding message', 
      error: error.message 
    });
  }
});

// Close/resolve ticket
router.put('/tickets/:ticketNumber/close', verifyToken, async (req, res) => {
  try {
    const { ticketNumber } = req.params;
    const { satisfactionRating, satisfactionComment } = req.body;

    const ticket = await Support.findOne({ 
      ticketNumber,
      customer: req.user.id,
      status: { $in: ['resolved', 'pending_customer'] }
    });

    if (!ticket) {
      return res.status(404).json({ 
        message: 'Ticket not found or not in closeable state' 
      });
    }

    ticket.status = 'closed';
    ticket.closedAt = new Date();

    if (satisfactionRating) {
      ticket.resolution.customerSatisfied = satisfactionRating >= 4;
      ticket.resolution.satisfactionRating = satisfactionRating;
      ticket.resolution.satisfactionComment = satisfactionComment || '';
    }

    await ticket.addMessage(
      'system',
      `Ticket closed by customer${satisfactionRating ? ` with rating: ${satisfactionRating}/5` : ''}`,
      { name: 'System' }
    );

    await ticket.save();

    res.json({
      success: true,
      message: 'Ticket closed successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error closing ticket', 
      error: error.message 
    });
  }
});

// Reopen ticket
router.put('/tickets/:ticketNumber/reopen', verifyToken, async (req, res) => {
  try {
    const { ticketNumber } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: 'Reason for reopening is required' });
    }

    const ticket = await Support.findOne({ 
      ticketNumber,
      customer: req.user.id,
      status: { $in: ['resolved', 'closed'] }
    });

    if (!ticket) {
      return res.status(404).json({ 
        message: 'Ticket not found or cannot be reopened' 
      });
    }

    await ticket.reopen(`Customer request: ${reason.trim()}`);

    // Send notification
    await notificationService.sendSupportTicketUpdated(ticket._id, 'reopened');

    res.json({
      success: true,
      message: 'Ticket reopened successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error reopening ticket', 
      error: error.message 
    });
  }
});

// Get support categories and types
router.get('/categories', (req, res) => {
  const categories = {
    order: {
      label: 'Order Issues',
      types: ['order_issue', 'return_request', 'refund_request'],
      subcategories: ['Order not received', 'Wrong item received', 'Damaged item', 'Order cancellation', 'Order modification']
    },
    payment: {
      label: 'Payment Issues',
      types: ['payment_issue', 'refund_request'],
      subcategories: ['Payment failed', 'Double charge', 'Refund not received', 'Payment method issue']
    },
    shipping: {
      label: 'Shipping & Delivery',
      types: ['delivery_issue'],
      subcategories: ['Delayed delivery', 'Lost package', 'Damaged package', 'Wrong address', 'Delivery attempt failed']
    },
    product: {
      label: 'Product Issues',
      types: ['product_defect', 'return_request'],
      subcategories: ['Product defective', 'Product not as described', 'Quality issue', 'Missing parts', 'Product incompatible']
    },
    account: {
      label: 'Account Issues',
      types: ['account_issue'],
      subcategories: ['Login problems', 'Profile update', 'Email/SMS issues', 'Privacy concerns']
    },
    technical: {
      label: 'Technical Support',
      types: ['technical_support'],
      subcategories: ['Website not working', 'App crashes', 'Feature not working', 'Performance issues']
    },
    other: {
      label: 'Other',
      types: ['general_inquiry', 'complaint', 'suggestion'],
      subcategories: ['General question', 'Feedback', 'Suggestion', 'Partnership inquiry', 'Media inquiry']
    }
  };

  res.json({
    success: true,
    categories
  });
});

// Get ticket statistics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const stats = await Support.aggregate([
      { $match: { customer: req.user.id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const summary = {
      total: 0,
      open: 0,
      assigned: 0,
      in_progress: 0,
      pending_customer: 0,
      resolved: 0,
      closed: 0,
      escalated: 0
    };

    stats.forEach(stat => {
      summary.total += stat.count;
      summary[stat._id] = stat.count;
    });

    // Get recent activity
    const recentTickets = await Support.find({ customer: req.user.id })
      .sort({ lastActivityAt: -1 })
      .limit(5)
      .select('ticketNumber subject status lastActivityAt');

    res.json({
      success: true,
      stats: summary,
      recentActivity: recentTickets
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching support statistics', 
      error: error.message 
    });
  }
});

// Search tickets
router.get('/search', verifyToken, async (req, res) => {
  try {
    const { q, category, status, dateFrom, dateTo } = req.query;

    if (!q || q.trim().length < 3) {
      return res.status(400).json({ 
        message: 'Search query must be at least 3 characters' 
      });
    }

    let query = {
      customer: req.user.id,
      $or: [
        { subject: { $regex: q.trim(), $options: 'i' } },
        { description: { $regex: q.trim(), $options: 'i' } },
        { ticketNumber: { $regex: q.trim(), $options: 'i' } }
      ]
    };

    if (category && category !== 'all') query.category = category;
    if (status && status !== 'all') query.status = status;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const tickets = await Support.find(query)
      .populate('order', 'orderNumber')
      .populate('product', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      results: tickets.length,
      tickets: tickets.map(ticket => ({
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        createdAt: ticket.createdAt,
        lastActivityAt: ticket.lastActivityAt,
        order: ticket.order,
        product: ticket.product
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error searching tickets', 
      error: error.message 
    });
  }
});

// Quick actions for common issues
router.post('/quick-actions/:action', verifyToken, async (req, res) => {
  try {
    const { action } = req.params;
    const { orderId, reason } = req.body;

    let ticketData = {};

    switch (action) {
      case 'cancel-order':
        if (!orderId) {
          return res.status(400).json({ message: 'Order ID is required' });
        }
        
        const order = await Order.findOne({ _id: orderId, user: req.user.id });
        if (!order) {
          return res.status(404).json({ message: 'Order not found' });
        }

        if (['shipped', 'delivered'].includes(order.orderStatus)) {
          return res.status(400).json({ message: 'Cannot cancel shipped/delivered orders' });
        }

        ticketData = {
          type: 'order_issue',
          category: 'order',
          subcategory: 'Order cancellation',
          subject: `Cancel Order ${order.orderNumber}`,
          description: `Request to cancel order ${order.orderNumber}. Reason: ${reason || 'Customer request'}`,
          order: orderId,
          priority: 'high'
        };
        break;

      case 'report-defect':
        if (!req.body.productId) {
          return res.status(400).json({ message: 'Product ID is required' });
        }
        
        ticketData = {
          type: 'product_defect',
          category: 'product',
          subcategory: 'Product defective',
          subject: 'Product Defect Report',
          description: `Product defect reported. Details: ${reason || 'Product not working as expected'}`,
          product: req.body.productId,
          priority: 'high'
        };
        break;

      case 'request-refund':
        if (!orderId) {
          return res.status(400).json({ message: 'Order ID is required' });
        }
        
        ticketData = {
          type: 'refund_request',
          category: 'payment',
          subcategory: 'Refund request',
          subject: `Refund Request for Order`,
          description: `Request refund for order. Reason: ${reason || 'Not satisfied with purchase'}`,
          order: orderId,
          priority: 'medium'
        };
        break;

      default:
        return res.status(400).json({ message: 'Invalid quick action' });
    }

    // Create the ticket using the regular ticket creation logic
    req.body = ticketData;
    return router.handle({ ...req, url: '/tickets', method: 'POST' }, res);

  } catch (error) {
    res.status(500).json({ 
      message: 'Error processing quick action', 
      error: error.message 
    });
  }
});

module.exports = router;
