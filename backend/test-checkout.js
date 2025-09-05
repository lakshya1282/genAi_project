const http = require('http');

// Test checkout API call
const testCheckout = () => {
  const postData = JSON.stringify({
    shippingAddress: {
      street: "123 Test St",
      city: "Test City", 
      state: "Test State",
      country: "India",
      pincode: "123456"
    },
    paymentMethod: "cod"
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/orders/checkout',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      // Using valid JWT token for user with cart
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YjcyZTUyOWMzYjQ1OTQ3YzcwM2VjMyIsIm5hbWUiOiJUZXN0IFVzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJ1c2VyVHlwZSI6ImN1c3RvbWVyIiwiaWF0IjoxNzU2OTc0MjM4fQ.cIAPLMtw1G_FEAIKv2qKynDO-2hKpBUpdFgW-fOLf58'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response Status:', res.statusCode);
      console.log('Response Headers:', res.headers);
      console.log('Response Body:', data);
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e.message);
  });

  req.write(postData);
  req.end();
};

console.log('Testing checkout API...');
testCheckout();
