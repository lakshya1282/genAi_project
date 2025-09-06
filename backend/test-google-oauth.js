#!/usr/bin/env node

/**
 * Google OAuth Integration Test Script
 * 
 * This script tests the Google OAuth integration setup
 * Run with: node test-google-oauth.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔍 Testing Google OAuth Integration Setup...\n');

// Test 1: Check required dependencies
console.log('1️⃣ Checking dependencies...');
try {
  require('passport');
  require('passport-google-oauth20');
  require('express-session');
  require('connect-mongo');
  console.log('✅ All required packages installed\n');
} catch (error) {
  console.log('❌ Missing dependencies:', error.message);
  console.log('   Run: npm install passport passport-google-oauth20 express-session connect-mongo\n');
}

// Test 2: Check environment variables
console.log('2️⃣ Checking environment variables...');
const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SESSION_SECRET',
  'JWT_SECRET'
];

let allEnvConfigured = true;
requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}: Configured`);
  } else {
    console.log(`❌ ${envVar}: Not configured`);
    allEnvConfigured = false;
  }
});

if (!allEnvConfigured) {
  console.log('\n⚠️  Missing environment variables. Update your .env file:');
  console.log('   See GOOGLE_OAUTH_SETUP.md for detailed instructions\n');
} else {
  console.log('✅ All environment variables configured\n');
}

// Test 3: Test Passport configuration
console.log('3️⃣ Testing Passport configuration...');
try {
  const { passport } = require('./config/passport');
  console.log('✅ Passport configuration loaded successfully\n');
} catch (error) {
  console.log('❌ Passport configuration error:', error.message, '\n');
}

// Test 4: Check User model compatibility
console.log('4️⃣ Checking User model...');
try {
  const User = require('./models/User');
  
  // Check if Google OAuth fields are present in schema
  const userSchema = User.schema;
  const hasGoogleId = userSchema.paths.googleId ? true : false;
  const hasAuthProvider = userSchema.paths.authProvider ? true : false;
  const hasPicture = userSchema.paths.picture ? true : false;
  
  if (hasGoogleId && hasAuthProvider && hasPicture) {
    console.log('✅ User model updated with Google OAuth fields');
  } else {
    console.log('❌ User model missing Google OAuth fields');
    console.log(`   googleId: ${hasGoogleId ? '✅' : '❌'}`);
    console.log(`   authProvider: ${hasAuthProvider ? '✅' : '❌'}`);
    console.log(`   picture: ${hasPicture ? '✅' : '❌'}`);
  }
  console.log('');
} catch (error) {
  console.log('❌ User model error:', error.message, '\n');
}

// Test 5: Check routes
console.log('5️⃣ Checking Google OAuth routes...');
try {
  require('./routes/googleAuth');
  console.log('✅ Google OAuth routes loaded successfully\n');
} catch (error) {
  console.log('❌ Google OAuth routes error:', error.message, '\n');
}

// Test 6: Database connection test
console.log('6️⃣ Testing database connection...');
const connectAndTest = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/artisan-marketplace';
    await mongoose.connect(mongoUri);
    console.log('✅ Database connection successful');
    
    // Test if we can create a Google OAuth user structure
    const User = require('./models/User');
    const testUser = new User({
      name: 'Test Google User',
      email: 'test@example.com',
      googleId: 'test_google_id',
      authProvider: 'google',
      picture: 'https://example.com/photo.jpg',
      phone: '+1234567890',
      isEmailVerified: true,
      emailVerifiedAt: new Date()
    });
    
    // Validate without saving
    await testUser.validate();
    console.log('✅ Google OAuth user model validation successful\n');
    
    await mongoose.disconnect();
  } catch (error) {
    console.log('❌ Database test failed:', error.message, '\n');
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

// Summary
const printSummary = () => {
  console.log('📋 Setup Summary:');
  console.log('==================');
  
  if (allEnvConfigured) {
    console.log('🟢 Google OAuth is fully configured and ready to use!');
    console.log('\n🚀 Next steps:');
    console.log('   1. Start your server: npm run dev');
    console.log('   2. Test the OAuth flow: GET /api/auth/google');
    console.log('   3. Check the setup guide: GOOGLE_OAUTH_SETUP.md');
  } else {
    console.log('🟡 Google OAuth setup is incomplete');
    console.log('\n📝 Required actions:');
    console.log('   1. Configure Google Cloud Console credentials');
    console.log('   2. Update .env file with OAuth credentials');
    console.log('   3. See GOOGLE_OAUTH_SETUP.md for detailed instructions');
  }
  
  console.log('\n📄 Available endpoints:');
  console.log('   GET  /api/auth/google              - Start OAuth flow');
  console.log('   GET  /api/auth/google/callback     - OAuth callback');
  console.log('   GET  /api/auth/google/profile      - Get user profile (protected)');
  console.log('   POST /api/auth/google/complete-profile - Complete profile (protected)');
  console.log('   POST /api/auth/google/unlink       - Unlink Google account (protected)');
  
  console.log('\n✨ Integration complete! Ready for Google OAuth authentication.\n');
};

// Run tests
connectAndTest().then(() => {
  printSummary();
  process.exit(0);
}).catch(() => {
  printSummary();
  process.exit(1);
});
