const nodemailer = require('nodemailer');
require('dotenv').config();

async function sendTestOTPEmail() {
  console.log('📧 Testing OTP Email Sending...\n');
  
  try {
    // Create transporter with exact same config that worked
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Test email address
    const testEmail = 'lakshyapratap5911@gmail.com'; // Send to yourself for testing
    const testOTP = '123456';
    const userName = 'Test User';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #667eea;">
          <h1 style="color: #667eea; margin: 0;">ArtisanAI</h1>
          <p style="color: #6c757d; margin: 5px 0;">Handcrafted Marketplace</p>
        </div>
        
        <div style="padding: 30px 0;">
          <h2 style="color: #333; margin-bottom: 20px;">Welcome ${userName}!</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Thank you for joining ArtisanAI. 
            To complete your registration, please verify your email address using the code below:
          </p>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 30px 0; padding: 20px; border-radius: 10px; text-align: center;">
            <p style="color: white; margin: 0 0 10px 0; font-size: 14px;">Your Verification Code</p>
            <h1 style="color: white; margin: 0; font-size: 36px; letter-spacing: 8px; font-weight: bold;">${testOTP}</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">
              <strong>⏰ Important:</strong> This verification code will expire in 10 minutes.
              <br>If you didn't create an account, please ignore this email.
            </p>
          </div>
        </div>
        
        <div style="border-top: 1px solid #e9ecef; padding-top: 20px; text-align: center;">
          <p style="color: #6c757d; font-size: 12px; margin: 0;">
            Best regards,<br>
            <strong>The ArtisanAI Team</strong><br>
            Supporting authentic craftsmanship since 2024
          </p>
        </div>
      </div>
    `;

    console.log('📤 Sending OTP email...');
    console.log(`From: ${process.env.EMAIL_USER}`);
    console.log(`To: ${testEmail}`);
    console.log(`OTP: ${testOTP}`);
    console.log();

    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: testEmail,
      subject: 'Verify your ArtisanAI account - OTP Test',
      html: html
    });

    console.log('✅ OTP Email sent successfully!');
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log(`📮 Response: ${result.response}`);
    console.log();
    console.log('🎉 Check your email inbox for the OTP!');
    console.log(`📧 Email sent to: ${testEmail}`);
    
    return true;

  } catch (error) {
    console.error('❌ Failed to send OTP email:', error.message);
    if (error.code) console.log(`Error Code: ${error.code}`);
    if (error.response) console.log(`SMTP Response: ${error.response}`);
    return false;
  }
}

// Run test
if (require.main === module) {
  sendTestOTPEmail().finally(() => {
    console.log('\n📝 Test completed');
    process.exit(0);
  });
}

module.exports = { sendTestOTPEmail };
