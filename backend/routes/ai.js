const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Product = require('../models/Product');
const Artisan = require('../models/Artisan');
const aiSearchService = require('../services/aiSearchService');
const searchAnalyticsService = require('../services/searchAnalyticsService');
const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// AI content generation using Gemini API
const generateAIContent = {
  enhanceProductDescription: async (originalDescription, craftType, materials) => {
    try {
      const prompt = `Enhance this product description for an Indian artisan marketplace. 
      Original description: "${originalDescription}"
      Craft type: ${craftType}
      Materials: ${materials || 'traditional materials'}
      
      Please create an engaging, culturally-rich description that:
      - Highlights the traditional craftsmanship
      - Emphasizes the cultural heritage and story
      - Uses appealing language for online customers
      - Mentions the skilled artisan work
      - Keeps the tone professional yet warm
      - Limit to 300-400 words
      
      Return only the enhanced description without any additional text or formatting.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API Error:', error);
      // Fallback to template if API fails
      return `This exquisite handcrafted ${craftType.toLowerCase()} piece embodies centuries of traditional Indian craftsmanship. ${originalDescription} Each detail tells a story of dedication, skill passed down through generations. Made with ${materials || 'traditional materials'} and time-honored techniques, this piece represents the rich cultural heritage of Indian artisans.`;
    }
  },

  generateArtisanStory: async (artisan) => {
    try {
      const prompt = `Create a compelling artisan story for an Indian marketplace. 
      Artisan Name: ${artisan.name}
      Craft Type: ${artisan.craftType}
      Location: ${artisan.location?.city || 'India'}, ${artisan.location?.state || ''}
      Experience: ${artisan.experience || 'several'} years
      Bio: ${artisan.bio || 'No additional bio provided'}
      
      Please create an inspiring story that:
      - Tells about their journey and passion
      - Highlights traditional techniques and cultural heritage
      - Creates emotional connection with customers
      - Emphasizes the uniqueness of their craft
      - Mentions family traditions if relevant
      - Keep it between 200-300 words
      
      Return only the story without any additional text or formatting.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API Error:', error);
      // Fallback to template if API fails
      return `Meet ${artisan.name}, a passionate ${artisan.craftType.toLowerCase()} artisan from ${artisan.location?.city || 'India'}. With ${artisan.experience || 'several'} years of experience, ${artisan.name} has dedicated their life to preserving the ancient art of ${artisan.craftType.toLowerCase()}. Growing up in a family of craftspeople, they learned intricate techniques passed down through generations. Today, ${artisan.name} continues this beautiful tradition, creating unique pieces that tell stories of culture, heritage, and skilled craftsmanship.`;
    }
  },

  generateMarketingContent: async (product) => {
    try {
      const prompt = `Generate marketing content for this Indian artisan product:
      Product Name: ${product.name}
      Category: ${product.category}
      Description: ${product.description}
      Price: ₹${product.price}
      
      Generate:
      1. A social media post (with relevant hashtags)
      2. A compelling product story
      3. Target audience description
      
      Format your response as:
      SOCIAL_MEDIA: [social media post with hashtags]
      PRODUCT_STORY: [detailed product story]
      TARGET_AUDIENCE: [target audience description]`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the response
      const socialMediaMatch = text.match(/SOCIAL_MEDIA:\s*([\s\S]*?)(?=PRODUCT_STORY:|$)/);
      const productStoryMatch = text.match(/PRODUCT_STORY:\s*([\s\S]*?)(?=TARGET_AUDIENCE:|$)/);
      const targetAudienceMatch = text.match(/TARGET_AUDIENCE:\s*([\s\S]*)/);
      
      return {
        socialMediaPost: socialMediaMatch ? socialMediaMatch[1].trim() : `🎨 Discover authentic Indian craftsmanship! ✨ ${product.name} - handcrafted with love and tradition. 🇮🇳 #HandmadeinIndia #ArtisanCrafts #${product.category} #SupportLocal`,
        productStory: productStoryMatch ? productStoryMatch[1].trim() : `This ${product.name} is more than just a product - it's a piece of living history crafted with traditional techniques.`,
        targetAudience: targetAudienceMatch ? targetAudienceMatch[1].trim() : 'Art enthusiasts, cultural appreciators, unique gift seekers'
      };
    } catch (error) {
      console.error('Gemini API Error:', error);
      // Fallback to template if API fails
      return {
        socialMediaPost: `🎨 Discover authentic Indian craftsmanship! ✨ ${product.name} - handcrafted with love and tradition. Each piece tells a unique story of cultural heritage. 🇮🇳 #HandmadeinIndia #ArtisanCrafts #${product.category} #SupportLocal #TraditionalArt`,
        productStory: `This ${product.name} is more than just a product - it's a piece of living history. Crafted using traditional ${product.category.toLowerCase()} techniques that have been perfected over generations, every detail reflects the artisan's deep connection to their cultural roots.`,
        targetAudience: product.category === 'Jewelry' ? 'Fashion-conscious individuals, gift buyers, cultural enthusiasts' : 'Art collectors, cultural enthusiasts, unique gift seekers'
      };
    }
  },

  generateTags: async (product) => {
    try {
      const prompt = `Generate relevant tags for this Indian artisan product:
      Product Name: ${product.name}
      Category: ${product.category}
      Description: ${product.description}
      
      Generate 8-12 relevant tags that would help customers find this product. Include:
      - Craft-specific terms
      - Cultural/regional tags
      - Material-based tags
      - Style descriptors
      - General marketplace tags
      
      Return only the tags separated by commas, no additional text.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const tags = response.text().split(',').map(tag => tag.trim().toLowerCase());
      return tags;
    } catch (error) {
      console.error('Gemini API Error:', error);
      // Fallback to template if API fails
      const baseTags = ['handmade', 'indian-craft', 'traditional', 'authentic', 'cultural-heritage'];
      const categoryTags = {
        Pottery: ['ceramic', 'clay', 'terracotta', 'earthenware', 'home-decor'],
        Jewelry: ['handcrafted-jewelry', 'traditional-jewelry', 'indian-jewelry', 'ethnic', 'accessories'],
        Textiles: ['handwoven', 'fabric', 'traditional-textile', 'indian-textile', 'handloom'],
        Woodwork: ['wooden-craft', 'carved', 'furniture', 'decorative', 'sustainable'],
        Metalwork: ['metal-art', 'brass', 'copper', 'traditional-metalwork', 'decorative']
      };
      return [...baseTags, ...(categoryTags[product.category] || [])];
    }
  }
};

// Enhance product description with AI
router.post('/enhance-description', async (req, res) => {
  try {
    const { productId, originalDescription, craftType, materials } = req.body;
    
    // Using Gemini AI for enhancement
    const enhancedDescription = await generateAIContent.enhanceProductDescription(
      originalDescription, 
      craftType, 
      materials
    );

    // Update product if productId is provided
    if (productId) {
      await Product.findByIdAndUpdate(productId, {
        aiEnhancedDescription: enhancedDescription
      });
    }

    res.json({
      success: true,
      enhancedDescription,
      message: 'Product description enhanced successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error enhancing description', error: error.message });
  }
});

// Generate artisan story
router.post('/generate-story', async (req, res) => {
  try {
    const { artisanId } = req.body;
    
    const artisan = await Artisan.findById(artisanId);
    if (!artisan) {
      return res.status(404).json({ message: 'Artisan not found' });
    }

    const generatedStory = await generateAIContent.generateArtisanStory(artisan);

    // Update artisan story if they don't have one
    if (!artisan.story) {
      artisan.story = generatedStory;
      await artisan.save();
    }

    res.json({
      success: true,
      story: generatedStory,
      message: 'Artisan story generated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating story', error: error.message });
  }
});

// Generate marketing content for products
router.post('/generate-marketing', async (req, res) => {
  try {
    const { productId } = req.body;
    
    const product = await Product.findById(productId).populate('artisan');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const marketingContent = await generateAIContent.generateMarketingContent(product);
    const aiTags = await generateAIContent.generateTags(product);

    // Update product with AI-generated content
    product.marketingContent = marketingContent;
    product.aiGeneratedTags = aiTags;
    await product.save();

    res.json({
      success: true,
      marketingContent,
      aiTags,
      message: 'Marketing content generated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating marketing content', error: error.message });
  }
});

// Get market insights for artisans
router.get('/insights/:artisanId', async (req, res) => {
  try {
    const artisanId = req.params.artisanId;
    
    // Get artisan's products
    const products = await Product.find({ artisan: artisanId });
    
    const insights = {
      totalProducts: products.length,
      totalViews: products.reduce((sum, product) => sum + product.views, 0),
      totalLikes: products.reduce((sum, product) => sum + product.likes, 0),
      averagePrice: products.length > 0 ? products.reduce((sum, product) => sum + product.price, 0) / products.length : 0,
      mostPopularProduct: products.sort((a, b) => b.views - a.views)[0]?.name || 'No products yet',
      suggestions: [
        'Consider adding more product images to increase engagement',
        'Use AI-generated descriptions to improve product appeal',
        'Share your crafting story to connect with customers',
        'Add seasonal products to boost sales'
      ],
      marketTrends: {
        popularCategories: ['Jewelry', 'Textiles', 'Pottery'],
        recommendedPriceRange: '₹500 - ₹5000',
        bestSellingTags: ['handmade', 'traditional', 'eco-friendly', 'unique']
      }
    };

    res.json({
      success: true,
      insights,
      message: 'Market insights generated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating insights', error: error.message });
  }
});

// Generate product tags
router.post('/generate-tags', async (req, res) => {
  try {
    const { productId, productName, category, description } = req.body;
    
    const productData = productId ? await Product.findById(productId) : { name: productName, category, description };
    const aiTags = await generateAIContent.generateTags(productData);

    if (productId) {
      await Product.findByIdAndUpdate(productId, {
        aiGeneratedTags: aiTags
      });
    }

    res.json({
      success: true,
      tags: aiTags,
      message: 'Tags generated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating tags', error: error.message });
  }
});

// ===== AI SEARCH ENDPOINTS =====

// AI-powered smart search
router.post('/smart-search', async (req, res) => {
  const startTime = Date.now();
  let searchLogId = null;
  
  try {
    const { query, userPreferences, page = 1, limit = 12, sortBy = 'relevance' } = req.body;
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Search query is required' 
      });
    }

    console.log(`AI Search Query: "${query}"`);
    
    // Parse the natural language query using AI
    const parsedQuery = await aiSearchService.parseSearchQuery(query, userPreferences);
    console.log('Parsed Query:', parsedQuery);

    // Perform intelligent search
    const searchResults = await aiSearchService.performSmartSearch(parsedQuery, {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy
    });

    const responseTime = Date.now() - startTime;
    const successful = searchResults.products.length > 0;

    // Log search analytics
    searchLogId = await searchAnalyticsService.logSearch({
      query: query,
      parsedQuery: parsedQuery,
      resultCount: searchResults.products.length,
      userId: userPreferences?.userId,
      userType: userPreferences?.userType || 'anonymous',
      sessionId: req.sessionId || req.headers['x-session-id'],
      searchMode: 'ai',
      aiConfidence: parsedQuery.confidence,
      responseTime: responseTime,
      successful: successful,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: true,
      message: 'AI search completed successfully',
      query: query,
      parsedQuery: parsedQuery,
      products: searchResults.products,
      pagination: searchResults.pagination,
      insights: searchResults.insights,
      searchMetadata: {
        ...searchResults.searchMetadata,
        responseTime: responseTime,
        searchId: searchLogId
      }
    });
  } catch (error) {
    console.error('AI Search Error:', error);
    
    const responseTime = Date.now() - startTime;
    
    // Log failed search
    if (req.body.query) {
      await searchAnalyticsService.logSearch({
        query: req.body.query,
        parsedQuery: null,
        resultCount: 0,
        userId: req.body.userPreferences?.userId,
        userType: req.body.userPreferences?.userType || 'anonymous',
        sessionId: req.sessionId || req.headers['x-session-id'],
        searchMode: 'ai',
        aiConfidence: 0,
        responseTime: responseTime,
        successful: false,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'AI search failed', 
      error: error.message 
    });
  }
});

// Generate search suggestions
router.post('/search-suggestions', async (req, res) => {
  try {
    const { query, limit = 6 } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Query is required for suggestions' 
      });
    }

    if (query.trim().length < 2) {
      return res.json({
        success: true,
        suggestions: [],
        message: 'Query too short for suggestions'
      });
    }

    console.log(`Generating suggestions for: "${query}"`);
    
    const suggestions = await aiSearchService.generateSearchSuggestions(query.trim(), parseInt(limit));

    res.json({
      success: true,
      suggestions,
      message: 'Search suggestions generated successfully'
    });
  } catch (error) {
    console.error('Search Suggestions Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate search suggestions', 
      error: error.message 
    });
  }
});

// Analyze search query (for debugging/analytics)
router.post('/analyze-query', async (req, res) => {
  try {
    const { query, userPreferences } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Query is required for analysis' 
      });
    }

    console.log(`Analyzing query: "${query}"`);
    
    const parsedQuery = await aiSearchService.parseSearchQuery(query, userPreferences);

    res.json({
      success: true,
      query: query,
      parsedQuery: parsedQuery,
      analysis: {
        queryLength: query.length,
        wordCount: query.split(' ').length,
        hasNumbers: /\d/.test(query),
        hasPriceTerms: /(price|cost|under|below|above|cheap|expensive|₹|rupee|rs)/i.test(query),
        hasColorTerms: /(blue|red|green|yellow|white|black|golden|silver|pink|purple)/i.test(query),
        hasOccasionTerms: /(wedding|festival|diwali|gift|birthday|anniversary)/i.test(query)
      },
      message: 'Query analysis completed'
    });
  } catch (error) {
    console.error('Query Analysis Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to analyze query', 
      error: error.message 
    });
  }
});

// Get search analytics (for admin/insights)
router.get('/search-analytics', async (req, res) => {
  try {
    const { timeRange = 7 } = req.query;
    
    const analytics = await searchAnalyticsService.getAnalyticsDashboard(parseInt(timeRange));
    const recommendations = await searchAnalyticsService.getSearchRecommendations();
    const poorQueries = await searchAnalyticsService.getPoorPerformingQueries(10);

    res.json({
      success: true,
      analytics,
      recommendations,
      poorPerformingQueries: poorQueries,
      timeRange: parseInt(timeRange),
      message: 'Search analytics retrieved successfully'
    });
  } catch (error) {
    console.error('Search Analytics Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve search analytics', 
      error: error.message 
    });
  }
});

// Clear AI search cache
router.post('/clear-cache', async (req, res) => {
  try {
    aiSearchService.clearCache();
    
    res.json({
      success: true,
      message: 'AI search cache cleared successfully'
    });
  } catch (error) {
    console.error('Clear Cache Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to clear cache', 
      error: error.message 
    });
  }
});

module.exports = router;
