const { GoogleGenerativeAI } = require('@google/generative-ai');
const Product = require('../models/Product');
const User = require('../models/User');
const Artisan = require('../models/Artisan');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

class AIAssistantService {
  // Customer Shopping Assistant
  async customerAssistant(message, userContext = {}) {
    try {
      const { userId, preferences, recentlyViewed, currentCategory, budget } = userContext;
      
      // Get user's recent activity and preferences for context
      let contextInfo = '';
      if (userId) {
        const user = await User.findById(userId).populate('recentlyViewed.product', 'name category price');
        if (user && user.recentlyViewed.length > 0) {
          const recentProducts = user.recentlyViewed.slice(0, 3).map(rv => 
            `${rv.product.name} (${rv.product.category}) - ₹${rv.product.price}`
          );
          contextInfo = `Recently viewed products: ${recentProducts.join(', ')}. `;
        }
        
        if (user && user.preferences) {
          contextInfo += `User preferences: Favorite categories: ${user.preferences.favoriteCategories?.join(', ') || 'None'}, `;
          contextInfo += `Price range: ₹${user.preferences.priceRange?.min || 0} - ₹${user.preferences.priceRange?.max || 10000}, `;
          contextInfo += `Language: ${user.preferences.language || 'en'}. `;
        }
      }

      // Get some relevant products for recommendations
      let productContext = '';
      if (currentCategory) {
        const products = await Product.find({ category: currentCategory, isActive: true })
          .limit(5)
          .select('name price category artisan');
        if (products.length > 0) {
          productContext = `Available ${currentCategory} products: ${products.map(p => 
            `${p.name} - ₹${p.price}`
          ).join(', ')}. `;
        }
      }

      const prompt = `You are a helpful shopping assistant for an Indian artisan marketplace called "Artisan Marketplace". 
      You help customers discover beautiful handcrafted products from skilled Indian artisans.

      ${contextInfo}
      ${productContext}

      Customer message: "${message}"

      Please respond as a knowledgeable, friendly shopping assistant. You should:
      - Help customers find products that match their needs
      - Provide information about Indian crafts and their cultural significance
      - Suggest products based on occasions, budget, or preferences  
      - Explain the value of handcrafted items and supporting artisans
      - Answer questions about products, materials, care instructions, etc.
      - Guide them through the shopping process
      - Be culturally sensitive and celebrate Indian heritage
      - Keep responses concise but informative (2-3 sentences max unless explaining something complex)
      - Use a warm, welcoming tone
      
      If asked about specific products, provide general guidance. For exact product availability and details, suggest they browse the categories or use the search function.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      return {
        message: response.text(),
        type: 'customer_assistant',
        suggestions: await this.generateCustomerSuggestions(message, userContext)
      };
    } catch (error) {
      console.error('Customer Assistant Error:', error);
      return {
        message: "I'm here to help you discover amazing handcrafted products! Could you tell me what you're looking for today?",
        type: 'customer_assistant',
        suggestions: ['Browse Categories', 'Search Products', 'View Wishlist', 'Need Gift Ideas?']
      };
    }
  }

  // Artisan Business Assistant
  async artisanAssistant(message, artisanContext = {}) {
    try {
      const { artisanId, products, recentOrders, craftType } = artisanContext;
      
      let contextInfo = '';
      if (artisanId) {
        const artisan = await Artisan.findById(artisanId);
        if (artisan) {
          contextInfo = `Artisan: ${artisan.name}, Craft: ${artisan.craftType}, Location: ${artisan.location?.city || 'India'}, Experience: ${artisan.experience || 'experienced'} years. `;
        }

        // Get artisan's product info for context
        const artisanProducts = await Product.find({ artisan: artisanId, isActive: true })
          .limit(5)
          .select('name category price views likes stock');
        
        if (artisanProducts.length > 0) {
          const productStats = artisanProducts.map(p => 
            `${p.name} (₹${p.price}, ${p.views} views, ${p.stock} in stock)`
          );
          contextInfo += `Recent products: ${productStats.join(', ')}. `;
        }
      }

      const prompt = `You are a business advisor and mentor for artisans on an Indian artisan marketplace. 
      You help artisans grow their craft business, improve their products, and succeed online.

      ${contextInfo}

      Artisan message: "${message}"

      Please respond as an experienced business mentor for artisans. You should:
      - Help with product creation, descriptions, and storytelling
      - Provide business advice for growing their craft business
      - Suggest pricing strategies and market positioning
      - Give tips on photography, product presentation, and marketing
      - Advise on inventory management and seasonal trends
      - Help with understanding customer needs and preferences
      - Encourage preservation of traditional techniques
      - Provide guidance on scaling their business
      - Keep responses practical and actionable (2-4 sentences)
      - Be supportive and encouraging
      
      Focus on helping them succeed while maintaining the authenticity and quality of their traditional crafts.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      return {
        message: response.text(),
        type: 'artisan_assistant',
        suggestions: await this.generateArtisanSuggestions(message, artisanContext)
      };
    } catch (error) {
      console.error('Artisan Assistant Error:', error);
      return {
        message: "I'm here to help you grow your craft business! Whether you need help with product descriptions, business strategies, or understanding your customers, I'm here to support you.",
        type: 'artisan_assistant',
        suggestions: ['Generate Product Description', 'Business Tips', 'Pricing Advice', 'Marketing Help']
      };
    }
  }

  // Generate contextual suggestions for customers
  async generateCustomerSuggestions(message, userContext) {
    const lowerMessage = message.toLowerCase();
    
    // Gift-related suggestions
    if (lowerMessage.includes('gift') || lowerMessage.includes('present')) {
      return ['Gift Ideas by Occasion', 'Personalized Items', 'Traditional Crafts', 'Price Range Guide'];
    }
    
    // Budget-related suggestions
    if (lowerMessage.includes('budget') || lowerMessage.includes('price') || lowerMessage.includes('cheap') || lowerMessage.includes('expensive')) {
      return ['Budget-Friendly Options', 'Premium Collections', 'Best Value Products', 'Seasonal Offers'];
    }
    
    // Category-related suggestions
    if (lowerMessage.includes('jewelry') || lowerMessage.includes('jewellery')) {
      return ['Traditional Jewelry', 'Silver Jewelry', 'Handmade Earrings', 'Wedding Jewelry'];
    }
    
    if (lowerMessage.includes('textile') || lowerMessage.includes('fabric') || lowerMessage.includes('cloth')) {
      return ['Handwoven Fabrics', 'Traditional Sarees', 'Block Prints', 'Embroidered Items'];
    }
    
    if (lowerMessage.includes('pottery') || lowerMessage.includes('ceramic')) {
      return ['Clay Pottery', 'Decorative Bowls', 'Traditional Pots', 'Modern Ceramics'];
    }
    
    // Default suggestions
    return ['Browse Categories', 'Search Products', 'Popular Items', 'New Arrivals'];
  }

  // Generate contextual suggestions for artisans
  async generateArtisanSuggestions(message, artisanContext) {
    const lowerMessage = message.toLowerCase();
    
    // Product-related suggestions
    if (lowerMessage.includes('product') || lowerMessage.includes('description') || lowerMessage.includes('story')) {
      return ['Generate Description', 'Create Product Story', 'Add Product Tags', 'Pricing Guidance'];
    }
    
    // Business-related suggestions
    if (lowerMessage.includes('business') || lowerMessage.includes('sales') || lowerMessage.includes('marketing')) {
      return ['Marketing Tips', 'Increase Sales', 'Customer Engagement', 'Social Media Strategy'];
    }
    
    // Photography/presentation
    if (lowerMessage.includes('photo') || lowerMessage.includes('image') || lowerMessage.includes('picture')) {
      return ['Photography Tips', 'Product Presentation', 'Image Optimization', 'Showcase Ideas'];
    }
    
    // Pricing related
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('pricing')) {
      return ['Pricing Strategy', 'Competitive Analysis', 'Value Pricing', 'Seasonal Pricing'];
    }
    
    // Default suggestions
    return ['Product Help', 'Business Growth', 'Market Insights', 'Success Tips'];
  }

  // Get personalized product recommendations for customers
  async getProductRecommendations(userId, query = '', limit = 6) {
    try {
      let user = null;
      let baseQuery = { isActive: true };
      
      if (userId) {
        user = await User.findById(userId).populate('recentlyViewed.product');
      }
      
      // Build recommendation logic
      if (user && user.preferences?.favoriteCategories?.length > 0) {
        baseQuery.category = { $in: user.preferences.favoriteCategories };
      }
      
      if (user && user.preferences?.priceRange) {
        baseQuery.price = { 
          $gte: user.preferences.priceRange.min || 0,
          $lte: user.preferences.priceRange.max || 10000
        };
      }
      
      // If there's a specific query, add text search
      if (query) {
        baseQuery.$or = [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { category: { $regex: query, $options: 'i' } }
        ];
      }
      
      const products = await Product.find(baseQuery)
        .populate('artisan', 'name craftType location')
        .sort({ views: -1, createdAt: -1 })
        .limit(limit);
      
      return products;
    } catch (error) {
      console.error('Product Recommendations Error:', error);
      return [];
    }
  }

  // Generate business insights for artisans
  async generateBusinessInsights(artisanId) {
    try {
      const artisan = await Artisan.findById(artisanId);
      const products = await Product.find({ artisan: artisanId });
      
      if (!artisan || products.length === 0) {
        return {
          message: "Start by adding your first product to get personalized business insights!",
          insights: []
        };
      }
      
      const totalViews = products.reduce((sum, p) => sum + (p.views || 0), 0);
      const totalLikes = products.reduce((sum, p) => sum + (p.likes || 0), 0);
      const averagePrice = products.reduce((sum, p) => sum + p.price, 0) / products.length;
      const lowStockProducts = products.filter(p => p.stock < 5).length;
      
      const prompt = `Provide business insights for an artisan with these stats:
      - Craft Type: ${artisan.craftType}
      - Total Products: ${products.length}
      - Total Views: ${totalViews}
      - Total Likes: ${totalLikes}
      - Average Price: ₹${averagePrice.toFixed(2)}
      - Low Stock Items: ${lowStockProducts}
      - Location: ${artisan.location?.city || 'India'}
      
      Provide 3-4 specific, actionable business insights and recommendations for growth.
      Format as a friendly, encouraging message with concrete next steps.`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      return {
        message: response.text(),
        insights: [
          { label: 'Total Products', value: products.length },
          { label: 'Total Views', value: totalViews },
          { label: 'Average Price', value: `₹${averagePrice.toFixed(2)}` },
          { label: 'Engagement Rate', value: `${totalLikes}/${totalViews}` }
        ]
      };
    } catch (error) {
      console.error('Business Insights Error:', error);
      return {
        message: "I'm here to help you grow your business! Add some products to get detailed insights and recommendations.",
        insights: []
      };
    }
  }
}

module.exports = new AIAssistantService();
