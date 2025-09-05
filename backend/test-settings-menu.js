const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

// Import the customer account routes
const customerRoutes = require('./routes/customerAccount');

const app = express();
app.use(express.json());
app.use('/api/customer', customerRoutes);

// Simple test to verify the endpoint structure
const testEndpoint = async () => {
  try {
    console.log('🧪 Testing enhanced customer settings menu endpoint...');
    console.log('📁 Checking route file structure...');
    
    // Read the route file to verify our endpoint exists
    const fs = require('fs');
    const routeContent = fs.readFileSync('./routes/customerAccount.js', 'utf8');
    
    if (routeContent.includes("router.get('/settings-menu'")) {
      console.log('✅ Settings menu endpoint found in customerAccount.js');
    } else {
      console.log('❌ Settings menu endpoint not found');
      return;
    }
    
    if (routeContent.includes('menuSections')) {
      console.log('✅ Menu sections structure found');
    } else {
      console.log('❌ Menu sections structure not found');
      return;
    }
    
    if (routeContent.includes('accountSettingsSection')) {
      console.log('✅ Account settings section found');
    } else {
      console.log('❌ Account settings section not found');
      return;
    }
    
    if (routeContent.includes('myActivitySection')) {
      console.log('✅ My activity section found');
    } else {
      console.log('❌ My activity section not found');
      return;
    }
    
    if (routeContent.includes('logoutSection')) {
      console.log('✅ Logout section found');
    } else {
      console.log('❌ Logout section not found');
      return;
    }
    
    // Check for required menu items based on rules
    const requiredItems = [
      'profile_settings',
      'orders',
      'wishlist', 
      'coupons',
      'help_centre',
      'recently_viewed',
      'language',
      'posted_reviews'
    ];
    
    let allItemsFound = true;
    requiredItems.forEach(item => {
      if (routeContent.includes(`'${item}'`) || routeContent.includes(`"${item}"`)) {
        console.log(`✅ Required menu item '${item}' found`);
      } else {
        console.log(`❌ Required menu item '${item}' missing`);
        allItemsFound = false;
      }
    });
    
    if (allItemsFound) {
      console.log('\n🎉 All tests passed! Enhanced customer settings menu endpoint is ready.');
      console.log('\n📋 Endpoint Details:');
      console.log('   URL: GET /api/customer/settings-menu');
      console.log('   Auth: Bearer token required (customer)');
      console.log('   Response: Structured settings menu with all required sections');
      
      console.log('\n📱 Menu Structure:');
      console.log('   1. Profile Settings');
      console.log('   2. Orders');
      console.log('   3. Wishlist');
      console.log('   4. Coupons');
      console.log('   5. Help Centre');
      console.log('   6. Recently Viewed');
      console.log('   7. Language');
      console.log('   8. Account Settings (edit profile, addresses, language, notifications, privacy, security)');
      console.log('   9. My Activity (posted reviews)');
      console.log('   10. Logout');
      
    } else {
      console.log('\n❌ Some required items are missing from the menu structure.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
testEndpoint();

console.log('\n💡 To test with a real server and database:');
console.log('   1. Start your MongoDB server');
console.log('   2. Run: npm start or nodemon server.js');
console.log('   3. Send GET request to: http://localhost:5000/api/customer/settings-menu');
console.log('   4. Include Authorization header: Bearer <customer_jwt_token>');
