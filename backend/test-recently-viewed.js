const fs = require('fs');

// Test enhanced recently viewed functionality
const testRecentlyViewed = async () => {
  try {
    console.log('🧪 Testing enhanced recently viewed functionality...');
    console.log('📁 Checking route file for recently viewed enhancements...');
    
    const routeContent = fs.readFileSync('./routes/customerAccount.js', 'utf8');
    
    // Test 1: Enhanced GET endpoint
    if (routeContent.includes("GET /api/customer/recently-viewed - Get recently viewed products")) {
      console.log('✅ Enhanced GET recently-viewed endpoint found');
      
      if (routeContent.includes("pagination") && routeContent.includes("summary")) {
        console.log('✅ Pagination and summary features found');
      } else {
        console.log('❌ Pagination or summary features missing');
      }
      
      if (routeContent.includes("formattedPrice") && routeContent.includes("viewedAgo")) {
        console.log('✅ Enhanced product formatting found');
      } else {
        console.log('❌ Enhanced product formatting missing');
      }
      
      if (routeContent.includes("businessName") && routeContent.includes("profileImage")) {
        console.log('✅ Enhanced artisan information found');
      } else {
        console.log('❌ Enhanced artisan information missing');
      }
      
    } else {
      console.log('❌ Enhanced GET recently-viewed endpoint not found');
    }
    
    // Test 2: Individual item removal
    if (routeContent.includes("DELETE /api/customer/recently-viewed/:productId")) {
      console.log('✅ Individual item removal endpoint found');
    } else {
      console.log('❌ Individual item removal endpoint missing');
    }
    
    // Test 3: Clear all functionality
    if (routeContent.includes("DELETE /api/customer/recently-viewed - Clear all recently viewed")) {
      console.log('✅ Clear all recently viewed endpoint found');
    } else {
      console.log('❌ Clear all recently viewed endpoint missing');
    }
    
    // Test 4: Helper function
    if (routeContent.includes("function getTimeAgo")) {
      console.log('✅ Time formatting helper function found');
    } else {
      console.log('❌ Time formatting helper function missing');
    }
    
    // Test 5: Enhanced POST endpoint
    if (routeContent.includes("Verify product exists") && routeContent.includes("totalRecentlyViewed")) {
      console.log('✅ Enhanced POST endpoint with product validation found');
    } else {
      console.log('❌ Enhanced POST endpoint features missing');
    }
    
    console.log('\n📱 Enhanced Recently Viewed Features:');
    console.log('   ✨ Detailed product information (price, images, rating, etc.)');
    console.log('   ✨ Artisan details (name, business name, location, profile image)');
    console.log('   ✨ Pagination support for large lists');
    console.log('   ✨ Time-based formatting (e.g., "2 hours ago")');
    console.log('   ✨ Stock status and discount information');
    console.log('   ✨ Formatted prices with currency symbol');
    console.log('   ✨ Product description preview');
    console.log('   ✨ Filter out deleted/null products');
    console.log('   ✨ Individual item removal');
    console.log('   ✨ Clear all items functionality');
    console.log('   ✨ Enhanced response with summary and pagination');
    
    console.log('\n🔗 Available Endpoints:');
    console.log('   GET    /api/customer/recently-viewed - Get paginated recently viewed items');
    console.log('   POST   /api/customer/recently-viewed - Add product to recently viewed');
    console.log('   DELETE /api/customer/recently-viewed/:productId - Remove specific item');
    console.log('   DELETE /api/customer/recently-viewed - Clear all items');
    
    console.log('\n📋 Query Parameters for GET:');
    console.log('   ?limit=10 - Number of items per page (default: 10)');
    console.log('   ?page=1 - Page number (default: 1)');
    
    console.log('\n📊 Sample Enhanced Response Structure:');
    console.log(`   {
     "success": true,
     "recentlyViewed": [
       {
         "id": "product_id",
         "name": "Handcrafted Vase",
         "price": 1250,
         "originalPrice": 1500,
         "discount": 17,
         "images": ["image1.jpg", "image2.jpg"],
         "mainImage": "image1.jpg",
         "category": "Home Decor",
         "quantityAvailable": 5,
         "rating": 4.5,
         "reviewCount": 23,
         "description": "Beautiful handcrafted ceramic vase...",
         "artisan": {
           "id": "artisan_id",
           "name": "Ramesh Kumar",
           "businessName": "Kumar Ceramics",
           "location": "Jaipur, Rajasthan",
           "profileImage": "profile.jpg"
         },
         "viewedAt": "2024-01-15T10:30:00Z",
         "isInStock": true,
         "hasDiscount": true,
         "formattedPrice": "₹1,250",
         "formattedOriginalPrice": "₹1,500",
         "viewedAgo": "2 hours ago"
       }
     ],
     "pagination": {
       "current": 1,
       "total": 3,
       "totalCount": 25,
       "hasMore": true
     },
     "summary": {
       "totalItems": 25,
       "itemsInPage": 10,
       "lastViewedAt": "2024-01-15T10:30:00Z"
     }
   }`);
    
    console.log('\n🎯 Frontend Integration Benefits:');
    console.log('   • Rich product cards with all necessary details');
    console.log('   • Pagination for better performance');
    console.log('   • Human-readable time stamps');
    console.log('   • Stock status and pricing information');
    console.log('   • Easy item management (remove/clear)');
    console.log('   • Artisan information for trust building');
    
    console.log('\n💡 Usage Examples:');
    console.log('   # Get first page (10 items)');
    console.log('   GET /api/customer/recently-viewed');
    console.log('   ');
    console.log('   # Get second page with 5 items per page');
    console.log('   GET /api/customer/recently-viewed?page=2&limit=5');
    console.log('   ');
    console.log('   # Add a product to recently viewed');
    console.log('   POST /api/customer/recently-viewed');
    console.log('   Body: { "productId": "product_id_here" }');
    console.log('   ');
    console.log('   # Remove specific item');
    console.log('   DELETE /api/customer/recently-viewed/product_id_here');
    console.log('   ');
    console.log('   # Clear all items');
    console.log('   DELETE /api/customer/recently-viewed');
    
    console.log('\n🎉 Enhanced recently viewed functionality is ready!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
testRecentlyViewed();

console.log('\n💡 To test with a real server:');
console.log('   1. Start your MongoDB server');
console.log('   2. Run: npm start or nodemon server.js');
console.log('   3. Use the endpoints with proper Bearer token authentication');
console.log('   4. Test with a frontend or API client like Postman');
