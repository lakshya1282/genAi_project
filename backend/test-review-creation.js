const axios = require('axios');

async function testReviewCreation() {
  try {
    console.log('🧪 Testing review creation functionality...');
    
    // First, let's try to create a review without authentication to see the auth error
    console.log('\n1. Testing without authentication...');
    try {
      const response = await axios.post('http://localhost:5000/api/reviews', {
        productId: 'test-product-id',
        rating: 5,
        comment: 'Great product!'
      });
      console.log('✅ Unexpected success:', response.data);
    } catch (error) {
      console.log('❌ Expected auth error:', error.response?.data || error.message);
    }

    // Test the health endpoint to ensure server is responsive
    console.log('\n2. Testing server health...');
    const healthResponse = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Health check:', healthResponse.data);

    // Test auth endpoint if it exists (check if we can create a user or login)
    console.log('\n3. Checking available endpoints...');
    try {
      const usersResponse = await axios.get('http://localhost:5000/api/users');
      console.log('✅ Users endpoint accessible');
    } catch (error) {
      console.log('❌ Users endpoint error:', error.response?.status, error.response?.data || error.message);
    }

    console.log('\n🔍 Review creation test completed. Check the logs above for issues.');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testReviewCreation();
