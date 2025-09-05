const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'senderType'
  },
  senderType: {
    type: String,
    required: true,
    enum: ['User', 'Artisan']
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'order-inquiry', 'custom-request'],
    default: 'text'
  },
  attachments: [{
    url: String,
    type: {
      type: String,
      enum: ['image', 'document']
    },
    filename: String
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artisan',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  chatType: {
    type: String,
    enum: ['general', 'product-inquiry', 'custom-order', 'support'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'archived'],
    default: 'active'
  },
  messages: [messageSchema],
  lastMessage: {
    content: String,
    timestamp: Date,
    sender: mongoose.Schema.Types.ObjectId,
    senderType: String
  },
  unreadCount: {
    customer: { type: Number, default: 0 },
    artisan: { type: Number, default: 0 }
  },
  isCustomerOnline: {
    type: Boolean,
    default: false
  },
  isArtisanOnline: {
    type: Boolean,
    default: false
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  metadata: {
    customOrderDetails: {
      budget: Number,
      timeline: String,
      specifications: String,
      attachments: [String]
    },
    inquiryDetails: {
      questions: [String],
      productVariations: [String]
    }
  }
}, {
  timestamps: true
});

// Update last message and activity when new message is added
chatSchema.pre('save', function(next) {
  if (this.messages && this.messages.length > 0) {
    const lastMsg = this.messages[this.messages.length - 1];
    this.lastMessage = {
      content: lastMsg.content,
      timestamp: lastMsg.timestamp,
      sender: lastMsg.sender,
      senderType: lastMsg.senderType
    };
    this.lastActivity = lastMsg.timestamp;
  }
  next();
});

// Index for efficient queries
chatSchema.index({ customer: 1, artisan: 1 });
chatSchema.index({ customer: 1, status: 1, lastActivity: -1 });
chatSchema.index({ artisan: 1, status: 1, lastActivity: -1 });
chatSchema.index({ product: 1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });

// Method to add a message
chatSchema.methods.addMessage = function(senderId, senderType, content, messageType = 'text', attachments = []) {
  const message = {
    sender: senderId,
    senderType: senderType,
    content: content,
    messageType: messageType,
    attachments: attachments,
    timestamp: new Date()
  };
  
  this.messages.push(message);
  
  // Update unread count
  if (senderType === 'User') {
    this.unreadCount.artisan += 1;
  } else {
    this.unreadCount.customer += 1;
  }
  
  this.lastActivity = new Date();
  return message;
};

// Method to mark messages as read
chatSchema.methods.markAsRead = function(userType) {
  if (userType === 'customer') {
    // Mark all artisan messages as read
    this.messages.forEach(msg => {
      if (msg.senderType === 'Artisan' && !msg.isRead) {
        msg.isRead = true;
        msg.readAt = new Date();
      }
    });
    this.unreadCount.customer = 0;
  } else if (userType === 'artisan') {
    // Mark all customer messages as read
    this.messages.forEach(msg => {
      if (msg.senderType === 'User' && !msg.isRead) {
        msg.isRead = true;
        msg.readAt = new Date();
      }
    });
    this.unreadCount.artisan = 0;
  }
};

// Method to set online status
chatSchema.methods.setOnlineStatus = function(userType, isOnline) {
  if (userType === 'customer') {
    this.isCustomerOnline = isOnline;
  } else if (userType === 'artisan') {
    this.isArtisanOnline = isOnline;
  }
  this.lastActivity = new Date();
};

// Virtual for checking if chat is active (has recent activity)
chatSchema.virtual('isActive').get(function() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return this.lastActivity > oneWeekAgo && this.status === 'active';
});

// Method to get unread count for a specific user
chatSchema.methods.getUnreadCount = function(userType) {
  return userType === 'customer' ? this.unreadCount.customer : this.unreadCount.artisan;
};

module.exports = mongoose.model('Chat', chatSchema);
