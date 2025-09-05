const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testEnhancedChatbot() {
  console.log('🤖 Testing Enhanced Product Chatbot with NLP...\n');

  const sessionId = `test-session-${Date.now()}`;
  const userContext = {
    isAuthenticated: false,
    userId: null,
    userType: null,
    preferences: {}
  };

  const conversationFlow = [
    {
      message: "Hi there! I'm looking for something special",
      description: "General greeting and intent"
    },
    {
      message: "I need a wedding gift for my sister",
      description: "Specific gift intent with occasion"
    },
    {
      message: "She loves jewelry, but I have a budget of ₹2000",
      description: "Category preference with budget constraint"
    },
    {
      message: "What about traditional pottery for home decoration?",
      description: "Change in category and intent"
    },
    {
      message: "Tell me more about Indian pottery traditions",
      description: "Information seeking intent"
    },
    {
      message: "Show me some pottery under ₹1500",
      description: "Specific search with price filter"
    }
  ];

  console.log(`🔗 Session ID: ${sessionId}\n`);

  for (let i = 0; i < conversationFlow.length; i++) {
    const { message, description } = conversationFlow[i];
    console.log(`${i + 1}. ${description}`);
    console.log(`👤 User: "${message}"`);
    
    try {
      const response = await axios.post(`${BASE_URL}/product-chatbot/chat`, {
        message,
        sessionId,
        userContext
      });
      
      if (response.data.success) {
        console.log(`🤖 Assistant: ${response.data.message}`);
        console.log(`📊 Products found: ${response.data.products?.length || 0}`);
        console.log(`🔍 Search performed: ${response.data.searchPerformed}`);
        console.log(`🎯 Intent detected: ${response.data.userIntent}`);
        
        if (response.data.suggestions && response.data.suggestions.length > 0) {
          console.log(`💡 Suggestions: ${response.data.suggestions.join(' | ')}`);
        }
        
        if (response.data.products && response.data.products.length > 0) {
          console.log(`📦 Sample products: ${response.data.products.slice(0, 2).map(p => p.name).join(', ')}`);
        }
        
      } else {
        console.log(`❌ Failed: ${response.data.message}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
    }
    
    console.log(''); // Empty line for readability
    
    // Add delay between messages to simulate real conversation
    if (i < conversationFlow.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Test conversation history
  console.log('📚 Testing Conversation History...');
  try {
    const historyResponse = await axios.get(`${BASE_URL}/product-chatbot/history/${sessionId}`);
    if (historyResponse.data.success) {
      console.log(`✅ History retrieved: ${historyResponse.data.history.length} messages`);
      console.log(`🔍 Search history: ${historyResponse.data.searchHistory?.join(', ') || 'None'}`);
      console.log(`🎯 Final intent: ${historyResponse.data.userIntent}`);
    }
  } catch (error) {
    console.log(`❌ History error: ${error.response?.data?.message || error.message}`);
  }
  
  console.log('\n📈 Testing Trending Products...');
  try {
    const trendingResponse = await axios.get(`${BASE_URL}/product-chatbot/trending?limit=3`);
    if (trendingResponse.data.success) {
      console.log(`✅ Trending products: ${trendingResponse.data.trending.length}`);
      console.log(`📂 Available categories: ${trendingResponse.data.categories.join(', ')}`);
    }
  } catch (error) {
    console.log(`❌ Trending error: ${error.response?.data?.message || error.message}`);
  }

  console.log('\n🎉 Enhanced Chatbot testing completed!');
}

// Test health endpoint first
async function testHealth() {
  try {
    console.log('🏥 Testing API Health...');
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ API is healthy:', response.data.message);
    console.log('');
    return true;
  } catch (error) {
    console.log('❌ API Health Error:', error.message);
    return false;
  }
}

async function runTests() {
  const isHealthy = await testHealth();
  if (isHealthy) {
    await testEnhancedChatbot();
  } else {
    console.log('❌ Cannot run tests - API is not healthy');
  }
}

// Add delay to ensure server is ready
setTimeout(runTests, 1000);
