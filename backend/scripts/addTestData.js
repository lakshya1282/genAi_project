const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const Artisan = require('../models/Artisan');
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const Notification = require('../models/Notification');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/artisan-marketplace');

async function addTestData() {
  try {
    console.log('Adding test data...');

    // Create test artisan
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    
    const testArtisan = new Artisan({
      name: 'Test Artisan',
      email: 'artisan@test.com',
      password: hashedPassword,
      phone: '1234567890',
      location: 'Test City',
      craftType: 'Pottery',
      bio: 'Test artisan for development',
      isVerified: true
    });
    
    await testArtisan.save();
    console.log('✅ Test artisan created');

    // Create test customer
    const testUser = new User({
      name: 'Test Customer',
      email: 'customer@test.com',
      password: hashedPassword,
      phone: '0987654321'
    });
    
    await testUser.save();
    console.log('✅ Test customer created');

    // Create test product
    const testProduct = new Product({
      name: 'Test Pottery Vase',
      description: 'A beautiful handcrafted pottery vase',
      price: 1500,
      category: 'Pottery',
      images: ['https://via.placeholder.com/400x300'],
      artisan: testArtisan._id,
      stock: 10
    });
    
    await testProduct.save();
    console.log('✅ Test product created');

    // Create test order
    const testOrder = new Order({
      user: testUser._id,
      items: [{
        product: testProduct._id,
        artisan: testArtisan._id,
        quantity: 2,
        price: testProduct.price,
        total: testProduct.price * 2
      }],
      shippingAddress: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        country: 'India',
        pincode: '123456'
      },
      paymentDetails: {
        method: 'cod',
        paymentStatus: 'pending'
      },
      subtotal: testProduct.price * 2,
      shippingCost: 100,
      tax: Math.round(testProduct.price * 2 * 0.18),
      total: (testProduct.price * 2) + 100 + Math.round(testProduct.price * 2 * 0.18),
      orderStatus: 'confirmed'
    });
    
    await testOrder.save();
    console.log('✅ Test order created');

    // Create test notification
    const testNotification = new Notification({
      recipient: testArtisan._id,
      type: 'new_order',
      title: 'New Order Received!',
      message: `You received a new order #${testOrder.orderNumber} from ${testUser.name}`,
      data: {
        order: testOrder._id,
        customer: testUser._id,
        amount: testOrder.total
      },
      priority: 'high',
      isRead: false
    });
    
    await testNotification.save();
    console.log('✅ Test notification created');

    console.log('\n🎉 Test data successfully added!');
    console.log('\nTest Credentials:');
    console.log('Artisan: artisan@test.com / testpassword');
    console.log('Customer: customer@test.com / testpassword');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding test data:', error);
    process.exit(1);
  }
}

addTestData();
