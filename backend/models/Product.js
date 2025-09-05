const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  aiEnhancedDescription: {
    type: String,
    maxlength: 3000
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['Pottery', 'Weaving', 'Jewelry', 'Woodwork', 'Metalwork', 'Textiles', 'Paintings', 'Sculptures', 'Other']
  },
  images: [{
    type: String
  }],
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artisan',
    required: true
  },
  materials: [String],
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    weight: Number
  },
  isCustomizable: {
    type: Boolean,
    default: false
  },
  customizationOptions: [String],
  quantityAvailable: {
    type: Number,
    default: 1,
    min: 0,
    required: true
  },
  quantitySold: {
    type: Number,
    default: 0,
    min: 0,
    required: true
  },
  lowStockThreshold: {
    type: Number,
    default: 5,
    min: 0
  },
  // Track stock changes for audit
  stockHistory: [{
    changeType: {
      type: String,
      enum: ['increase', 'decrease', 'sold', 'cancelled'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    previousAvailable: {
      type: Number,
      required: true
    },
    newAvailable: {
      type: Number,
      required: true
    },
    previousSold: {
      type: Number,
      required: true
    },
    newSold: {
      type: Number,
      required: true
    },
    reason: String,
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isOutOfStock: {
    type: Boolean,
    default: false
  },
  craftingTime: {
    type: String,
    enum: ['1-3 days', '1 week', '2 weeks', '1 month', '2+ months']
  },
  tags: [String],
  aiGeneratedTags: [String],
  searchKeywords: [String], // For better search functionality
  priceRange: {
    type: String,
    enum: ['budget', 'mid-range', 'premium', 'luxury']
  },
  occasion: {
    type: String,
    enum: ['daily-use', 'festive', 'wedding', 'gifting', 'home-decor', 'office']
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'expert']
  },
  marketingContent: {
    socialMediaPost: String,
    productStory: String,
    targetAudience: String
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual for checking if low stock
productSchema.virtual('isLowStock').get(function() {
  return this.quantityAvailable <= this.lowStockThreshold;
});

// Method to check if quantity is available (simple check)
productSchema.methods.isQuantityAvailable = function(quantity) {
  if (!this.isActive || this.isOutOfStock) {
    return false;
  }
  return this.quantityAvailable >= quantity;
};

// Method to add stock history entry
productSchema.methods.addStockHistory = function(changeType, quantity, reason, orderId = null) {
  const previousAvailable = this.quantityAvailable;
  const previousSold = this.quantitySold;
  let newAvailable = previousAvailable;
  let newSold = previousSold;
  
  // Calculate new stock based on change type
  if (changeType === 'increase') {
    newAvailable = previousAvailable + quantity;
  } else if (changeType === 'decrease') {
    newAvailable = Math.max(0, previousAvailable - quantity);
  } else if (changeType === 'sold') {
    newAvailable = Math.max(0, previousAvailable - quantity);
    newSold = previousSold + quantity;
  } else if (changeType === 'cancelled') {
    // When order is cancelled, add back to available and subtract from sold
    newAvailable = previousAvailable + quantity;
    newSold = Math.max(0, previousSold - quantity);
  }
  
  // Add to history (keep last 50 entries)
  this.stockHistory.unshift({
    changeType,
    quantity,
    previousAvailable,
    newAvailable,
    previousSold,
    newSold,
    reason,
    orderId,
    timestamp: new Date()
  });
  
  // Keep only last 50 entries
  if (this.stockHistory.length > 50) {
    this.stockHistory = this.stockHistory.slice(0, 50);
  }
};

// Method to deduct stock (for order creation)
productSchema.methods.deductStock = function(quantity, orderId, reason = 'Order placed') {
  if (!this.isQuantityAvailable(quantity)) {
    throw new Error(`Insufficient stock. Available: ${this.quantityAvailable}, Requested: ${quantity}`);
  }
  
  // Update quantities
  this.quantityAvailable = Math.max(0, this.quantityAvailable - quantity);
  this.quantitySold += quantity;
  
  // Update out of stock status
  this.isOutOfStock = this.quantityAvailable === 0;
  
  // Add to stock history
  this.addStockHistory('sold', quantity, reason, orderId);
  
  return this;
};

// Method to restore stock (for order cancellation)
productSchema.methods.restoreStock = function(quantity, orderId, reason = 'Order cancelled') {
  // Update quantities
  this.quantityAvailable += quantity;
  this.quantitySold = Math.max(0, this.quantitySold - quantity);
  
  // Update out of stock status
  this.isOutOfStock = this.quantityAvailable === 0;
  
  // Add to stock history
  this.addStockHistory('cancelled', quantity, reason, orderId);
  
  return this;
};

// Pre-save middleware to update out of stock status and search fields
productSchema.pre('save', function(next) {
  this.isOutOfStock = this.quantityAvailable === 0;
  
  // Set price range based on price
  if (this.price <= 500) {
    this.priceRange = 'budget';
  } else if (this.price <= 2000) {
    this.priceRange = 'mid-range';
  } else if (this.price <= 10000) {
    this.priceRange = 'premium';
  } else {
    this.priceRange = 'luxury';
  }
  
  // Generate search keywords
  const keywords = [];
  if (this.name) keywords.push(...this.name.toLowerCase().split(' '));
  if (this.description) keywords.push(...this.description.toLowerCase().split(' ').filter(word => word.length > 3));
  if (this.materials) keywords.push(...this.materials.map(m => m.toLowerCase()));
  if (this.tags) keywords.push(...this.tags.map(t => t.toLowerCase()));
  if (this.aiGeneratedTags) keywords.push(...this.aiGeneratedTags.map(t => t.toLowerCase()));
  keywords.push(this.category.toLowerCase());
  
  // Remove duplicates and short words
  this.searchKeywords = [...new Set(keywords.filter(word => word.length > 2))];
  
  next();
});

// Index for search functionality
productSchema.index({ 
  name: 'text', 
  description: 'text', 
  tags: 'text', 
  searchKeywords: 'text',
  materials: 'text'
});
productSchema.index({ artisan: 1, isActive: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ isOutOfStock: 1, isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ priceRange: 1 });
productSchema.index({ views: -1 });
productSchema.index({ quantitySold: -1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
