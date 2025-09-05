const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    required: true
  },
  type: {
    type: String,
    enum: [
      'order_issue',
      'payment_issue',
      'delivery_issue',
      'product_defect',
      'return_request',
      'refund_request',
      'account_issue',
      'technical_support',
      'general_inquiry',
      'complaint',
      'suggestion'
    ],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'in_progress', 'pending_customer', 'resolved', 'closed', 'escalated'],
    default: 'open'
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artisan'
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  delivery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery'
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  category: {
    type: String,
    enum: ['order', 'payment', 'shipping', 'product', 'account', 'technical', 'other'],
    required: true
  },
  subcategory: {
    type: String,
    maxlength: 100
  },
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    mimetype: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  messages: [{
    sender: {
      type: String,
      enum: ['customer', 'artisan', 'support', 'system'],
      required: true
    },
    senderDetails: {
      id: mongoose.Schema.Types.ObjectId,
      name: String,
      email: String
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    attachments: [{
      filename: String,
      url: String,
      size: Number,
      mimetype: String
    }],
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readBy: [{
      user: String, // 'customer', 'artisan', 'support'
      readAt: Date
    }]
  }],
  assignedTo: {
    agentId: String,
    agentName: String,
    assignedAt: Date
  },
  resolution: {
    type: {
      type: String,
      enum: ['refund', 'replacement', 'credit', 'repair', 'explanation', 'policy_change', 'other']
    },
    description: String,
    amount: Number, // For refunds/credits
    resolvedBy: {
      id: String,
      name: String,
      role: String
    },
    resolvedAt: Date,
    customerSatisfied: Boolean,
    satisfactionRating: {
      type: Number,
      min: 1,
      max: 5
    },
    satisfactionComment: String
  },
  escalation: {
    level: {
      type: Number,
      default: 0,
      min: 0,
      max: 3
    },
    escalatedAt: Date,
    escalatedBy: String,
    escalationReason: String,
    escalatedTo: String
  },
  tags: [String],
  internalNotes: [{
    note: String,
    addedBy: String,
    addedAt: {
      type: Date,
      default: Date.now
    },
    isPrivate: {
      type: Boolean,
      default: true
    }
  }],
  metrics: {
    firstResponseTime: Number, // in minutes
    resolutionTime: Number, // in minutes
    responseCount: {
      type: Number,
      default: 0
    },
    escalationCount: {
      type: Number,
      default: 0
    }
  },
  automation: {
    autoAssigned: {
      type: Boolean,
      default: false
    },
    suggectedResolution: String,
    aiConfidence: Number,
    autoResponses: [{
      trigger: String,
      response: String,
      sentAt: Date
    }]
  },
  relatedTickets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Support'
  }],
  customerInfo: {
    totalOrders: Number,
    totalSpent: Number,
    accountAge: Number,
    previousTickets: Number
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  closedAt: Date,
  reopenedCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate ticket number before saving
supportTicketSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.ticketNumber = `ST${timestamp.slice(-8)}${random}`;
  }
  next();
});

// Update last activity when messages are added
supportTicketSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.lastActivityAt = new Date();
  }
  next();
});

// Calculate metrics
supportTicketSchema.pre('save', function(next) {
  if (this.messages && this.messages.length > 0) {
    // Calculate first response time
    if (!this.metrics.firstResponseTime) {
      const firstSupportResponse = this.messages.find(msg => msg.sender === 'support');
      if (firstSupportResponse) {
        const diffMs = new Date(firstSupportResponse.timestamp) - new Date(this.createdAt);
        this.metrics.firstResponseTime = Math.round(diffMs / (1000 * 60)); // in minutes
      }
    }
    
    // Update response count
    this.metrics.responseCount = this.messages.filter(msg => msg.sender === 'support').length;
  }
  
  // Calculate resolution time
  if (this.status === 'resolved' && !this.metrics.resolutionTime) {
    const diffMs = new Date() - new Date(this.createdAt);
    this.metrics.resolutionTime = Math.round(diffMs / (1000 * 60)); // in minutes
  }
  
  next();
});

// Indexes for efficient querying
supportTicketSchema.index({ ticketNumber: 1 });
supportTicketSchema.index({ customer: 1 });
supportTicketSchema.index({ artisan: 1 });
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ priority: 1 });
supportTicketSchema.index({ type: 1 });
supportTicketSchema.index({ category: 1 });
supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ lastActivityAt: -1 });
supportTicketSchema.index({ 'assignedTo.agentId': 1 });

// Virtual for age in hours
supportTicketSchema.virtual('ageInHours').get(function() {
  return Math.round((new Date() - new Date(this.createdAt)) / (1000 * 60 * 60));
});

// Virtual for unread message count
supportTicketSchema.virtual('unreadCount').get(function() {
  return this.messages.filter(msg => !msg.isRead).length;
});

// Method to add message
supportTicketSchema.methods.addMessage = function(sender, message, senderDetails = {}, attachments = []) {
  this.messages.push({
    sender,
    senderDetails,
    message,
    attachments,
    timestamp: new Date()
  });
  
  this.lastActivityAt = new Date();
  return this.save();
};

// Method to assign ticket
supportTicketSchema.methods.assignTo = function(agentId, agentName) {
  this.assignedTo = {
    agentId,
    agentName,
    assignedAt: new Date()
  };
  this.status = 'assigned';
  return this.save();
};

// Method to escalate ticket
supportTicketSchema.methods.escalate = function(reason, escalatedBy, escalatedTo) {
  this.escalation.level += 1;
  this.escalation.escalatedAt = new Date();
  this.escalation.escalatedBy = escalatedBy;
  this.escalation.escalationReason = reason;
  this.escalation.escalatedTo = escalatedTo;
  this.status = 'escalated';
  this.priority = this.priority === 'urgent' ? 'urgent' : 
                  this.priority === 'high' ? 'urgent' :
                  this.priority === 'medium' ? 'high' : 'medium';
  this.metrics.escalationCount += 1;
  return this.save();
};

// Method to resolve ticket
supportTicketSchema.methods.resolve = function(resolutionData, resolvedBy) {
  this.resolution = {
    ...resolutionData,
    resolvedBy,
    resolvedAt: new Date()
  };
  this.status = 'resolved';
  this.closedAt = new Date();
  return this.save();
};

// Method to reopen ticket
supportTicketSchema.methods.reopen = function(reason) {
  this.status = 'open';
  this.closedAt = null;
  this.reopenedCount += 1;
  this.addMessage('system', `Ticket reopened: ${reason}`, { name: 'System' });
  return this.save();
};

// Static method to get tickets by filters
supportTicketSchema.statics.findByFilters = function(filters = {}) {
  const query = {};
  
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.type) query.type = filters.type;
  if (filters.category) query.category = filters.category;
  if (filters.customer) query.customer = filters.customer;
  if (filters.artisan) query.artisan = filters.artisan;
  if (filters.assignedTo) query['assignedTo.agentId'] = filters.assignedTo;
  
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
  }
  
  return this.find(query);
};

// Static method to get urgent tickets
supportTicketSchema.statics.getUrgentTickets = function() {
  return this.find({
    $or: [
      { priority: 'urgent' },
      { isUrgent: true },
      { 
        priority: 'high',
        createdAt: { $lt: new Date(Date.now() - 4 * 60 * 60 * 1000) } // 4 hours old
      }
    ],
    status: { $nin: ['resolved', 'closed'] }
  }).sort({ createdAt: 1 });
};

module.exports = mongoose.model('Support', supportTicketSchema);
