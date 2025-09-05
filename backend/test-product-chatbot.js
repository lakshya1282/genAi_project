const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/product-chatbot';

async function testProductChatbot() {
  console.log('🤖 Testing OpenAI-Powered Product Chatbot...\n');

  // Generate a session ID for testing
  const sessionId = `test-session-${Date.now()}`;
  
  const testQueries = [
    {
      message: 'Hello! I\'m looking for some traditional jewelry',
      description: 'Greeting and jewelry search'
    },
    {
      message: 'Show me pottery items under 500 rupees',
      description: 'Price-filtered pottery search'
    },
    {
      message: 'I need a wedding gift for my sister',
      description: 'Gift intent with context'
    },
    {
      message: 'What\'s the difference between handmade and machine-made pottery?',
      description: 'Informational query'
    },
    {
      message: 'Can you show me textiles from Rajasthan?',
      description: 'Location-specific search'
    }
  ];

  console.log(`🔑 Using session ID: ${sessionId}\n`);

  for (let i = 0; i < testQueries.length; i++) {
    const { message, description } = testQueries[i];
    console.log(`${i + 1}. ${description}`);
    console.log(`   📝 Query: "${message}"`);
    
    try {
      const response = await axios.post(`${BASE_URL}/chat`, {
        message: message,
        sessionId: sessionId,
        userContext: {
          isAuthenticated: false,
          preferences: {}
        }
      });
      
      if (response.data.success) {
        console.log(`   ✅ Success!`);
        console.log(`   💬 Response: ${response.data.message}`);
        console.log(`   🔍 Search performed: ${response.data.searchPerformed}`);
        console.log(`   📦 Products found: ${response.data.products.length}`);
        
        if (response.data.products.length > 0) {
          console.log(`   🏷️  Sample products: ${response.data.products.slice(0, 3).map(p => p.name).join(', ')}`);
        }
        
        if (response.data.suggestions && response.data.suggestions.length > 0) {
          console.log(`   💡 Suggestions: ${response.data.suggestions.join(', ')}`);
        }
        
        console.log(`   🎯 User intent: ${response.data.userIntent}`);
        
      } else {
        console.log(`   ❌ Failed: ${response.data.message}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.response?.data?.message || error.message}`);
      if (error.response?.data?.error) {
        console.log(`   📝 Details: ${error.response.data.error}`);
      }
    }
    
    console.log(''); // Empty line for readability
    
    // Add delay between requests to be respectful to OpenAI API
    if (i < testQueries.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Test conversation history
  console.log('📜 Testing Conversation History...');
  try {
    const historyResponse = await axios.get(`${BASE_URL}/history/${sessionId}`);
    if (historyResponse.data.success) {
      console.log('   ✅ History retrieved successfully');
      console.log(`   📊 Conversation length: ${historyResponse.data.history.length} messages`);
      console.log(`   🔍 Search history: ${historyResponse.data.searchHistory.join(', ')}`);
      console.log(`   🎯 Final intent: ${historyResponse.data.userIntent}`);
      console.log(`   📂 Last category: ${historyResponse.data.lastCategory || 'None'}`);
    }
  } catch (error) {
    console.log(`   ❌ History Error: ${error.response?.data?.message || error.message}`);
  }

  console.log('');

  // Test trending endpoint
  console.log('🔥 Testing Trending Products Endpoint...');
  try {
    const trendingResponse = await axios.get(`${BASE_URL}/trending?limit=3`);
    if (trendingResponse.data.success) {
      console.log('   ✅ Trending products loaded successfully');
      console.log(`   📦 Products: ${trendingResponse.data.trending.length}`);
      console.log(`   📂 Categories available: ${trendingResponse.data.categories.slice(0, 5).join(', ')}`);
      console.log(`   💡 Default suggestions: ${trendingResponse.data.suggestions.join(', ')}`);
    }
  } catch (error) {
    console.log(`   ❌ Trending Error: ${error.response?.data?.message || error.message}`);
  }

  console.log('');

  // Test clearing conversation
  console.log('🧹 Testing Clear Conversation...');
  try {
    const clearResponse = await axios.delete(`${BASE_URL}/clear/${sessionId}`);
    if (clearResponse.data.success) {
      console.log('   ✅ Conversation cleared successfully');
      console.log(`   📝 ${clearResponse.data.message}`);
    }
  } catch (error) {
    console.log(`   ❌ Clear Error: ${error.response?.data?.message || error.message}`);
  }

  console.log('\n🎉 Product Chatbot testing completed!');
  console.log('\n📋 Summary:');
  console.log('   • Conversational AI powered by OpenAI GPT-4');
  console.log('   • Context-aware product search with intent detection');
  console.log('   • Session-based conversation history');
  console.log('   • Dynamic suggestions based on user interaction');
  console.log('   • Cultural sensitivity for Indian handcrafted products');
}

// Test health endpoint first
async function testHealth() {
  try {
    console.log('🏥 Testing API Health...');
    // Test basic API health (assuming there's a general health endpoint)
    const response = await axios.get('http://localhost:5000/api/health');
    console.log('✅ API is healthy:', response.data.message);
    console.log('');
    return true;
  } catch (error) {
    // If no health endpoint, just test if server is running
    try {
      await axios.get('http://localhost:5000');
      console.log('✅ Server is running');
      console.log('');
      return true;
    } catch (serverError) {
      console.log('❌ Server Health Error:', error.message);
      return false;
    }
  }
}

async function runTests() {
  console.log('🚀 Starting OpenAI Product Chatbot Tests\n');
  console.log('⚡ Make sure your server is running with: npm start or node server.js');
  console.log('🔑 Make sure OPENAI_API_KEY is set in your environment\n');
  
  const isHealthy = await testHealth();
  if (isHealthy) {
    await testProductChatbot();
  } else {
    console.log('❌ Cannot run tests - Server is not accessible');
    console.log('💡 Make sure to start your backend server first!');
  }
}

// Add delay to ensure server is ready
setTimeout(runTests, 1000);
