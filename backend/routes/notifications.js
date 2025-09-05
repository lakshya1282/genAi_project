const express = require('express');
const Notification = require('../models/Notification');

const router = express.Router();

// Middleware to verify JWT token for artisans
const verifyArtisanToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's an artisan token
    if (decoded.userType !== 'artisan') {
      return res.status(403).json({ message: 'Access denied. Artisan token required.' });
    }
    
    req.artisan = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Get all notifications for an artisan
router.get('/', verifyArtisanToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.artisan.id })
      .populate('data.customer', 'name email')
      .populate('data.product', 'name price images')
      .populate('data.order', 'orderNumber total')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
});

// Get unread notifications count
router.get('/unread-count', verifyArtisanToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      recipient: req.artisan.id, 
      isRead: false 
    });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching unread count', error: error.message });
  }
});

// Mark notification as read
router.put('/:notificationId/read', verifyArtisanToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, recipient: req.artisan.id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', verifyArtisanToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.artisan.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications', error: error.message });
  }
});

// Delete notification
router.delete('/:notificationId', verifyArtisanToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.notificationId,
      recipient: req.artisan.id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification', error: error.message });
  }
});

module.exports = router;
