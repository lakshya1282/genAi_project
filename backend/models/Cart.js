const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [{
    variantId: {
      type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and String for sample products
      required: true
    },
    qty: {
      type: Number,
      required: true,
      min: 1
    },
    unitPriceCents: {
      type: Number,
      required: true,
      min: 0
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totals: {
    itemsTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    shippingEstimate: {
      type: Number,
      default: 0,
      min: 0
    },
    taxEstimate: {
      type: Number,
      default: 0,
      min: 0
    },
    grandTotal: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  appliedCoupons: [{
    code: String,
    discount: Number,
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    }
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update updatedAt before saving
cartSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to calculate totals
cartSchema.methods.calculateTotals = function() {
  // Ensure items is an array
  if (!Array.isArray(this.items)) {
    this.items = [];
  }
  
  // Calculate items total
  this.totals.itemsTotal = this.items.reduce((total, item) => {
    return total + (item.unitPriceCents * item.qty);
  }, 0);

  // Calculate shipping estimate (free shipping over ₹2000)
  const itemsTotalInRupees = this.totals.itemsTotal / 100;
  this.totals.shippingEstimate = itemsTotalInRupees >= 2000 ? 0 : 10000; // ₹100 in paise

  // Calculate tax estimate (18% GST)
  this.totals.taxEstimate = Math.round(this.totals.itemsTotal * 0.18);

  // Apply coupon discounts
  let discountAmount = 0;
  // Ensure appliedCoupons is an array
  if (!Array.isArray(this.appliedCoupons)) {
    this.appliedCoupons = [];
  }
  
  this.appliedCoupons.forEach(coupon => {
    if (coupon.type === 'percentage') {
      discountAmount += Math.round(this.totals.itemsTotal * (coupon.discount / 100));
    } else {
      discountAmount += coupon.discount;
    }
  });

  // Calculate grand total
  this.totals.grandTotal = this.totals.itemsTotal + this.totals.shippingEstimate + this.totals.taxEstimate - discountAmount;
  this.totals.grandTotal = Math.max(0, this.totals.grandTotal);

  return this.totals;
};

// Method to add or update item
cartSchema.methods.addOrUpdateItem = function(variantId, qty, unitPriceCents) {
  // Ensure items is an array
  if (!Array.isArray(this.items)) {
    this.items = [];
  }
  
  const existingItemIndex = this.items.findIndex(item => 
    item.variantId.toString() === variantId.toString()
  );

  if (existingItemIndex > -1) {
    // Update existing item
    this.items[existingItemIndex].qty = qty;
    this.items[existingItemIndex].unitPriceCents = unitPriceCents;
    this.items[existingItemIndex].addedAt = new Date();
  } else {
    // Add new item
    this.items.push({
      variantId,
      qty,
      unitPriceCents,
      addedAt: new Date()
    });
  }

  this.calculateTotals();
  return this;
};

// Method to remove item
cartSchema.methods.removeItem = function(variantId) {
  // Ensure items is an array
  if (!Array.isArray(this.items)) {
    this.items = [];
  }
  
  this.items = this.items.filter(item => 
    item.variantId.toString() !== variantId.toString()
  );
  this.calculateTotals();
  return this;
};

// Method to clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  this.appliedCoupons = this.appliedCoupons || [];
  this.appliedCoupons = [];
  this.calculateTotals();
  return this;
};

// Method to get item count
cartSchema.methods.getItemCount = function() {
  // Ensure items is an array
  if (!Array.isArray(this.items)) {
    this.items = [];
  }
  
  return this.items.reduce((total, item) => total + item.qty, 0);
};

// Static method to find or create cart for user
cartSchema.statics.findOrCreateCart = async function(userId) {
  let cart = await this.findOne({ userId });
  
  if (!cart) {
    cart = new this({
      userId,
      items: [],
      totals: {
        itemsTotal: 0,
        shippingEstimate: 0,
        taxEstimate: 0,
        grandTotal: 0
      }
    });
    await cart.save();
  }
  
  return cart;
};

// Index for efficient queries
cartSchema.index({ userId: 1 });
cartSchema.index({ 'items.variantId': 1 });
cartSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Cart', cartSchema);
