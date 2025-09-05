const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Artisan = require('../models/Artisan');
const router = express.Router();

// Register artisan
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, location, craftType, bio } = req.body;

    // Check if artisan already exists
    const existingArtisan = await Artisan.findOne({ email });
    if (existingArtisan) {
      return res.status(400).json({ message: 'Artisan already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new artisan
    const artisan = new Artisan({
      name,
      email,
      password: hashedPassword,
      phone,
      location,
      craftType,
      bio
    });

    await artisan.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: artisan._id, userType: 'artisan' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Artisan registered successfully',
      token,
      artisan: {
        id: artisan._id,
        name: artisan.name,
        email: artisan.email,
        craftType: artisan.craftType
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login artisan
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find artisan
    const artisan = await Artisan.findOne({ email });
    if (!artisan) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, artisan.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: artisan._id, userType: 'artisan' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      artisan: {
        id: artisan._id,
        name: artisan.name,
        email: artisan.email,
        craftType: artisan.craftType
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all artisans (for marketplace)
router.get('/', async (req, res) => {
  try {
    const artisans = await Artisan.find({ isVerified: true })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(artisans);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get artisan profile
router.get('/:id', async (req, res) => {
  try {
    const artisan = await Artisan.findById(req.params.id).select('-password');
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan not found' });
    }
    res.json(artisan);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update artisan profile
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, location, craftType, bio, story, socialMedia } = req.body;
    
    const artisan = await Artisan.findByIdAndUpdate(
      req.params.id,
      {
        name,
        phone,
        location,
        craftType,
        bio,
        story,
        socialMedia
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!artisan) {
      return res.status(404).json({ message: 'Artisan not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      artisan
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current artisan profile (authenticated)
router.get('/profile', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      const artisanId = decoded.id;

      const artisan = await Artisan.findById(artisanId).select('-password');
      if (!artisan) {
        return res.status(404).json({ success: false, message: 'Artisan not found' });
      }
      
      // Transform the artisan data to match frontend expectations
      const profile = {
        coverPhoto: artisan.profileImage || '', // Map existing field
        profilePhoto: artisan.profileImage || '',
        displayName: artisan.name,
        bio: artisan.bio || '',
        specialization: artisan.craftType,
        experience: artisan.experience?.toString() || '',
        location: artisan.location || { city: '', state: '', country: 'India' },
        contact: {
          phone: artisan.phone || '',
          email: artisan.email || '',
          website: artisan.socialMedia?.website || '',
          instagram: artisan.socialMedia?.instagram || '',
          facebook: artisan.socialMedia?.facebook || ''
        },
        achievements: [],
        story: artisan.story || '',
        skills: [],
        languages: []
      };
      
      res.json({ success: true, profile });
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update current artisan profile (authenticated)
router.post('/profile', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      const artisanId = decoded.id;

      const profileData = req.body;
      
      // Transform frontend profile data to backend model format
      const updateData = {
        name: profileData.displayName || '',
        bio: profileData.bio || '',
        story: profileData.story || '',
        craftType: profileData.specialization || '',
        experience: profileData.experience || '',
        location: profileData.location || {},
        phone: profileData.contact?.phone || '',
        profileImage: profileData.profilePhoto || profileData.coverPhoto || '',
        socialMedia: {
          instagram: profileData.contact?.instagram || '',
          facebook: profileData.contact?.facebook || '',
          whatsapp: '',
          ...(profileData.contact?.website && { website: profileData.contact.website })
        }
      };

      // Only update fields that have values to avoid validation errors
      const filteredUpdateData = {};
      Object.keys(updateData).forEach(key => {
        if (key === 'location' || key === 'socialMedia') {
          // Handle nested objects
          if (updateData[key] && Object.keys(updateData[key]).length > 0) {
            filteredUpdateData[key] = updateData[key];
          }
        } else if (updateData[key] && updateData[key] !== '') {
          filteredUpdateData[key] = updateData[key];
        }
      });
      
      const artisan = await Artisan.findByIdAndUpdate(
        artisanId,
        filteredUpdateData,
        { new: true, runValidators: false } // Disable validation for partial updates
      ).select('-password');

      if (!artisan) {
        return res.status(404).json({ success: false, message: 'Artisan not found' });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        artisan
      });
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
