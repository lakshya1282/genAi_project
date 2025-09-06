const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploads
app.use('/uploads', express.static('uploads'));

// MongoDB connection
const connectDB = async () => {
  try {
    // For MVP, using a simple local MongoDB connection
    // In production, use MongoDB Atlas
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/artisan-marketplace');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/artisans', require('./routes/artisans'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/ai-assistant', require('./routes/aiAssistant'));
app.use('/api/login-chatbot', require('./routes/loginChatbot'));
app.use('/api/product-chatbot', require('./routes/productChatbot'));
app.use('/api/products', require('./routes/products'));
app.use('/api/products-enhanced', require('./routes/enhancedProducts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/artisan', require('./routes/artisan'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/artisan/orders', require('./routes/artisanOrders'));
app.use('/api/artisan/products', require('./routes/artisanProducts'));
app.use('/api/artisan/analytics', require('./routes/analytics'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/support', require('./routes/support'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/customer', require('./routes/customerAccount'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/help-center', require('./routes/helpCenter'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/reviews', require('./routes/reviews'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Artisan Marketplace API is running!', timestamp: new Date() });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    
    server.on('error', (error) => {
      console.error('Server error:', error);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();
