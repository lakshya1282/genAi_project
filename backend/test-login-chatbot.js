const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testLoginChatbot() {
  console.log('🔍 Testing Login Chatbot Product Search...\n');

  const testQueries = [
    'Show me traditional jewelry',
    'Find pottery items for home decor',
    'Handwoven textiles for gifts under 1000 rupees',
    'Beautiful wooden crafts',
    'Festival decoration items'
  ];

  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    console.log(`${i + 1}. Testing query: "${query}"`);
    
    try {
      const response = await axios.post(`${BASE_URL}/login-chatbot/search`, {
        query: query,
        limit: 4
      });
      
      if (response.data.success) {
        console.log(`   ✅ Success: ${response.data.products.length} products found`);
        console.log(`   📝 Message: ${response.data.message}`);
        console.log(`   🔧 Search Mode: ${response.data.searchMode}`);
        if (response.data.suggestions && response.data.suggestions.length > 0) {
          console.log(`   💡 Suggestions: ${response.data.suggestions.join(', ')}`);
        }
      } else {
        console.log(`   ❌ Failed: ${response.data.message}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.response?.data?.message || error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }

  // Test popular searches endpoint
  console.log('📊 Testing Popular Searches Endpoint...');
  try {
    const popularResponse = await axios.get(`${BASE_URL}/login-chatbot/popular-searches`);
    if (popularResponse.data.success) {
      console.log('   ✅ Popular searches loaded successfully');
      console.log(`   🔥 Searches: ${popularResponse.data.popularSearches.join(', ')}`);
      console.log(`   📂 Categories: ${popularResponse.data.categories.join(', ')}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.response?.data?.message || error.message}`);
  }

  console.log('\n🎉 Login Chatbot testing completed!');
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
    await testLoginChatbot();
  } else {
    console.log('❌ Cannot run tests - API is not healthy');
  }
}

// Add delay to ensure server is ready
setTimeout(runTests, 1000);
