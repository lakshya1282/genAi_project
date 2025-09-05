const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

async function updateProductStock() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/artisan-marketplace');
    console.log('Connected to MongoDB');

    // Update the gold ring product (from the screenshot)
    const result = await Product.updateMany(
      { isActive: true },
      { 
        $set: { 
          stock: 10,
          reservedStock: 0,
          isOutOfStock: false,
          lowStockThreshold: 3
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} products with stock = 10`);

    // Verify the update
    const products = await Product.find({ isActive: true }).select('name stock reservedStock availableStock isOutOfStock');
    
    console.log('\n=== Updated Products: ===');
    products.forEach(product => {
      console.log(`${product.name}: Stock=${product.stock}, Reserved=${product.reservedStock}, Available=${product.availableStock}`);
    });

  } catch (error) {
    console.error('Update failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

updateProductStock();
