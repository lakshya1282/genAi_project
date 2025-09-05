# OpenAI-Powered Product Chatbot

The product chatbot has been successfully upgraded from Gemini AI to **OpenAI GPT-4** for enhanced natural language understanding and better conversational experiences.

## Features

### 🤖 **Advanced AI Conversation**
- Powered by OpenAI's GPT-4 model
- Context-aware conversations with memory
- Cultural sensitivity for Indian handcrafted products
- Intent detection (browse, gift, specific, help, compare)

### 🔍 **Smart Product Search**
- Natural language query processing
- Keyword extraction and search parameter generation
- Price range filtering based on user input
- Category-specific searches
- Intent-based result ranking

### 💭 **Conversation Context**
- Session-based conversation history
- User preference tracking
- Search history maintenance
- Dynamic suggestion generation

## API Endpoints

### Chat Endpoint
```
POST /api/product-chatbot/chat
```

**Request Body:**
```json
{
  "message": "Show me traditional jewelry under 1000 rupees",
  "sessionId": "unique-session-id",
  "userContext": {
    "isAuthenticated": false,
    "preferences": {}
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "I'd be happy to help you find beautiful traditional jewelry! Here are some exquisite pieces under ₹1000...",
  "products": [...],
  "suggestions": [
    "Show me silver jewelry",
    "Find handmade earrings",
    "Traditional necklace sets",
    "Jewelry gift sets"
  ],
  "searchPerformed": true,
  "userIntent": "browse",
  "metadata": {
    "sessionId": "unique-session-id",
    "conversationLength": 2,
    "searchCount": 1
  }
}
```

### Other Endpoints

- `GET /api/product-chatbot/history/:sessionId` - Get conversation history
- `DELETE /api/product-chatbot/clear/:sessionId` - Clear conversation
- `GET /api/product-chatbot/trending` - Get trending products and categories

## Setup

### 1. Environment Variable
Add your OpenAI API key to your `.env` file:
```
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 2. Dependencies
The chatbot uses the official OpenAI Node.js library:
```bash
npm install openai
```

### 3. Model Configuration
Currently configured to use:
- **Model:** `gpt-4`
- **Max Tokens:** 1000
- **Temperature:** 0.7 (balanced creativity)

## Testing

Run the comprehensive test suite:
```bash
node test-product-chatbot.js
```

The test includes:
- ✅ Conversational AI responses
- ✅ Product search functionality
- ✅ Context and session management
- ✅ Intent detection
- ✅ Suggestion generation
- ✅ Error handling

## Example Conversations

### Product Search
**User:** "I'm looking for pottery items for my kitchen"
**AI:** "I'd love to help you find beautiful pottery for your kitchen! Let me show you some handcrafted ceramic pieces perfect for cooking and serving..."

### Gift Assistance  
**User:** "I need a wedding gift under 2000 rupees"
**AI:** "How wonderful! Wedding gifts are special. Let me suggest some beautiful handcrafted items that would make perfect wedding presents..."

### Information Queries
**User:** "Tell me about different types of Indian pottery"
**AI:** "Indian pottery has a rich tradition spanning thousands of years! There are several distinctive styles like Blue Pottery from Jaipur, Terracotta from Bengal..."

## Key Improvements over Gemini

1. **Better Context Understanding:** GPT-4 maintains conversation context more effectively
2. **Cultural Sensitivity:** Enhanced knowledge of Indian crafts and traditions
3. **Response Quality:** More natural, helpful, and engaging responses
4. **Intent Detection:** Better understanding of user needs and shopping intent
5. **Error Handling:** Robust fallback mechanisms and error recovery

## Error Handling

The chatbot includes multiple levels of error handling:

1. **OpenAI API Errors:** Graceful fallback with informative messages
2. **Network Issues:** Timeout handling and retry logic
3. **Invalid Responses:** JSON parsing error recovery
4. **Fallback Mode:** Default responses when AI is unavailable

## Performance Considerations

- **Rate Limiting:** Built-in delays for API calls
- **Token Management:** Optimized prompts to stay within limits
- **Caching:** Conversation context stored in memory (Redis recommended for production)
- **Cleanup:** Automatic session cleanup after 1 hour

## Future Enhancements

- [ ] Add product image analysis capabilities
- [ ] Implement voice conversation support
- [ ] Add multi-language support
- [ ] Integrate with recommendation engine
- [ ] Add purchase intent prediction

## Support

For issues or questions about the OpenAI chatbot integration, please check:

1. OpenAI API key is valid and has sufficient credits
2. Server environment variables are properly set
3. Network connectivity to OpenAI services
4. Database connection for product searches
