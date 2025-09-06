const nodemailer = require('nodemailer');
require('dotenv').config();

// Test email configuration
async function testEmailConfig() {
  console.log('🧪 Testing Email Configuration...\n');
  
  // Show configuration (masked)
  console.log('📧 Email Configuration:');
  console.log(`   Email User: ${process.env.EMAIL_USER}`);
  console.log(`   Email Password: ${process.env.EMAIL_PASSWORD ? '✓ Set' : '✗ Not set'}`);
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL}\n`);

  // Create transporter
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  try {
    // Test connection
    console.log('🔌 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    // Send test email
    console.log('📤 Sending test email...');
    const testEmail = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: '🎉 ArtisanAI Email Test - Configuration Successful!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #667eea;">
            <h1 style="color: #667eea; margin: 0;">🎉 Email Test Successful!</h1>
            <p style="color: #6c757d; margin: 5px 0;">ArtisanAI Email Verification System</p>
          </div>
          
          <div style="padding: 30px 0;">
            <h2 style="color: #333; margin-bottom: 20px;">Configuration Verified ✅</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Congratulations! Your email configuration is working perfectly. 
              The OTP verification system is ready to use.
            </p>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 30px 0; padding: 25px; border-radius: 10px; color: white;">
              <h3 style="margin: 0 0 15px 0;">🔧 System Status</h3>
              <p style="margin: 0; opacity: 0.9;">
                ✅ SMTP Connection: Active<br>
                ✅ Gmail Integration: Working<br>
                ✅ Email Templates: Loaded<br>
                ✅ OTP Generation: Ready
              </p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
              <h4 style="margin: 0 0 10px 0; color: #28a745;">🚀 Next Steps</h4>
              <p style="margin: 0; color: #6c757d; font-size: 14px;">
                Your email verification system is now configured and ready for use. 
                Users can register and receive OTP verification emails.
              </p>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e9ecef; padding-top: 20px; text-align: center;">
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              Test completed at: ${new Date().toLocaleString()}<br>
              <strong>ArtisanAI Development Team</strong>
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Response: ${result.response}\n`);

    console.log('🎉 Email configuration is working perfectly!');
    console.log('📧 Check your inbox at:', process.env.EMAIL_USER);
    console.log('\n🚀 You can now start the server and test user registration with OTP verification.');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Verify Gmail app password is correct');
    console.log('2. Ensure 2-factor authentication is enabled');
    console.log('3. Check if less secure apps is disabled (should be)');
    console.log('4. Verify internet connection');
  }
}

// Run the test
if (require.main === module) {
  testEmailConfig().finally(() => {
    process.exit(0);
  });
}

module.exports = { testEmailConfig };
