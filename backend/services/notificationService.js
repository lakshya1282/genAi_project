const nodemailer = require('nodemailer');
const twilio = require('twilio');
const Notification = require('../models/Notification');
const Artisan = require('../models/Artisan');

class NotificationService {
  constructor() {
    // Email transporter
    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail', // You can change this to your preferred service
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your-app-password'
      }
    });

    // SMS client (Twilio)
    this.smsClient = process.env.TWILIO_ACCOUNT_SID ? 
      twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;
  }

  // Create in-app notification
  async createNotification(recipientId, type, title, message, data = {}, priority = 'medium') {
    try {
      const notification = new Notification({
        recipient: recipientId,
        type,
        title,
        message,
        data,
        priority,
        actionUrl: data.actionUrl
      });

      await notification.save();
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Send email notification
  async sendEmail(to, subject, html, text = null) {
    try {
      if (!process.env.EMAIL_USER) {
        console.log('Email not configured. Would send:', { to, subject });
        return { success: false, message: 'Email service not configured' };
      }

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send SMS notification
  async sendSMS(to, message) {
    try {
      if (!this.smsClient) {
        console.log('SMS not configured. Would send:', { to, message });
        return { success: false, message: 'SMS service not configured' };
      }

      const result = await this.smsClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to
      });

      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return { success: false, error: error.message };
    }
  }

  // Notify artisan about cart addition
  async notifyCartAddition(productId, customerId, quantity) {
    try {
      const Product = require('../models/Product');
      const User = require('../models/User');
      
      const product = await Product.findById(productId).populate('artisan');
      const customer = await User.findById(customerId);

      if (!product || !customer) return;

      const artisan = product.artisan;
      const title = 'Product Added to Cart!';
      const message = `${customer.name} added ${quantity} ${product.name}(s) to their cart. Total value: ₹${product.price * quantity}`;

      // Create in-app notification
      await this.createNotification(
        artisan._id,
        'cart_addition',
        title,
        message,
        {
          product: productId,
          customer: customerId,
          quantity,
          amount: product.price * quantity,
          actionUrl: `/dashboard/products/${productId}`
        },
        'low'
      );

      // Send email notification
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-inline-size: 600px; margin: 0 auto;">
          <h2 style="color: #333;">🛒 Your Product is in Demand!</h2>
          <p>Hello ${artisan.name},</p>
          <p>Great news! A customer has shown interest in your product:</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0; color: #495057;">${product.name}</h3>
            <p style="margin: 10px 0;"><strong>Quantity:</strong> ${quantity}</p>
            <p style="margin: 10px 0;"><strong>Potential Value:</strong> ₹${product.price * quantity}</p>
            <p style="margin: 10px 0;"><strong>Customer:</strong> ${customer.name}</p>
          </div>
          
          <p>This is a great opportunity! Make sure your product details are up to date and consider reaching out to the customer.</p>
          
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
             style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Dashboard
          </a>
          
          <p style="margin-block-start: 30px; color: #6c757d; font-size: 14px;">
            Best regards,<br>
            ArtisanAI Team
          </p>
        </div>
      `;

      await this.sendEmail(artisan.email, title, emailHtml);

      return { success: true };
    } catch (error) {
      console.error('Error sending cart notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Notify artisan about order cancellation
  async notifyOrderCancellation(orderId) {
    try {
      const Order = require('../models/Order');
      
      const order = await Order.findById(orderId)
        .populate('user')
        .populate('items.product')
        .populate('items.artisan');

      if (!order) return;

      // Group items by artisan
      const artisanOrders = {};
      order.items.forEach(item => {
        const artisanId = item.artisan._id.toString();
        if (!artisanOrders[artisanId]) {
          artisanOrders[artisanId] = {
            artisan: item.artisan,
            items: [],
            total: 0
          };
        }
        artisanOrders[artisanId].items.push(item);
        artisanOrders[artisanId].total += item.total;
      });

      // Send notifications to each artisan
      for (const artisanId in artisanOrders) {
        const artisanOrder = artisanOrders[artisanId];
        const artisan = artisanOrder.artisan;

        const title = 'Order Cancelled';
        const message = `Order #${order.orderNumber} from ${order.user.name} has been cancelled. Refund amount: ₹${artisanOrder.total}`;

        // Create in-app notification
        await this.createNotification(
          artisanId,
          'order_cancelled',
          title,
          message,
          {
            order: orderId,
            customer: order.user._id,
            amount: artisanOrder.total,
            actionUrl: `/dashboard/orders/${order.orderNumber}`
          },
          'medium'
        );

        // Send email notification
        const itemsList = artisanOrder.items.map(item => 
          `<li>${item.product.name} - Qty: ${item.quantity} - ₹${item.total}</li>`
        ).join('');

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-inline-size: 600px; margin: 0 auto;">
            <h2 style="color: #f39c12;">📋 Order Cancelled</h2>
            <p>Hello ${artisan.name},</p>
            <p>We want to inform you that an order has been cancelled by the customer.</p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeeba; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0; color: #856404;">Order #${order.orderNumber}</h3>
              <p><strong>Customer:</strong> ${order.user.name}</p>
              <p><strong>Cancelled Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Refund Amount:</strong> ₹${artisanOrder.total}</p>
            </div>
            
            <h4>Cancelled Items:</h4>
            <ul>${itemsList}</ul>
            
            <p>The stock for these items has been automatically restored to your inventory.</p>
            
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/orders" 
               style="background: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View All Orders
            </a>
            
            <p style="margin-block-start: 30px; color: #6c757d; font-size: 14px;">
              Best regards,<br>
              ArtisanAI Team
            </p>
          </div>
        `;

        await this.sendEmail(artisan.email, title, emailHtml);
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending cancellation notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Notify customer about order status update
  async notifyOrderStatusUpdate(orderId, newStatus, note) {
    try {
      const Order = require('../models/Order');
      
      const order = await Order.findById(orderId)
        .populate('user')
        .populate('items.product')
        .populate('items.artisan');

      if (!order) return;

      const customer = order.user;
      const title = `Order ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`;
      let message = `Your order #${order.orderNumber} has been ${newStatus}.`;
      
      if (note) {
        message += ` Note: ${note}`;
      }

      // Create customer notification (if we had customer notifications)
      // For now, just send email
      
      let emailHtml = '';
      let emailSubject = '';
      
      switch (newStatus) {
        case 'confirmed':
          emailSubject = '✅ Order Confirmed';
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-inline-size: 600px; margin: 0 auto;">
              <h2 style="color: #28a745;">✅ Your Order is Confirmed!</h2>
              <p>Hello ${customer.name},</p>
              <p>Great news! Your order has been confirmed and is being prepared.</p>
              
              <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0; color: #155724;">Order #${order.orderNumber}</h3>
                <p><strong>Status:</strong> Confirmed</p>
                <p><strong>Total:</strong> ₹${order.total}</p>
                <p><strong>Estimated Delivery:</strong> ${order.estimatedDelivery ? order.estimatedDelivery.toLocaleDateString() : 'TBD'}</p>
              </div>
              
              ${note ? `<p><strong>Note from artisan:</strong> ${note}</p>` : ''}
              
              <p>We'll keep you updated on your order progress.</p>
            </div>
          `;
          break;
          
        case 'processing':
          emailSubject = '🔄 Order Being Processed';
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-inline-size: 600px; margin: 0 auto;">
              <h2 style="color: #fd7e14;">🔄 Your Order is Being Processed</h2>
              <p>Hello ${customer.name},</p>
              <p>Your order is now being carefully crafted by our skilled artisan.</p>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0; color: #856404;">Order #${order.orderNumber}</h3>
                <p><strong>Status:</strong> Processing</p>
                <p><strong>Total:</strong> ₹${order.total}</p>
              </div>
              
              ${note ? `<p><strong>Update from artisan:</strong> ${note}</p>` : ''}
              
              <p>Your handcrafted items are being prepared with care and attention to detail.</p>
            </div>
          `;
          break;
          
        case 'shipped':
          emailSubject = '📦 Order Shipped';
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-inline-size: 600px; margin: 0 auto;">
              <h2 style="color: #17a2b8;">📦 Your Order Has Been Shipped!</h2>
              <p>Hello ${customer.name},</p>
              <p>Exciting news! Your order is on its way to you.</p>
              
              <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0; color: #0c5460;">Order #${order.orderNumber}</h3>
                <p><strong>Status:</strong> Shipped</p>
                <p><strong>Total:</strong> ₹${order.total}</p>
                ${order.trackingNumber ? `<p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>` : ''}
                <p><strong>Expected Delivery:</strong> ${order.estimatedDelivery ? order.estimatedDelivery.toLocaleDateString() : 'Soon'}</p>
              </div>
              
              ${note ? `<p><strong>Shipping note:</strong> ${note}</p>` : ''}
              
              <p>You can expect your order to arrive soon. Thank you for supporting handmade crafts!</p>
            </div>
          `;
          break;
          
        case 'delivered':
          emailSubject = '🎉 Order Delivered';
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-inline-size: 600px; margin: 0 auto;">
              <h2 style="color: #28a745;">🎉 Your Order Has Been Delivered!</h2>
              <p>Hello ${customer.name},</p>
              <p>Wonderful! Your handcrafted items have been delivered.</p>
              
              <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0; color: #155724;">Order #${order.orderNumber}</h3>
                <p><strong>Status:</strong> Delivered</p>
                <p><strong>Total:</strong> ₹${order.total}</p>
                <p><strong>Delivered on:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              
              <p>We hope you love your handcrafted items! Please consider leaving a review to help the artisan and other customers.</p>
              
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${order._id}/review" 
                 style="background: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-block-start: 10px;">
                Leave a Review
              </a>
            </div>
          `;
          break;
          
        default:
          emailSubject = `Order Update - ${newStatus}`;
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-inline-size: 600px; margin: 0 auto;">
              <h2>Order Status Update</h2>
              <p>Hello ${customer.name},</p>
              <p>Your order #${order.orderNumber} status has been updated to: <strong>${newStatus}</strong></p>
              ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}
            </div>
          `;
      }

      await this.sendEmail(customer.email, emailSubject, emailHtml);

      return { success: true };
    } catch (error) {
      console.error('Error sending order status notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Notify artisan about new order
  async notifyNewOrder(orderId) {
    try {
      const Order = require('../models/Order');
      
      const order = await Order.findById(orderId)
        .populate('user')
        .populate('items.product')
        .populate('items.artisan');

      if (!order) return;

      // Group items by artisan
      const artisanOrders = {};
      order.items.forEach(item => {
        const artisanId = item.artisan._id.toString();
        if (!artisanOrders[artisanId]) {
          artisanOrders[artisanId] = {
            artisan: item.artisan,
            items: [],
            total: 0
          };
        }
        artisanOrders[artisanId].items.push(item);
        artisanOrders[artisanId].total += item.total;
      });

      // Send notifications to each artisan
      for (const artisanId in artisanOrders) {
        const artisanOrder = artisanOrders[artisanId];
        const artisan = artisanOrder.artisan;

        const title = 'New Order Received!';
        const message = `You received a new order #${order.orderNumber} from ${order.user.name}. Order value: ₹${artisanOrder.total}`;

        // Create in-app notification
        await this.createNotification(
          artisanId,
          'new_order',
          title,
          message,
          {
            order: orderId,
            customer: order.user._id,
            amount: artisanOrder.total,
            actionUrl: `/dashboard/orders/${order.orderNumber}`
          },
          'high'
        );

        // Send email with order details
        const itemsList = artisanOrder.items.map(item => 
          `<li>${item.product.name} - Qty: ${item.quantity} - ₹${item.total}</li>`
        ).join('');

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-inline-size: 600px; margin: 0 auto;">
            <h2 style="color: #27ae60;">🎉 New Order Received!</h2>
            <p>Hello ${artisan.name},</p>
            <p>Congratulations! You have received a new order.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0; color: #495057;">Order #${order.orderNumber}</h3>
              <p><strong>Customer:</strong> ${order.user.name}</p>
              <p><strong>Phone:</strong> ${order.user.phone}</p>
              <p><strong>Order Date:</strong> ${order.createdAt.toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> ₹${artisanOrder.total}</p>
            </div>
            
            <h4>Items Ordered:</h4>
            <ul>${itemsList}</ul>
            
            <h4>Shipping Address:</h4>
            <div style="background: #e3f2fd; padding: 15px; border-radius: 6px;">
              <p>${order.shippingAddress.street}<br>
              ${order.shippingAddress.city}, ${order.shippingAddress.state}<br>
              ${order.shippingAddress.country} - ${order.shippingAddress.pincode}</p>
            </div>
            
            <p style="margin-block-start: 20px;">Please confirm the order and update the status once you start processing.</p>
            
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/orders" 
               style="background: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Manage Orders
            </a>
            
            <p style="margin-block-start: 30px; color: #6c757d; font-size: 14px;">
              Best regards,<br>
              ArtisanAI Team
            </p>
          </div>
        `;

        await this.sendEmail(artisan.email, title, emailHtml);

        // Send SMS for urgent orders
        if (artisanOrder.total > 5000) {
          const smsMessage = `New high-value order #${order.orderNumber} received! ₹${artisanOrder.total} from ${order.user.name}. Check your dashboard: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
          await this.sendSMS(artisan.phone, smsMessage);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending order notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Get notifications for artisan
  async getNotifications(artisanId, page = 1, limit = 20, unreadOnly = false) {
    try {
      const query = { recipient: artisanId };
      if (unreadOnly) {
        query.isRead = false;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('data.product', 'name images price')
        .populate('data.customer', 'name email')
        .populate('data.order', 'orderNumber total orderStatus');

      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({
        recipient: artisanId,
        isRead: false
      });

      return {
        notifications,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        unreadCount
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      await Notification.findByIdAndUpdate(notificationId, {
        isRead: true,
        readAt: new Date()
      });
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark all notifications as read for an artisan
  async markAllAsRead(artisanId) {
    try {
      await Notification.updateMany(
        { recipient: artisanId, isRead: false },
        { 
          isRead: true,
          readAt: new Date()
        }
      );
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationService();
