const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

async function testStockSystem() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/artisan-marketplace');
    console.log('Connected to MongoDB');

    // Find a test product
    const product = await Product.findOne({ isActive: true });
    if (!product) {
      console.log('No active products found');
      return;
    }

    console.log('\n=== Testing Product: ===');
    console.log(`Name: ${product.name}`);
    console.log(`Total Stock: ${product.stock}`);
    console.log(`Reserved Stock: ${product.reservedStock || 0}`);
    console.log(`Available Stock (virtual): ${product.availableStock}`);

    // Test the new methods
    console.log('\n=== Testing Enhanced Stock Methods: ===');
    
    // Test getStockInfoForUser
    if (product.getStockInfoForUser) {
      const stockInfo = product.getStockInfoForUser();
      console.log('Stock Info:', JSON.stringify(stockInfo, null, 2));
    } else {
      console.log('getStockInfoForUser method not available');
    }

    // Test isQuantityAvailable
    const testQuantity = 2;
    console.log(`\n=== Testing Quantity Availability (${testQuantity} items): ===`);
    
    if (product.isQuantityAvailable) {
      const isAvailable = product.isQuantityAvailable(testQuantity);
      console.log(`Is ${testQuantity} available: ${isAvailable}`);
    } else {
      const fallbackAvailable = product.availableStock >= testQuantity && product.isActive && !product.isOutOfStock;
      console.log(`Is ${testQuantity} available (fallback): ${fallbackAvailable}`);
    }

    console.log('\n=== Stock System Test Complete ===');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

testStockSystem();
