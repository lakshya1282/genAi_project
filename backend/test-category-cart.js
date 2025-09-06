const axios = require('axios');

async function testCategoryCartFlow() {
  try {
    console.log('🛒 Testing category page add to cart functionality...');
    
    const baseURL = 'http://localhost:5000/api';
    let token;
    
    // Step 1: Login as a customer
    console.log('1️⃣ Logging in as customer...');
    try {
      const loginResponse = await axios.post(`${baseURL}/users/login`, {
        email: 'testuser@example.com',
        password: 'testpassword123'
      });
      console.log('✅ Login successful');
      token = loginResponse.data.token;
    } catch (error) {
      console.log('❌ Login failed, testing without authentication');
      return;
    }
    
    // Step 2: Test add to cart with sample product IDs
    const sampleProductIds = ['sample1', 'sample2', 'sample3', 'sample4', 'sample5'];
    
    for (const productId of sampleProductIds) {
      console.log(`\n🛍️ Testing add to cart for ${productId}...`);
      
      try {
        // Test the new cart endpoint
        const addResponse = await axios.post(`${baseURL}/cart/items`, {
          variantId: productId,
          qty: 1
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (addResponse.data.success) {
          console.log(`✅ ${productId} added to cart successfully`);
        } else {
          console.log(`⚠️ ${productId} add failed: ${addResponse.data.message}`);
        }
      } catch (error) {
        console.log(`❌ ${productId} add error:`, error.response?.data?.message || error.message);
        
        // Try legacy endpoint
        try {
          const legacyResponse = await axios.post(`${baseURL}/cart/add`, {
            productId: productId,
            quantity: 1
          }, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (legacyResponse.data.success) {
            console.log(`✅ ${productId} added via legacy endpoint`);
          } else {
            console.log(`⚠️ ${productId} legacy add failed: ${legacyResponse.data.message}`);
          }
        } catch (legacyError) {
          console.log(`❌ ${productId} legacy endpoint also failed:`, legacyError.response?.data?.message || legacyError.message);
        }
      }
    }
    
    // Step 3: Check cart contents
    console.log('\n🛒 Checking cart contents...');
    try {
      const cartResponse = await axios.get(`${baseURL}/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (cartResponse.data.success) {
        const cart = cartResponse.data.cart;
        console.log(`📦 Cart has ${cart.itemCount || 0} items`);
        console.log('📋 Cart items:', cart.items?.length || 0);
      } else {
        console.log('❌ Failed to get cart:', cartResponse.data.message);
      }
    } catch (error) {
      console.log('❌ Cart fetch error:', error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testCategoryCartFlow();
