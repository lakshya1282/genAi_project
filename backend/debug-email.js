const nodemailer = require('nodemailer');
require('dotenv').config();

async function debugEmailConfig() {
  console.log('🔍 Debugging Email Configuration...\n');
  
  // Step 1: Check environment variables
  console.log('1️⃣ Environment Variables:');
  console.log(`   EMAIL_USER: ${process.env.EMAIL_USER}`);
  console.log(`   EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? 'SET (Length: ' + process.env.EMAIL_PASSWORD.length + ')' : 'NOT SET'}`);
  console.log(`   EMAIL_PASSWORD (masked): ${process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.replace(/./g, '*') : 'NOT SET'}`);
  console.log();

  // Step 2: Test different configurations
  const configs = [
    {
      name: 'Gmail Service (Current)',
      config: {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      }
    },
    {
      name: 'Gmail SMTP Direct',
      config: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      }
    },
    {
      name: 'Gmail SMTP SSL',
      config: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      }
    }
  ];

  for (const { name, config } of configs) {
    console.log(`2️⃣ Testing: ${name}`);
    
    try {
      const transporter = nodemailer.createTransport(config);
      
      // Test connection
      console.log('   🔌 Testing connection...');
      await transporter.verify();
      console.log('   ✅ Connection successful!');
      
      // Send test email
      console.log('   📤 Sending test email...');
      const result = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER, // Send to self
        subject: `Test Email - ${name} - ${new Date().toLocaleTimeString()}`,
        html: `
          <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #28a745;">✅ Email Test Successful!</h2>
            <p>Configuration: <strong>${name}</strong></p>
            <p>Time: ${new Date().toLocaleString()}</p>
            <p>This email was sent successfully from your ArtisanAI application.</p>
          </div>
        `
      });
      
      console.log('   ✅ Email sent successfully!');
      console.log(`   📧 Message ID: ${result.messageId}`);
      console.log(`   📮 Response: ${result.response}`);
      console.log('   🎉 This configuration is working!\n');
      
      // If successful, no need to test others
      return true;
      
    } catch (error) {
      console.log('   ❌ Failed:', error.message);
      if (error.code) console.log(`   🔍 Error Code: ${error.code}`);
      if (error.responseCode) console.log(`   🔍 Response Code: ${error.responseCode}`);
      console.log();
    }
  }
  
  return false;
}

async function testPasswordFormat() {
  console.log('3️⃣ Testing App Password Format...\n');
  
  const password = process.env.EMAIL_PASSWORD;
  if (!password) {
    console.log('❌ No password found in environment');
    return;
  }
  
  console.log(`Original: "${password}"`);
  console.log(`Length: ${password.length}`);
  console.log(`Has spaces: ${password.includes(' ')}`);
  
  // Test with spaces removed
  const passwordNoSpaces = password.replace(/\s/g, '');
  console.log(`Without spaces: "${passwordNoSpaces}"`);
  console.log(`Length without spaces: ${passwordNoSpaces.length}`);
  
  if (password !== passwordNoSpaces) {
    console.log('\n🧪 Testing with spaces removed...');
    
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: passwordNoSpaces
        }
      });
      
      await transporter.verify();
      console.log('✅ Connection successful with spaces removed!');
      
      // Update .env suggestion
      console.log('\n💡 SOLUTION FOUND:');
      console.log('Update your .env file:');
      console.log(`EMAIL_PASSWORD=${passwordNoSpaces}`);
      
      return true;
    } catch (error) {
      console.log('❌ Still failed with spaces removed:', error.message);
    }
  }
  
  return false;
}

async function runDiagnostics() {
  console.log('🩺 Email Configuration Diagnostics\n');
  console.log('='.repeat(50));
  
  try {
    // Test current configuration
    const mainTestSuccess = await debugEmailConfig();
    
    if (!mainTestSuccess) {
      // Test password format variations
      const passwordTestSuccess = await testPasswordFormat();
      
      if (!passwordTestSuccess) {
        console.log('\n🔧 Troubleshooting Tips:');
        console.log('1. Verify Gmail 2-Factor Authentication is enabled');
        console.log('2. Generate a new App Password:');
        console.log('   - Google Account → Security → 2-Step Verification → App passwords');
        console.log('3. Make sure "Less secure app access" is OFF (should be)');
        console.log('4. Try removing spaces from app password');
        console.log('5. Check if Gmail account is locked or flagged');
        console.log('6. Verify internet connection');
        console.log('\n📧 App Password should be 16 characters, all lowercase, no spaces');
        console.log('Example format: abcdabcdabcdabcd');
      }
    }
    
    console.log('\n' + '='.repeat(50));
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

// Run diagnostics
if (require.main === module) {
  runDiagnostics().finally(() => {
    process.exit(0);
  });
}

module.exports = { debugEmailConfig, testPasswordFormat };
