const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Artisan = require('../models/Artisan');
const paymentService = require('../services/paymentService');
const notificationService = require('../services/notificationService');
const inventoryService = require('../services/inventoryService');

const router = express.Router();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Check cart stock availability
router.post('/check-cart-availability', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('cart.product');
    
    if (!user.cart || user.cart.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const cartItems = user.cart.map(item => ({
      productId: item.product._id,
      quantity: item.quantity
    }));

    const availability = await inventoryService.checkStockAvailability(cartItems);
    const unavailableItems = availability.filter(item => !item.available);

    res.json({
      success: true,
      availability,
      allAvailable: unavailableItems.length === 0,
      unavailableItems
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking availability', error: error.message });
  }
});

// Create order with immediate stock deduction (no reservation)
router.post('/', verifyToken, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Items are required' });
    }

    // Normalize items: [{ product: id, quantity }]
    const normItems = items.map(i => ({
      product: i.product || i.productId,
      quantity: i.quantity || i.qty
    }));

    // Basic validation
    for (const it of normItems) {
      if (!it.product || !it.quantity || it.quantity < 1) {
        return res.status(400).json({ success: false, message: 'Each item must include product and quantity >= 1' });
      }
    }

    let subtotal = 0;
    const orderItems = [];

    await session.withTransaction(async () => {
      // Validate and deduct stock atomically per product
      for (const it of normItems) {
        const product = await Product.findOneAndUpdate(
          { _id: it.product, quantityAvailable: { $gte: it.quantity }, isActive: true },
          { $inc: { quantityAvailable: -it.quantity, quantitySold: it.quantity } },
          { new: true, session }
        );

        if (!product) {
          throw new Error('INSUFFICIENT_STOCK');
        }

        // Update derived flags if needed
        if (product.quantityAvailable === 0 && !product.isOutOfStock) {
          product.isOutOfStock = true;
          await product.save({ session });
        }

        const itemTotal = product.price * it.quantity;
        subtotal += itemTotal;
        orderItems.push({
          product: product._id,
          artisan: product.artisan,
          quantity: it.quantity,
          price: product.price,
          total: itemTotal
        });
      }

      // Totals
      const shippingCost = subtotal > 2000 ? 0 : 100;
      const tax = Math.round(subtotal * 0.18);
      const total = subtotal + shippingCost + tax;

      // Create order with status COMPLETED (no payment integration)
      const order = new Order({
        user: req.user.id,
        items: orderItems,
        shippingAddress,
        paymentDetails: {
          method: paymentMethod || 'cod',
          paymentStatus: 'completed'
        },
        subtotal,
        shippingCost,
        tax,
        total,
        status: 'COMPLETED',
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      await order.save({ session });

      res.status(201).json({ success: true, order });
    });
  } catch (error) {
    if (error.message === 'INSUFFICIENT_STOCK') {
      return res.status(409).json({ success: false, message: 'Out of stock' });
    }
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Error creating order', error: error.message });
  } finally {
    session.endSession();
  }
});

// Simple checkout route - place order immediately
router.post('/checkout', verifyToken, async (req, res) => {
  console.log('🛒 Checkout request from user:', req.user.id);
  
  try {
    const Cart = require('../models/Cart');
    
    // Find user's cart
    const cart = await Cart.findOne({ userId: req.user.id }).populate('items.variantId');
    
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    console.log('Found cart with', cart.items.length, 'items');
    
    let subtotal = 0;
    const orderItems = [];
    
    // Process each cart item
    for (const cartItem of cart.items) {
      const product = cartItem.variantId;
      const quantity = cartItem.qty;
      
      console.log('Processing:', product.name, 'x', quantity);
      
      // Check if enough stock available
      if (product.quantityAvailable < quantity) {
        return res.status(409).json({ 
          success: false, 
          message: `Insufficient stock for ${product.name}. Available: ${product.quantityAvailable}, Requested: ${quantity}` 
        });
      }
      
      // Deduct stock immediately
      product.quantityAvailable -= quantity;
      product.quantitySold += quantity;
      product.isOutOfStock = product.quantityAvailable === 0;
      await product.save();
      
      console.log('Stock updated for', product.name, '- Available:', product.quantityAvailable, 'Sold:', product.quantitySold);
      
      const itemTotal = product.price * quantity;
      subtotal += itemTotal;
      
      orderItems.push({
        product: product._id,
        artisan: product.artisan,
        quantity: quantity,
        price: product.price,
        total: itemTotal
      });
    }

    // Calculate totals
    const shippingCost = subtotal > 2000 ? 0 : 100;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + shippingCost + tax;

    // Create completed order
    const order = new Order({
      user: req.user.id,
      items: orderItems,
      shippingAddress: req.body.shippingAddress || { street: 'N/A', city: 'N/A', state: 'N/A', country: 'India', pincode: '000000' },
      paymentDetails: {
        method: 'cod',
        paymentStatus: 'completed'
      },
      subtotal,
      shippingCost,
      tax,
      total,
      status: 'COMPLETED'
    });

    await order.save();
    console.log('Order created:', order.orderNumber);

    // Clear cart
    cart.items = [];
    cart.totals = { itemsTotal: 0, shippingEstimate: 0, taxEstimate: 0, grandTotal: 0 };
    await cart.save();
    console.log('Cart cleared');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! Stock has been updated.',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        itemCount: orderItems.length
      }
    });
    
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ success: false, message: 'Error processing order', error: error.message });
  }
});

// Get user orders
router.get('/my-orders', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate({
        path: 'items.product',
        select: 'name images category'
      })
      .populate({
        path: 'items.artisan',
        select: 'name location'
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// Get specific order details
router.get('/:orderId', verifyToken, async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.orderId, 
      user: req.user.id 
    })
    .populate({
      path: 'items.product',
      populate: {
        path: 'artisan',
        select: 'name location craftType'
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
});

// Cancel order: revert stock and mark CANCELLED
router.patch('/:orderId/cancel', verifyToken, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const order = await Order.findOne({ _id: req.params.orderId, user: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'CANCELLED') return res.status(400).json({ success: false, message: 'Order already cancelled' });

    await session.withTransaction(async () => {
      // Revert stock for each item
      for (const it of order.items) {
        const upd = await Product.findByIdAndUpdate(
          it.product,
          { $inc: { quantityAvailable: it.quantity, quantitySold: -it.quantity }, $set: { isOutOfStock: false } },
          { new: true, session }
        );
        if (!upd) throw new Error('PRODUCT_NOT_FOUND');
      }

      order.status = 'CANCELLED';
      await order.save({ session });
    });

    res.json({ success: true, message: 'Order cancelled', orderId: order._id });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, message: 'Error cancelling order', error: error.message });
  } finally {
    session.endSession();
  }
});

// Add review for ordered product
router.post('/:orderId/review', verifyToken, async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    
    const order = await Order.findOne({ 
      _id: req.params.orderId, 
      user: req.user.id,
      orderStatus: 'delivered'
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not delivered' });
    }

    // Check if product is in the order
    const orderItem = order.items.find(item => item.product.toString() === productId);
    if (!orderItem) {
      return res.status(400).json({ message: 'Product not found in this order' });
    }

    // Check if already reviewed
    const existingReview = order.reviews.find(review => review.product.toString() === productId);
    if (existingReview) {
      return res.status(400).json({ message: 'Product already reviewed' });
    }

    order.reviews.push({
      product: productId,
      rating,
      comment
    });

    await order.save();

    res.json({
      success: true,
      message: 'Review added successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding review', error: error.message });
  }
});

// Payment routes disabled for simplified checkout
// router.post('/create-payment-order', verifyToken, async (req, res) => {
//   // Payment integration removed for now
// });

// Mark order as completed (no stock changes)
router.patch('/:orderId/complete', verifyToken, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, user: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'CANCELLED') return res.status(400).json({ success: false, message: 'Cancelled orders cannot be completed' });

    order.status = 'COMPLETED';
    await order.save();

    res.json({ success: true, message: 'Order completed', orderId: order._id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error completing order', error: error.message });
  }
});

// Payment verification route disabled for simplified checkout
// router.post('/verify-payment', verifyToken, async (req, res) => {
//   // Payment verification removed for now
// });

module.exports = router;
