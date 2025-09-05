# 🎨 ArtisanAI - AI-Powered Marketplace for Local Artisans

An innovative MERN stack platform that empowers Indian artisans with AI-driven marketing tools, storytelling assistance, and digital marketplace capabilities.

## 🌟 Features
this is delete functio 
### For Artisans:
- **AI Story Generation**: Craft compelling narratives about their journey and traditions
- **Enhanced Product Descriptions**: Transform basic descriptions into engaging, culturally-rich content
- **Smart Marketing Content**: Generate social media posts and identify target audiences
- **Market Insights**: AI-powered analytics and recommendations
- **Digital Marketplace**: Showcase products to a global audience
- **Dashboard**: Manage products, view analytics, and access AI tools

### For Customers:
- **Curated Marketplace**: Browse authentic handcrafted products
- **Artisan Stories**: Learn about the craftspeople behind the products
- **Cultural Context**: Understand the heritage and significance of each craft
- **Advanced Search**: Find products by category, artisan, or keywords

## 🚀 Technology Stack

- **Frontend**: React.js with modern hooks and context API
- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **AI Integration**: OpenAI API (expandable to Google Cloud AI)
- **Authentication**: JWT-based authentication
- **Styling**: Custom CSS with responsive design

## 📁 Project Structure

```
artisan-marketplace/
├── backend/
│   ├── models/
│   │   ├── Artisan.js
│   │   └── Product.js
│   ├── routes/
│   │   ├── artisans.js
│   │   ├── products.js
│   │   └── ai.js
│   ├── seedData.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── App.js
│   │   └── App.css
│   └── package.json
└── package.json
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Quick Start

1. **Clone and Install Dependencies**
   ```bash
   cd artisan-marketplace
   npm run install-all
   ```

2. **Setup Environment Variables**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB**
   ```bash
   # For local MongoDB
   mongod
   ```

4. **Seed Sample Data** (Optional)
   ```bash
   cd backend
   node seedData.js
   ```

5. **Start the Application**
   ```bash
   # From root directory
   npm run dev
   ```

   Or start separately:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && npm start
   ```

### URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

### Demo Credentials
- **Email**: demo@artisan.com
- **Password**: demo123

## 🤖 AI Features

### 1. Story Generation
- Automatically generates compelling artisan stories based on profile information
- Incorporates cultural context and traditional craft heritage
- Customizable with additional prompts

### 2. Product Description Enhancement
- Transforms basic descriptions into engaging narratives
- Adds cultural significance and craftsmanship details
- Optimized for customer engagement

### 3. Marketing Content Creation
- Generates social media posts with relevant hashtags
- Creates product stories for better customer connection
- Identifies target audiences for better marketing

### 4. Market Insights
- Provides analytics on product performance
- Offers AI-powered recommendations for improvement
- Tracks market trends and pricing strategies

## 📱 API Endpoints

### Artisans
- `POST /api/artisans/register` - Register new artisan
- `POST /api/artisans/login` - Artisan login
- `GET /api/artisans` - Get all verified artisans
- `GET /api/artisans/:id` - Get artisan profile
- `PUT /api/artisans/:id` - Update artisan profile

### Products
- `GET /api/products` - Get all products (with pagination/filtering)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/artisan/:artisanId` - Get products by artisan

### AI Features
- `POST /api/ai/enhance-description` - Enhance product description
- `POST /api/ai/generate-story` - Generate artisan story
- `POST /api/ai/generate-marketing` - Generate marketing content
- `POST /api/ai/generate-tags` - Generate product tags
- `GET /api/ai/insights/:artisanId` - Get market insights

## 🎯 Hackathon MVP Features

This MVP includes:

✅ **Core Marketplace**: Browse and search products
✅ **Artisan Registration/Login**: User authentication system
✅ **AI Story Generation**: Create compelling artisan narratives
✅ **AI Description Enhancement**: Improve product descriptions
✅ **AI Marketing Content**: Generate social media posts and tags
✅ **Dashboard**: Artisan management interface
✅ **Responsive Design**: Mobile-friendly interface
✅ **Sample Data**: Pre-loaded demo content

## 🔮 Future Enhancements

- **Real AI Integration**: Connect with OpenAI GPT-4 or Google Cloud AI
- **Image Upload**: Product and profile image management
- **Payment Integration**: Razorpay/Stripe for transactions
- **Advanced Analytics**: Detailed sales and engagement metrics
- **Multi-language Support**: Regional language content generation
- **Mobile App**: React Native mobile application
- **Video Stories**: AI-generated video content for products
- **Recommendation Engine**: Personalized product suggestions

## 🌍 Social Impact

This platform addresses critical challenges faced by Indian artisans:

- **Digital Divide**: Provides easy-to-use digital marketing tools
- **Language Barriers**: AI helps create professional content
- **Market Access**: Connects artisans with global customers
- **Cultural Preservation**: Promotes traditional crafts and stories
- **Economic Empowerment**: Increases artisan income through better marketing

## 👥 Target Users

- **Primary**: Local artisans and craftspeople
- **Secondary**: Craft enthusiasts and cultural preservationists
- **Tertiary**: Tourists and gift buyers

## 🏆 Hackathon Presentation Points

1. **Problem Statement**: Digital marketing challenges for traditional artisans
2. **AI Solution**: Automated content generation and market insights
3. **Technical Innovation**: MERN stack with AI integration
4. **Social Impact**: Preserving cultural heritage while empowering artisans
5. **Scalability**: Extensible platform for global artisan communities
6. **Demo**: Live demonstration of AI features and marketplace

## 📊 Metrics for Success

- Number of artisans onboarded
- Products listed with AI-enhanced content
- Customer engagement with AI-generated stories
- Increase in artisan sales and reach
- Platform usage and retention rates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Indian artisan communities for their rich cultural heritage
- Open source contributors and the MERN stack community
- AI/ML research community for advancing accessible AI tools

---

**Built with ❤️ for Indian Artisans**
