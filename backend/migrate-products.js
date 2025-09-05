const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/artisan-marketplace')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    console.log('Starting product migration...');
    
    // Get all products that need migration
    const products = await Product.find({
      $or: [
        { quantityAvailable: { $exists: false } },
        { quantitySold: { $exists: false } }
      ]
    });
    
    console.log(`Found ${products.length} products to migrate`);
    
    let migratedCount = 0;
    
    for (const product of products) {
      try {
        const updates = {};
        
        // Migrate stock to quantityAvailable if needed
        if (product.quantityAvailable === undefined && product.stock !== undefined) {
          updates.quantityAvailable = product.stock;
          console.log(`Product ${product.name}: Setting quantityAvailable = ${product.stock}`);
        }
        
        // Initialize quantitySold if not exists
        if (product.quantitySold === undefined) {
          updates.quantitySold = 0;
          console.log(`Product ${product.name}: Setting quantitySold = 0`);
        }
        
        // Initialize views if not exists
        if (product.views === undefined) {
          updates.views = 0;
        }
        
        // Initialize likes if not exists
        if (product.likes === undefined) {
          updates.likes = 0;
        }
        
        // Apply updates
        if (Object.keys(updates).length > 0) {
          await Product.findByIdAndUpdate(product._id, { $set: updates });
          migratedCount++;
          console.log(`✅ Migrated product: ${product.name}`);
        }
      } catch (error) {
        console.error(`❌ Error migrating product ${product.name}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Migration completed! ${migratedCount} products updated.`);
    
    // Verify migration
    const stats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          avgPrice: { $avg: '$price' },
          totalStock: { $sum: '$quantityAvailable' },
          totalSold: { $sum: '$quantitySold' }
        }
      }
    ]);
    
    console.log('\n📊 Updated database stats:', stats[0]);
    
    // Check sample products after migration
    const sampleProducts = await Product.find({}).limit(3).select('name quantityAvailable quantitySold views likes');
    console.log('\n📦 Sample products after migration:');
    sampleProducts.forEach(p => {
      console.log({
        name: p.name,
        quantityAvailable: p.quantityAvailable,
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
