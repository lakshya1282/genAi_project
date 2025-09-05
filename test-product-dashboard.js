const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_ARTISAN = {
  email: 'test.artisan@example.com',
  password: 'password123',
  name: 'Test Artisan',
  craftType: 'Pottery',
  location: 'Test City',
  description: 'A test artisan for product management testing'
};

let artisanToken = null;

async function testProductDashboard() {
  console.log('🧪 Testing Product Dashboard Functionality\n');

  try {
    // Step 1: Register/Login artisan
    console.log('1. Registering/Logging in test artisan...');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/api/artisans/register`, TEST_ARTISAN);
      artisanToken = registerResponse.data.token;
      console.log('✅ Artisan registered successfully');
    } catch (registerError) {
      if (registerError.response?.status === 400) {
        // Artisan might already exist, try login
        const loginResponse = await axios.post(`${BASE_URL}/api/artisans/login`, {
          email: TEST_ARTISAN.email,
          password: TEST_ARTISAN.password
        });
        artisanToken = loginResponse.data.token;
        console.log('✅ Artisan logged in successfully');
      } else {
        throw registerError;
      }
    }

    // Step 2: Test product creation
    console.log('\n2. Testing product creation...');
    const productData = {
      name: 'Test Handmade Vase',
      description: 'A beautiful handcrafted ceramic vase with intricate patterns',
      price: 299.99,
      category: 'Pottery',
      materials: 'Clay, Ceramic Glaze, Natural Pigments',
      craftingTime: '1 week',
      stock: 5,
      lowStockThreshold: 2,
      isCustomizable: true,
      customizationOptions: 'Size, Color, Pattern',
      tags: 'handmade, ceramic, decorative, home-decor',
      dimensions: JSON.stringify({
        length: 15,
        width: 15,
        height: 25,
        weight: 800
      })
    };

    const createResponse = await axios.post(`${BASE_URL}/api/artisan/products`, productData, {
      headers: {
        'Authorization': `Bearer ${artisanToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (createResponse.data.success) {
      console.log('✅ Product created successfully');
      console.log(`   Product ID: ${createResponse.data.product._id}`);
      console.log(`   Product Name: ${createResponse.data.product.name}`);
    } else {
      throw new Error('Product creation failed');
    }

    // Step 3: Test fetching artisan's products
    console.log('\n3. Testing product listing...');
    const productsResponse = await axios.get(`${BASE_URL}/api/artisan/products`, {
      headers: {
        'Authorization': `Bearer ${artisanToken}`
      }
    });

    if (productsResponse.data.success) {
      console.log('✅ Products fetched successfully');
      console.log(`   Total products: ${productsResponse.data.products.length}`);
      productsResponse.data.products.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} - ₹${product.price} (Stock: ${product.stock})`);
      });
    }

    // Step 4: Test dashboard summary
    console.log('\n4. Testing dashboard summary...');
    const summaryResponse = await axios.get(`${BASE_URL}/api/artisan/products/dashboard/summary`, {
      headers: {
        'Authorization': `Bearer ${artisanToken}`
      }
    });

    if (summaryResponse.data.success) {
      console.log('✅ Dashboard summary fetched successfully');
      const stats = summaryResponse.data.summary.productStats;
      console.log(`   Total Products: ${stats.totalProducts}`);
      console.log(`   Active Products: ${stats.activeProducts}`);
      console.log(`   Total Inventory Value: ₹${stats.totalInventoryValue}`);
      console.log(`   Average Price: ₹${stats.avgPrice}`);
    }

    // Step 5: Test form data options
    console.log('\n5. Testing form options...');
    const formDataResponse = await axios.get(`${BASE_URL}/api/artisan/products/form-data/options`, {
      headers: {
        'Authorization': `Bearer ${artisanToken}`
      }
    });

    if (formDataResponse.data.success) {
      console.log('✅ Form options fetched successfully');
      console.log(`   Categories: ${formDataResponse.data.formData.categories.length}`);
      console.log(`   Materials: ${formDataResponse.data.formData.commonMaterials.length}`);
      console.log(`   Crafting Times: ${formDataResponse.data.formData.craftingTimes.length}`);
    }

    console.log('\n🎉 All tests passed! Product dashboard is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data?.message || error.response.data);
    }
  }
}

// Helper function to test server connectivity
async function checkServerConnection() {
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Server is running');
    console.log(`   Message: ${response.data.message}`);
    return true;
  } catch (error) {
    console.error('❌ Server is not responding');
    console.error('   Make sure to start the backend server with: cd backend && npm run dev');
    return false;
  }
}

// Main execution
async function runTests() {
  console.log('🚀 Starting Product Dashboard Tests...\n');
  
  const serverRunning = await checkServerConnection();
  if (serverRunning) {
    console.log('');
    await testProductDashboard();
  }
}

runTests();
