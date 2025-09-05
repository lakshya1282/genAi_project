const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const Product = require('../models/Product');
const embeddingService = require('./embeddingService');
const searchAnalyticsService = require('./searchAnalyticsService');

class AISearchService {
  constructor() {
    // Initialize AI models
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.geminiModel = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Cache for embeddings and frequent searches
    this.embeddingCache = new Map();
    this.searchCache = new Map();
  }

  /**
   * Parse natural language query into search parameters
   */
  async parseSearchQuery(query, userPreferences = null) {
    try {
      const prompt = `You are a search intelligence system for an Indian artisan marketplace. Parse this natural language search query into structured search parameters.

Query: "${query}"
User Context: ${userPreferences ? JSON.stringify(userPreferences) : 'No specific context'}

Extract and return ONLY a JSON object with these possible fields (omit fields that don't apply):
{
  "intent": "search|browse|gift|specific_item|price_inquiry",
  "category": "Pottery|Weaving|Jewelry|Woodwork|Metalwork|Textiles|Paintings|Sculptures",
  "keywords": ["array", "of", "relevant", "keywords"],
  "priceRange": {"min": number, "max": number},
  "occasion": "wedding|festival|diwali|gift|decoration|personal",
  "materials": ["material1", "material2"],
  "colors": ["color1", "color2"],
  "location": "state or region if mentioned",
  "style": "traditional|modern|vintage|contemporary",
  "customizable": boolean,
  "giftPurpose": boolean,
  "urgent": boolean,
  "sentiment": "excited|casual|urgent|specific"
}

Examples:
- "blue pottery for gifts" → {"intent": "gift", "category": "Pottery", "keywords": ["blue", "pottery"], "colors": ["blue"], "giftPurpose": true}
- "traditional jewelry under 2000" → {"intent": "search", "category": "Jewelry", "keywords": ["traditional", "jewelry"], "priceRange": {"max": 2000}, "style": "traditional"}
- "handmade items from rajasthan" → {"intent": "browse", "keywords": ["handmade"], "location": "rajasthan"}

Return ONLY valid JSON without any explanation or additional text.`;

      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      let parsedParams;

      try {
        const cleanText = response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsedParams = JSON.parse(cleanText);
      } catch (parseError) {
        console.log('JSON parse error, using fallback parsing');
        parsedParams = this.fallbackQueryParsing(query);
      }

      // Add confidence score
      parsedParams.confidence = this.calculateConfidence(query, parsedParams);
      
      return parsedParams;
    } catch (error) {
      console.error('Error parsing search query:', error);
      return this.fallbackQueryParsing(query);
    }
  }

  /**
   * Generate search suggestions based on partial query
   */
  async generateSearchSuggestions(partialQuery, limit = 6) {
    try {
      const cacheKey = `suggestions_${partialQuery.toLowerCase()}`;
      if (this.searchCache.has(cacheKey)) {
        return this.searchCache.get(cacheKey);
      }

      const prompt = `Generate ${limit} intelligent search suggestions for an Indian artisan marketplace based on this partial query: "${partialQuery}"

Make suggestions that are:
1. Relevant to Indian handicrafts and artisan products
2. Complete, searchable queries
3. Diverse (different categories, occasions, styles)
4. Natural language that users would actually type

Return ONLY a JSON array of suggestion strings, no other text.

Example format: ["blue pottery for home decoration", "traditional jewelry for weddings", "handwoven textiles from Gujarat"]`;

      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      
      let suggestions;
      try {
        const cleanText = response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        suggestions = JSON.parse(cleanText);
        
        if (!Array.isArray(suggestions)) {
          throw new Error('Response is not an array');
        }
      } catch (parseError) {
        // Fallback suggestions
        suggestions = this.generateFallbackSuggestions(partialQuery, limit);
      }

      // Cache the suggestions
      this.searchCache.set(cacheKey, suggestions);
      
      return suggestions;
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return this.generateFallbackSuggestions(partialQuery, limit);
    }
  }

  /**
   * Perform intelligent search using parsed parameters
   */
  async performSmartSearch(parsedQuery, options = {}) {
    try {
      const { page = 1, limit = 12, sortBy = 'relevance' } = options;
      
      // Build MongoDB query from parsed parameters
      const mongoQuery = this.buildMongoQuery(parsedQuery);
      
      // Get products from database
      let products = await Product.find(mongoQuery)
        .populate('artisan', 'name location craftType')
        .lean();

      // Apply AI ranking and sorting
      if (parsedQuery.keywords && parsedQuery.keywords.length > 0) {
        products = await this.rankProductsByRelevance(products, parsedQuery);
        
        // Enhance with semantic similarity if we have a meaningful query
        const query = parsedQuery.keywords.join(' ');
        if (query.length > 3) {
          try {
            products = await embeddingService.enhanceProductSearch(query, products);
          } catch (error) {
            console.log('Semantic search enhancement failed, continuing with keyword search');
          }
        }
      }

      // Apply sorting
      products = this.sortProducts(products, sortBy, parsedQuery);

      // Paginate
      const startIndex = (page - 1) * limit;
      const paginatedProducts = products.slice(startIndex, startIndex + limit);

      // Generate AI insights
      const insights = await this.generateSearchInsights(parsedQuery, products.length);

      return {
        products: paginatedProducts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(products.length / limit),
          total: products.length,
          hasMore: startIndex + limit < products.length
        },
        insights,
        searchMetadata: {
          queryType: parsedQuery.intent,
          confidence: parsedQuery.confidence,
          processingTime: Date.now()
        }
      };
    } catch (error) {
      console.error('Error performing smart search:', error);
      throw error;
    }
  }

  /**
   * Build MongoDB query from parsed AI parameters
   */
  buildMongoQuery(parsedQuery) {
    const query = {};

    // Category filter
    if (parsedQuery.category) {
      query.category = parsedQuery.category;
    }

    // Price range
    if (parsedQuery.priceRange) {
      query.price = {};
      if (parsedQuery.priceRange.min) query.price.$gte = parsedQuery.priceRange.min;
      if (parsedQuery.priceRange.max) query.price.$lte = parsedQuery.priceRange.max;
    }

    // Customizable filter
    if (parsedQuery.customizable !== undefined) {
      query.isCustomizable = parsedQuery.customizable;
    }

    // Location-based filter
    if (parsedQuery.location) {
      query['artisan.location.state'] = new RegExp(parsedQuery.location, 'i');
    }

    // Keywords search
    if (parsedQuery.keywords && parsedQuery.keywords.length > 0) {
      const keywordRegex = parsedQuery.keywords.map(keyword => 
        new RegExp(keyword, 'i')
      );
      
      query.$or = [
        { name: { $in: keywordRegex } },
        { description: { $in: keywordRegex } },
        { tags: { $in: parsedQuery.keywords } },
        { aiGeneratedTags: { $in: parsedQuery.keywords } },
        { 'artisan.craftType': { $in: keywordRegex } }
      ];
    }

    // Color filter
    if (parsedQuery.colors && parsedQuery.colors.length > 0) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { colors: { $in: parsedQuery.colors } },
          { name: { $in: parsedQuery.colors.map(color => new RegExp(color, 'i')) } },
          { description: { $in: parsedQuery.colors.map(color => new RegExp(color, 'i')) } }
        ]
      });
    }

    // Ensure active products only
    query.isActive = true;
    query.stock = { $gt: 0 };

    return query;
  }

  /**
   * Rank products by relevance using AI scoring
   */
  async rankProductsByRelevance(products, parsedQuery) {
    try {
      const scoredProducts = products.map(product => {
        let relevanceScore = 0;
        const keywords = parsedQuery.keywords || [];
        
        // Keyword matching in name (highest weight)
        keywords.forEach(keyword => {
          if (product.name.toLowerCase().includes(keyword.toLowerCase())) {
            relevanceScore += 10;
          }
        });

        // Keyword matching in description
        keywords.forEach(keyword => {
          if (product.description.toLowerCase().includes(keyword.toLowerCase())) {
            relevanceScore += 5;
          }
        });

        // Category exact match bonus
        if (parsedQuery.category && product.category === parsedQuery.category) {
          relevanceScore += 15;
        }

        // Price preference bonus
        if (parsedQuery.priceRange) {
          const { min = 0, max = 100000 } = parsedQuery.priceRange;
          if (product.price >= min && product.price <= max) {
            relevanceScore += 8;
          }
        }

        // Popularity factors
        relevanceScore += (product.views || 0) * 0.01;
        relevanceScore += (product.likes || 0) * 0.1;
        relevanceScore += (product.rating || 0) * 2;

        // Customizable bonus if requested
        if (parsedQuery.customizable && product.isCustomizable) {
          relevanceScore += 5;
        }

        return {
          ...product,
          relevanceScore
        };
      });

      return scoredProducts.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      console.error('Error ranking products:', error);
      return products;
    }
  }

  /**
   * Sort products based on criteria
   */
  sortProducts(products, sortBy, parsedQuery) {
    switch (sortBy) {
      case 'price-asc':
        return products.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return products.sort((a, b) => b.price - a.price);
      case 'newest':
        return products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'popularity':
        return products.sort((a, b) => (b.views + b.likes) - (a.views + a.likes));
      case 'rating':
        return products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'relevance':
      default:
        return products; // Already sorted by relevance in rankProductsByRelevance
    }
  }

  /**
   * Generate insights about search results
   */
  async generateSearchInsights(parsedQuery, totalResults) {
    try {
      if (totalResults === 0) {
        return "No products found for your search. Try using different keywords or broader search terms.";
      }

      const insightPrompts = [];
      
      if (parsedQuery.intent === 'gift') {
        insightPrompts.push("These handcrafted items make perfect gifts with their unique cultural stories.");
      }
      
      if (parsedQuery.occasion) {
        insightPrompts.push(`Perfect selections for ${parsedQuery.occasion} celebrations.`);
      }
      
      if (parsedQuery.category) {
        insightPrompts.push(`Showing authentic ${parsedQuery.category.toLowerCase()} from skilled artisans.`);
      }

      if (totalResults > 50) {
        insightPrompts.push("Many options available - consider using filters to narrow your search.");
      } else if (totalResults < 5) {
        insightPrompts.push("Limited options found - try broader search terms for more choices.");
      }

      return insightPrompts.join(' ') || `Found ${totalResults} handcrafted products matching your search.`;
    } catch (error) {
      console.error('Error generating insights:', error);
      return `Found ${totalResults} products for your search.`;
    }
  }

  /**
   * Fallback query parsing when AI fails
   */
  fallbackQueryParsing(query) {
    const lowerQuery = query.toLowerCase();
    const parsed = {
      intent: 'search',
      keywords: query.split(' ').filter(word => word.length > 2),
      confidence: 0.6
    };

    // Simple category detection
    const categories = ['pottery', 'jewelry', 'textile', 'wood', 'metal', 'painting', 'sculpture'];
    for (const category of categories) {
      if (lowerQuery.includes(category)) {
        parsed.category = category.charAt(0).toUpperCase() + category.slice(1);
        if (category === 'textile') parsed.category = 'Textiles';
        if (category === 'wood') parsed.category = 'Woodwork';
        if (category === 'metal') parsed.category = 'Metalwork';
        if (category === 'painting') parsed.category = 'Paintings';
        if (category === 'sculpture') parsed.category = 'Sculptures';
        break;
      }
    }

    // Simple price detection
    const priceMatch = lowerQuery.match(/under (\d+)|below (\d+)|less than (\d+)/);
    if (priceMatch) {
      parsed.priceRange = { max: parseInt(priceMatch[1] || priceMatch[2] || priceMatch[3]) };
    }

    // Gift detection
    if (lowerQuery.includes('gift') || lowerQuery.includes('present')) {
      parsed.intent = 'gift';
      parsed.giftPurpose = true;
    }

    return parsed;
  }

  /**
   * Generate fallback suggestions
   */
  generateFallbackSuggestions(partialQuery, limit) {
    const suggestions = [
      'handmade pottery for home decoration',
      'traditional Indian jewelry',
      'blue pottery from Jaipur',
      'wooden handicrafts',
      'festival decoration items',
      'wedding gift ideas',
      'textile wall hangings',
      'brass items for pooja',
      'handwoven fabrics',
      'eco-friendly crafts'
    ];

    // Filter based on partial query if possible
    const filtered = suggestions.filter(s => 
      s.toLowerCase().includes(partialQuery.toLowerCase())
    );

    return (filtered.length > 0 ? filtered : suggestions).slice(0, limit);
  }

  /**
   * Calculate confidence score for parsed query
   */
  calculateConfidence(originalQuery, parsedQuery) {
    let confidence = 0.5; // Base confidence

    // Boost confidence based on successfully parsed fields
    if (parsedQuery.category) confidence += 0.15;
    if (parsedQuery.keywords && parsedQuery.keywords.length > 0) confidence += 0.15;
    if (parsedQuery.intent !== 'search') confidence += 0.1;
    if (parsedQuery.priceRange) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Clear caches
   */
  clearCache() {
    this.embeddingCache.clear();
    this.searchCache.clear();
  }
}

module.exports = new AISearchService();
