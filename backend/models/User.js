const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerifiedAt: {
    type: Date
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password not required if using Google OAuth
    },
    minlength: 6
  },
  // Google OAuth fields
  googleId: {
    type: String,
    sparse: true // Allow null values but enforce uniqueness when present
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  picture: {
    type: String // Google profile picture URL
  },
  phone: {
    type: String,
    required: function() {
      // Phone not required for Google OAuth users initially
      // They can add it later in profile completion
      return !this.googleId;
    }
  },
  addresses: [{
    type: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home'
    },
    street: String,
    city: String,
    state: String,
    country: { type: String, default: 'India' },
    pincode: String,
    isDefault: { type: Boolean, default: false }
  }],
  profileImage: {
    type: String,
    default: ''
  },
  // Cart functionality moved to dedicated Cart model
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  preferences: {
    favoriteCategories: [String],
    priceRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 10000 }
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'or', 'pa', 'as'],
      default: 'en'
    },
    currency: {
      type: String,
      enum: ['INR', 'USD'],
      default: 'INR'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false }
    }
  },
  recentlyViewed: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  coupons: [{
    code: String,
    discount: Number,
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    },
    expiresAt: Date,
    isUsed: {
      type: Boolean,
      default: false
    },
    usedAt: Date
  }],
  accountSettings: {
    newsletter: { type: Boolean, default: true },
    twoFactorAuth: { type: Boolean, default: false },
    privacy: {
      showProfile: { type: Boolean, default: false },
      showOrders: { type: Boolean, default: false }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create index for Google OAuth users
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema);
