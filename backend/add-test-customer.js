const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/artisan-marketplace');
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const addTestCustomer = async () => {
  try {
    // Check if test customer already exists
    const existingUser = await User.findOne({ email: 'test@customer.com' });
    if (existingUser) {
      console.log('Test customer already exists!');
      console.log('Email: test@customer.com');
      console.log('Password: test123');
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('test123', salt);

    // Create test customer
    const testCustomer = new User({
      name: 'Test Customer',
      email: 'test@customer.com',
      password: hashedPassword,
      phone: '+91 9999999999',
      cart: [], // Empty cart initially
      wishlist: [],
      addresses: [{
        type: 'home',
        street: '123 Test Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        pincode: '400001',
        isDefault: true
      }]
    });

    await testCustomer.save();
    
    console.log('Test customer created successfully!');
    console.log('=== TEST CUSTOMER CREDENTIALS ===');
    console.log('Email: test@customer.com');
    console.log('Password: test123');
    console.log('==================================');
    
  } catch (error) {
    console.error('Error creating test customer:', error);
  } finally {
    mongoose.connection.close();
  }
};

const runScript = async () => {
  await connectDB();
  await addTestCustomer();
};

runScript();
