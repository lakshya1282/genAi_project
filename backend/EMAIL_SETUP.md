# Email Verification Setup Guide

This guide explains how to configure SMTP for email verification with OTP in your ArtisanAI marketplace.

## Features

✅ **Email verification with 6-digit OTP codes**
✅ **Secure temporary user data storage**
✅ **Automatic expiration and cleanup**
✅ **Rate limiting and attempt restrictions**
✅ **Beautiful HTML email templates**
✅ **Mobile-responsive OTP input component**
✅ **Resend functionality with countdown timer**

## Email Configuration

### 1. Gmail Setup (Recommended)

1. **Create a Gmail account** or use an existing one for sending emails
2. **Enable 2-Factor Authentication** on your Gmail account
3. **Generate an App Password**:
   - Go to Google Account Settings → Security
   - Select "2-Step Verification"
   - Click "App passwords"
   - Generate a password for "Mail"
   - Copy the generated 16-character password

### 2. Environment Variables

Add these variables to your `.env` file:

```bash
# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
FRONTEND_URL=http://localhost:3000

# Optional: For production
NODE_ENV=production
```

### 3. Alternative SMTP Providers

#### SendGrid
```bash
EMAIL_SERVICE=SendGrid
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
```

#### Mailgun
```bash
EMAIL_SERVICE=Mailgun
EMAIL_USER=your-mailgun-username
EMAIL_PASSWORD=your-mailgun-password
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
```

#### AWS SES
```bash
EMAIL_SERVICE=SES
EMAIL_USER=your-aws-access-key-id
EMAIL_PASSWORD=your-aws-secret-access-key
SMTP_HOST=email-smtp.region.amazonaws.com
SMTP_PORT=587
AWS_REGION=us-east-1
```

## Database Setup

The system uses MongoDB with automatic TTL (Time To Live) indexes for cleanup.

### Models Created:
- **OTPVerification**: Stores OTP codes with automatic expiration
- **User**: Updated with `isEmailVerified` and `emailVerifiedAt` fields
- **Artisan**: Updated with `isEmailVerified` and `emailVerifiedAt` fields

### Automatic Cleanup:
- OTP records expire automatically after 10 minutes
- Verified OTP records are deleted after 5 seconds
- Background cleanup task removes expired records

## API Endpoints

### Registration Endpoints

#### Customer Registration
```http
POST /api/users/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890"
}
```

#### Artisan Registration
```http
POST /api/artisans/register
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "craftType": "Pottery",
  "location": {
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India"
  },
  "bio": "Passionate potter with 10+ years experience"
}
```

### Verification Endpoints

#### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456",
  "userType": "user" // or "artisan"
}
```

#### Resend OTP
```http
POST /api/auth/resend-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "userType": "user" // or "artisan"
}
```

#### Check Verification Status
```http
GET /api/auth/verification-status/user@example.com/user
```

## Security Features

### OTP Security
- 6-digit random numeric codes
- 10-minute expiration time
- Maximum 5 verification attempts
- Automatic cleanup of expired codes
- Rate limiting on resend requests

### Data Protection
- Passwords are hashed before temporary storage
- User data stored temporarily until verification
- Automatic deletion of unverified records
- HTTPS enforcement recommended for production

### Email Security
- HTML email templates with proper encoding
- Anti-phishing measures in email design
- Clear verification instructions
- Branded email appearance

## Frontend Integration

### OTP Verification Component
- Auto-focus and navigation between input fields
- Paste support for 6-digit codes
- Real-time countdown timer
- Error handling and retry logic
- Mobile-responsive design
- Accessibility features

### Registration Flow
1. User fills registration form
2. Form validation and submission
3. OTP sent to email address
4. User enters OTP code
5. Account created and user logged in
6. Welcome email sent

## Testing

### Test Email Delivery
```javascript
// Test endpoint for development
POST /api/auth/admin/test-email
{
  "email": "test@example.com"
}
```

### Monitor OTP Statistics
```javascript
// Admin endpoint to view OTP stats
GET /api/auth/admin/otp-stats
```

### Manual Cleanup
```javascript
// Force cleanup of expired OTPs
POST /api/auth/admin/cleanup-otps
```

## Production Checklist

### Email Configuration
- [ ] Configure production SMTP provider
- [ ] Set up proper DNS records (SPF, DKIM, DMARC)
- [ ] Configure email rate limiting
- [ ] Set up email monitoring and logging

### Security
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up rate limiting middleware
- [ ] Monitor for suspicious activity

### Database
- [ ] Configure MongoDB replica sets
- [ ] Set up database backups
- [ ] Monitor database performance
- [ ] Configure proper indexes

### Monitoring
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure application logging
- [ ] Monitor email delivery rates
- [ ] Track registration completion rates

## Troubleshooting

### Common Issues

#### Email Not Sending
1. Check SMTP credentials in `.env`
2. Verify Gmail app password is correct
3. Check firewall/security group settings
4. Ensure SMTP port (587) is open

#### OTP Verification Failing
1. Check system time synchronization
2. Verify OTP hasn't expired (10 minutes)
3. Ensure case-sensitive email matching
4. Check attempt limits (max 5)

#### Database Issues
1. Verify MongoDB connection
2. Check TTL indexes are created
3. Monitor disk space
4. Check collection permissions

### Logs and Debugging
- Check server logs for SMTP errors
- Monitor OTP verification attempts
- Track email delivery success rates
- Debug frontend network requests

## Support

For additional help:
- Check the troubleshooting section
- Review server logs
- Test with different email providers
- Verify all environment variables are set

## Future Enhancements

Potential improvements:
- SMS backup verification
- Social login integration
- Multi-language email templates
- Advanced spam protection
- Email verification analytics dashboard
