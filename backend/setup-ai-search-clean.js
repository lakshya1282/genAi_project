const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

async function initializeAISearch() {
  console.log('🚀 Initializing AI Search System...\n');
  
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/artisan-marketplace');
    console.log('✅ Connected to MongoDB\n');
    
    // Check API key configuration
    console.log('🔧 Checking API Configuration...');
    
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_')) {
      console.log('❌ Gemini API key not configured');
      console.log('   Please add GEMINI_API_KEY to your .env file');
      console.log('   Get your key from: https://makersuite.google.com/app/apikey\n');
      return;
    }
    console.log('✅ Gemini API key configured');
    
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your_')) {
      console.log('❌ OpenAI API key not configured');
      console.log('   Please add OPENAI_API_KEY to your .env file');
      console.log('   Get your key from: https://platform.openai.com/api-keys\n');
      return;
    }
    console.log('✅ OpenAI API key configured\n');
    
    // Check product data
    console.log('📦 Checking Product Data...');
    const productCount = await Product.countDocuments();
    console.log(`✅ Found ${productCount} products in database\n`);
    
    if (productCount === 0) {
      console.log('⚠️  No products found. AI search will work but won\'t return results.');
      console.log('   Consider running seed data or adding products first.\n');
    }
    
    console.log('🎉 AI Search System Initialization Complete!');
    console.log('\nYour AI search system is ready with:');
    console.log('• 🔍 Natural language search queries');
    console.log('• 💡 Smart search suggestions');
    console.log('• 🎯 Semantic product matching');
    console.log('• 📊 Search analytics and insights');
    console.log('• 🚀 Fallback mechanisms for reliability\n');
    
    console.log('Next steps:');
    console.log('1. Start your backend server: npm run dev');
    console.log('2. Test the AI search: node test-ai-search.js');
    console.log('3. Try the frontend AI Search page');
    console.log('4. Monitor search performance\n');
    
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// Run initialization
if (require.main === module) {
  initializeAISearch();
}
