const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');
const Cart = require('./models/Cart');
require('dotenv').config();

async function debugCartAPI() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/artisan-marketplace');
    console.log('Connected to MongoDB');

    // Find a test product
    const product = await Product.findOne({ name: 'gold ring' });
    if (!product) {
      console.log('Gold ring product not found');
      return;
    }

    console.log('\n=== Product Details: ===');
    console.log(`ID: ${product._id}`);
    console.log(`Name: ${product.name}`);
    console.log(`Stock: ${product.stock}`);
    console.log(`Reserved: ${product.reservedStock}`);
    console.log(`Available: ${product.availableStock}`);
    console.log(`Is Active: ${product.isActive}`);
    console.log(`Is Out of Stock: ${product.isOutOfStock}`);

    // Find a test customer
    const customer = await User.findOne().limit(1);
    if (!customer) {
      console.log('No customer found');
      return;
    }

    console.log('\n=== Customer Details: ===');
    console.log(`ID: ${customer._id}`);
    console.log(`Name: ${customer.name}`);
    console.log(`Email: ${customer.email}`);

    // Test isQuantityAvailable method
    console.log('\n=== Stock Availability Test: ===');
    const testQuantities = [1, 5, 10, 15];
    
    testQuantities.forEach(qty => {
      const isAvailable = product.isQuantityAvailable ? 
        product.isQuantityAvailable(qty, customer._id) : 
        (product.availableStock >= qty && product.isActive && !product.isOutOfStock);
      console.log(`Quantity ${qty}: ${isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    });

    // Test cart operations
    console.log('\n=== Cart Test: ===');
    let cart = await Cart.findOne({ userId: customer._id });
    if (!cart) {
      console.log('No existing cart found, will create new one');
    } else {
      console.log(`Found existing cart with ${cart.items.length} items`);
    }

    // Test adding item to cart
    console.log('\n=== Testing Add to Cart Logic: ===');
    const testQty = 2;
    
    console.log(`Testing adding ${testQty} of ${product.name}...`);
    console.log(`Product ID: ${product._id}`);
    console.log(`Product stock: ${product.stock}`);
    console.log(`Product available: ${product.availableStock}`);
    console.log(`Product active: ${product.isActive}`);
    console.log(`Product out of stock: ${product.isOutOfStock}`);
    
    const canAdd = product.isQuantityAvailable ? 
      product.isQuantityAvailable(testQty, customer._id) : 
      (product.availableStock >= testQty && product.isActive && !product.isOutOfStock);
    
    console.log(`Can add ${testQty} items: ${canAdd}`);

  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

debugCartAPI();
