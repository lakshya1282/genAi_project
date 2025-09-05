# AI Model Implementation Guide

This guide explains how to implement and configure AI models for the enhanced search functionality in your Artisan Marketplace application.

## 🤖 AI Models Used

### 1. **Google Gemini AI (Primary)**
- **Purpose**: Natural Language Processing, Query Parsing, Content Generation
- **Model**: `gemini-pro`
- **Use Cases**:
  - Parse natural language search queries
  - Generate search suggestions
  - Create product descriptions
  - Generate marketing content
  - Provide search insights

### 2. **OpenAI (Secondary)**
- **Purpose**: Vector Embeddings, Semantic Search
- **Model**: `text-embedding-ada-002`
- **Use Cases**:
  - Generate vector embeddings for products and queries
  - Semantic similarity matching
  - Advanced product ranking

## 🔧 Setup Instructions

### Step 1: Install Dependencies
The required packages are already in your `package.json`:
```bash
cd backend
npm install @google/generative-ai openai
```

### Step 2: Configure Environment Variables
Update your `.env` file with the following API keys:

```env
# AI Model Configuration
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# AI Search Configuration
AI_SEARCH_CACHE_TTL=3600
AI_SEARCH_MAX_RESULTS=100
AI_CONFIDENCE_THRESHOLD=0.5
```

### Step 3: Get API Keys

#### Google Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key and add it to your `.env` file

#### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Create a new API key
4. Copy the key and add it to your `.env` file

## 🚀 AI Search Features Implemented

### 1. **Natural Language Query Processing**
- Converts queries like "blue pottery for gifts" into structured search parameters
- Extracts intent, category, price range, colors, occasions, etc.
- Provides confidence scores for AI parsing accuracy

### 2. **Smart Search Suggestions**
- Generates contextual search suggestions as users type
- Uses AI to create relevant, complete search queries
- Caches suggestions for performance

### 3. **Semantic Product Search**
- Uses vector embeddings to find semantically similar products
- Improves search relevance beyond keyword matching
- Handles typos and synonyms better

### 4. **Search Analytics & Learning**
- Tracks all search queries and results
- Monitors AI performance and user behavior
- Provides insights for system improvement
- Identifies poorly performing queries

## 📊 API Endpoints Created

### AI Search Endpoints
- `POST /api/ai/smart-search` - Intelligent search with natural language queries
- `POST /api/ai/search-suggestions` - Generate search suggestions
- `POST /api/ai/analyze-query` - Analyze and debug search queries
- `GET /api/ai/search-analytics` - Get search performance analytics

### Example Usage

#### Smart Search
```javascript
POST /api/ai/smart-search
{
  "query": "blue pottery for Diwali decoration under 1000",
  "userPreferences": {
    "userType": "customer",
    "language": "en"
  },
  "page": 1,
  "limit": 12,
  "sortBy": "relevance"
}
```

#### Search Suggestions
```javascript
POST /api/ai/search-suggestions
{
  "query": "traditional jew",
  "limit": 6
}
```

## 🎯 Frontend Integration

The frontend AI Search component automatically uses these endpoints:

### Usage Examples
- **Natural Language**: "Find pottery perfect for Diwali decoration"
- **Price Queries**: "Show me blue textiles under ₹1000"
- **Occasion-based**: "Traditional jewelry for wedding gifts"
- **Location-based**: "Handcrafted items from Rajasthan"

### Search Modes
1. **🤖 AI Search**: Natural language processing with smart suggestions
2. **📋 Standard Search**: Traditional filters and keyword search

## ⚙️ Configuration Options

### Environment Variables
```env
# Cache settings
AI_SEARCH_CACHE_TTL=3600          # Cache time-to-live in seconds
AI_SEARCH_MAX_RESULTS=100         # Maximum results per search
AI_CONFIDENCE_THRESHOLD=0.5       # Minimum confidence for AI parsing

# Model settings
GEMINI_MODEL=gemini-pro           # Google Gemini model version
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002  # OpenAI embedding model
```

## 🔍 Monitoring & Analytics

### Search Performance Metrics
- **Success Rate**: Percentage of searches returning results
- **AI Confidence**: Average confidence of AI query parsing
- **Response Time**: Average search processing time
- **User Engagement**: Click-through rates and conversions

### Analytics Dashboard
Access search analytics at: `GET /api/ai/search-analytics?timeRange=7`

## 🛠️ Customization Options

### 1. **Adjust AI Prompts**
Edit the prompts in `services/aiSearchService.js` to:
- Change query parsing behavior
- Modify suggestion generation style
- Customize insight generation

### 2. **Modify Search Scoring**
Update the ranking algorithm in `rankProductsByRelevance()` to:
- Adjust keyword weighting
- Change popularity factors
- Add custom scoring criteria

### 3. **Extend Categories**
Add new product categories to the fallback parsing in `aiSearchService.js`:
```javascript
const categories = ['pottery', 'jewelry', 'textile', 'wood', 'metal', 'painting', 'sculpture'];
```

## 🚨 Troubleshooting

### Common Issues

1. **AI API Keys Not Working**
   - Verify keys are correctly set in `.env`
   - Check API quota and billing settings
   - Ensure environment variables are loaded

2. **Slow Search Performance**
   - Monitor response times in analytics
   - Consider increasing cache TTL
   - Optimize database queries

3. **Poor Search Results**
   - Check AI confidence scores
   - Review poorly performing queries in analytics
   - Improve product descriptions and tags

### Fallback Behavior
- If AI APIs fail, the system gracefully falls back to:
  - Template-based query parsing
  - Keyword-only search
  - Static suggestions
  - Basic relevance scoring

## 📈 Performance Optimization

### Caching Strategy
- **Query Cache**: Frequently used queries and suggestions
- **Embedding Cache**: Vector embeddings for products and queries
- **Analytics Cache**: Recent analytics data

### Database Optimization
- Index products by category, price, tags
- Use text search indexes for keywords
- Consider MongoDB Atlas Search for advanced features

## 🔮 Future Enhancements

### Planned Improvements
1. **Personalized Search**: Use user history and preferences
2. **Visual Search**: Image-based product search
3. **Voice Search**: Speech-to-text integration
4. **Real-time Learning**: Continuous model improvement
5. **Multi-language Support**: Enhanced non-English search

### Advanced Features
- **Product Recommendations**: AI-powered similar products
- **Trend Analysis**: Market trend predictions
- **Dynamic Pricing**: AI-suggested optimal pricing
- **Inventory Optimization**: Demand prediction

## 💡 Best Practices

1. **Monitor API Usage**: Track API calls to avoid quota limits
2. **Cache Intelligently**: Cache frequently accessed data
3. **Handle Errors Gracefully**: Always provide fallback options
4. **Log Everything**: Comprehensive logging for debugging
5. **User Privacy**: Respect user data and privacy regulations

## 🧪 Testing

### Test Queries to Validate Implementation
```javascript
// Test these queries after setup:
"blue pottery for gifts"
"traditional jewelry under 2000"
"handmade textiles from Gujarat"
"wooden crafts for home decoration"
"festival decoration items"
"eco-friendly products"
```

### API Testing
Use tools like Postman or curl to test endpoints:
```bash
curl -X POST http://localhost:5000/api/ai/smart-search \
  -H "Content-Type: application/json" \
  -d '{"query": "blue pottery for gifts"}'
```

## 📞 Support

For issues or questions about the AI implementation:
1. Check the troubleshooting section above
2. Review server logs for error details
3. Monitor the search analytics dashboard
4. Adjust configuration based on usage patterns

---

**Note**: This AI implementation provides both powerful search capabilities and comprehensive fallback mechanisms to ensure your marketplace works reliably even when AI services are unavailable.
