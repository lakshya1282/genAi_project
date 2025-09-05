const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and String for demo
    required: true,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  customerName: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    maxlength: 500
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  helpful: {
    type: Number,
    default: 0
  },
  images: [{
    type: String
  }]
}, {
  timestamps: true
});

// Compound index to prevent duplicate reviews from same customer for same product
reviewSchema.index({ productId: 1, customerId: 1 }, { unique: true });

// Index for efficient queries
reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ customerId: 1, createdAt: -1 });

// Virtual for formatted date
reviewSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Static method to get reviews for a product
reviewSchema.statics.getProductReviews = function(productId) {
  return this.find({ productId })
    .populate('customerId', 'name')
    .sort({ createdAt: -1 });
};

// Static method to get reviews by customer
reviewSchema.statics.getCustomerReviews = function(customerId) {
  return this.find({ customerId })
    .populate('productId', 'name images price')
    .sort({ createdAt: -1 });
};

// Method to calculate average rating for a product
reviewSchema.statics.getAverageRating = async function(productId) {
  let matchCondition;
  
  // Handle both ObjectId and string productIds
  try {
    if (mongoose.Types.ObjectId.isValid(productId) && productId.length === 24) {
      matchCondition = { productId: new mongoose.Types.ObjectId(productId) };
    } else {
      matchCondition = { productId: productId };
    }
  } catch {
    matchCondition = { productId: productId };
  }
  
  const result = await this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : { averageRating: 0, totalReviews: 0 };
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
