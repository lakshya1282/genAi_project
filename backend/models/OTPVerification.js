const mongoose = require('mongoose');

const otpVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  userType: {
    type: String,
    enum: ['user', 'artisan'],
    required: true
  },
  purpose: {
    type: String,
    enum: ['email_verification', 'password_reset'],
    default: 'email_verification'
  },
  verified: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index - documents will be automatically deleted after expiration
  },
  userData: {
    // Temporarily store user data until email is verified
    name: String,
    password: String,
    phone: String,
    // Additional fields for artisan
    location: mongoose.Schema.Types.Mixed,
    craftType: String,
    bio: String
  }
}, {
  timestamps: true
});

// Index for efficient cleanup and querying
otpVerificationSchema.index({ email: 1, userType: 1, verified: 1 });
otpVerificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1800 }); // Cleanup after 30 minutes

module.exports = mongoose.model('OTPVerification', otpVerificationSchema);
