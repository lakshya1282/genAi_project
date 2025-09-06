const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const OTPVerification = require('../models/OTPVerification');
const User = require('../models/User');
const Artisan = require('../models/Artisan');
const notificationService = require('./notificationService');

class EmailVerificationService {
  constructor() {
    this.OTP_EXPIRY_MINUTES = 10; // OTP expires in 10 minutes
    this.MAX_ATTEMPTS = 5;
  }

  // Generate a 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Create and send OTP for email verification
  async sendVerificationOTP(email, userType, userData) {
    try {
      // Check if user already exists
      const existingUser = userType === 'user' 
        ? await User.findOne({ email })
        : await Artisan.findOne({ email });
      
      if (existingUser) {
        if (existingUser.isEmailVerified) {
          return { success: false, message: `${userType === 'user' ? 'User' : 'Artisan'} already exists with this email` };
        } else {
          // User exists but not verified - we can resend OTP
          return this.resendVerificationOTP(email, userType);
        }
      }

      // Generate OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Delete any existing OTP records for this email and userType
      await OTPVerification.deleteMany({ 
        email, 
        userType, 
        purpose: 'email_verification' 
      });

      // Create new OTP record
      const otpRecord = new OTPVerification({
        email,
        otp,
        userType,
        purpose: 'email_verification',
        expiresAt,
        userData
      });

      await otpRecord.save();

      // Send OTP email
      const emailSent = await this.sendOTPEmail(email, otp, userType, userData.name);
      
      if (!emailSent.success) {
        // Clean up OTP record if email fails
        await OTPVerification.deleteOne({ _id: otpRecord._id });
        return { success: false, message: 'Failed to send verification email' };
      }

      return { 
        success: true, 
        message: `Verification OTP sent to ${email}. Please check your email and enter the 6-digit code to complete registration.`,
        expiresIn: this.OTP_EXPIRY_MINUTES
      };
    } catch (error) {
      console.error('Error sending verification OTP:', error);
      return { success: false, message: 'Error sending verification email' };
    }
  }

  // Resend verification OTP
  async resendVerificationOTP(email, userType) {
    try {
      // Find the existing OTP record
      const existingOTP = await OTPVerification.findOne({
        email,
        userType,
        purpose: 'email_verification',
        verified: false
      });

      if (!existingOTP) {
        return { success: false, message: 'No pending verification found for this email' };
      }

      // Generate new OTP
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Update the existing record
      existingOTP.otp = otp;
      existingOTP.expiresAt = expiresAt;
      existingOTP.attempts = 0; // Reset attempts
      existingOTP.createdAt = new Date();
      
      await existingOTP.save();

      // Send new OTP email
      const emailSent = await this.sendOTPEmail(email, otp, userType, existingOTP.userData.name);
      
      if (!emailSent.success) {
        return { success: false, message: 'Failed to send verification email' };
      }

      return { 
        success: true, 
        message: `New verification OTP sent to ${email}`,
        expiresIn: this.OTP_EXPIRY_MINUTES
      };
    } catch (error) {
      console.error('Error resending verification OTP:', error);
      return { success: false, message: 'Error resending verification email' };
    }
  }

  // Verify OTP and complete registration
  async verifyOTP(email, otp, userType) {
    try {
      // Find the OTP record
      const otpRecord = await OTPVerification.findOne({
        email,
        userType,
        purpose: 'email_verification',
        verified: false
      });

      if (!otpRecord) {
        return { success: false, message: 'Invalid or expired verification code' };
      }

      // Check if OTP is expired
      if (new Date() > otpRecord.expiresAt) {
        await OTPVerification.deleteOne({ _id: otpRecord._id });
        return { success: false, message: 'Verification code has expired. Please request a new one.' };
      }

      // Check attempts
      if (otpRecord.attempts >= this.MAX_ATTEMPTS) {
        await OTPVerification.deleteOne({ _id: otpRecord._id });
        return { success: false, message: 'Too many failed attempts. Please request a new verification code.' };
      }

      // Verify OTP
      if (otpRecord.otp !== otp) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        
        const remainingAttempts = this.MAX_ATTEMPTS - otpRecord.attempts;
        return { 
          success: false, 
          message: `Invalid verification code. ${remainingAttempts} attempts remaining.` 
        };
      }

      // OTP is valid - create the user/artisan account
      const result = await this.createVerifiedAccount(otpRecord);
      
      if (result.success) {
        // Mark OTP as verified and clean up
        otpRecord.verified = true;
        await otpRecord.save();
        
        // Delete the OTP record after successful verification
        setTimeout(async () => {
          await OTPVerification.deleteOne({ _id: otpRecord._id });
        }, 5000); // Delete after 5 seconds
      }

      return result;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { success: false, message: 'Error verifying code. Please try again.' };
    }
  }

  // Create verified user/artisan account
  async createVerifiedAccount(otpRecord) {
    try {
      const userData = otpRecord.userData;
      const userType = otpRecord.userType;
      const email = otpRecord.email;

      if (userType === 'user') {
        // Create User account
        const user = new User({
          name: userData.name,
          email: email,
          password: userData.password, // Already hashed
          phone: userData.phone,
          isEmailVerified: true,
          emailVerifiedAt: new Date()
        });

        await user.save();

        // Generate JWT token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
          { id: user._id, email: user.email, type: 'user' },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        // Send welcome email
        await this.sendWelcomeEmail(email, userData.name, userType);

        return {
          success: true,
          message: 'Email verified successfully! Account created.',
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            isEmailVerified: true
          }
        };
      } else {
        // Create Artisan account
        const artisan = new Artisan({
          name: userData.name,
          email: email,
          password: userData.password, // Already hashed
          phone: userData.phone,
          location: userData.location,
          craftType: userData.craftType,
          bio: userData.bio,
          isEmailVerified: true,
          emailVerifiedAt: new Date()
        });

        await artisan.save();

        // Generate JWT token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
          { id: artisan._id, userType: 'artisan' },
          process.env.JWT_SECRET || 'fallback_secret',
          { expiresIn: '7d' }
        );

        // Send welcome email
        await this.sendWelcomeEmail(email, userData.name, userType);

        return {
          success: true,
          message: 'Email verified successfully! Artisan account created.',
          token,
          artisan: {
            id: artisan._id,
            name: artisan.name,
            email: artisan.email,
            craftType: artisan.craftType,
            isEmailVerified: true
          }
        };
      }
    } catch (error) {
      console.error('Error creating verified account:', error);
      return { success: false, message: 'Error creating account. Please try again.' };
    }
  }

  // Send OTP email
  async sendOTPEmail(email, otp, userType, name) {
    try {
      const subject = `Verify your ${userType === 'user' ? 'ArtisanAI' : 'ArtisanAI Seller'} account`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #667eea;">
            <h1 style="color: #667eea; margin: 0;">ArtisanAI</h1>
            <p style="color: #6c757d; margin: 5px 0;">Handcrafted Marketplace</p>
          </div>
          
          <div style="padding: 30px 0;">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome ${name}!</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Thank you for ${userType === 'user' ? 'joining' : 'registering as a seller on'} ArtisanAI. 
              To complete your registration, please verify your email address using the code below:
            </p>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 30px 0; padding: 20px; border-radius: 10px; text-align: center;">
              <p style="color: white; margin: 0 0 10px 0; font-size: 14px;">Your Verification Code</p>
              <h1 style="color: white; margin: 0; font-size: 36px; letter-spacing: 8px; font-weight: bold;">${otp}</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
              <p style="margin: 0; color: #6c757d; font-size: 14px;">
                <strong>⏰ Important:</strong> This verification code will expire in ${this.OTP_EXPIRY_MINUTES} minutes.
                <br>If you didn't create an account, please ignore this email.
              </p>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; text-align: center; background: #f8f9fa; border-radius: 8px;">
              <h3 style="color: #333; margin: 0 0 10px 0;">What's next?</h3>
              <p style="color: #6c757d; margin: 0; font-size: 14px;">
                ${userType === 'user' 
                  ? 'Once verified, you can start exploring unique handcrafted products from talented artisans across India.' 
                  : 'Once verified, you can start listing your handcrafted products and reach customers who appreciate authentic craftsmanship.'
                }
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

      return await notificationService.sendEmail(email, subject, html);
    } catch (error) {
      console.error('Error sending OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send welcome email after successful verification
  async sendWelcomeEmail(email, name, userType) {
    try {
      const subject = `Welcome to ArtisanAI ${userType === 'user' ? 'Community' : 'Marketplace'}! 🎉`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #667eea;">
            <h1 style="color: #667eea; margin: 0;">🎉 Welcome to ArtisanAI!</h1>
          </div>
          
          <div style="padding: 30px 0;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${name}!</h2>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Congratulations! Your email has been successfully verified and your account is now active.
            </p>
            
            ${userType === 'user' ? `
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 30px 0; padding: 25px; border-radius: 10px; color: white;">
                <h3 style="margin: 0 0 15px 0;">🛍️ Start Your Journey</h3>
                <p style="margin: 0; opacity: 0.9;">
                  Discover unique handcrafted products from talented artisans across India. 
                  Every purchase supports traditional craftsmanship and helps preserve cultural heritage.
                </p>
              </div>
              
              <div style="display: grid; gap: 15px; margin: 25px 0;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
                  <h4 style="margin: 0 0 10px 0; color: #28a745;">🔍 Explore Products</h4>
                  <p style="margin: 0; color: #6c757d; font-size: 14px;">Browse through categories like pottery, textiles, jewelry, and more.</p>
                </div>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #17a2b8;">
                  <h4 style="margin: 0 0 10px 0; color: #17a2b8;">💬 AI Shopping Assistant</h4>
                  <p style="margin: 0; color: #6c757d; font-size: 14px;">Get personalized recommendations with our smart AI assistant.</p>
                </div>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
                  <h4 style="margin: 0 0 10px 0; color: #856404;">❤️ Support Artisans</h4>
                  <p style="margin: 0; color: #6c757d; font-size: 14px;">Every purchase directly supports skilled craftspeople and their families.</p>
                </div>
              </div>
            ` : `
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 30px 0; padding: 25px; border-radius: 10px; color: white;">
                <h3 style="margin: 0 0 15px 0;">🎨 Welcome to the Marketplace</h3>
                <p style="margin: 0; opacity: 0.9;">
                  You're now part of a community that celebrates traditional craftsmanship. 
                  Start listing your products and connect with customers who value authentic handmade items.
                </p>
              </div>
              
              <div style="display: grid; gap: 15px; margin: 25px 0;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
                  <h4 style="margin: 0 0 10px 0; color: #28a745;">📦 Add Products</h4>
                  <p style="margin: 0; color: #6c757d; font-size: 14px;">Start by adding your first product with detailed descriptions and photos.</p>
                </div>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #17a2b8;">
                  <h4 style="margin: 0 0 10px 0; color: #17a2b8;">📊 Track Performance</h4>
                  <p style="margin: 0; color: #6c757d; font-size: 14px;">Use your dashboard to monitor sales, orders, and customer interactions.</p>
                </div>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
                  <h4 style="margin: 0 0 10px 0; color: #856404;">💡 AI Assistant</h4>
                  <p style="margin: 0; color: #6c757d; font-size: 14px;">Get help with product descriptions, pricing, and business insights.</p>
                </div>
              </div>
            `}
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}${userType === 'user' ? '' : '/dashboard'}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
                ${userType === 'user' ? '🚀 Start Shopping' : '🎯 Go to Dashboard'}
              </a>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e9ecef; padding-top: 20px; text-align: center;">
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              Need help? Contact us at support@artisanai.com<br>
              <strong>The ArtisanAI Team</strong><br>
              Preserving traditions, one craft at a time
            </p>
          </div>
        </div>
      `;

      return await notificationService.sendEmail(email, subject, html);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  // Clean up expired OTP records (can be called periodically)
  async cleanupExpiredOTPs() {
    try {
      const result = await OTPVerification.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      console.log(`Cleaned up ${result.deletedCount} expired OTP records`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
      return 0;
    }
  }

  // Get OTP status for debugging (admin only)
  async getOTPStatus(email, userType) {
    try {
      const otpRecord = await OTPVerification.findOne({
        email,
        userType,
        purpose: 'email_verification',
        verified: false
      });

      if (!otpRecord) {
        return { exists: false };
      }

      return {
        exists: true,
        attempts: otpRecord.attempts,
        expiresAt: otpRecord.expiresAt,
        isExpired: new Date() > otpRecord.expiresAt,
        createdAt: otpRecord.createdAt
      };
    } catch (error) {
      console.error('Error getting OTP status:', error);
      return { exists: false, error: error.message };
    }
  }
}

module.exports = new EmailVerificationService();
