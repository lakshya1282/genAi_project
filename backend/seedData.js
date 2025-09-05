const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Artisan = require('./models/Artisan');
const Product = require('./models/Product');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/artisan-marketplace');
    console.log('MongoDB Connected for seeding');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    // Clear existing data
    await Artisan.deleteMany({});
    await Product.deleteMany({});

    // Hash password for demo user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('demo123', salt);

    // Create sample artisans
    const artisans = await Artisan.create([
      {
        name: 'Rajesh Kumar',
        email: 'demo@artisan.com',
        password: hashedPassword,
        phone: '+91 9876543210',
        location: {
          city: 'Jaipur',
          state: 'Rajasthan',
          country: 'India'
        },
        craftType: 'Pottery',
        bio: 'Traditional pottery artisan specializing in Jaipur blue pottery',
        story: 'Meet Rajesh Kumar, a passionate pottery artisan from Jaipur. With over 15 years of experience, Rajesh has dedicated his life to preserving the ancient art of pottery. Growing up in a family of craftspeople, he learned the intricate techniques passed down through generations. Today, Rajesh continues this beautiful tradition, creating unique pieces that tell stories of culture, heritage, and skilled craftsmanship.',
        experience: 15,
        isVerified: true,
        rating: 4.8,
        socialMedia: {
          instagram: '@rajesh_pottery',
          whatsapp: '+919876543210'
        }
      },
      {
        name: 'Meera Devi',
        email: 'meera@artisan.com',
        password: hashedPassword,
        phone: '+91 8765432109',
        location: {
          city: 'Varanasi',
          state: 'Uttar Pradesh',
          country: 'India'
        },
        craftType: 'Weaving',
        bio: 'Master weaver specializing in Banarasi silk textiles',
        story: 'Meera Devi discovered her calling in weaving at a young age in Varanasi. What started as a childhood fascination has blossomed into a lifelong passion for preserving traditional Indian crafts. Every piece created by Meera is a testament to the rich cultural heritage of India, combining traditional techniques with contemporary aesthetics to create timeless works of art.',
        experience: 20,
        isVerified: true,
        rating: 4.9,
        socialMedia: {
          instagram: '@meera_weaves',
          facebook: 'MeeraTraditionalWeaves'
        }
      },
      {
        name: 'Anita Sharma',
        email: 'anita@artisan.com',
        password: hashedPassword,
        phone: '+91 7654321098',
        location: {
          city: 'Pushkar',
          state: 'Rajasthan',
          country: 'India'
        },
        craftType: 'Jewelry',
        bio: 'Silver jewelry artisan creating contemporary pieces with traditional techniques',
        story: 'In the heart of Pushkar, Anita Sharma practices the ancient art of jewelry making. Her journey began under the guidance of master craftspeople, learning secrets and techniques that have been carefully preserved for centuries. Anita believes that each creation should not only be beautiful but also carry the soul and story of the artisan who made it.',
        experience: 12,
        isVerified: true,
        rating: 4.7,
        socialMedia: {
          instagram: '@anita_silver_arts',
          whatsapp: '+917654321098'
        }
      }
    ]);

    console.log('Sample artisans created:', artisans.length);

    // Create sample products
    const products = await Product.create([
      {
        name: 'Traditional Blue Pottery Vase',
        description: 'Beautiful handcrafted vase with traditional Jaipur blue pottery design',
        aiEnhancedDescription: 'This exquisite handcrafted pottery piece embodies centuries of traditional Indian craftsmanship. Beautiful handcrafted vase with traditional Jaipur blue pottery design. Each curve and glaze tells a story of dedication, skill passed down through generations. Made with locally sourced clay and traditional firing techniques, this piece represents the rich cultural heritage of Indian pottery artisans.',
        price: 1200,
        category: 'Pottery',
        artisan: artisans[0]._id,
        materials: ['Clay', 'Natural pigments', 'Traditional glazes'],
        dimensions: {
          length: 15,
          width: 15,
          height: 25,
          weight: 800
        },
        craftingTime: '1 week',
        tags: ['handmade', 'pottery', 'traditional', 'jaipur', 'blue-pottery'],
        aiGeneratedTags: ['handmade', 'indian-craft', 'traditional', 'authentic', 'cultural-heritage', 'ceramic', 'clay', 'terracotta', 'earthenware', 'home-decor'],
        marketingContent: {
          socialMediaPost: '🎨 Discover authentic Indian craftsmanship! ✨ Traditional Blue Pottery Vase - handcrafted with love and tradition. Each piece tells a unique story of cultural heritage. 🇮🇳 #HandmadeinIndia #ArtisanCrafts #Pottery #SupportLocal #TraditionalArt',
          productStory: 'This Traditional Blue Pottery Vase is more than just a product - it\'s a piece of living history. Crafted using traditional pottery techniques that have been perfected over generations, every detail reflects the artisan\'s deep connection to their cultural roots.',
          targetAudience: 'Home decor enthusiasts, collectors, mindful consumers'
        },
        views: 45,
        likes: 12
      },
      {
        name: 'Handwoven Silk Scarf',
        description: 'Elegant silk scarf with traditional Banarasi weaving patterns',
        aiEnhancedDescription: 'This beautiful textile showcases the rich weaving traditions of India. Elegant silk scarf with traditional Banarasi weaving patterns. Handwoven with precision and care, each thread represents hours of dedicated craftsmanship and cultural storytelling through fabric.',
        price: 850,
        category: 'Textiles',
        artisan: artisans[1]._id,
        materials: ['Pure silk', 'Gold thread', 'Natural dyes'],
        dimensions: {
          length: 180,
          width: 70,
          weight: 150
        },
        craftingTime: '2 weeks',
        tags: ['silk', 'scarf', 'banarasi', 'handwoven', 'traditional'],
        aiGeneratedTags: ['handmade', 'indian-craft', 'traditional', 'authentic', 'cultural-heritage', 'handwoven', 'fabric', 'traditional-textile', 'indian-textile', 'handloom'],
        marketingContent: {
          socialMediaPost: '🎨 Discover authentic Indian craftsmanship! ✨ Handwoven Silk Scarf - handcrafted with love and tradition. Each piece tells a unique story of cultural heritage. 🇮🇳 #HandmadeinIndia #ArtisanCrafts #Textiles #SupportLocal #TraditionalArt',
          productStory: 'This Handwoven Silk Scarf is more than just a product - it\'s a piece of living history. Crafted using traditional textiles techniques that have been perfected over generations, every detail reflects the artisan\'s deep connection to their cultural roots.',
          targetAudience: 'Interior designers, cultural appreciators, eco-conscious buyers'
        },
        views: 32,
        likes: 8
      },
      {
        name: 'Silver Oxidized Earrings',
        description: 'Traditional oxidized silver earrings with intricate tribal patterns',
        aiEnhancedDescription: 'A stunning piece of handcrafted jewelry that captures the essence of Indian artisanship. Traditional oxidized silver earrings with intricate tribal patterns. Meticulously designed using time-honored techniques, this jewelry piece reflects the intricate beauty of traditional Indian metalwork and gemstone setting.',
        price: 450,
        category: 'Jewelry',
        artisan: artisans[2]._id,
        materials: ['Sterling silver', 'Oxidized finish', 'Traditional tools'],
        dimensions: {
          length: 4,
          width: 2,
          weight: 15
        },
        craftingTime: '1-3 days',
        tags: ['silver', 'earrings', 'oxidized', 'tribal', 'traditional'],
        aiGeneratedTags: ['handmade', 'indian-craft', 'traditional', 'authentic', 'cultural-heritage', 'handcrafted-jewelry', 'traditional-jewelry', 'indian-jewelry', 'ethnic', 'accessories'],
        marketingContent: {
          socialMediaPost: '🎨 Discover authentic Indian craftsmanship! ✨ Silver Oxidized Earrings - handcrafted with love and tradition. Each piece tells a unique story of cultural heritage. 🇮🇳 #HandmadeinIndia #ArtisanCrafts #Jewelry #SupportLocal #TraditionalArt',
          productStory: 'These Silver Oxidized Earrings are more than just a product - they\'re a piece of living history. Crafted using traditional jewelry techniques that have been perfected over generations, every detail reflects the artisan\'s deep connection to their cultural roots.',
          targetAudience: 'Fashion-conscious individuals, gift buyers, cultural enthusiasts'
        },
        views: 67,
        likes: 18
      }
    ]);

    console.log('Sample products created:', products.length);
    console.log('Database seeded successfully!');
    
    console.log('\n=== DEMO CREDENTIALS ===');
    console.log('Email: demo@artisan.com');
    console.log('Password: demo123');
    console.log('========================\n');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    mongoose.connection.close();
  }
};

const runSeeder = async () => {
  await connectDB();
  await seedData();
};

if (require.main === module) {
  runSeeder();
}

module.exports = { seedData, connectDB };
