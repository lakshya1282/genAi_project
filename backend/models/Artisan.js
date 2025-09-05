const mongoose = require('mongoose');

const artisanSchema = new mongoose.Schema({
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
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: false
  },
  location: {
    city: String,
    state: String,
    country: { type: String, default: 'India' }
  },
  craftType: {
    type: String,
    required: false,
    enum: ['Pottery', 'Weaving', 'Jewelry', 'Woodwork', 'Metalwork', 'Textiles', 'Paintings', 'Sculptures', 'Other']
  },
  bio: {
    type: String,
    maxlength: 1000
  },
  story: {
    type: String,
    maxlength: 2000
  },
  experience: {
    type: String,
    default: ''
  },
  profileImage: {
    type: String,
    default: ''
  },
  socialMedia: {
    instagram: String,
    facebook: String,
    whatsapp: String,
    website: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalSales: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Artisan', artisanSchema);
