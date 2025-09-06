const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const Artisan = require('../models/Artisan');
const jwt = require('jsonwebtoken');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    // Try to find as User first, then as Artisan
    let user = await User.findById(id);
    if (!user) {
      user = await Artisan.findById(id);
      if (user) {
        user.userType = 'artisan'; // Add type flag
      }
    } else {
      user.userType = 'user'; // Add type flag
    }
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
        // Parse state parameter (JSON string containing flow and userType)
        let authFlow = 'login';
        let userType = 'user';
        
        if (profile.params?.state) {
          try {
            const stateData = JSON.parse(profile.params.state);
            authFlow = stateData.flow || 'login';
            userType = stateData.userType || 'user';
          } catch (parseError) {
            console.warn('⚠️ Could not parse state parameter, using defaults:', profile.params.state);
            // Fallback to old format for backward compatibility
            authFlow = profile.params.state;
          }
        }
        
        const Model = userType === 'artisan' ? Artisan : User;
        const modelName = userType === 'artisan' ? 'artisan' : 'user';
        
        console.log('🔐 Google OAuth Profile received:', {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          picture: profile.photos?.[0]?.value,
          authFlow: authFlow,
          userType: userType
        });

        const googleEmail = profile.emails?.[0]?.value;
        if (!googleEmail) {
          console.error('❌ No email found in Google profile');
          return done(new Error('No email found in Google profile'), null);
        }

        const normalizedEmail = googleEmail.toLowerCase();
        
        // Step 1: Check if user/artisan already exists with this Google ID
        let existingUser = await Model.findOne({ googleId: profile.id });
        
        if (existingUser) {
          console.log(`✅ Existing Google ${modelName} found:`, existingUser.email);
          
          // Update profile picture if it has changed
          if (profile.photos?.[0]?.value && existingUser.picture !== profile.photos[0].value) {
            existingUser.picture = profile.photos[0].value;
            if (existingUser.profileImage !== undefined) {
              existingUser.profileImage = profile.photos[0].value;
            }
            await existingUser.save();
            console.log(`📸 Updated profile picture for existing ${modelName}`);
          }
          
          // Add userType for later processing
          existingUser.userType = userType;
          return done(null, existingUser);
        }
        
        // Step 2: Check if user/artisan exists with the same email (different auth provider)
        existingUser = await Model.findOne({ email: normalizedEmail });
        
        // Also check the other model type for email conflicts
        const OtherModel = userType === 'artisan' ? User : Artisan;
        const otherTypeRecord = await OtherModel.findOne({ email: normalizedEmail });
        
        if (otherTypeRecord) {
          console.error(`❌ Email conflict: Email exists as ${userType === 'artisan' ? 'user' : 'artisan'} but trying to register as ${userType}`);
          const error = new Error('EXISTING_EMAIL');
          error.userMessage = `This email is already registered as ${userType === 'artisan' ? 'a customer' : 'an artisan'}. Please use the correct login type or contact support.`;
          error.existingProvider = otherTypeRecord.authProvider || 'local';
          return done(error, null);
        }
        
        if (existingUser) {
          console.log('🔗 Found existing user with same email:', existingUser.email);
          console.log('   Current auth provider:', existingUser.authProvider);
          console.log('   Auth flow type:', authFlow);
          
          // Handle signup flow - user trying to signup with existing email
          if (authFlow === 'signup') {
            if (existingUser.authProvider === 'local' && !existingUser.googleId) {
              // Email exists as local account - cannot signup with Google
              console.error('❌ Signup attempt with existing local email:', existingUser.email);
              const error = new Error('EXISTING_EMAIL');
              error.userMessage = 'This email is already registered. Please use the login option instead.';
              error.existingProvider = 'local';
              return done(error, null);
            } else if (existingUser.googleId && existingUser.googleId !== profile.id) {
              // Email exists with different Google account
              console.error('❌ Signup attempt with existing Google email:', existingUser.email);
              const error = new Error('EXISTING_EMAIL');
              error.userMessage = 'This email is already registered with a different Google account.';
              error.existingProvider = 'google';
              return done(error, null);
            }
          }
          
          if (existingUser.googleId && existingUser.googleId !== profile.id) {
            // Email exists but linked to different Google account
            console.error('❌ Email linked to different Google account');
            return done(new Error('This email is already linked to a different Google account. Please sign in with your original Google account or contact support.'), null);
          }
          
          if (existingUser.authProvider === 'local' && !existingUser.googleId) {
            // This is a local account - add warning in logs for security audit
            console.warn('⚠️  Linking Google account to existing local account:', {
              email: existingUser.email,
              existingProvider: existingUser.authProvider,
              newProvider: 'google',
              googleId: profile.id
            });
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
        
        // Step 3: Handle new user creation based on auth flow
        if (authFlow === 'login') {
          // User trying to login but account doesn't exist
          console.error('❌ Login attempt with non-existent email:', normalizedEmail);
          const error = new Error('USER_NOT_FOUND');
          error.userMessage = 'No account found with this email. Please sign up first.';
          return done(error, null);
        }
        
        // Create new user/artisan with Google profile (signup flow)
        console.log(`🆕 Creating new Google ${modelName}:`, normalizedEmail);
        
        const userData = {
          name: profile.displayName || `Google ${modelName.charAt(0).toUpperCase() + modelName.slice(1)}`,
          email: normalizedEmail,
          googleId: profile.id,
          authProvider: 'google',
          picture: profile.photos?.[0]?.value,
          isEmailVerified: true,
          emailVerifiedAt: new Date()
        };
        
        // Add model-specific fields
        if (userType === 'user') {
          userData.profileImage = profile.photos?.[0]?.value || '';
          userData.preferences = {
            language: 'en',
            currency: 'INR',
            notifications: {
              email: true,
              sms: false, // No phone number yet
              push: true,
              marketing: false
            }
          };
        } else {
          userData.profileImage = profile.photos?.[0]?.value || '';
          // Artisan-specific defaults - craftType will be set during profile completion
        }
        
        const newUser = new Model(userData);
        
        await newUser.save();
        console.log(`✅ New Google ${modelName} created successfully:`, newUser.email);
        
        // Add userType for later processing
        newUser.userType = userType;
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

// Helper function to generate JWT token for OAuth users (User or Artisan)
const generateJWTToken = (user) => {
  const userType = user.userType || (user.craftType !== undefined ? 'artisan' : 'user');
  
  const payload = {
    id: user._id,
    email: user.email,
    type: userType,
    authProvider: user.authProvider
  };
  
  // For artisan tokens, use userType field for consistency with existing auth
  if (userType === 'artisan') {
    payload.userType = 'artisan';
  }

  return jwt.sign(payload, process.env.JWT_SECRET, { 
    expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
  });
};

module.exports = { passport, generateJWTToken };
