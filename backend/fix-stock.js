const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/artisan-marketplace')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    console.log('Starting stock field migration...');
    
    // Update all products to add quantityAvailable based on stock
    const result = await Product.updateMany(
      { quantityAvailable: { $exists: false } },
      [
        {
          $set: {
            quantityAvailable: { $ifNull: ['$stock', 1] },
            quantitySold: { $ifNull: ['$quantitySold', 0] },
            views: { $ifNull: ['$views', 0] },
            likes: { $ifNull: ['$likes', 0] }
          }
        }
      ]
    );
    
    console.log(`Updated ${result.modifiedCount} products`);
    
    // Verify the update
    const sampleProducts = await Product.find({}).limit(5).select('name stock quantityAvailable quantitySold views likes');
    console.log('\nSample products after migration:');
    sampleProducts.forEach(p => {
      console.log({
        name: p.name,
        oldStock: p.stock,
        newQuantityAvailable: p.quantityAvailable,
        quantitySold: p.quantitySold,
        views: p.views,
        likes: p.likes
      });
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
