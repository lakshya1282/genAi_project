const express = require('express');
const OpenAI = require('openai');
const Product = require('../models/Product');
const User = require('../models/User');
const Artisan = require('../models/Artisan');
const router = express.Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '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'
});

// Store conversation context (in production, use Redis or database)
const conversationContexts = new Map();

// Enhanced AI-powered product chatbot
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId, userContext } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    console.log(`Product Chatbot Query: "${message}"`);

    // Get or create conversation context
    let context = conversationContexts.get(sessionId) || {
      conversationHistory: [],
      userPreferences: userContext?.preferences || {},
      searchHistory: [],
      lastProductCategory: null,
      userIntent: 'browse'
    };

    // Add user message to conversation history
    context.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Enhanced AI prompt for natural conversation using OpenAI
    const conversationPrompt = `You are an AI shopping assistant for "Kaarigari" - an Indian handcrafted products marketplace. You help customers discover beautiful handmade products from talented Indian artisans.

CONVERSATION CONTEXT:
${context.conversationHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

USER CONTEXT:
- Authenticated: ${userContext?.isAuthenticated || false}
- Previous searches: ${context.searchHistory.join(', ') || 'None'}
- Last category viewed: ${context.lastProductCategory || 'None'}
- User preferences: ${JSON.stringify(context.userPreferences)}

USER MESSAGE: "${message}"

Your task is to:
1. Understand the user's intent and provide a helpful, conversational response
2. If they're looking for products, extract search parameters in JSON format
3. Be friendly, knowledgeable about Indian crafts, and culturally sensitive
4. Keep responses concise but informative
5. Provide relevant follow-up suggestions

If the user is looking for products, respond in this format:
RESPONSE: [Your conversational response]
SEARCH_PARAMS: {
  "keywords": ["term1", "term2"],
  "category": "Category Name", 
  "priceRange": {"min": number, "max": number},
  "occasion": "occasion type",
  "intent": "browse|gift|specific|help|compare",
  "shouldSearch": true/false
}
SUGGESTIONS: ["suggestion1", "suggestion2", "suggestion3"]

Examples of user intents:
- "Show me jewelry" → Product search intent
- "Tell me about Indian pottery" → Information intent  
- "I need a gift for my mother" → Gift assistance intent
- "What's the difference between..." → Comparison intent
- "How do I care for..." → Help/information intent

Be conversational and helpful while maintaining your role as a shopping assistant for handcrafted Indian products.`;

    let aiResponse;
    try {
      aiResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert AI shopping assistant for Kaarigari, an Indian handcrafted products marketplace. You are knowledgeable about Indian crafts, culture, and traditions. Respond naturally and helpfully."
          },
          {
            role: "user",
            content: conversationPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });
    } catch (openaiError) {
      console.error('OpenAI API Error:', openaiError);
      throw new Error('AI service temporarily unavailable');
    }
    
    const aiText = aiResponse.choices[0]?.message?.content || 'Sorry, I cannot process your request right now.';
    
    console.log('Raw AI Response:', aiText);

    // Parse AI response
    let conversationResponse = aiText;
    let searchParams = null;
    let suggestions = [];

    // Extract search parameters if present
    const searchMatch = aiText.match(/SEARCH_PARAMS:\s*({[\s\S]*?})/);
    if (searchMatch) {
      try {
        searchParams = JSON.parse(searchMatch[1]);
      } catch (e) {
        console.log('Failed to parse search params:', e);
      }
    }

    // Extract suggestions if present
    const suggestionsMatch = aiText.match(/SUGGESTIONS:\s*(\[[\s\S]*?\])/);
    if (suggestionsMatch) {
      try {
        suggestions = JSON.parse(suggestionsMatch[1]);
      } catch (e) {
        console.log('Failed to parse suggestions:', e);
      }
    }

    // Extract main response
    const responseMatch = aiText.match(/RESPONSE:\s*([\s\S]*?)(?=SEARCH_PARAMS:|SUGGESTIONS:|$)/);
    if (responseMatch) {
      conversationResponse = responseMatch[1].trim();
    }

    // Search for products if requested
    let products = [];
    if (searchParams && searchParams.shouldSearch) {
      products = await searchProducts(searchParams);
      
      // Update search history
      if (searchParams.keywords && searchParams.keywords.length > 0) {
        context.searchHistory.push(...searchParams.keywords);
        context.searchHistory = [...new Set(context.searchHistory)].slice(-10); // Keep unique, last 10
      }
      
      if (searchParams.category) {
        context.lastProductCategory = searchParams.category;
      }
      
      context.userIntent = searchParams.intent || 'browse';
    }

    // Generate contextual suggestions if none provided
    if (suggestions.length === 0) {
      suggestions = generateContextualSuggestions(context, searchParams, products);
    }

    // Update conversation context
    context.conversationHistory.push({
      role: 'assistant',
      content: conversationResponse,
      timestamp: new Date(),
      products: products.length,
      searchParams: searchParams
    });

    // Store updated context
    conversationContexts.set(sessionId, context);

    // Auto-cleanup old contexts (keep for 1 hour)
    setTimeout(() => {
      conversationContexts.delete(sessionId);
    }, 60 * 60 * 1000);

    res.json({
      success: true,
      message: conversationResponse,
      products: products.slice(0, 6), // Limit to 6 products
      suggestions: suggestions.slice(0, 4), // Limit to 4 suggestions
      searchPerformed: searchParams?.shouldSearch || false,
      userIntent: context.userIntent,
      metadata: {
        sessionId,
        conversationLength: context.conversationHistory.length,
        searchCount: context.searchHistory.length
      }
    });

  } catch (error) {
    console.error('Product Chatbot Error:', error);
    
    // Fallback response
    const fallbackResponse = "I'm here to help you discover amazing handcrafted products! Could you tell me what you're looking for? For example, you can ask about jewelry, pottery, textiles, or any specific item you need.";
    
    res.json({
      success: true,
      message: fallbackResponse,
      products: [],
      suggestions: [
        "Show me traditional jewelry",
        "Find pottery for home decor", 
        "I need a gift under ₹1000",
        "What are your popular items?"
      ],
      searchPerformed: false,
      error: 'AI processing failed, using fallback response'
    });
  }
});

// Enhanced product search function
async function searchProducts(searchParams) {
  try {
    let mongoQuery = { isActive: true };
    let sortCriteria = { views: -1, createdAt: -1 };

    // Build search query based on extracted parameters
    if (searchParams.keywords && searchParams.keywords.length > 0) {
      const keywordQueries = searchParams.keywords.map(keyword => ({
        $or: [
          { name: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } },
          { category: { $regex: keyword, $options: 'i' } },
          { tags: { $regex: keyword, $options: 'i' } }
        ]
      }));
      
      if (keywordQueries.length === 1) {
        mongoQuery = { ...mongoQuery, ...keywordQueries[0] };
      } else {
        mongoQuery.$and = keywordQueries;
      }
    }

    // Category filter
    if (searchParams.category) {
      mongoQuery.category = { $regex: searchParams.category, $options: 'i' };
    }

    // Price range filter
    if (searchParams.priceRange) {
      mongoQuery.price = {};
      if (searchParams.priceRange.min) {
        mongoQuery.price.$gte = searchParams.priceRange.min;
      }
      if (searchParams.priceRange.max) {
        mongoQuery.price.$lte = searchParams.priceRange.max;
      }
    }

    // Intent-based sorting
    switch (searchParams.intent) {
      case 'gift':
        sortCriteria = { likes: -1, views: -1 }; // Popular items for gifts
        break;
      case 'browse':
        sortCriteria = { createdAt: -1, views: -1 }; // Newer items first
        break;
      case 'specific':
        sortCriteria = { views: -1 }; // Most viewed (likely what they want)
        break;
      default:
        sortCriteria = { views: -1, createdAt: -1 };
    }

    console.log('MongoDB Query:', JSON.stringify(mongoQuery, null, 2));

    const products = await Product.find(mongoQuery)
      .populate('artisan', 'name craftType location')
      .sort(sortCriteria)
      .limit(8);

    return products;

  } catch (error) {
    console.error('Product search error:', error);
    return [];
  }
}

// Generate contextual suggestions based on conversation state
function generateContextualSuggestions(context, searchParams, products) {
  const suggestions = [];
  
  // Intent-based suggestions
  if (context.userIntent === 'gift') {
    suggestions.push("Show me gift sets", "Items under ₹500 for gifts", "Personalized products");
  } else if (context.userIntent === 'browse') {
    suggestions.push("What's trending?", "Show me new arrivals", "Popular categories");
  }

  // Category-based suggestions
  if (context.lastProductCategory) {
    suggestions.push(`More ${context.lastProductCategory.toLowerCase()} items`);
    
    // Related categories
    const categoryRelations = {
      'Jewelry': ['Traditional accessories', 'Wedding jewelry'],
      'Pottery': ['Home decor items', 'Kitchen pottery'],
      'Textiles': ['Traditional fabrics', 'Handwoven items'],
      'Woodwork': ['Furniture pieces', 'Decorative wood items'],
      'Metalwork': ['Brass items', 'Traditional metalwork']
    };
    
    const related = categoryRelations[context.lastProductCategory];
    if (related) {
      suggestions.push(related[0]);
    }
  }

  // Price-based suggestions if products found
  if (products.length > 0) {
    const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / products.length;
    if (avgPrice > 1000) {
      suggestions.push("Show budget-friendly options");
    } else {
      suggestions.push("Show premium products");
    }
  }

  // Default suggestions if nothing specific
  if (suggestions.length === 0) {
    suggestions.push(
      "Help me find a gift",
      "Show me popular items", 
      "What's new in pottery?",
      "Traditional jewelry collection"
    );
  }

  return [...new Set(suggestions)].slice(0, 4);
}

// Get conversation history
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const context = conversationContexts.get(sessionId);
    
    if (!context) {
      return res.json({
        success: true,
        history: [],
        message: 'No conversation history found'
      });
    }

    res.json({
      success: true,
      history: context.conversationHistory,
      searchHistory: context.searchHistory,
      userIntent: context.userIntent,
      lastCategory: context.lastProductCategory
    });

  } catch (error) {
    console.error('History retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversation history'
    });
  }
});

// Clear conversation
router.delete('/clear/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    conversationContexts.delete(sessionId);
    
    res.json({
      success: true,
      message: 'Conversation cleared'
    });

  } catch (error) {
    console.error('Clear conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear conversation'
    });
  }
});

// Get trending products for suggestions
router.get('/trending', async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const trending = await Product.find({ isActive: true })
      .populate('artisan', 'name craftType location')
      .sort({ views: -1, likes: -1 })
      .limit(parseInt(limit));

    const categories = await Product.distinct('category', { isActive: true });
    
    res.json({
      success: true,
      trending,
      categories,
      suggestions: [
        "Show me traditional jewelry",
        "Find pottery for home",
        "I need a wedding gift",
        "What's popular in textiles?"
      ]
    });

  } catch (error) {
    console.error('Trending products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trending products'
    });
  }
});

module.exports = router;
