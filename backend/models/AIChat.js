const mongoose = require('mongoose');

const aiChatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userType',
    required: true
  },
  userType: {
    type: String,
    enum: ['User', 'Artisan'],
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  assistantType: {
    type: String,
    enum: ['customer', 'artisan'],
    required: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    suggestions: [String],
    metadata: {
      responseTime: Number,
      aiConfidence: Number,
      userContext: mongoose.Schema.Types.Mixed
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  totalMessages: {
    type: Number,
    default: 0
  },
  userSatisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    ratedAt: Date
  }
}, {
  timestamps: true
});

// Index for efficient querying
aiChatSchema.index({ userId: 1, sessionId: 1, createdAt: -1 });
aiChatSchema.index({ userType: 1, assistantType: 1, lastMessageAt: -1 });

// Update lastMessageAt and totalMessages when new messages are added
aiChatSchema.pre('save', function(next) {
  if (this.messages && this.messages.length > 0) {
    this.lastMessageAt = this.messages[this.messages.length - 1].timestamp;
    this.totalMessages = this.messages.length;
  }
  next();
});

module.exports = mongoose.model('AIChat', aiChatSchema);
