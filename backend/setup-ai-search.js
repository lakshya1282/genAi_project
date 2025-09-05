const mongoose = require('mongoose');
const Product = require('./models/Product');
const embeddingService = require('./services/embeddingService');
require('dotenv').config();

/**
 * Initialize AI search system
 */
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
      console.log('⚠️  No products found. AI search will work but won\\'t return results.');
      console.log('   Consider running seed data or adding products first.\n');
    }
    
    // Test AI services
    console.log('🧪 Testing AI Services...');
    
    // Test Gemini API
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const testPrompt = 'Respond with just "OK" if you can read this message.';\n      const result = await model.generateContent(testPrompt);\n      const response = await result.response;\n      \n      if (response.text().trim().toLowerCase().includes('ok')) {\n        console.log('✅ Gemini API is working');\n      } else {\n        console.log('⚠️  Gemini API responded but may have issues');\n      }\n    } catch (error) {\n      console.log('❌ Gemini API test failed:', error.message);\n    }\n    \n    // Test OpenAI API\n    try {\n      const { OpenAI } = require('openai');\n      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });\n      \n      const testEmbedding = await openai.embeddings.create({\n        model: 'text-embedding-ada-002',\n        input: 'test',\n      });\n      \n      if (testEmbedding.data && testEmbedding.data.length > 0) {\n        console.log('✅ OpenAI API is working');\n      } else {\n        console.log('⚠️  OpenAI API responded but may have issues');\n      }\n    } catch (error) {\n      console.log('❌ OpenAI API test failed:', error.message);\n    }\n    \n    console.log('\n🎉 AI Search System Initialization Complete!');\n    console.log('\nYour AI search system is ready to use with the following features:');\n    console.log('• 🔍 Natural language search queries');\n    console.log('• 💡 Smart search suggestions');\n    console.log('• 🎯 Semantic product matching');\n    console.log('• 📊 Search analytics and insights');\n    console.log('• 🚀 Fallback mechanisms for reliability\\n');\n    \n    console.log('Next steps:');\n    console.log('1. Start your backend server: npm run dev');\n    console.log('2. Test the AI search endpoints: node test-ai-search.js');\n    console.log('3. Try the frontend AI Search page in your browser');\n    console.log('4. Monitor search performance in analytics\\n');\n    \n  } catch (error) {\n    console.error('❌ Initialization failed:', error.message);\n  } finally {\n    await mongoose.disconnect();\n  }\n}\n\n/**\n * Generate sample embeddings for existing products\n */\nasync function generateSampleEmbeddings() {\n  console.log('🔗 Generating Sample Product Embeddings...\n');\n  \n  try {\n    const products = await Product.find().limit(10).lean();\n    \n    if (products.length === 0) {\n      console.log('⚠️  No products found to generate embeddings for');\n      return;\n    }\n    \n    console.log(`Processing ${products.length} products...`);\n    \n    for (const product of products) {\n      try {\n        const embedding = await embeddingService.generateProductEmbedding(product);\n        console.log(`✅ Generated embedding for \"${product.name}\"`);\n        \n        // Optional: Store embedding in database\n        // await Product.findByIdAndUpdate(product._id, { embedding });\n      } catch (error) {\n        console.log(`❌ Failed to generate embedding for \"${product.name}\": ${error.message}`);\n      }\n    }\n    \n    console.log('\\n✅ Sample embedding generation completed');\n  } catch (error) {\n    console.error('❌ Embedding generation failed:', error.message);\n  }\n}\n\n/**\n * Display usage information\n */\nfunction showUsage() {\n  console.log('📚 AI Search Setup Usage:');\n  console.log('\\nCommands:');\n  console.log('  node setup-ai-search.js           # Initialize AI search system');\n  console.log('  node setup-ai-search.js --embeddings   # Generate sample embeddings');\n  console.log('  node setup-ai-search.js --help         # Show this help');\n  console.log('\\nEnvironment Setup:');\n  console.log('1. Copy .env.example to .env');\n  console.log('2. Add your GEMINI_API_KEY and OPENAI_API_KEY');\n  console.log('3. Run this setup script');\n  console.log('4. Start the server and test functionality\\n');\n}\n\n// Main execution\nif (require.main === module) {\n  const args = process.argv.slice(2);\n  \n  if (args.includes('--help')) {\n    showUsage();\n  } else if (args.includes('--embeddings')) {\n    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/artisan-marketplace')\n      .then(generateSampleEmbeddings)\n      .then(() => mongoose.disconnect())\n      .catch(error => {\n        console.error('❌ Setup failed:', error.message);\n        process.exit(1);\n      });\n  } else {\n    initializeAISearch();\n  }\n}\n\nmodule.exports = {\n  initializeAISearch,\n  generateSampleEmbeddings\n};
