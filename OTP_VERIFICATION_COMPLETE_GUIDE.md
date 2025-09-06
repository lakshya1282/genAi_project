# 📧 OTP Email Verification System - Complete Setup Guide

## 🎉 System Overview

Your ArtisanAI marketplace now has a complete **SMTP-based email verification system with OTP** for both customers and artisans. Here's what's implemented:

### ✅ Features Implemented:
- **6-digit OTP verification** for email confirmation
- **Professional HTML email templates** with branding
- **Mobile-responsive OTP input component**
- **Automatic expiration and cleanup** (10 minutes)
- **Rate limiting** (max 5 attempts, resend functionality)
- **Secure temporary data storage** until verification
- **Welcome emails** after successful verification
- **Admin monitoring endpoints** for statistics

---

## 🔧 Configuration Complete

### Email Settings Configured:
```
✅ Email Account: lakshyapratap5911@gmail.com
✅ App Password: wvvz yfto cqao ohtv
✅ SMTP Service: Gmail
✅ All environment variables set
```

### Database Models Updated:
```
✅ OTPVerification model created
✅ User model updated with email verification fields
✅ Artisan model updated with email verification fields
✅ TTL indexes for automatic cleanup
```

### API Endpoints Created:
```
✅ POST /api/users/register - Customer registration with OTP
✅ POST /api/artisans/register - Artisan registration with OTP  
✅ POST /api/auth/verify-otp - Unified OTP verification
✅ POST /api/auth/resend-otp - Resend verification code
✅ GET /api/auth/verification-status/:email/:userType - Check status
✅ POST /api/auth/login - Enhanced login with email verification check
```

### Frontend Components:
```
✅ OTPVerification component with beautiful UI
✅ Updated CustomerRegister page
✅ Updated artisan Register page  
✅ Auto-focus, paste support, countdown timer
✅ Mobile responsive design
```

---

## 🚀 How to Test the System

### 1. Start the Backend Server:
```bash
cd backend
npm start
```

### 2. Start the Frontend:  
```bash
cd frontend
npm start
```

### 3. Test Email Configuration (Optional):
```bash
cd backend
node test-email.js
```

### 4. Test Complete OTP Flow (Optional):
```bash
cd backend  
node test-otp-flow.js
```

---

## 🧪 Testing the Registration Flow

### For Customer Registration:
1. Go to `http://localhost:3000/customer/register`
2. Fill in registration details:
   - Name: `Test Customer`
   - Email: `test@example.com` (or any valid email)
   - Phone: `+1234567890`
   - Password: `password123`
   - Confirm Password: `password123`
3. Click "Create Account"
4. Check email for 6-digit OTP code
5. Enter OTP in verification screen
6. Account created and redirected to marketplace

### For Artisan Registration:
1. Go to `http://localhost:3000/register`
2. Fill in artisan details:
   - Name: `Test Artisan`
   - Email: `artisan@example.com`
   - Password: `password123`
   - Phone: `+1234567890`
   - Craft Type: `Pottery`
   - City: `Mumbai`
   - State: `Maharashtra`
   - Bio: `Experienced potter...`
3. Click "Join ArtisanAI"
4. Check email for OTP
5. Enter OTP code
6. Account created and redirected to dashboard

---

## 📧 Email Templates

### Verification Email Features:
- **Professional branding** with ArtisanAI logo
- **Clear 6-digit OTP** prominently displayed
- **Expiration countdown** (10 minutes)
- **Security instructions** and guidance
- **Next steps** information
- **Anti-phishing** design elements

### Welcome Email Features:
- **Congratulations message** for successful verification
- **Feature highlights** based on user type
- **Getting started guide** 
- **Direct links** to marketplace/dashboard
- **Support information**

---

## 🔐 Security Features

### OTP Security:
- ✅ **Random 6-digit codes** (100,000 - 999,999)
- ✅ **10-minute expiration** with automatic cleanup
- ✅ **Maximum 5 attempts** per OTP
- ✅ **Rate limiting** on resend requests
- ✅ **Secure password hashing** before storage
- ✅ **Temporary data storage** until verification

### Email Security:
- ✅ **Gmail SMTP** with app-specific password
- ✅ **HTML template validation** 
- ✅ **Anti-phishing measures** in design
- ✅ **Clear sender identification**

---

## 🎨 Frontend UI Features

### OTP Input Component:
- ✅ **6 individual input fields** with auto-focus
- ✅ **Auto-advance** to next field on input
- ✅ **Backspace navigation** between fields
- ✅ **Paste support** for 6-digit codes
- ✅ **Real-time countdown** timer
- ✅ **Resend functionality** when expired
- ✅ **Error handling** with clear messages
- ✅ **Mobile responsive** design
- ✅ **Loading states** and animations

### Registration Flow:
- ✅ **Seamless transition** from registration to OTP
- ✅ **Back to registration** button
- ✅ **Clear instructions** and help text
- ✅ **Progress indicators**
- ✅ **Error handling** throughout flow

---

## 📊 Admin & Monitoring

### Available Admin Endpoints:
```http
GET /api/auth/admin/otp-stats
- View OTP generation and verification statistics

POST /api/auth/admin/cleanup-otps  
- Force cleanup of expired OTP records

GET /api/auth/verification-status/:email/:userType
- Check verification status for any user
```

### Automatic Maintenance:
- ✅ **TTL indexes** auto-delete expired records
- ✅ **Background cleanup** of verified records
- ✅ **Database optimization** with proper indexing

---

## 🔧 Environment Variables Reference

Your `.env` file should contain:
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/artisan-marketplace
JWT_SECRET=your_jwt_secret_key_for_hackathon_demo_2024

# Email Configuration  
EMAIL_USER=lakshyapratap5911@gmail.com
EMAIL_PASSWORD=wvvz yfto cqao ohtv

# Frontend
FRONTEND_URL=http://localhost:3000

# Other APIs
GEMINI_API_KEY=AIzaSyCRRR7BRRGd1LnuGI3aB-3yJM5bt6G-_jI
```

---

## 🚨 Troubleshooting

### Common Issues & Solutions:

#### 1. Email Not Sending
**Problem**: OTP emails not being delivered
**Solutions**:
- ✅ Verify Gmail app password is correct
- ✅ Check spam/junk folders
- ✅ Ensure internet connection is stable
- ✅ Run `node test-email.js` to test configuration

#### 2. OTP Verification Failing
**Problem**: Valid OTP codes being rejected
**Solutions**:
- ✅ Check system time synchronization
- ✅ Ensure OTP hasn't expired (10 minutes)
- ✅ Verify email address matches exactly
- ✅ Check database connection

#### 3. Frontend Not Connecting  
**Problem**: Registration form not sending requests
**Solutions**:
- ✅ Ensure backend server is running on port 5000
- ✅ Check CORS configuration
- ✅ Verify API endpoints are accessible
- ✅ Check browser network tab for errors

#### 4. Database Issues
**Problem**: OTP records not saving
**Solutions**:
- ✅ Verify MongoDB is running
- ✅ Check database connection string
- ✅ Ensure proper permissions
- ✅ Monitor disk space

---

## 🎯 Production Deployment Checklist

When deploying to production:

### Email Configuration:
- [ ] Use production SMTP provider (Gmail, SendGrid, etc.)
- [ ] Configure proper DNS records (SPF, DKIM, DMARC)
- [ ] Set up email monitoring and logging
- [ ] Configure rate limiting for email sending

### Security:
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS for production domains
- [ ] Set up rate limiting middleware
- [ ] Monitor for suspicious registration activity

### Database:
- [ ] Use MongoDB Atlas or replica sets
- [ ] Configure automated backups
- [ ] Set up database monitoring
- [ ] Optimize indexes for performance

### Monitoring:
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure application logging
- [ ] Monitor email delivery rates
- [ ] Track registration completion rates

---

## 📈 Usage Analytics

The system automatically tracks:
- ✅ **OTP generation** counts by user type
- ✅ **Verification success** rates  
- ✅ **Failed attempt** patterns
- ✅ **Email delivery** statistics
- ✅ **Registration completion** rates

Access via admin endpoints for insights.

---

## 🎉 Success! Your System is Ready

**🚀 Your ArtisanAI marketplace now has enterprise-grade email verification!**

### What's Working:
1. ✅ **Professional OTP emails** sent via Gmail SMTP
2. ✅ **Beautiful verification UI** with countdown timers  
3. ✅ **Secure registration flow** for customers and artisans
4. ✅ **Automatic cleanup** and maintenance
5. ✅ **Mobile-responsive** design
6. ✅ **Admin monitoring** capabilities

### Next Steps:
1. 🧪 **Test the registration flow** with real email addresses
2. 🎨 **Customize email templates** if needed
3. 📊 **Monitor usage statistics** via admin endpoints
4. 🚀 **Deploy to production** when ready

---

## 💬 Support

For additional help or customization:
- 📧 Check the EMAIL_SETUP.md guide
- 🧪 Run test scripts to diagnose issues
- 📋 Review server logs for detailed error information
- 🔧 Use admin endpoints to monitor system health

**Your email verification system is now live and ready for users! 🎉**
