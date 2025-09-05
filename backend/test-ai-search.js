const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000';

// Test data
const testQueries = [
  'blue pottery for gifts',
  'traditional jewelry under 2000',
  'handmade textiles from Gujarat',
  'wooden crafts for home decoration',
  'festival decoration items',
  'eco-friendly products'
];

/**
 * Test AI smart search endpoint
 */
async function testSmartSearch() {
  console.log('🔍 Testing AI Smart Search...\n');
  
  for (const query of testQueries) {
    try {
      console.log(`Testing query: "${query}"`);
      
      const response = await axios.post(`${BASE_URL}/api/ai/smart-search`, {
        query: query,
        userPreferences: {
          userType: 'customer',
          language: 'en'
        },
        page: 1,
        limit: 5,
        sortBy: 'relevance'
      });
      
      if (response.data.success) {
        console.log(`✅ Success - Found ${response.data.products.length} products`);
        console.log(`   AI Confidence: ${(response.data.parsedQuery.confidence * 100).toFixed(1)}%`);
        console.log(`   Intent: ${response.data.parsedQuery.intent}`);
        console.log(`   Category: ${response.data.parsedQuery.category || 'None detected'}`);
        console.log(`   Response Time: ${response.data.searchMetadata.responseTime}ms`);
        
        if (response.data.insights) {
          console.log(`   AI Insight: ${response.data.insights}`);
        }
      } else {
        console.log(`❌ Failed: ${response.data.message}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
}

/**
 * Test search suggestions endpoint
 */
async function testSearchSuggestions() {
  console.log('💡 Testing Search Suggestions...\n');
  
  const partialQueries = ['blue', 'traditional', 'handmade', 'wooden'];
  
  for (const partial of partialQueries) {
    try {
      console.log(`Testing partial query: "${partial}"`);
      
      const response = await axios.post(`${BASE_URL}/api/ai/search-suggestions`, {
        query: partial,
        limit: 4
      });
      
      if (response.data.success) {
        console.log(`✅ Generated ${response.data.suggestions.length} suggestions:`);
        response.data.suggestions.forEach((suggestion, index) => {
          console.log(`   ${index + 1}. ${suggestion}`);
        });
      } else {
        console.log(`❌ Failed: ${response.data.message}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }
}

/**
 * Test query analysis endpoint
 */
async function testQueryAnalysis() {
  console.log('🧠 Testing Query Analysis...\n');
  
  const analysisQuery = 'blue pottery for wedding gifts under 1500 rupees';
  
  try {
    console.log(`Analyzing query: "${analysisQuery}"`);
    
    const response = await axios.post(`${BASE_URL}/api/ai/analyze-query`, {
      query: analysisQuery,
      userPreferences: {
        userType: 'customer',
        language: 'en'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Analysis Results:');
      console.log('   Parsed Query:', JSON.stringify(response.data.parsedQuery, null, 2));
      console.log('   Analysis:', JSON.stringify(response.data.analysis, null, 2));
    } else {
      console.log(`❌ Failed: ${response.data.message}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }
  
  console.log('');
}

/**
 * Test search analytics endpoint
 */
async function testSearchAnalytics() {
  console.log('📊 Testing Search Analytics...\n');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/ai/search-analytics?timeRange=7`);
    
    if (response.data.success) {
      console.log('✅ Analytics Retrieved:');
      console.log('   Summary:', JSON.stringify(response.data.analytics?.summary || {}, null, 2));
      
      if (response.data.analytics?.topQueries?.length > 0) {
        console.log('   Top Queries:');
        response.data.analytics.topQueries.slice(0, 3).forEach((query, index) => {
          console.log(`     ${index + 1}. "${query.query}" (${query.count} searches)`);
        });
      }
      
      if (response.data.recommendations?.length > 0) {
        console.log('   Recommendations:');
        response.data.recommendations.forEach((rec, index) => {
          console.log(`     ${index + 1}. [${rec.priority}] ${rec.message}`);
        });
      }
    } else {
      console.log(`❌ Failed: ${response.data.message}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
  }
  
  console.log('');
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting AI Search Implementation Tests\n');
  console.log('Make sure your backend server is running on port 5000\n');
  console.log('=' * 50);
  
  try {
    // Test server health first
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Server is running\n');
  } catch (error) {
    console.log('❌ Server is not running. Please start the backend server first.');
    console.log('Run: npm run dev (from the backend directory)\n');
    return;
  }
  
  await testSmartSearch();
  await testSearchSuggestions();
  await testQueryAnalysis();
  await testSearchAnalytics();
  
  console.log('🎉 AI Search Implementation Tests Completed!');
  console.log('\nNext Steps:');
  console.log('1. Add your AI API keys to the .env file');
  console.log('2. Test the frontend AI Search page');
  console.log('3. Monitor search analytics for performance');
  console.log('4. Customize prompts based on your needs');
}

// Check if API keys are configured
function checkConfiguration() {
  console.log('🔧 Checking Configuration...\n');
  
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_')) {
    console.log('⚠️  Warning: GEMINI_API_KEY not configured in .env file');
  } else {
    console.log('✅ Gemini API key configured');
  }
  
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your_')) {
    console.log('⚠️  Warning: OPENAI_API_KEY not configured in .env file');
  } else {
    console.log('✅ OpenAI API key configured');
  }
  
  console.log('');
}

// Run the tests
if (require.main === module) {
  checkConfiguration();
  runTests().catch(error => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  testSmartSearch,
  testSearchSuggestions,
  testQueryAnalysis,
  testSearchAnalytics
};
