const express = require('express');
const paymentService = require('../services/paymentService');
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

// Create payment order with retry mechanism
router.post('/create-order', verifyToken, async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount || amount <= 0) {
      return res.status(400).json({ 
        message: 'Valid order ID and amount are required' 
      });
    }

    // Verify order belongs to user and is pending payment
    const order = await Order.findOne({ 
      _id: orderId, 
      user: req.user.id,
      'paymentDetails.paymentStatus': { $in: ['pending', 'failed'] }
    });

    if (!order) {
      return res.status(404).json({ 
        message: 'Order not found or payment already completed' 
      });
    }

    // Create payment order with retry
    const result = await paymentService.createOrderWithRetry(amount, 'INR', orderId);

    if (result.success) {
      res.json({
        success: true,
        order: result.order,
        key: process.env.RAZORPAY_KEY_ID,
        message: 'Payment order created successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to create payment order',
        error: result.error,
        attemptsMade: result.attemptsMade
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error creating payment order', 
      error: error.message 
    });
  }
});

// Process payment with comprehensive error handling
router.post('/process', verifyToken, async (req, res) => {
  try {
    const { orderId, ...paymentData } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    // Verify order belongs to user
    const order = await Order.findOne({ 
      _id: orderId, 
      user: req.user.id 
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const result = await paymentService.processPayment(orderId, paymentData);

    if (result.success) {
      res.json({
        success: true,
        message: 'Payment processed successfully',
        paymentId: result.paymentId,
        amount: result.amount,
        method: result.method,
        status: result.status
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error,
        code: result.code,
        paymentStatus: result.paymentStatus
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error processing payment', 
      error: error.message 
    });
  }
});

// Retry failed payment
router.post('/retry/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id,
      'paymentDetails.paymentStatus': 'failed',
      'paymentDetails.retryAvailable': true,
      'paymentDetails.retryDeadline': { $gt: new Date() }
    });

    if (!order) {
      return res.status(404).json({ 
        message: 'Order not found or retry not available' 
      });
    }

    // Create new payment order
    const result = await paymentService.createOrderWithRetry(order.total, 'INR', orderId);

    if (result.success) {
      // Reset payment status
      await Order.findByIdAndUpdate(orderId, {
        'paymentDetails.paymentStatus': 'pending',
        'paymentDetails.retryAttempted': true,
        'paymentDetails.lastRetryAt': new Date()
      });

      res.json({
        success: true,
        order: result.order,
        key: process.env.RAZORPAY_KEY_ID,
        message: 'Payment retry initiated'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to create retry payment order',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrying payment', 
      error: error.message 
    });
  }
});

// Get payment status
router.get('/status/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ 
      _id: orderId, 
      user: req.user.id 
    }).select('paymentDetails orderStatus total orderNumber');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      success: true,
      payment: {
        orderNumber: order.orderNumber,
        status: order.paymentDetails.paymentStatus,
        method: order.paymentDetails.method,
        amount: order.total,
        transactionId: order.paymentDetails.transactionId,
        paymentDate: order.paymentDetails.paymentDate,
        failureReason: order.paymentDetails.failureReason,
        retryAvailable: order.paymentDetails.retryAvailable,
        retryDeadline: order.paymentDetails.retryDeadline
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching payment status', 
      error: error.message 
    });
  }
});

// Payment webhook handler
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.get('x-razorpay-signature');
    const body = req.body;

    // Verify webhook signature
    const isValid = paymentService.verifyWebhookSignature(body, signature);
    
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const { event, payload } = body;

    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload.payment.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity);
        break;
      case 'refund.processed':
        await handleRefundProcessed(payload.refund.entity);
        break;
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

// Handle payment captured webhook
async function handlePaymentCaptured(payment) {
  try {
    const orderId = payment.notes?.order_id;
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, {
        'paymentDetails.paymentStatus': 'completed',
        'paymentDetails.capturedAt': new Date(payment.created_at * 1000)
      });
      
      console.log(`Payment captured for order ${orderId}: ${payment.id}`);
    }
  } catch (error) {
    console.error('Error handling payment captured:', error);
  }
}

// Handle payment failed webhook
async function handlePaymentFailed(payment) {
  try {
    const orderId = payment.notes?.order_id;
    if (orderId) {
      await paymentService.handlePaymentFailure(
        orderId, 
        'gateway_failure', 
        { paymentId: payment.id },
        payment.error_description
      );
      
      console.log(`Payment failed for order ${orderId}: ${payment.id}`);
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

// Handle refund processed webhook
async function handleRefundProcessed(refund) {
  try {
    await Order.findOneAndUpdate(
      { 'paymentDetails.transactionId': refund.payment_id },
      {
        'paymentDetails.refundStatus': 'processed',
        'paymentDetails.refundId': refund.id,
        'paymentDetails.refundProcessedAt': new Date(refund.created_at * 1000)
      }
    );
    
    console.log(`Refund processed: ${refund.id} for payment ${refund.payment_id}`);
  } catch (error) {
    console.error('Error handling refund processed:', error);
  }
}

// Get payment analytics for artisan
router.get('/analytics', verifyArtisanToken, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const result = await paymentService.getPaymentAnalytics(
      req.artisan.id, 
      dateFrom, 
      dateTo
    );

    if (result.success) {
      res.json({
        success: true,
        analytics: result.analytics
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error fetching payment analytics',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching payment analytics', 
      error: error.message 
    });
  }
});

// Process refund
router.post('/refund', verifyArtisanToken, async (req, res) => {
  try {
    const { orderId, amount, reason = 'requested_by_artisan' } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    // Verify order belongs to artisan
    const order = await Order.findOne({
      _id: orderId,
      'items.artisan': req.artisan.id,
      'paymentDetails.paymentStatus': 'completed'
    });

    if (!order) {
      return res.status(404).json({ 
        message: 'Order not found or refund not applicable' 
      });
    }

    const result = await paymentService.refundPayment(
      order.paymentDetails.transactionId,
      amount,
      reason
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Refund processed successfully',
        refundId: result.refund.id,
        amount: result.refund.amount / 100
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Refund processing failed',
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({ 
      message: 'Error processing refund', 
      error: error.message 
    });
  }
});

// Bulk refunds
router.post('/bulk-refund', verifyArtisanToken, async (req, res) => {
  try {
    const { refundRequests } = req.body;

    if (!Array.isArray(refundRequests) || refundRequests.length === 0) {
      return res.status(400).json({ message: 'Refund requests array is required' });
    }

    // Verify all orders belong to artisan
    const orderIds = refundRequests.map(req => req.orderId);
    const orders = await Order.find({
      _id: { $in: orderIds },
      'items.artisan': req.artisan.id,
      'paymentDetails.paymentStatus': 'completed'
    });

    if (orders.length !== refundRequests.length) {
      return res.status(400).json({ 
        message: 'Some orders not found or not eligible for refund' 
      });
    }

    // Prepare refund requests with payment IDs
    const processRequests = refundRequests.map(request => {
      const order = orders.find(o => o._id.toString() === request.orderId);
      return {
        ...request,
        paymentId: order.paymentDetails.transactionId
      };
    });

    const results = await paymentService.processBulkRefunds(processRequests);
    
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      message: `Processed ${successCount} of ${results.length} refunds`,
      results
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error processing bulk refunds', 
      error: error.message 
    });
  }
});

// Get failed payments for recovery
router.get('/failed', verifyToken, async (req, res) => {
  try {
    const failedOrders = await Order.find({
      user: req.user.id,
      'paymentDetails.paymentStatus': 'failed',
      'paymentDetails.retryAvailable': true,
      'paymentDetails.retryDeadline': { $gt: new Date() }
    }).select('orderNumber total paymentDetails createdAt');

    res.json({
      success: true,
      failedPayments: failedOrders.map(order => ({
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.total,
        failureReason: order.paymentDetails.failureReason,
        retryDeadline: order.paymentDetails.retryDeadline,
        orderDate: order.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching failed payments', 
      error: error.message 
    });
  }
});

module.exports = router;
