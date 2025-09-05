const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/artisan-marketplace')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const products = await Product.find({}).limit(5).lean();
    console.log('Sample products:');
    products.forEach(p => {
      console.log({
        id: p._id,
        name: p.name,
        price: p.price,
        quantityAvailable: p.quantityAvailable,
        stock: p.stock,
        views: p.views,
        likes: p.likes,
        artisan: p.artisan
      });
    });
    
    const count = await Product.countDocuments({});
    console.log('Total products in database:', count);
    
    const stats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          avgPrice: { $avg: '$price' },
          withQuantityAvailable: { $sum: { $cond: [{ $type: ['$quantityAvailable', 'number'] }, 1, 0] } },
          withOldStock: { $sum: { $cond: [{ $type: ['$stock', 'number'] }, 1, 0] } }
        }
      }
    ]);
    console.log('Database stats:', stats[0]);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
