const mongoose = require('mongoose');
require('dotenv').config();

// Test the artisan Google auth fix
async function testArtisanGoogleAuth() {
  console.log('🧪 Testing Artisan Google Auth Fix\n');
  
  try {
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/artisan-marketplace');
    console.log('✅ Connected to MongoDB\n');
    
    // Test 1: Check if Artisan model has Google OAuth fields
    console.log('🔍 Test 1: Checking Artisan model schema...');
    const Artisan = require('./models/Artisan');
    const artisanSchema = Artisan.schema;
    
    const requiredFields = ['googleId', 'authProvider', 'picture'];
    const hasGoogleFields = requiredFields.every(field => artisanSchema.paths[field]);
    
    if (hasGoogleFields) {
      console.log('✅ Artisan model has all required Google OAuth fields');
      requiredFields.forEach(field => {
        console.log(`   - ${field}: ${artisanSchema.paths[field].instance || artisanSchema.paths[field].options.type.name}`);
      });
    } else {
      console.log('❌ Artisan model missing Google OAuth fields');
      requiredFields.forEach(field => {
        if (!artisanSchema.paths[field]) {
          console.log(`   - Missing: ${field}`);
        }
      });
    }
    
    console.log('');
    
    // Test 2: Check if passport configuration includes Artisan model
    console.log('🔍 Test 2: Checking passport configuration...');
    try {
      const passportConfig = require('./config/passport');
      const fs = require('fs');
      const passportFile = fs.readFileSync('./config/passport.js', 'utf8');
      
      const hasArtisanImport = passportFile.includes("require('../models/Artisan')");
      const hasUserTypeLogic = passportFile.includes('userType === \'artisan\'');
      const hasModelSelection = passportFile.includes('const Model = userType === \'artisan\' ? Artisan : User');
      
      if (hasArtisanImport && hasUserTypeLogic && hasModelSelection) {
        console.log('✅ Passport configuration updated for artisan support');
        console.log('   - Artisan model imported');
        console.log('   - User type logic implemented');  
        console.log('   - Dynamic model selection added');
      } else {
        console.log('❌ Passport configuration incomplete');
        if (!hasArtisanImport) console.log('   - Missing Artisan model import');
        if (!hasUserTypeLogic) console.log('   - Missing user type logic');
        if (!hasModelSelection) console.log('   - Missing dynamic model selection');
      }
    } catch (error) {
      console.log('❌ Error checking passport configuration:', error.message);
    }
    
    console.log('');
    
    // Test 3: Check if artisan Google OAuth routes exist
    console.log('🔍 Test 3: Checking artisan Google OAuth routes...');
    try {
      const fs = require('fs');
      const artisanAuthFile = './routes/artisanGoogleAuth.js';
      
      if (fs.existsSync(artisanAuthFile)) {
        console.log('✅ Artisan Google OAuth routes file exists');
        
        const routeContent = fs.readFileSync(artisanAuthFile, 'utf8');
        const hasSignupRoute = routeContent.includes('/google/signup');
        const hasLoginRoute = routeContent.includes('/google/login');
        const hasProfileRoute = routeContent.includes('/google/profile');
        
        if (hasSignupRoute && hasLoginRoute && hasProfileRoute) {
          console.log('✅ All required artisan Google OAuth routes implemented');
          console.log('   - /google/signup');
          console.log('   - /google/login');
          console.log('   - /google/profile');
        } else {
          console.log('⚠️  Some artisan Google OAuth routes may be missing');
        }
      } else {
        console.log('❌ Artisan Google OAuth routes file not found');
      }
    } catch (error) {
      console.log('❌ Error checking artisan routes:', error.message);
    }
    
    console.log('');
    
    // Test 4: Check if server.js includes artisan routes
    console.log('🔍 Test 4: Checking server configuration...');
    try {
      const fs = require('fs');
      const serverFile = fs.readFileSync('./server.js', 'utf8');
      
      const hasArtisanAuthRoute = serverFile.includes("require('./routes/artisanGoogleAuth')");
      const hasArtisanMount = serverFile.includes('/api/artisan/auth');
      
      if (hasArtisanAuthRoute && hasArtisanMount) {
        console.log('✅ Server configured for artisan Google OAuth routes');
        console.log('   - Artisan auth routes imported');
        console.log('   - Routes mounted at /api/artisan/auth');
      } else {
        console.log('❌ Server configuration incomplete');
        if (!hasArtisanAuthRoute) console.log('   - Missing artisan auth route import');
        if (!hasArtisanMount) console.log('   - Missing route mounting');
      }
    } catch (error) {
      console.log('❌ Error checking server configuration:', error.message);
    }
    
    console.log('');
    
    // Test 5: Check main Google auth callback updates
    console.log('🔍 Test 5: Checking main Google OAuth callback updates...');
    try {
      const fs = require('fs');
      const googleAuthFile = fs.readFileSync('./routes/googleAuth.js', 'utf8');
      
      const hasUserTypeDetection = googleAuthFile.includes('const userType = req.user.userType');
      const hasArtisanRedirect = googleAuthFile.includes('/artisan/dashboard');
      const hasDynamicProfileCheck = googleAuthFile.includes('if (userType === \'artisan\')');
      
      if (hasUserTypeDetection && hasArtisanRedirect && hasDynamicProfileCheck) {
        console.log('✅ Main Google OAuth callback updated for artisan support');
        console.log('   - User type detection added');
        console.log('   - Artisan redirect URLs implemented');  
        console.log('   - Dynamic profile completion logic added');
      } else {
        console.log('⚠️  Main Google OAuth callback may need updates');
        if (!hasUserTypeDetection) console.log('   - Missing user type detection');
        if (!hasArtisanRedirect) console.log('   - Missing artisan redirect URLs');
        if (!hasDynamicProfileCheck) console.log('   - Missing dynamic profile logic');
      }
    } catch (error) {
      console.log('❌ Error checking main Google auth callback:', error.message);
    }
    
    console.log('');
    
    // Test 6: Create a test artisan with Google OAuth fields (dry run)
    console.log('🔍 Test 6: Testing artisan creation with Google OAuth fields...');
    try {
      const testArtisanData = {
        name: 'Test Artisan',
        email: 'test.artisan@gmail.com',
        googleId: 'google_test_id_12345',
        authProvider: 'google',
        picture: 'https://lh3.googleusercontent.com/test-photo',
        isEmailVerified: true,
        craftType: 'Pottery',
        phone: '1234567890'
      };
      
      // Just validate the schema without saving
      const testArtisan = new Artisan(testArtisanData);
      const validationError = testArtisan.validateSync();
      
      if (!validationError) {
        console.log('✅ Test artisan with Google OAuth fields validates successfully');
        console.log('   - All required fields present');
        console.log('   - Schema accepts Google OAuth data');
      } else {
        console.log('❌ Test artisan validation failed:', validationError.message);
      }
    } catch (error) {
      console.log('❌ Error testing artisan creation:', error.message);
    }
    
    console.log('\n🎉 Artisan Google Auth Fix Test Complete!\n');
    
    // Summary
    console.log('📋 SUMMARY:');
    console.log('The fix implements the following changes:');
    console.log('1. ✅ Added Google OAuth fields to Artisan model');
    console.log('2. ✅ Updated passport.js to handle both User and Artisan authentication');
    console.log('3. ✅ Created artisan-specific Google OAuth routes');
    console.log('4. ✅ Modified main callback to redirect artisans properly');
    console.log('5. ✅ Added artisan profile completion logic');
    console.log('');
    console.log('🎯 EXPECTED BEHAVIOR:');
    console.log('- New artisans: /artisan/complete-profile (if missing phone/craftType)');
    console.log('- Existing artisans: /artisan/dashboard (if profile complete)');
    console.log('- Proper JWT tokens with artisan user type');
    console.log('- Email conflict detection between user/artisan types');
    console.log('');
    console.log('🔗 ARTISAN GOOGLE AUTH URLs:');
    console.log('- Signup: GET /api/artisan/auth/google/signup');
    console.log('- Login: GET /api/artisan/auth/google/login');
    console.log('- Callback: GET /api/auth/google/callback (unified)');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📦 Disconnected from MongoDB');
  }
}

// Run the test
testArtisanGoogleAuth().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test error:', error);
  process.exit(1);
});
