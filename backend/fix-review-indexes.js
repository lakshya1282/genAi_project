const mongoose = require('mongoose');
require('dotenv').config();

async function fixReviewIndexes() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/artisan-marketplace');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const reviewsCollection = db.collection('reviews');

    console.log('\n📋 Current indexes in reviews collection:');
    const indexes = await reviewsCollection.indexes();
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. Index name: ${index.name}`);
      console.log(`   Keys: ${JSON.stringify(index.key)}`);
      console.log(`   Unique: ${index.unique || false}`);
      console.log('');
    });

    // Check if the problematic index exists
    const problemIndex = indexes.find(index => 
      index.name === 'customer_1_product_1' || 
      (index.key.customer && index.key.product)
    );

    if (problemIndex) {
      console.log('🗑️ Dropping problematic index:', problemIndex.name);
      await reviewsCollection.dropIndex(problemIndex.name);
      console.log('✅ Index dropped successfully');
    }

    // Create the correct index as defined in the model
    console.log('\n🔨 Creating correct index: productId_1_customerId_1');
    await reviewsCollection.createIndex(
      { productId: 1, customerId: 1 }, 
      { 
        unique: true,
        name: 'productId_1_customerId_1'
      }
    );
    console.log('✅ Correct index created');

    console.log('\n📋 Updated indexes:');
    const updatedIndexes = await reviewsCollection.indexes();
    updatedIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)} (unique: ${index.unique || false})`);
    });

  } catch (error) {
    console.error('💥 Error fixing indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixReviewIndexes();
