const http = require('http');

// Test health endpoint
function testHealth() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ success: true, data: response });
        } catch (e) {
          resolve({ success: false, error: 'Invalid JSON', data });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });

    req.end();
  });
}

// Test registration endpoint
function testRegistration() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      name: 'Test Customer',
      email: 'kavitaparmar699@gmail.com',
      password: 'password123',
      phone: '+91-9876543210'
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/users/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ 
            success: true, 
            status: res.statusCode,
            data: response 
          });
        } catch (e) {
          resolve({ 
            success: false, 
            error: 'Invalid JSON', 
            status: res.statusCode,
            data 
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Backend Server Connection...\n');
  
  // Test health endpoint
  console.log('1️⃣ Testing Health Endpoint...');
  const healthResult = await testHealth();
  
  if (healthResult.success) {
    console.log('✅ Health check passed:', healthResult.data.message);
  } else {
    console.log('❌ Health check failed:', healthResult.error);
    return;
  }
  
  console.log('\n2️⃣ Testing Registration Endpoint...');
  const regResult = await testRegistration();
  
  if (regResult.success) {
    console.log('✅ Registration endpoint responded:');
    console.log(`   Status: ${regResult.status}`);
    console.log(`   Response:`, regResult.data);
    
    if (regResult.data.requiresVerification) {
      console.log('\n🎉 OTP System is working!');
      console.log(`📧 OTP should be sent to: ${regResult.data.email}`);
    } else if (regResult.data.success === false) {
      console.log('\n⚠️ Registration failed:', regResult.data.message);
    } else {
      console.log('\n⚠️ Old registration system (no OTP)');
    }
  } else {
    console.log('❌ Registration test failed:', regResult.error);
    if (regResult.status) console.log(`   Status: ${regResult.status}`);
    if (regResult.data) console.log(`   Data: ${regResult.data}`);
  }
  
  console.log('\n🎯 Test completed!');
}

runTests().catch(console.error);
