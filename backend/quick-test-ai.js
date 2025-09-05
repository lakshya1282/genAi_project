const axios = require('axios');

async function quickTest() {
  try {
    console.log('Testing AI Assistant API...');
    
    // Test health endpoint first
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Health check:', healthResponse.data.message);
    
    // Test customer assistant
    console.log('\n2. Testing customer assistant...');
    const customerResponse = await axios.post('http://localhost:5000/api/ai-assistant/customer/chat', {
      userId: "507f1f77bcf86cd799439011",
      userType: "User",
      message: "Hello, I need help finding a gift"
    });
    console.log('✅ Customer response:', customerResponse.data.success ? 'SUCCESS' : 'FAILED');
    if (customerResponse.data.message) {
      console.log('📝 Message:', customerResponse.data.message.substring(0, 100) + '...');
    }
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data.message || error.response.data);
    } else if (error.request) {
      console.error('❌ Network Error: Could not connect to server');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

quickTest();
