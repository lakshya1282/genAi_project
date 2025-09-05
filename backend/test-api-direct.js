const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testAPIDirectly() {
  try {
    // Connect to MongoDB to get a test user
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/artisan-marketplace');
    console.log('Connected to MongoDB');

    // Find a test customer
    const customer = await User.findOne();
    if (!customer) {
      console.log('No customer found');
      return;
    }

    console.log('Test customer:', customer.email);

    // Generate a JWT token for the customer
    const token = jwt.sign(
      { 
        id: customer._id, 
        email: customer.email,
        type: 'customer'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Generated token for testing');

    // Test the API endpoint
    const apiUrl = 'http://localhost:5000/api/cart/items';
    const testData = {
      variantId: '68b8aeb8790c1a3dfafd4039', // gold ring ID from your screenshot
      qty: 2
    };

    console.log('\n=== Testing API Call ===');
    console.log('URL:', apiUrl);
    console.log('Data:', testData);
    console.log('Token:', token.substring(0, 20) + '...');

    try {
      const response = await axios.post(apiUrl, testData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('\n✅ API Call Successful!');
      console.log('Response:', response.data);
    } catch (apiError) {
      console.log('\n❌ API Call Failed!');
      console.log('Status:', apiError.response?.status);
      console.log('Error data:', apiError.response?.data);
      console.log('Error message:', apiError.message);
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

testAPIDirectly();
