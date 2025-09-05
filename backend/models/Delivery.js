const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true
  },
  trackingNumber: {
    type: String,
    required: true,
    unique: true
  },
  courier: {
    name: {
      type: String,
      required: true,
      enum: ['BlueDart', 'DTDC', 'FedEx', 'DHL', 'IndiaPost', 'Delhivery', 'Ekart', 'Professional', 'Other']
    },
    contactNumber: String,
    website: String,
    trackingUrl: String
  },
  sender: {
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Artisan',
      required: true
    },
    address: {
      name: String,
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
      phone: String
    },
    pickupDate: Date,
    pickupTime: String
  },
  recipient: {
    name: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String
    },
    deliveryInstructions: String
  },
  package: {
    weight: Number, // in kg
    dimensions: {
      length: Number, // in cm
      width: Number,
      height: Number
    },
    description: String,
    value: Number,
    isFragile: {
      type: Boolean,
      default: false
    },
    requiresSignature: {
      type: Boolean,
      default: true
    }
  },
  timeline: [{
    status: {
      type: String,
      enum: [
        'label_created',
        'pickup_scheduled',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'failed_delivery',
        'returned_to_sender',
        'cancelled'
      ],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    location: {
      city: String,
      state: String,
      facility: String
    },
    description: String,
    updatedBy: {
      type: String,
      enum: ['system', 'courier', 'artisan', 'customer'],
      default: 'system'
    }
  }],
  currentStatus: {
    type: String,
    enum: [
      'label_created',
      'pickup_scheduled',
      'picked_up',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'failed_delivery',
      'returned_to_sender',
      'cancelled'
    ],
    default: 'label_created'
  },
  estimatedDelivery: Date,
  actualDelivery: Date,
  deliveryAttempts: [{
    attemptNumber: Number,
    timestamp: Date,
    status: {
      type: String,
      enum: ['delivered', 'failed', 'rescheduled']
    },
    reason: String,
    location: String,
    signature: String,
    receivedBy: String,
    photo: String // URL to delivery photo
  }],
  specialInstructions: String,
  insurance: {
    isInsured: {
      type: Boolean,
      default: false
    },
    amount: Number,
    provider: String,
    policyNumber: String
  },
  cost: {
    shippingCharge: Number,
    codCharge: Number,
    insuranceCharge: Number,
    totalCost: Number,
    paidBy: {
      type: String,
      enum: ['sender', 'recipient'],
      default: 'sender'
    }
  },
  notifications: {
    smsEnabled: {
      type: Boolean,
      default: true
    },
    emailEnabled: {
      type: Boolean,
      default: true
    },
    whatsappEnabled: {
      type: Boolean,
      default: false
    },
    lastNotificationSent: Date
  },
  issues: [{
    type: {
      type: String,
      enum: ['delay', 'damage', 'lost', 'wrong_address', 'customer_unavailable', 'other']
    },
    description: String,
    reportedBy: String,
    reportedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'closed'],
      default: 'open'
    },
    resolution: String,
    resolvedAt: Date
  }],
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    submittedAt: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate tracking number before saving
deliverySchema.pre('save', async function(next) {
  if (this.isNew && !this.trackingNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.trackingNumber = `AM${timestamp.slice(-8)}${random}`;
  }
  next();
});

// Update current status when timeline is modified
deliverySchema.pre('save', function(next) {
  if (this.timeline && this.timeline.length > 0) {
    const latestUpdate = this.timeline[this.timeline.length - 1];
    this.currentStatus = latestUpdate.status;
    
    // Update delivery date if delivered
    if (latestUpdate.status === 'delivered' && !this.actualDelivery) {
      this.actualDelivery = latestUpdate.timestamp;
    }
  }
  next();
});

// Indexes for efficient querying
deliverySchema.index({ order: 1 });
deliverySchema.index({ trackingNumber: 1 });
deliverySchema.index({ 'sender.artisan': 1 });
deliverySchema.index({ currentStatus: 1 });
deliverySchema.index({ estimatedDelivery: 1 });
deliverySchema.index({ createdAt: -1 });

// Virtual for delivery URL
deliverySchema.virtual('trackingUrl').get(function() {
  if (this.courier.trackingUrl) {
    return this.courier.trackingUrl.replace('{trackingNumber}', this.trackingNumber);
  }
  return `${process.env.FRONTEND_URL || 'http://localhost:3000'}/track/${this.trackingNumber}`;
});

// Virtual for delivery progress percentage
deliverySchema.virtual('progressPercentage').get(function() {
  const statusProgress = {
    'label_created': 10,
    'pickup_scheduled': 20,
    'picked_up': 30,
    'in_transit': 60,
    'out_for_delivery': 80,
    'delivered': 100,
    'failed_delivery': 70,
    'returned_to_sender': 0,
    'cancelled': 0
  };
  return statusProgress[this.currentStatus] || 0;
});

// Method to add status update
deliverySchema.methods.addStatusUpdate = function(status, location = {}, description = '', updatedBy = 'system') {
  this.timeline.push({
    status,
    timestamp: new Date(),
    location,
    description,
    updatedBy
  });
  
  return this.save();
};

// Method to estimate delivery date
deliverySchema.methods.calculateEstimatedDelivery = function() {
  const deliveryDays = {
    'same_city': 1,
    'same_state': 2,
    'different_state': 4,
    'remote_area': 7
  };
  
  // Simple logic - can be enhanced with actual courier APIs
  let days = deliveryDays['different_state'];
  
  // Add extra days for remote areas or special handling
  if (this.package.isFragile) days += 1;
  if (this.recipient.address.pincode && this.recipient.address.pincode.startsWith('8')) {
    days += 2; // Northeast states typically take longer
  }
  
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + days);
  this.estimatedDelivery = estimatedDate;
  
  return estimatedDate;
};

// Method to check if delivery is delayed
deliverySchema.methods.isDelayed = function() {
  if (!this.estimatedDelivery || this.currentStatus === 'delivered') return false;
  return new Date() > this.estimatedDelivery;
};

// Static method to get deliveries by status
deliverySchema.statics.findByStatus = function(status, artisanId = null) {
  const query = { currentStatus: status };
  if (artisanId) {
    query['sender.artisan'] = artisanId;
  }
  return this.find(query).populate('order').populate('sender.artisan');
};

module.exports = mongoose.model('Delivery', deliverySchema);
