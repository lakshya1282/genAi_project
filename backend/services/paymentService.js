const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const notificationService = require('./notificationService');

class PaymentService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'demo_key_id',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'demo_key_secret'
    });
    
    // Payment retry configuration
    this.retryConfig = {
      maxAttempts: 3,
      retryDelay: 1000 // 1 second
    };
    
    // Payment timeout configuration
    this.timeoutConfig = {
      paymentTimeout: 15 * 60 * 1000, // 15 minutes
      abandonedTimeout: 24 * 60 * 60 * 1000 // 24 hours
    };
  }

  // Create payment order
  async createOrder(amount, currency = 'INR', orderId) {
    try {
      const options = {
        amount: amount * 100, // Razorpay amount is in smallest currency unit (paise)
        currency,
        receipt: orderId,
        notes: {
          order_id: orderId
        }
      };

      const order = await this.razorpay.orders.create(options);
      return {
        success: true,
        order
      };
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verify payment signature
  verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'demo_key_secret')
        .update(body.toString())
        .digest('hex');

      return {
        success: expectedSignature === razorpaySignature,
        expectedSignature,
        receivedSignature: razorpaySignature
      };
    } catch (error) {
      console.error('Error verifying payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get payment details
  async getPayment(paymentId) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return {
        success: true,
        payment
      };
    } catch (error) {
      console.error('Error fetching payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Refund payment
  async refundPayment(paymentId, amount = null, reason = 'requested_by_customer') {
    try {
      const refundData = {
        notes: {
          reason
        }
      };

      if (amount) {
        refundData.amount = amount * 100; // Convert to paise
      }

      const refund = await this.razorpay.payments.refund(paymentId, refundData);
      return {
        success: true,
        refund
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create subscription (for future use)
  async createSubscription(planId, customerId, totalCount = 12) {
    try {
      const options = {
        plan_id: planId,
        customer_id: customerId,
        total_count: totalCount,
        quantity: 1
      };

      const subscription = await this.razorpay.subscriptions.create(options);
      return {
        success: true,
        subscription
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Webhook signature verification
  verifyWebhookSignature(body, signature, secret) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret || process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(JSON.stringify(body))
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  // Enhanced payment creation with retry mechanism
  async createOrderWithRetry(amount, currency = 'INR', orderId, attempt = 1) {
    try {
      const result = await this.createOrder(amount, currency, orderId);
      
      if (!result.success && attempt < this.retryConfig.maxAttempts) {
        console.log(`Payment creation failed, retrying... Attempt ${attempt + 1}`);
        await new Promise(resolve => setTimeout(resolve, this.retryConfig.retryDelay * attempt));
        return this.createOrderWithRetry(amount, currency, orderId, attempt + 1);
      }
      
      return result;
    } catch (error) {
      console.error('Error in payment creation with retry:', error);
      return {
        success: false,
        error: error.message,
        attemptsMade: attempt
      };
    }
  }

  // Process payment with comprehensive error handling
  async processPayment(orderId, paymentData) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
      
      // Verify payment signature
      const verification = this.verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      
      if (!verification.success) {
        await this.handlePaymentFailure(orderId, 'signature_verification_failed', paymentData);
        return {
          success: false,
          error: 'Payment signature verification failed',
          code: 'SIGNATURE_MISMATCH'
        };
      }

      // Get payment details from Razorpay
      const paymentDetails = await this.getPayment(razorpay_payment_id);
      
      if (!paymentDetails.success) {
        await this.handlePaymentFailure(orderId, 'payment_fetch_failed', paymentData);
        return {
          success: false,
          error: 'Failed to fetch payment details',
          code: 'FETCH_ERROR'
        };
      }

      const payment = paymentDetails.payment;
      
      // Check payment status
      if (payment.status !== 'captured' && payment.status !== 'authorized') {
        await this.handlePaymentFailure(orderId, `payment_status_${payment.status}`, paymentData);
        return {
          success: false,
          error: `Payment status: ${payment.status}`,
          code: 'INVALID_STATUS',
          paymentStatus: payment.status
        };
      }

      // Update order with payment details
      const order = await Order.findByIdAndUpdate(orderId, {
        'paymentDetails.paymentStatus': 'completed',
        'paymentDetails.transactionId': razorpay_payment_id,
        'paymentDetails.razorpayOrderId': razorpay_order_id,
        'paymentDetails.paymentMethod': payment.method,
        'paymentDetails.paidAmount': payment.amount / 100, // Convert from paise
        'paymentDetails.paymentDate': new Date(payment.created_at * 1000),
        'paymentDetails.gatewayResponse': {
          status: payment.status,
          method: payment.method,
          bank: payment.bank,
          wallet: payment.wallet,
          vpa: payment.vpa,
          cardId: payment.card_id
        }
      }, { new: true });

      // Send payment confirmation
      await this.sendPaymentConfirmation(orderId);
      
      return {
        success: true,
        paymentId: razorpay_payment_id,
        amount: payment.amount / 100,
        method: payment.method,
        status: payment.status,
        order
      };
    } catch (error) {
      console.error('Error processing payment:', error);
      await this.handlePaymentFailure(orderId, 'processing_error', paymentData, error.message);
      return {
        success: false,
        error: 'Payment processing failed',
        code: 'PROCESSING_ERROR'
      };
    }
  }

  // Handle payment failures with logging and notifications
  async handlePaymentFailure(orderId, reason, paymentData, errorMessage = '') {
    try {
      const order = await Order.findByIdAndUpdate(orderId, {
        'paymentDetails.paymentStatus': 'failed',
        'paymentDetails.failureReason': reason,
        'paymentDetails.failureData': paymentData,
        'paymentDetails.failureTime': new Date(),
        'paymentDetails.errorMessage': errorMessage
      }, { new: true }).populate('user');

      if (order) {
        // Log the failure
        console.error(`Payment failure for order ${order.orderNumber}: ${reason}`, {
          orderId,
          reason,
          paymentData,
          errorMessage
        });

        // Send failure notification to customer
        await notificationService.sendPaymentFailureNotification(orderId, reason);
        
        // Create retry opportunity
        await this.createPaymentRetryOpportunity(orderId);
      }
    } catch (error) {
      console.error('Error handling payment failure:', error);
    }
  }

  // Create payment retry opportunity
  async createPaymentRetryOpportunity(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) return;

      // Set retry timeout (24 hours)
      const retryDeadline = new Date(Date.now() + this.timeoutConfig.abandonedTimeout);
      
      await Order.findByIdAndUpdate(orderId, {
        'paymentDetails.retryDeadline': retryDeadline,
        'paymentDetails.retryAvailable': true
      });

      // Schedule reminder notifications
      setTimeout(async () => {
        await this.sendPaymentRetryReminder(orderId, '6 hours');
      }, 6 * 60 * 60 * 1000); // 6 hours

      setTimeout(async () => {
        await this.sendPaymentRetryReminder(orderId, '1 hour');
      }, 23 * 60 * 60 * 1000); // 23 hours (1 hour before expiry)

      // Auto-cancel after deadline
      setTimeout(async () => {
        await this.cancelAbandonedPayment(orderId);
      }, this.timeoutConfig.abandonedTimeout);
      
    } catch (error) {
      console.error('Error creating payment retry opportunity:', error);
    }
  }

  // Send payment retry reminder
  async sendPaymentRetryReminder(orderId, timeLeft) {
    try {
      const order = await Order.findById(orderId).populate('user');
      if (!order || order.paymentDetails.paymentStatus === 'completed') return;

      await notificationService.sendPaymentRetryReminder(orderId, timeLeft);
    } catch (error) {
      console.error('Error sending payment retry reminder:', error);
    }
  }

  // Cancel abandoned payment
  async cancelAbandonedPayment(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order || order.paymentDetails.paymentStatus === 'completed') return;

      await Order.findByIdAndUpdate(orderId, {
        orderStatus: 'cancelled',
        'paymentDetails.paymentStatus': 'abandoned',
        'paymentDetails.abandonedAt': new Date()
      });

      // Restore stock
      const inventoryService = require('./inventoryService');
      await inventoryService.restoreStock(order.items);

      // Notify customer
      await notificationService.sendPaymentAbandonedNotification(orderId);
      
      console.log(`Order ${order.orderNumber} cancelled due to abandoned payment`);
    } catch (error) {
      console.error('Error cancelling abandoned payment:', error);
    }
  }

  // Send payment confirmation
  async sendPaymentConfirmation(orderId) {
    try {
      await notificationService.sendPaymentConfirmation(orderId);
    } catch (error) {
      console.error('Error sending payment confirmation:', error);
    }
  }

  // Get payment analytics
  async getPaymentAnalytics(artisanId, dateFrom, dateTo) {
    try {
      const matchQuery = {
        'items.artisan': artisanId,
        'paymentDetails.paymentStatus': 'completed'
      };

      if (dateFrom || dateTo) {
        matchQuery.createdAt = {};
        if (dateFrom) matchQuery.createdAt.$gte = new Date(dateFrom);
        if (dateTo) matchQuery.createdAt.$lte = new Date(dateTo);
      }

      const analytics = await Order.aggregate([
        { $match: matchQuery },
        { $unwind: '$items' },
        { $match: { 'items.artisan': artisanId } },
        {
          $group: {
            _id: '$paymentDetails.paymentMethod',
            count: { $sum: 1 },
            totalAmount: { $sum: '$items.total' },
            avgAmount: { $avg: '$items.total' },
            orders: { $addToSet: '$_id' }
          }
        }
      ]);

      const summary = {
        totalTransactions: 0,
        totalAmount: 0,
        byMethod: {},
        avgTransactionValue: 0
      };

      analytics.forEach(stat => {
        summary.totalTransactions += stat.orders.length;
        summary.totalAmount += stat.totalAmount;
        summary.byMethod[stat._id] = {
          count: stat.orders.length,
          amount: stat.totalAmount,
          avgAmount: stat.avgAmount
        };
      });

      summary.avgTransactionValue = summary.totalTransactions > 0 ? 
        summary.totalAmount / summary.totalTransactions : 0;

      return {
        success: true,
        analytics: summary
      };
    } catch (error) {
      console.error('Error getting payment analytics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process bulk refunds
  async processBulkRefunds(refundRequests) {
    const results = [];
    
    for (const request of refundRequests) {
      try {
        const result = await this.refundPayment(
          request.paymentId, 
          request.amount, 
          request.reason
        );
        
        results.push({
          paymentId: request.paymentId,
          orderId: request.orderId,
          ...result
        });
        
        if (result.success) {
          // Update order status
          await Order.findByIdAndUpdate(request.orderId, {
            'paymentDetails.refundStatus': 'processed',
            'paymentDetails.refundId': result.refund.id,
            'paymentDetails.refundAmount': request.amount,
            'paymentDetails.refundDate': new Date()
          });
          
          // Notify customer
          await notificationService.sendRefundNotification(request.orderId, result.refund);
        }
      } catch (error) {
        results.push({
          paymentId: request.paymentId,
          orderId: request.orderId,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = new PaymentService();
