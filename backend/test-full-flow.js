const axios = require('axios');

async function testFullFlow() {
  try {
    console.log('🔄 Testing full authentication and review flow...\n');
    
    const baseURL = 'http://localhost:5000/api';
    
    // Step 1: Register a test user
    console.log('1️⃣ Registering test user...');
    let token;
    try {
      const registerResponse = await axios.post(`${baseURL}/users/register`, {
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'testpassword123',
        phone: '1234567890'
      });
      console.log('✅ User registered successfully');
      token = registerResponse.data.token;
    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        console.log('⚠️ User already exists, trying to login...');
        
        // Step 2: Login with existing user
        const loginResponse = await axios.post(`${baseURL}/users/login`, {
          email: 'testuser@example.com',
          password: 'testpassword123'
        });
        console.log('✅ Login successful');
        token = loginResponse.data.token;
      } else {
        throw error;
      }
    }
    
    console.log('🎟️ Token received:', token ? 'Yes' : 'No');
    
    // Step 3: Test authenticated request
    console.log('\\n2️⃣ Testing authenticated profile request...');
    const profileResponse = await axios.get(`${baseURL}/users/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Profile retrieved:', profileResponse.data.user.name);
    
    // Step 4: Create a review
    console.log('\\n3️⃣ Creating review...');
    const reviewResponse = await axios.post(`${baseURL}/reviews`, {
      productId: '68b9e59fe2695ca11c71b3df', // Use a valid-looking ObjectId
      rating: 5,
      comment: 'This is a test review from the automated test script!'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Review created successfully!');
    console.log('📝 Review details:', {
      id: reviewResponse.data.review._id,
      rating: reviewResponse.data.review.rating,
      comment: reviewResponse.data.review.comment
    });
    
    // Step 5: Retrieve the reviews for this product
    console.log('\\n4️⃣ Retrieving product reviews...');
    const productReviewsResponse = await axios.get(`${baseURL}/reviews/product/68b9e59fe2695ca11c71b3df`);
    console.log('✅ Product reviews retrieved:', productReviewsResponse.data.reviews.length, 'reviews found');
    
    console.log('\\n🎉 All tests passed! The review system is working correctly.');
    
  } catch (error) {
    console.error('💥 Test failed at step:', error.message);
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📋 Response data:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('🔍 Full error:', error);
  }
}

testFullFlow();
