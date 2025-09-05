const express = require('express');
const Chat = require('../models/Chat');
const User = require('../models/User');
const Artisan = require('../models/Artisan');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Middleware to verify token and determine user type
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid token.' });
  }
};

// GET /api/chat - Get all chats for the authenticated user
router.get('/', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    let query = {};
    let populateFields = [];
    
    if (req.user.userType === 'customer') {
      query.customer = req.user.id;
      populateFields = [
        { path: 'artisan', select: 'name email location profileImage' },
        { path: 'product', select: 'name price images' }
      ];
    } else {
      query.artisan = req.user.id;
      populateFields = [
        { path: 'customer', select: 'name email profileImage' },
        { path: 'product', select: 'name price images' }
      ];
    }
    
    const chats = await Chat.find(query)
      .populate(populateFields)
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total unread count
    const totalUnread = chats.reduce((sum, chat) => {
      const userType = req.user.userType === 'customer' ? 'customer' : 'artisan';
      return sum + chat.getUnreadCount(userType);
    }, 0);

    res.json({
      success: true,
      chats: chats.map(chat => ({
        _id: chat._id,
        customer: chat.customer,
        artisan: chat.artisan,
        product: chat.product,
        chatType: chat.chatType,
        status: chat.status,
        lastMessage: chat.lastMessage,
        unreadCount: chat.getUnreadCount(req.user.userType === 'customer' ? 'customer' : 'artisan'),
        isOnline: req.user.userType === 'customer' ? chat.isArtisanOnline : chat.isCustomerOnline,
        lastActivity: chat.lastActivity,
        createdAt: chat.createdAt
      })),
      totalUnread,
      pagination: {
        current: Number(page),
        total: Math.ceil(await Chat.countDocuments(query) / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching chats', 
      error: error.message 
    });
  }
});

// POST /api/chat/start - Start a new chat
router.post('/start', verifyToken, async (req, res) => {
  try {
    const { artisanId, productId, chatType = 'general', initialMessage } = req.body;
    
    if (req.user.userType !== 'customer') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only customers can start chats' 
      });
    }

    // Check if artisan exists
    const artisan = await Artisan.findById(artisanId);
    if (!artisan) {
      return res.status(404).json({ 
        success: false, 
        message: 'Artisan not found' 
      });
    }

    // Check if product exists (if productId provided)
    let product = null;
    if (productId) {
      product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ 
          success: false, 
          message: 'Product not found' 
        });
      }
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      customer: req.user.id,
      artisan: artisanId,
      product: productId || null,
      status: 'active'
    });

    if (!chat) {
      // Create new chat
      chat = new Chat({
        customer: req.user.id,
        artisan: artisanId,
        product: productId || null,
        chatType,
        status: 'active'
      });
    }

    // Add initial message if provided
    if (initialMessage) {
      chat.addMessage(req.user.id, 'User', initialMessage);
    }

    await chat.save();

    // Populate the chat before returning
    await chat.populate([
      { path: 'customer', select: 'name email profileImage' },
      { path: 'artisan', select: 'name email location profileImage' },
      { path: 'product', select: 'name price images' }
    ]);

    res.status(201).json({
      success: true,
      chat: {
        _id: chat._id,
        customer: chat.customer,
        artisan: chat.artisan,
        product: chat.product,
        chatType: chat.chatType,
        status: chat.status,
        messages: chat.messages.slice(-10), // Return last 10 messages
        lastMessage: chat.lastMessage,
        unreadCount: chat.getUnreadCount('customer'),
        isOnline: chat.isArtisanOnline,
        lastActivity: chat.lastActivity,
        createdAt: chat.createdAt
      },
      message: 'Chat started successfully'
    });

  } catch (error) {
    console.error('Start chat error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error starting chat', 
      error: error.message 
    });
  }
});

// GET /api/chat/:chatId - Get specific chat with messages
router.get('/:chatId', verifyToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const chat = await Chat.findById(chatId)
      .populate([
        { path: 'customer', select: 'name email profileImage' },
        { path: 'artisan', select: 'name email location profileImage' },
        { path: 'product', select: 'name price images' }
      ]);

    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chat not found' 
      });
    }

    // Check if user has access to this chat
    const hasAccess = (req.user.userType === 'customer' && chat.customer._id.toString() === req.user.id) ||
                     (req.user.userType === 'artisan' && chat.artisan._id.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Mark messages as read
    const userType = req.user.userType === 'customer' ? 'customer' : 'artisan';
    chat.markAsRead(userType);
    await chat.save();

    // Paginate messages (newest first)
    const totalMessages = chat.messages.length;
    const skip = Math.max(0, totalMessages - (Number(page) * Number(limit)));
    const paginatedMessages = chat.messages.slice(skip, skip + Number(limit));

    res.json({
      success: true,
      chat: {
        _id: chat._id,
        customer: chat.customer,
        artisan: chat.artisan,
        product: chat.product,
        chatType: chat.chatType,
        status: chat.status,
        messages: paginatedMessages,
        unreadCount: chat.getUnreadCount(userType),
        isOnline: req.user.userType === 'customer' ? chat.isArtisanOnline : chat.isCustomerOnline,
        lastActivity: chat.lastActivity,
        createdAt: chat.createdAt
      },
      pagination: {
        current: Number(page),
        total: Math.ceil(totalMessages / Number(limit)),
        totalMessages
      }
    });

  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching chat', 
      error: error.message 
    });
  }
});

// POST /api/chat/:chatId/message - Send a message
router.post('/:chatId/message', verifyToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, messageType = 'text', attachments = [] } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message content is required' 
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chat not found' 
      });
    }

    // Check if user has access to this chat
    const hasAccess = (req.user.userType === 'customer' && chat.customer.toString() === req.user.id) ||
                     (req.user.userType === 'artisan' && chat.artisan.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Add message
    const senderType = req.user.userType === 'customer' ? 'User' : 'Artisan';
    const message = chat.addMessage(req.user.id, senderType, content.trim(), messageType, attachments);
    
    await chat.save();

    // Populate sender info
    let populatedSender;
    if (senderType === 'User') {
      populatedSender = await User.findById(req.user.id).select('name email profileImage');
    } else {
      populatedSender = await Artisan.findById(req.user.id).select('name email profileImage location');
    }

    res.json({
      success: true,
      message: {
        _id: message._id,
        sender: populatedSender,
        senderType: message.senderType,
        content: message.content,
        messageType: message.messageType,
        attachments: message.attachments,
        isRead: message.isRead,
        timestamp: message.timestamp
      },
      chatLastActivity: chat.lastActivity
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error sending message', 
      error: error.message 
    });
  }
});

// PUT /api/chat/:chatId/online - Update online status
router.put('/:chatId/online', verifyToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { isOnline = true } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chat not found' 
      });
    }

    // Check if user has access to this chat
    const hasAccess = (req.user.userType === 'customer' && chat.customer.toString() === req.user.id) ||
                     (req.user.userType === 'artisan' && chat.artisan.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    const userType = req.user.userType === 'customer' ? 'customer' : 'artisan';
    chat.setOnlineStatus(userType, isOnline);
    await chat.save();

    res.json({
      success: true,
      message: 'Online status updated',
      isOnline
    });

  } catch (error) {
    console.error('Update online status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating online status', 
      error: error.message 
    });
  }
});

// PUT /api/chat/:chatId/close - Close a chat
router.put('/:chatId/close', verifyToken, async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chat not found' 
      });
    }

    // Check if user has access to this chat
    const hasAccess = (req.user.userType === 'customer' && chat.customer.toString() === req.user.id) ||
                     (req.user.userType === 'artisan' && chat.artisan.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    chat.status = 'closed';
    await chat.save();

    res.json({
      success: true,
      message: 'Chat closed successfully'
    });

  } catch (error) {
    console.error('Close chat error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error closing chat', 
      error: error.message 
    });
  }
});

// GET /api/chat/unread-count - Get total unread message count
router.get('/unread/count', verifyToken, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.userType === 'customer') {
      query.customer = req.user.id;
    } else {
      query.artisan = req.user.id;
    }
    
    const chats = await Chat.find({ ...query, status: 'active' });
    const userType = req.user.userType === 'customer' ? 'customer' : 'artisan';
    
    const totalUnread = chats.reduce((sum, chat) => {
      return sum + chat.getUnreadCount(userType);
    }, 0);

    res.json({
      success: true,
      unreadCount: totalUnread
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching unread count', 
      error: error.message 
    });
  }
});

module.exports = router;
