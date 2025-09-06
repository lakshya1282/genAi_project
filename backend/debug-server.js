const express = require('express');
const cors = require('cors');

console.log('🚀 Starting debug server...');

const app = express();
const PORT = 5000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'OK', 
    message: 'Debug server is running',
    timestamp: new Date().toISOString()
  });
});

// Test registration endpoint
app.post('/api/users/register', (req, res) => {
  console.log('Registration request received:', req.body);
  
  try {
    const { name, email, password, phone } = req.body;
    
    // Simple validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    // Mock response for testing
    res.json({
      success: true,
      message: 'Registration endpoint working',
      requiresVerification: true,
      email: email,
      expiresIn: 10,
      debug: true
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: error.message 
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Debug server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📝 Registration: http://localhost:${PORT}/api/users/register`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use. Trying to kill existing process...`);
  }
});

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down debug server...');
  server.close(() => {
    console.log('✅ Debug server closed');
    process.exit(0);
  });
});

console.log('🔍 Debug server ready. Press Ctrl+C to stop.');
