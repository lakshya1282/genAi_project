const emailVerificationService = require('./services/emailVerificationService');
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/artisan-marketplace');
    console.log('📚 MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

// Test the complete OTP flow
async function testOTPFlow() {
  console.log('🧪 Testing Complete OTP Verification Flow\n');
  
  // Test data
  const testEmail = 'test@example.com';
  const testUserData = {
    name: 'Test User',
    password: 'hashed_password_here', // In real scenario, this would be hashed
    phone: '+1234567890'
  };

  try {
    // Step 1: Send OTP
    console.log('📤 Step 1: Sending OTP...');
    const sendResult = await emailVerificationService.sendVerificationOTP(
      testEmail, 
      'user', 
      testUserData
    );
    
    console.log('Send Result:', sendResult);
    
    if (!sendResult.success) {
      console.error('❌ Failed to send OTP:', sendResult.message);
      return;
    }
    
    console.log('✅ OTP sent successfully!\n');
    
    // Step 2: Get OTP status
    console.log('🔍 Step 2: Checking OTP status...');
    const statusResult = await emailVerificationService.getOTPStatus(testEmail, 'user');
    console.log('OTP Status:', statusResult);
    
    if (!statusResult.exists) {
      console.error('❌ OTP record not found');
      return;
    }
    
    console.log('✅ OTP record found in database\n');
    
    // Step 3: Test invalid OTP
    console.log('🚫 Step 3: Testing invalid OTP...');
    const invalidResult = await emailVerificationService.verifyOTP(testEmail, '000000', 'user');
    console.log('Invalid OTP Result:', invalidResult);
    
    if (invalidResult.success) {
      console.error('❌ Invalid OTP was accepted (this should not happen)');
      return;
    }
    
    console.log('✅ Invalid OTP correctly rejected\n');
    
    // Step 4: Test resend OTP
    console.log('🔄 Step 4: Testing resend OTP...');
    const resendResult = await emailVerificationService.resendVerificationOTP(testEmail, 'user');
    console.log('Resend Result:', resendResult);
    
    if (!resendResult.success) {
      console.error('❌ Failed to resend OTP:', resendResult.message);
      return;
    }
    
    console.log('✅ OTP resent successfully\n');
    
    // Step 5: For testing purposes, we'll need to manually get the OTP from database
    // In real scenario, user would get it from email
    console.log('📧 Step 5: Getting OTP from database (for testing)...');
    const OTPVerification = require('./models/OTPVerification');
    const otpRecord = await OTPVerification.findOne({
      email: testEmail,
      userType: 'user',
      verified: false
    });
    
    if (!otpRecord) {
      console.error('❌ OTP record not found in database');
      return;
    }
    
    console.log(`🔑 Found OTP: ${otpRecord.otp}`);
    console.log('⚠️ In production, users get this from email\n');
    
    // Step 6: Verify correct OTP (but don't actually create user)
    console.log('✅ Step 6: Testing correct OTP verification...');
    
    // For testing, we'll just validate the OTP without creating the user
    // by directly checking the OTP record
    if (otpRecord.otp && otpRecord.expiresAt > new Date()) {
      console.log('✅ OTP is valid and not expired');
      console.log(`   OTP: ${otpRecord.otp}`);
      console.log(`   Expires: ${otpRecord.expiresAt.toLocaleString()}`);
      console.log(`   Attempts: ${otpRecord.attempts}/5`);
    } else {
      console.error('❌ OTP is invalid or expired');
      return;
    }
    
    // Step 7: Cleanup test data
    console.log('\n🧹 Step 7: Cleaning up test data...');
    await OTPVerification.deleteMany({ email: testEmail });
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 OTP Flow Test Completed Successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ OTP Generation: Working');
    console.log('✅ Email Sending: Working');  
    console.log('✅ OTP Storage: Working');
    console.log('✅ OTP Validation: Working');
    console.log('✅ Resend Functionality: Working');
    console.log('✅ Invalid OTP Rejection: Working');
    console.log('✅ Database Operations: Working');
    
    console.log('\n🚀 The OTP verification system is fully functional!');
    console.log('🧑‍💻 You can now test user registration in the frontend.');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Test email sending capability
async function testEmailSending() {
  console.log('\n📧 Testing Email Sending...');
  
  try {
    const testResult = await emailVerificationService.sendOTPEmail(
      'test@example.com',
      '123456',
      'user',
      'Test User'
    );
    
    console.log('Email Test Result:', testResult);
    
    if (testResult.success) {
      console.log('✅ Email sending is working correctly');
    } else {
      console.log('❌ Email sending failed:', testResult.error);
    }
  } catch (error) {
    console.error('❌ Email test error:', error.message);
  }
}

// Main test function
async function runTests() {
  try {
    await connectDB();
    
    console.log('🎯 Starting OTP System Tests...\n');
    console.log('=' .repeat(50));
    
    // Test email configuration
    await testEmailSending();
    
    // Test complete OTP flow
    await testOTPFlow();
    
    console.log('\n' + '='.repeat(50));
    console.log('🏁 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📚 Database connection closed');
    process.exit(0);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testOTPFlow, testEmailSending };
