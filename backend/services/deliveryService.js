const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const Artisan = require('../models/Artisan');
const notificationService = require('./notificationService');

class DeliveryService {
  constructor() {
    this.courierConfigs = {
      'BlueDart': {
        trackingUrl: 'https://www.bluedart.com/web/guest/trackdartresult?trackFor={trackingNumber}',
        apiEndpoint: process.env.BLUEDART_API_URL,
        apiKey: process.env.BLUEDART_API_KEY
      },
      'DTDC': {
        trackingUrl: 'https://www.dtdc.in/tracking/tracking_results/{trackingNumber}',
        apiEndpoint: process.env.DTDC_API_URL,
        apiKey: process.env.DTDC_API_KEY
      },
      'Delhivery': {
        trackingUrl: 'https://www.delhivery.com/track/package/{trackingNumber}',
        apiEndpoint: process.env.DELHIVERY_API_URL,
        apiKey: process.env.DELHIVERY_API_KEY
      },
      'Professional': {
        trackingUrl: 'https://www.tpcindia.com/track/{trackingNumber}',
        apiEndpoint: process.env.PROFESSIONAL_API_URL,
        apiKey: process.env.PROFESSIONAL_API_KEY
      }
    };
  }

  // Create delivery record when order is shipped
  async createDelivery(orderId, shippingData) {
    try {
      const order = await Order.findById(orderId)
        .populate('user')
        .populate('items.artisan');

      if (!order) {
        return {
          success: false,
          message: 'Order not found'
        };
      }

      // Get primary artisan (assuming first item's artisan for simplicity)
      const primaryArtisan = order.items[0].artisan;

      // Create delivery record
      const delivery = new Delivery({
        order: orderId,
        courier: {
          name: shippingData.courierName,
          contactNumber: shippingData.courierContact,
          website: this.courierConfigs[shippingData.courierName]?.website || '',
          trackingUrl: this.courierConfigs[shippingData.courierName]?.trackingUrl || ''
        },
        sender: {
          artisan: primaryArtisan._id,
          address: shippingData.senderAddress || {
            name: primaryArtisan.name,
            street: primaryArtisan.address?.street || '',
            city: primaryArtisan.address?.city || '',
            state: primaryArtisan.address?.state || '',
            country: 'India',
            pincode: primaryArtisan.address?.pincode || '',
            phone: primaryArtisan.phone
          },
          pickupDate: shippingData.pickupDate || new Date(),
          pickupTime: shippingData.pickupTime || '10:00 AM'
        },
        recipient: {
          name: order.user.name,
          phone: order.user.phone,
          address: order.shippingAddress,
          deliveryInstructions: shippingData.deliveryInstructions || ''
        },
        package: {
          weight: shippingData.weight || 1,
          dimensions: shippingData.dimensions || { length: 20, width: 15, height: 10 },
          description: shippingData.description || 'Handcrafted items',
          value: order.total,
          isFragile: shippingData.isFragile || true,
          requiresSignature: shippingData.requiresSignature !== false
        },
        specialInstructions: shippingData.specialInstructions || '',
        insurance: {
          isInsured: shippingData.insurance?.isInsured || false,
          amount: shippingData.insurance?.amount || 0
        },
        cost: {
          shippingCharge: order.shippingCost || 0,
          codCharge: shippingData.codCharge || 0,
          insuranceCharge: shippingData.insurance?.charge || 0,
          totalCost: (order.shippingCost || 0) + (shippingData.codCharge || 0) + (shippingData.insurance?.charge || 0)
        }
      });

      // Calculate estimated delivery
      delivery.calculateEstimatedDelivery();

      // Add initial status
      delivery.timeline.push({
        status: 'label_created',
        timestamp: new Date(),
        description: `Shipping label created for ${delivery.courier.name}`,
        updatedBy: 'system'
      });

      await delivery.save();

      // Update order with tracking information
      await Order.findByIdAndUpdate(orderId, {
        trackingNumber: delivery.trackingNumber,
        orderStatus: 'shipped',
        shippedAt: new Date()
      });

      // Send notifications
      await this.sendDeliveryNotifications(delivery._id, 'shipped');

      return {
        success: true,
        delivery,
        trackingNumber: delivery.trackingNumber,
        estimatedDelivery: delivery.estimatedDelivery
      };
    } catch (error) {
      console.error('Error creating delivery:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update delivery status
  async updateDeliveryStatus(trackingNumber, status, location = {}, description = '', updatedBy = 'system') {
    try {
      const delivery = await Delivery.findOne({ trackingNumber })
        .populate('order')
        .populate('sender.artisan');

      if (!delivery) {
        return {
          success: false,
          message: 'Delivery not found'
        };
      }

      // Add status update
      await delivery.addStatusUpdate(status, location, description, updatedBy);

      // Update order status if delivered
      if (status === 'delivered') {
        await Order.findByIdAndUpdate(delivery.order._id, {
          orderStatus: 'delivered',
          actualDelivery: new Date()
        });
      }

      // Send notifications for important status updates
      const notificationStatuses = ['picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery'];
      if (notificationStatuses.includes(status)) {
        await this.sendDeliveryNotifications(delivery._id, status);
      }

      return {
        success: true,
        delivery,
        message: `Delivery status updated to ${status}`
      };
    } catch (error) {
      console.error('Error updating delivery status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Track delivery by tracking number
  async trackDelivery(trackingNumber) {
    try {
      const delivery = await Delivery.findOne({ trackingNumber })
        .populate({
          path: 'order',
          select: 'orderNumber total items user',
          populate: {
            path: 'user',
            select: 'name email'
          }
        })
        .populate('sender.artisan', 'name craftType location');

      if (!delivery) {
        return {
          success: false,
          message: 'Tracking number not found'
        };
      }

      // Check if we should fetch latest updates from courier API
      const shouldFetchUpdates = this.shouldFetchCourierUpdates(delivery);
      if (shouldFetchUpdates) {
        await this.fetchCourierUpdates(delivery);
      }

      return {
        success: true,
        tracking: {
          trackingNumber: delivery.trackingNumber,
          currentStatus: delivery.currentStatus,
          progressPercentage: delivery.progressPercentage,
          estimatedDelivery: delivery.estimatedDelivery,
          actualDelivery: delivery.actualDelivery,
          isDelayed: delivery.isDelayed(),
          courier: delivery.courier,
          timeline: delivery.timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
          package: delivery.package,
          recipient: delivery.recipient,
          order: {
            orderNumber: delivery.order.orderNumber,
            total: delivery.order.total
          },
          artisan: {
            name: delivery.sender.artisan.name,
            craftType: delivery.sender.artisan.craftType,
            location: delivery.sender.artisan.location
          }
        }
      };
    } catch (error) {
      console.error('Error tracking delivery:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get deliveries for artisan
  async getArtisanDeliveries(artisanId, filters = {}) {
    try {
      const {
        status,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      let query = { 'sender.artisan': artisanId };

      if (status && status !== 'all') {
        query.currentStatus = status;
      }

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const deliveries = await Delivery.find(query)
        .populate({
          path: 'order',
          select: 'orderNumber total user',
          populate: {
            path: 'user',
            select: 'name phone'
          }
        })
        .sort(sortOptions)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const totalCount = await Delivery.countDocuments(query);

      return {
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
      };
    } catch (error) {
      console.error('Error getting artisan deliveries:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get delivery statistics
  async getDeliveryStats(artisanId, dateFrom, dateTo) {
    try {
      let matchQuery = { 'sender.artisan': artisanId };

      if (dateFrom || dateTo) {
        matchQuery.createdAt = {};
        if (dateFrom) matchQuery.createdAt.$gte = new Date(dateFrom);
        if (dateTo) matchQuery.createdAt.$lte = new Date(dateTo);
      }

      const stats = await Delivery.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$currentStatus',
            count: { $sum: 1 },
            totalValue: { $sum: '$package.value' }
          }
        }
      ]);

      const summary = {
        totalDeliveries: 0,
        totalValue: 0,
        byStatus: {
          label_created: { count: 0, value: 0 },
          pickup_scheduled: { count: 0, value: 0 },
          picked_up: { count: 0, value: 0 },
          in_transit: { count: 0, value: 0 },
          out_for_delivery: { count: 0, value: 0 },
          delivered: { count: 0, value: 0 },
          failed_delivery: { count: 0, value: 0 },
          returned_to_sender: { count: 0, value: 0 },
          cancelled: { count: 0, value: 0 }
        },
        deliveryRate: 0,
        averageDeliveryTime: 0
      };

      stats.forEach(stat => {
        summary.totalDeliveries += stat.count;
        summary.totalValue += stat.totalValue;
        summary.byStatus[stat._id] = {
          count: stat.count,
          value: stat.totalValue
        };
      });

      // Calculate delivery rate
      const deliveredCount = summary.byStatus.delivered.count;
      summary.deliveryRate = summary.totalDeliveries > 0 ? 
        ((deliveredCount / summary.totalDeliveries) * 100).toFixed(2) : 0;

      // Get delayed deliveries
      const delayedCount = await Delivery.countDocuments({
        ...matchQuery,
        currentStatus: { $nin: ['delivered', 'cancelled'] },
        estimatedDelivery: { $lt: new Date() }
      });

      return {
        success: true,
        stats: {
          ...summary,
          delayedDeliveries: delayedCount
        }
      };
    } catch (error) {
      console.error('Error getting delivery stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Report delivery issue
  async reportDeliveryIssue(trackingNumber, issueData) {
    try {
      const delivery = await Delivery.findOne({ trackingNumber });
      
      if (!delivery) {
        return {
          success: false,
          message: 'Delivery not found'
        };
      }

      delivery.issues.push({
        type: issueData.type,
        description: issueData.description,
        reportedBy: issueData.reportedBy || 'customer',
        reportedAt: new Date()
      });

      await delivery.save();

      // Notify artisan about the issue
      await notificationService.sendDeliveryIssueNotification(delivery._id, issueData);

      return {
        success: true,
        message: 'Issue reported successfully',
        issueId: delivery.issues[delivery.issues.length - 1]._id
      };
    } catch (error) {
      console.error('Error reporting delivery issue:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send delivery notifications
  async sendDeliveryNotifications(deliveryId, status) {
    try {
      const delivery = await Delivery.findById(deliveryId)
        .populate('order')
        .populate('sender.artisan');

      if (!delivery) return;

      const order = delivery.order;
      const customer = await require('../models/User').findById(order.user);

      if (!customer) return;

      let emailSubject = '';
      let emailContent = '';

      switch (status) {
        case 'shipped':
          emailSubject = '📦 Your Order Has Been Shipped!';
          emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #17a2b8;">📦 Your Order is on the Way!</h2>
              <p>Hello ${customer.name},</p>
              <p>Great news! Your order has been shipped and is on its way to you.</p>
              
              <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0; color: #0c5460;">Shipping Details</h3>
                <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p><strong>Tracking Number:</strong> ${delivery.trackingNumber}</p>
                <p><strong>Courier:</strong> ${delivery.courier.name}</p>
                <p><strong>Estimated Delivery:</strong> ${delivery.estimatedDelivery.toLocaleDateString()}</p>
              </div>
              
              <p>You can track your shipment using the tracking number above.</p>
              
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/track/${delivery.trackingNumber}" 
                 style="background: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Track Your Order
              </a>
            </div>
          `;
          break;

        case 'delivered':
          emailSubject = '🎉 Your Order Has Been Delivered!';
          emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #28a745;">🎉 Order Delivered Successfully!</h2>
              <p>Hello ${customer.name},</p>
              <p>Your handcrafted items have been delivered successfully!</p>
              
              <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0; color: #155724;">Delivery Confirmation</h3>
                <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p><strong>Tracking Number:</strong> ${delivery.trackingNumber}</p>
                <p><strong>Delivered on:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              
              <p>We hope you love your handcrafted items! Please consider leaving a review to help the artisan.</p>
              
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${order._id}/review" 
                 style="background: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Leave a Review
              </a>
            </div>
          `;
          break;

        case 'out_for_delivery':
          emailSubject = '🚚 Your Order is Out for Delivery!';
          emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #fd7e14;">🚚 Out for Delivery</h2>
              <p>Hello ${customer.name},</p>
              <p>Your order is out for delivery and should arrive today!</p>
              <p><strong>Tracking Number:</strong> ${delivery.trackingNumber}</p>
              <p>Please ensure someone is available to receive the package.</p>
            </div>
          `;
          break;
      }

      if (emailSubject && emailContent) {
        await notificationService.sendEmail(customer.email, emailSubject, emailContent);
      }

      // Send SMS for important updates
      if (['shipped', 'out_for_delivery', 'delivered'].includes(status)) {
        const smsMessage = `Your order ${order.orderNumber} has been ${status}. Track: ${delivery.trackingNumber}`;
        await notificationService.sendSMS(customer.phone, smsMessage);
      }

      // Update last notification sent
      delivery.notifications.lastNotificationSent = new Date();
      await delivery.save();

    } catch (error) {
      console.error('Error sending delivery notifications:', error);
    }
  }

  // Check if we should fetch courier updates (every 4 hours)
  shouldFetchCourierUpdates(delivery) {
    if (delivery.currentStatus === 'delivered' || delivery.currentStatus === 'cancelled') {
      return false;
    }

    const lastUpdate = delivery.timeline[delivery.timeline.length - 1];
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    
    return !lastUpdate || new Date(lastUpdate.timestamp) < fourHoursAgo;
  }

  // Fetch updates from courier API (placeholder for actual API integration)
  async fetchCourierUpdates(delivery) {
    try {
      // This is a placeholder - in real implementation, you'd call actual courier APIs
      console.log(`Fetching updates for ${delivery.trackingNumber} from ${delivery.courier.name}`);
      
      // Simulate API response
      const mockUpdates = [
        {
          status: 'in_transit',
          location: { city: 'Delhi', state: 'Delhi', facility: 'Delhi Hub' },
          description: 'Package in transit to delivery location',
          timestamp: new Date()
        }
      ];

      // Apply updates if they're newer than our latest
      for (const update of mockUpdates) {
        const latestUpdate = delivery.timeline[delivery.timeline.length - 1];
        if (!latestUpdate || new Date(update.timestamp) > new Date(latestUpdate.timestamp)) {
          await delivery.addStatusUpdate(
            update.status,
            update.location,
            update.description,
            'courier'
          );
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error fetching courier updates:', error);
      return { success: false, error: error.message };
    }
  }

  // Schedule automatic delivery notifications
  scheduleDeliveryNotifications() {
    // Check for deliveries that need updates every hour
    setInterval(async () => {
      try {
        const activeDeliveries = await Delivery.find({
          currentStatus: { $nin: ['delivered', 'cancelled', 'returned_to_sender'] },
          isActive: true
        });

        for (const delivery of activeDeliveries) {
          if (this.shouldFetchCourierUpdates(delivery)) {
            await this.fetchCourierUpdates(delivery);
          }

          // Check for delayed deliveries
          if (delivery.isDelayed() && !delivery.delayNotificationSent) {
            await this.sendDelayNotification(delivery._id);
            delivery.delayNotificationSent = true;
            await delivery.save();
          }
        }
      } catch (error) {
        console.error('Error in scheduled delivery notifications:', error);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  // Send delay notification
  async sendDelayNotification(deliveryId) {
    try {
      const delivery = await Delivery.findById(deliveryId)
        .populate('order')
        .populate('sender.artisan');

      if (!delivery) return;

      const customer = await require('../models/User').findById(delivery.order.user);
      if (!customer) return;

      const emailSubject = '⏰ Delivery Delay Notice';
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #fd7e14;">⏰ Delivery Delay Notice</h2>
          <p>Hello ${customer.name},</p>
          <p>We want to inform you that your order delivery is experiencing a slight delay.</p>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0; color: #856404;">Tracking Information</h3>
            <p><strong>Order Number:</strong> ${delivery.order.orderNumber}</p>
            <p><strong>Tracking Number:</strong> ${delivery.trackingNumber}</p>
            <p><strong>Current Status:</strong> ${delivery.currentStatus.replace('_', ' ').toUpperCase()}</p>
          </div>
          
          <p>We apologize for any inconvenience and are working to ensure your package reaches you as soon as possible.</p>
          
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/track/${delivery.trackingNumber}" 
             style="background: #fd7e14; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Track Your Order
          </a>
        </div>
      `;

      await notificationService.sendEmail(customer.email, emailSubject, emailContent);
      
    } catch (error) {
      console.error('Error sending delay notification:', error);
    }
  }
}

module.exports = new DeliveryService();
