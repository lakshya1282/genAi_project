const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy (only initialize if credentials are available)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
  console.log('🔧 Google OAuth Configuration:');
  console.log('   Client ID:', process.env.GOOGLE_CLIENT_ID);
  console.log('   Callback URL:', callbackURL);
  
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: callbackURL,
      },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔐 Google OAuth Profile received:', {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          picture: profile.photos?.[0]?.value
        });

        const googleEmail = profile.emails?.[0]?.value;
        if (!googleEmail) {
          console.error('❌ No email found in Google profile');
          return done(new Error('No email found in Google profile'), null);
        }

        const normalizedEmail = googleEmail.toLowerCase();
        
        // Step 1: Check if user already exists with this Google ID
        let existingUser = await User.findOne({ googleId: profile.id });
        
        if (existingUser) {
          console.log('✅ Existing Google user found:', existingUser.email);
          
          // Update profile picture if it has changed
          if (profile.photos?.[0]?.value && existingUser.picture !== profile.photos[0].value) {
            existingUser.picture = profile.photos[0].value;
            existingUser.profileImage = profile.photos[0].value;
            await existingUser.save();
            console.log('📸 Updated profile picture for existing user');
          }
          
          return done(null, existingUser);
        }
        
        // Step 2: Check if user exists with the same email (different auth provider)
        existingUser = await User.findOne({ email: normalizedEmail });
        
        if (existingUser) {
          console.log('🔗 Found existing user with same email:', existingUser.email);
          console.log('   Current auth provider:', existingUser.authProvider);
          
          if (existingUser.googleId && existingUser.googleId !== profile.id) {
            // Email exists but linked to different Google account
            console.error('❌ Email linked to different Google account');
            return done(new Error('This email is already linked to a different Google account'), null);
          }
          
          // Link Google account to existing user (local -> google or update google linkage)
          console.log('🔗 Linking Google account to existing user');
          existingUser.googleId = profile.id;
          existingUser.authProvider = 'google';
          existingUser.picture = profile.photos?.[0]?.value || existingUser.profileImage;
          existingUser.profileImage = profile.photos?.[0]?.value || existingUser.profileImage;
          existingUser.isEmailVerified = true;
          existingUser.emailVerifiedAt = new Date();
          
          await existingUser.save();
          console.log('✅ Successfully linked Google account to existing user');
          return done(null, existingUser);
        }
        
        // Step 3: Create new user with Google profile
        console.log('🆕 Creating new Google user:', normalizedEmail);
        
        const newUser = new User({
          name: profile.displayName || 'Google User',
          email: normalizedEmail,
          googleId: profile.id,
          authProvider: 'google',
          picture: profile.photos?.[0]?.value,
          profileImage: profile.photos?.[0]?.value || '',
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
          // phone field omitted - will be collected later in profile completion
          preferences: {
            language: 'en',
            currency: 'INR',
            notifications: {
              email: true,
              sms: false, // No phone number yet
              push: true,
              marketing: false
            }
          }
        });
        
        await newUser.save();
        console.log('✅ New Google user created successfully:', newUser.email);
        return done(null, newUser);
        
      } catch (error) {
        console.error('❌ Google OAuth Strategy Error:', {
          message: error.message,
          stack: error.stack,
          profile: profile?.emails?.[0]?.value
        });
        return done(error, null);
      }
    }
  )
  );
} else {
  console.warn('⚠️  Google OAuth not configured - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required');
  console.warn('   See GOOGLE_OAUTH_SETUP.md for configuration instructions');
}

// Helper function to generate JWT token for OAuth users
const generateJWTToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    type: 'user',
    authProvider: user.authProvider
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { 
    expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
  });
};

module.exports = { passport, generateJWTToken };
