const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Product = require('./models/Product');
const Artisan = require('./models/Artisan');

mongoose.connect('mongodb://localhost:27017/artisan-marketplace')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Find the artisan that's logged in
    const artisan = await Artisan.findOne({ name: 'lakshya parmar' });
    console.log('Found artisan:', artisan ? { id: artisan._id, name: artisan.name } : 'Not found');
    
    if (artisan) {
      // Simulate the dashboard summary API logic
      const artisanObjectId = artisan._id;
      
      console.log('\nTesting dashboard aggregation with artisan ID:', artisanObjectId);
      
      const productStats = await Product.aggregate([
        { $match: { artisan: artisanObjectId } },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            activeProducts: { $sum: { $cond: ['$isActive', 1, 0] } },
            outOfStockProducts: { $sum: { $cond: [{ $eq: ['$quantityAvailable', 0] }, 1, 0] } },
            lowStockProducts: { $sum: { $cond: [{ $lte: ['$quantityAvailable', '$lowStockThreshold'] }, 1, 0] } },
            totalInventoryValue: { $sum: { $multiply: ['$quantityAvailable', '$price'] } },
            totalViews: { $sum: '$views' },
            totalLikes: { $sum: '$likes' },
            avgPrice: { $avg: '$price' }
          }
        }
      ]);
      
      console.log('Dashboard stats result:', productStats[0] || 'No stats found');
      
      // Check individual products for this artisan
      const products = await Product.find({ artisan: artisanObjectId }).select('name quantityAvailable views likes price');
      console.log('\nProducts for this artisan:');
      products.forEach(p => {
        console.log({
          name: p.name,
          stock: p.quantityAvailable,
          views: p.views,
          likes: p.likes,
          price: p.price
        });
      });
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
