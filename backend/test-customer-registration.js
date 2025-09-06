const fetch = require('node-fetch'); // Use node-fetch which might be available

// Test registration with actual customer email
async function testCustomerRegistration() {
  console.log('🧪 Testing Customer Registration with Real Email...\n');
  
  const baseURL = 'http://localhost:5000';
  
  try {
    // Test with a different email (customer's email)
    const customerData = {
      name: 'Test Customer',
      email: 'testcustomer@example.com', // Use a test email
      password: 'password123',
      phone: '+91-9876543210'
    };
    
    console.log('📤 Sending registration request...');
    console.log('Customer email:', customerData.email);
    console.log('Server email (from):', process.env.EMAIL_USER);
    console.log();
    
    // Use native fetch or create a simple HTTP request
    const response = await makeRequest(`${baseURL}/api/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customerData)
    });
    
    console.log('📋 Registration Response:');
    console.log(JSON.stringify(response, null, 2));
    
    if (response.success && response.requiresVerification) {
      console.log('\n✅ Registration initiated successfully!');
      console.log(`📧 OTP should be sent to: ${response.email}`);
      console.log('🔍 Check the email inbox for verification code');
      
      // Log email routing info
      console.log('\n📮 Email Routing:');
      console.log(`From: ${process.env.EMAIL_USER} (ArtisanAI Server)`);
      console.log(`To: ${response.email} (Customer)`);
      console.log(`Subject: Verify your ArtisanAI account`);
      
      return true;
    } else {
      console.log('\n❌ Registration failed or incomplete response');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Registration test failed:', error.message);
    return false;
  }
}

// Simple HTTP request function without external dependencies
async function makeRequest(url, options = {}) {
  try {
    // Try using fetch if available
    if (typeof fetch !== 'undefined') {
      const response = await fetch(url, options);
      return await response.json();
    }
    
    // Fallback to http module
    const http = require('http');
    const https = require('https');
    const urlObj = new URL(url);
    
    return new Promise((resolve, reject) => {
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const req = client.request({
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname,
        method: options.method || 'GET',
        headers: options.headers || {}
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ error: 'Invalid JSON response', data });
          }
        });
      });
      
      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  } catch (error) {
    throw error;
  }
}

// Test email routing configuration
async function testEmailConfiguration() {
  console.log('🔧 Email Configuration Check...\n');
  
  console.log('Environment Variables:');
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER}`);
  console.log(`EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET'}`);
  console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL}`);
  console.log();
  
  console.log('📧 Email Flow:');
  console.log('1. Customer registers with their email');
  console.log('2. Server generates OTP and stores it');
  console.log('3. Server sends OTP FROM lakshyapratap5911@gmail.com');
  console.log('4. Server sends OTP TO customer\'s email address');
  console.log('5. Customer receives OTP in their inbox');
  console.log('6. Customer enters OTP to verify');
  console.log();
}

async function runTest() {
  console.log('🚀 ArtisanAI Customer Registration Test\n');
  console.log('=' .repeat(50));
  
  await testEmailConfiguration();
  
  console.log('-'.repeat(30));
  
  const success = await testCustomerRegistration();
  
  console.log('\n' + '='.repeat(50));
  
  if (success) {
    console.log('✅ Test completed - OTP should be sent to customer email');
    console.log('\n📱 To test with frontend:');
    console.log('1. Go to: http://localhost:3000/customer/register');
    console.log('2. Use ANY email address (not the server email)');
    console.log('3. Check that email inbox for OTP');
    console.log('4. The OTP sender will be: lakshyapratap5911@gmail.com');
    console.log('5. But recipient will be the email you entered in form');
  } else {
    console.log('❌ Test failed - check server logs for errors');
  }
  
  console.log('\n🔍 If emails still go to server email, check:');
  console.log('- notification service sendEmail function');
  console.log('- email verification service routing');
  console.log('- SMTP transporter configuration');
}

// Run test
if (require.main === module) {
  runTest().finally(() => {
    process.exit(0);
  });
}

module.exports = { testCustomerRegistration };
