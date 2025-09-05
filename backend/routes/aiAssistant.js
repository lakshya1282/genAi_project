const express = require('express');
const aiAssistantService = require('../services/aiAssistantService');
const AIChat = require('../models/AIChat');
const User = require('../models/User');
const Artisan = require('../models/Artisan');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Middleware to identify user type and validate session
const validateSession = async (req, res, next) => {
  try {
    const { userId, userType, sessionId } = req.body;
    
    if (!userId || !userType) {
      return res.status(400).json({
        success: false,
        message: 'User ID and user type are required'
      });
    }
    
    if (!['User', 'Artisan'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type. Must be User or Artisan'
      });
    }
    
    // Verify user exists
    const UserModel = userType === 'User' ? User : Artisan;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `${userType} not found`
      });
    }
    
    req.userId = userId;
    req.userType = userType;
    req.sessionId = sessionId || uuidv4();
    req.user = user;
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Session validation error',
      error: error.message
    });
  }
};

// Customer Shopping Assistant
router.post('/customer/chat', validateSession, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { message, currentCategory, budget } = req.body;
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }
    
    if (req.userType !== 'User') {
      return res.status(403).json({
        success: false,
        message: 'Customer assistant is only available for customers'
      });
    }
    
    // Build user context
    const userContext = {
      userId: req.userId,
      preferences: req.user.preferences,
      recentlyViewed: req.user.recentlyViewed,
      currentCategory,
      budget
    };
    
    // Get AI response
    const aiResponse = await aiAssistantService.customerAssistant(message, userContext);
    const responseTime = Date.now() - startTime;
    
    // Get product recommendations if relevant
    let recommendations = [];
    if (message.toLowerCase().includes('recommend') || message.toLowerCase().includes('suggest') || message.toLowerCase().includes('show me')) {
      recommendations = await aiAssistantService.getProductRecommendations(req.userId, message, 6);
    }
    
    // Find or create chat session
    let chat = await AIChat.findOne({
      userId: req.userId,
      userType: req.userType,
      sessionId: req.sessionId,
      assistantType: 'customer'
    });
    
    if (!chat) {
      chat = new AIChat({
        userId: req.userId,
        userType: req.userType,
        sessionId: req.sessionId,
        assistantType: 'customer',
        messages: []
      });
    }
    
    // Add user message and AI response
    chat.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(startTime),
      metadata: { userContext }
    });
    
    chat.messages.push({
      role: 'assistant',
      content: aiResponse.message,
      timestamp: new Date(),
      suggestions: aiResponse.suggestions,
      metadata: {
        responseTime,
        userContext
      }
    });
    
    await chat.save();
    
    res.json({
      success: true,
      message: aiResponse.message,
      suggestions: aiResponse.suggestions,
      recommendations: recommendations.slice(0, 4), // Limit recommendations
      sessionId: req.sessionId,
      metadata: {
        responseTime,
        messageCount: chat.messages.length
      }
    });
    
  } catch (error) {
    console.error('Customer Assistant Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process customer assistant request',
      error: error.message
    });
  }
});

// Artisan Business Assistant
router.post('/artisan/chat', validateSession, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { message, craftType } = req.body;
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }
    
    if (req.userType !== 'Artisan') {
      return res.status(403).json({
        success: false,
        message: 'Artisan assistant is only available for artisans'
      });
    }
    
    // Build artisan context
    const artisanContext = {
      artisanId: req.userId,
      craftType: req.user.craftType || craftType
    };
    
    // Get AI response
    const aiResponse = await aiAssistantService.artisanAssistant(message, artisanContext);
    const responseTime = Date.now() - startTime;
    
    // Get business insights if requested
    let insights = null;
    if (message.toLowerCase().includes('insight') || message.toLowerCase().includes('analytics') || message.toLowerCase().includes('performance')) {
      insights = await aiAssistantService.generateBusinessInsights(req.userId);
    }
    
    // Find or create chat session
    let chat = await AIChat.findOne({
      userId: req.userId,
      userType: req.userType,
      sessionId: req.sessionId,
      assistantType: 'artisan'
    });
    
    if (!chat) {
      chat = new AIChat({
        userId: req.userId,
        userType: req.userType,
        sessionId: req.sessionId,
        assistantType: 'artisan',
        messages: []
      });
    }
    
    // Add user message and AI response
    chat.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(startTime),
      metadata: { artisanContext }
    });
    
    chat.messages.push({
      role: 'assistant',
      content: aiResponse.message,
      timestamp: new Date(),
      suggestions: aiResponse.suggestions,
      metadata: {
        responseTime,
        artisanContext
      }
    });
    
    await chat.save();
    
    res.json({
      success: true,
      message: aiResponse.message,
      suggestions: aiResponse.suggestions,
      insights: insights,
      sessionId: req.sessionId,
      metadata: {
        responseTime,
        messageCount: chat.messages.length
      }
    });
    
  } catch (error) {
    console.error('Artisan Assistant Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process artisan assistant request',
      error: error.message
    });
  }
});

// Get chat history
router.get('/chat/history', async (req, res) => {
  try {
    const { userId, userType, sessionId, limit = 20 } = req.query;
    
    if (!userId || !userType) {
      return res.status(400).json({
        success: false,
        message: 'User ID and user type are required'
      });
    }
    
    const query = { userId, userType, isActive: true };
    if (sessionId) {
      query.sessionId = sessionId;
    }
    
    const chats = await AIChat.find(query)
      .sort({ lastMessageAt: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      chats: chats.map(chat => ({
        sessionId: chat.sessionId,
        assistantType: chat.assistantType,
        lastMessageAt: chat.lastMessageAt,
        totalMessages: chat.totalMessages,
        messages: chat.messages.slice(-10), // Last 10 messages only
        userSatisfaction: chat.userSatisfaction
      }))
    });
    
  } catch (error) {
    console.error('Chat History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve chat history',
      error: error.message
    });
  }
});

// Rate assistant conversation
router.post('/chat/rate', async (req, res) => {
  try {
    const { userId, userType, sessionId, rating, feedback } = req.body;
    
    if (!userId || !userType || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'User ID, user type, and session ID are required'
      });
    }
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }
    
    const chat = await AIChat.findOne({ userId, userType, sessionId, isActive: true });
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      });
    }
    
    chat.userSatisfaction = {
      rating: parseInt(rating),
      feedback: feedback || '',
      ratedAt: new Date()
    };
    
    await chat.save();
    
    res.json({
      success: true,
      message: 'Thank you for your feedback!',
      rating: chat.userSatisfaction
    });
    
  } catch (error) {
    console.error('Rate Assistant Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save rating',
      error: error.message
    });
  }
});

// Get product recommendations
router.post('/recommendations', async (req, res) => {
  try {
    const { userId, query, limit = 6 } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    const recommendations = await aiAssistantService.getProductRecommendations(userId, query, parseInt(limit));
    
    res.json({
      success: true,
      recommendations,
      message: 'Product recommendations generated successfully'
    });
    
  } catch (error) {
    console.error('Recommendations Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message
    });
  }
});

// Get business insights for artisans
router.post('/artisan/insights', async (req, res) => {
  try {
    const { artisanId } = req.body;
    
    if (!artisanId) {
      return res.status(400).json({
        success: false,
        message: 'Artisan ID is required'
      });
    }
    
    const insights = await aiAssistantService.generateBusinessInsights(artisanId);
    
    res.json({
      success: true,
      insights,
      message: 'Business insights generated successfully'
    });
    
  } catch (error) {
    console.error('Business Insights Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate business insights',
      error: error.message
    });
  }
});

// Clear chat session
router.delete('/chat/clear', async (req, res) => {
  try {
    const { userId, userType, sessionId } = req.body;
    
    if (!userId || !userType) {
      return res.status(400).json({
        success: false,
        message: 'User ID and user type are required'
      });
    }
    
    const query = { userId, userType };
    if (sessionId) {
      query.sessionId = sessionId;
    }
    
    await AIChat.updateMany(query, { isActive: false });
    
    res.json({
      success: true,
      message: sessionId ? 'Chat session cleared' : 'All chat sessions cleared'
    });
    
  } catch (error) {
    console.error('Clear Chat Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear chat sessions',
      error: error.message
    });
  }
});

module.exports = router;
