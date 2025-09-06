const mongoose = require('mongoose');
const axios = require('axios');
const User = require('./models/User');
const Cart = require('./models/Cart');
require('dotenv').config();

async function testCartIssue() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/artisan-marketplace');
    console.log('Connected to MongoDB');

    // Get test customer
    const customer = await User.findOne({ email: 'customer@demo.com' });
    if (!customer) {
      console.log('No test customer found');
      return;
    }

    console.log('=== Test Customer ===');
    console.log(`ID: ${customer._id}`);
    console.log(`Name: ${customer.name}`);

    // Check current cart state
    console.log('\n=== Current Cart State ===');
    let cart = await Cart.findOne({ userId: customer._id }).populate('items.variantId');
    if (cart) {
      console.log(`Cart ID: ${cart._id}`);
      console.log(`Items in cart: ${cart.items.length}`);
      cart.items.forEach((item, index) => {
        console.log(`  Item ${index + 1}: ${item.variantId?.name || 'Unknown'} - Qty: ${item.qty}`);
      });
      console.log(`Item count: ${cart.getItemCount()}`);
    } else {
      console.log('No cart found');
    }

    // Test login to get token
    console.log('\n=== Testing Login ===');
    try {
      const loginResponse = await axios.post('http://localhost:5000/api/users/login', {
        email: 'customer@demo.com',
        password: 'password123'
      });
      
      const token = loginResponse.data.token;
      console.log('Login successful, got token');
      
      // Test get cart API
      console.log('\n=== Testing Get Cart API ===');
      const getCartResponse = await axios.get('http://localhost:5000/api/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Get cart response status:', getCartResponse.status);
      console.log('Get cart response data:', JSON.stringify(getCartResponse.data, null, 2));
      
      // Test adding sample product to cart
      console.log('\n=== Testing Add to Cart API ===');
      const addToCartResponse = await axios.post('http://localhost:5000/api/cart/items', {
        variantId: 'sample1',
        qty: 1
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Add to cart response status:', addToCartResponse.status);
      console.log('Add to cart response data:', JSON.stringify(addToCartResponse.data, null, 2));
      
      // Check cart state after adding
      console.log('\n=== Cart State After Adding ===');
      const getCartAfterResponse = await axios.get('http://localhost:5000/api/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Get cart after add response:', JSON.stringify(getCartAfterResponse.data, null, 2));
      
    } catch (apiError) {
      console.error('API test failed:', apiError.response?.data || apiError.message);
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

testCartIssue();
