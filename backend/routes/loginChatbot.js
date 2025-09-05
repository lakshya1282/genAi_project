const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Product = require('../models/Product');
const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// Product search with AI assistance
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 6 } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    console.log(`Login Chatbot Search Query: "${query}"`);

    // First, analyze the query with AI to extract search parameters
    const aiAnalysisPrompt = `Analyze this product search query for an Indian handcraft marketplace: "${query}"

Extract the following information and respond in JSON format:
- keywords: Main search terms
- category: Product category if mentioned (Pottery, Jewelry, Textiles, Woodwork, Metalwork, Paintings, Sculptures)
- priceRange: If price is mentioned, extract min and max values in INR
- occasion: Any occasion mentioned (wedding, festival, gift, home, decoration)
- materials: Any materials mentioned
- colors: Any colors mentioned
- searchIntent: The user's intention (browse, gift, specific_product, price_inquiry)

Example response:
{
  "keywords": ["pottery", "vase"],
  "category": "Pottery",
  "priceRange": {"min": 500, "max": 2000},
  "occasion": "home decoration",
  "materials": ["ceramic", "clay"],
  "colors": ["blue"],
  "searchIntent": "specific_product"
}`;

    let searchParams = {
      keywords: [query],
      category: null,
      priceRange: null,
      occasion: null,
      materials: [],
      colors: [],
      searchIntent: 'browse'
    };

    try {
      const aiResponse = await model.generateContent(aiAnalysisPrompt);
      const aiText = await aiResponse.response.text();
      
      // Try to parse JSON from AI response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedParams = JSON.parse(jsonMatch[0]);
        searchParams = { ...searchParams, ...parsedParams };
      }
    } catch (aiError) {
      console.log('AI analysis failed, using basic search:', aiError.message);
      // Continue with basic search if AI fails
    }

    // Build MongoDB query based on analyzed parameters
    let mongoQuery = {
      isActive: true,
      $or: []
    };

    // Add text search conditions
    const searchTerms = Array.isArray(searchParams.keywords) 
      ? searchParams.keywords 
      : [query];

    searchTerms.forEach(term => {
      const termRegex = { $regex: term.trim(), $options: 'i' };
      mongoQuery.$or.push(
        { name: termRegex },
        { description: termRegex },
        { category: termRegex },
        { tags: termRegex },
        { 'artisan.craftType': termRegex }
      );
    });

    // Add category filter
    if (searchParams.category) {
      mongoQuery.category = { $regex: searchParams.category, $options: 'i' };
    }

    // Add price range filter
    if (searchParams.priceRange && (searchParams.priceRange.min || searchParams.priceRange.max)) {
      mongoQuery.price = {};
      if (searchParams.priceRange.min) mongoQuery.price.$gte = searchParams.priceRange.min;
      if (searchParams.priceRange.max) mongoQuery.price.$lte = searchParams.priceRange.max;
    }

    // Remove empty $or array
    if (mongoQuery.$or.length === 0) {
      delete mongoQuery.$or;
    }

    console.log('MongoDB Query:', JSON.stringify(mongoQuery, null, 2));

    // Execute search
    const products = await Product.find(mongoQuery)
      .populate('artisan', 'name craftType location')
      .sort({ views: -1, createdAt: -1 })
      .limit(parseInt(limit));

    // If no products found with AI-enhanced search, try basic search
    if (products.length === 0) {
      const basicQuery = {
        isActive: true,
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { category: { $regex: query, $options: 'i' } }
        ]
      };

      const basicProducts = await Product.find(basicQuery)
        .populate('artisan', 'name craftType location')
        .sort({ views: -1, createdAt: -1 })
        .limit(parseInt(limit));

      return res.json({
        success: true,
        products: basicProducts,
        searchMode: 'basic',
        searchParams,
        message: `Found ${basicProducts.length} products using basic search`
      });
    }

    // Generate AI response about the search results
    let responseMessage = `Found ${products.length} handcrafted products`;
    
    if (searchParams.searchIntent === 'gift') {
      responseMessage += ' perfect for gifting';
    } else if (searchParams.searchIntent === 'specific_product') {
      responseMessage += ' matching your specific requirements';
    } else if (searchParams.occasion) {
      responseMessage += ` for ${searchParams.occasion}`;
    }

    if (products.length > 0) {
      const topCategories = [...new Set(products.map(p => p.category))].slice(0, 2);
      responseMessage += `. Categories include: ${topCategories.join(', ')}.`;
    }

    res.json({
      success: true,
      products,
      searchMode: 'ai-enhanced',
      searchParams,
      message: responseMessage,
      suggestions: generateSuggestions(searchParams, products)
    });

  } catch (error) {
    console.error('Login Chatbot Search Error:', error);
    res.status(500).json({
      success: false,
      message: 'Product search failed',
      error: error.message
    });
  }
});

// Generate contextual suggestions based on search results
function generateSuggestions(searchParams, products) {
  const suggestions = [];

  // Category-based suggestions
  if (products.length > 0) {
    const categories = [...new Set(products.map(p => p.category))];
    categories.slice(0, 2).forEach(category => {
      suggestions.push(`More ${category.toLowerCase()} items`);
    });
  }

  // Price-based suggestions
  if (searchParams.priceRange) {
    if (searchParams.priceRange.max && searchParams.priceRange.max < 1000) {
      suggestions.push('Budget-friendly options under ₹1000');
    } else if (searchParams.priceRange.min && searchParams.priceRange.min > 2000) {
      suggestions.push('Premium handcrafted items');
    }
  } else {
    suggestions.push('Items under ₹500', 'Premium products');
  }

  // Occasion-based suggestions
  if (searchParams.occasion) {
    if (searchParams.occasion.includes('gift')) {
      suggestions.push('Gift sets', 'Personalized items');
    } else if (searchParams.occasion.includes('home')) {
      suggestions.push('Home decor items', 'Furniture pieces');
    }
  } else {
    suggestions.push('Gift items', 'Home decoration');
  }

  return suggestions.slice(0, 4); // Limit to 4 suggestions
}

// Get popular search terms
router.get('/popular-searches', async (req, res) => {
  try {
    // Get popular categories and sample products
    const popularCategories = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const popularSearches = [
      'Traditional jewelry',
      'Pottery for home',
      'Handwoven textiles',
      'Wooden crafts',
      'Festival decorations',
      'Wedding gifts',
      'Items under ₹1000',
      'Artisan furniture'
    ];

    res.json({
      success: true,
      popularSearches,
      categories: popularCategories.map(cat => cat._id)
    });

  } catch (error) {
    console.error('Popular Searches Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular searches',
      error: error.message
    });
  }
});

module.exports = router;
