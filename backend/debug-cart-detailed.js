const mongoose = require('mongoose');
const Cart = require('./models/Cart');
const User = require('./models/User');
require('dotenv').config();

async function debugCartDetailed() {
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

    // Clear existing cart for clean test
    await Cart.findOneAndDelete({ userId: customer._id });
    console.log('Cleared existing cart');

    // Create a new cart and add item directly
    console.log('\n=== Creating new cart and adding item ===');
    let cart = await Cart.findOrCreateCart(customer._id);
    console.log('Created/found cart:', cart._id);

    // Add item using model method
    cart.addOrUpdateItem('sample1', 1, 125000); // 1250.00 in cents
    await cart.save();
    console.log('Added item to cart using model method');

    // Check what's actually in the database
    console.log('\n=== Raw Database Query ===');
    const rawCart = await mongoose.connection.collection('carts').findOne({ userId: customer._id });
    console.log('Raw cart from database:');
    console.log(JSON.stringify(rawCart, null, 2));

    // Check using Cart model
    console.log('\n=== Using Cart Model ===');
    const cartFromModel = await Cart.findOne({ userId: customer._id });
    console.log('Cart from model:');
    console.log(`Items array length: ${cartFromModel.items.length}`);
    if (cartFromModel.items.length > 0) {
      cartFromModel.items.forEach((item, index) => {
        console.log(`Item ${index}:`, {
          variantId: item.variantId,
          qty: item.qty,
          unitPriceCents: item.unitPriceCents
        });
      });
    }
    console.log(`Item count: ${cartFromModel.getItemCount()}`);
    console.log(`Totals:`, cartFromModel.totals);

    // Test the actual controller logic inline
    console.log('\n=== Testing Controller Logic Inline ===');
    
    // Sample products definition (same as in controller)
    const sampleProducts = {
      'sample1': {
        _id: 'sample1',
        name: 'Traditional Blue Pottery Vase',
        price: 1250,
        category: 'Pottery',
        images: ['https://via.placeholder.com/400x400/4A90E2/FFFFFF?text=Blue+Pottery+Vase'],
        quantityAvailable: 7,
        isActive: true,
        isOutOfStock: false,
        artisan: {
          name: 'Rajesh Kumar',
          location: { city: 'Jaipur', state: 'Rajasthan' }
        }
      }
    };

    const validatedItems = [];
    for (const item of cartFromModel.items) {
      console.log(`Processing item with variantId: "${item.variantId}" (type: ${typeof item.variantId})`);
      
      let product;
      
      // Check if it's a sample product first
      if (item.variantId && typeof item.variantId === 'string' && item.variantId.startsWith('sample')) {
        console.log(`Detected sample product: ${item.variantId}`);
        product = sampleProducts[item.variantId];
        if (product) {
          console.log(`Found sample product: ${product.name}`);
          // Add required methods for sample products
          product.isQuantityAvailable = (qty) => product.quantityAvailable >= qty && product.isActive && !product.isOutOfStock;
          product.lowStockThreshold = 2;
        } else {
          console.log(`Sample product not found in sampleProducts object`);
        }
      } else {
        console.log(`Not a sample product, variantId: ${item.variantId}`);
      }
      
      if (!product) {
        console.log(`Product not found, skipping item`);
        continue;
      }
      
      if (!product.isActive) {
        console.log(`Product not active, skipping item`);
        continue;
      }

      console.log(`Adding item to validated items: ${product.name}`);
      
      // Create validated item structure
      const validatedItem = {
        _id: item._id,
        product: {
          _id: product._id,
          name: product.name,
          price: product.price,
          images: product.images,
          category: product.category,
          artisan: product.artisan
        },
        qty: item.qty,
        unitPriceCents: item.unitPriceCents,
        unitPrice: item.unitPriceCents / 100,
        itemTotal: (item.unitPriceCents * item.qty) / 100,
        addedAt: item.addedAt
      };
      
      validatedItems.push(validatedItem);
    }

    console.log(`\nValidated items count: ${validatedItems.length}`);
    validatedItems.forEach((item, index) => {
      console.log(`Validated item ${index}:`, {
        name: item.product.name,
        qty: item.qty,
        price: item.product.price
      });
    });

  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

debugCartDetailed();
