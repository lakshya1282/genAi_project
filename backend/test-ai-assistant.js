const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test data
const testCustomer = {
  userId: "507f1f77bcf86cd799439011", // Sample MongoDB ObjectId
  userType: "User",
  message: "I'm looking for a beautiful handmade gift for my mother's birthday. She loves traditional jewelry."
};

const testArtisan = {
  userId: "507f1f77bcf86cd799439012", // Sample MongoDB ObjectId  
  userType: "Artisan",
  message: "How can I improve my product descriptions to attract more customers?"
};

async function testCustomerAssistant() {
  console.log('🛍️ Testing Customer AI Assistant...');
  try {
    const response = await axios.post(`${BASE_URL}/ai-assistant/customer/chat`, testCustomer);
    
    if (response.data.success) {
      console.log('✅ Customer Assistant Response:');
      console.log('📝 Message:', response.data.message);
      console.log('💡 Suggestions:', response.data.suggestions);
      console.log('🎯 Recommendations count:', response.data.recommendations?.length || 0);
    } else {
      console.log('❌ Customer Assistant failed:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Customer Assistant Error:', error.response?.data?.message || error.message);
  }
  console.log();
}

async function testArtisanAssistant() {
  console.log('🎨 Testing Artisan AI Assistant...');
  try {
    const response = await axios.post(`${BASE_URL}/ai-assistant/artisan/chat`, testArtisan);
    
    if (response.data.success) {
      console.log('✅ Artisan Assistant Response:');
      console.log('📝 Message:', response.data.message);
      console.log('💡 Suggestions:', response.data.suggestions);
      console.log('📊 Insights:', response.data.insights ? 'Available' : 'Not provided');
    } else {
      console.log('❌ Artisan Assistant failed:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Artisan Assistant Error:', error.response?.data?.message || error.message);
  }
  console.log();
}

async function testHealthCheck() {
  console.log('🏥 Testing API Health...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ API Health:', response.data.message);
  } catch (error) {
    console.log('❌ API Health Error:', error.message);
  }
  console.log();
}

async function runTests() {
  console.log('🚀 Starting AI Assistant API Tests...\n');
  
  await testHealthCheck();
  await testCustomerAssistant();
  await testArtisanAssistant();
  
  console.log('🏁 Tests completed!');
}

runTests();
