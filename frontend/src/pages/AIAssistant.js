import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import './AIAssistant.css';

const AIAssistant = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('story');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});

  // Story Generation
  const [storyData, setStoryData] = useState({
    artisanId: user?.id || '',
    customPrompt: ''
  });

  // Product Enhancement
  const [productData, setProductData] = useState({
    originalDescription: '',
    craftType: '',
    materials: '',
    productName: ''
  });

  // Marketing Content
  const [marketingData, setMarketingData] = useState({
    productId: '',
    productName: '',
    category: '',
    description: ''
  });

  const generateStory = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to use AI features');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/ai/generate-story', {
        artisanId: user.id
      });
      
      setResults({ ...results, story: response.data.story });
      toast.success('Story generated successfully!');
    } catch (error) {
      toast.error('Failed to generate story');
    }
    setLoading(false);
  };

  const enhanceDescription = async () => {
    if (!productData.originalDescription || !productData.craftType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/ai/enhance-description', {
        originalDescription: productData.originalDescription,
        craftType: productData.craftType,
        materials: productData.materials
      });
      
      setResults({ ...results, enhancedDescription: response.data.enhancedDescription });
      toast.success('Description enhanced successfully!');
    } catch (error) {
      toast.error('Failed to enhance description');
    }
    setLoading(false);
  };

  const generateMarketing = async () => {
    if (!marketingData.productName || !marketingData.category) {
      toast.error('Please fill in product name and category');
      return;
    }

    setLoading(true);
    try {
      // Simulate product for marketing generation
      const mockProduct = {
        name: marketingData.productName,
        category: marketingData.category,
        description: marketingData.description
      };

      const response = await axios.post('/api/ai/generate-tags', {
        productName: mockProduct.name,
        category: mockProduct.category,
        description: mockProduct.description
      });

      const marketingContent = {
        socialMediaPost: `🎨 Discover authentic Indian craftsmanship! ✨ ${mockProduct.name} - handcrafted with love and tradition. Each piece tells a unique story of cultural heritage. 🇮🇳 #HandmadeinIndia #ArtisanCrafts #${mockProduct.category} #SupportLocal #TraditionalArt`,
        productStory: `This ${mockProduct.name} is more than just a product - it's a piece of living history. Crafted using traditional ${mockProduct.category.toLowerCase()} techniques that have been perfected over generations, every detail reflects the artisan's deep connection to their cultural roots.`,
        targetAudience: mockProduct.category === 'Jewelry' ? 'Fashion-conscious individuals, gift buyers, cultural enthusiasts' :
                        mockProduct.category === 'Pottery' ? 'Home decor enthusiasts, collectors, mindful consumers' :
                        'Art collectors, cultural enthusiasts, unique gift seekers',
        tags: response.data.tags
      };
      
      setResults({ ...results, marketing: marketingContent });
      toast.success('Marketing content generated successfully!');
    } catch (error) {
      toast.error('Failed to generate marketing content');
    }
    setLoading(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="ai-assistant">
        <div className="container">
          <div className="auth-required">
            <h2>AI Assistant</h2>
            <p>Please login to access AI-powered features for your craft business.</p>
            <a href="/login" className="btn btn-primary">Login to Continue</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-assistant">
      <div className="container">
        <header className="ai-header">
          <h1>🤖 AI Assistant for Artisans</h1>
          <p>Leverage AI to enhance your craft business with compelling stories, better descriptions, and targeted marketing.</p>
        </header>

        <div className="ai-tabs">
          <button 
            className={`tab ${activeTab === 'story' ? 'active' : ''}`}
            onClick={() => setActiveTab('story')}
          >
            Generate Your Story
          </button>
          <button 
            className={`tab ${activeTab === 'enhance' ? 'active' : ''}`}
            onClick={() => setActiveTab('enhance')}
          >
            Enhance Descriptions
          </button>
          <button 
            className={`tab ${activeTab === 'marketing' ? 'active' : ''}`}
            onClick={() => setActiveTab('marketing')}
          >
            Marketing Content
          </button>
        </div>

        <div className="ai-content">
          {activeTab === 'story' && (
            <div className="ai-section">
              <h3>Generate Your Artisan Story</h3>
              <p>Let AI help you craft a compelling story about your journey, traditions, and craft.</p>
              
              <div className="form-group">
                <label className="form-label">Additional Context (Optional)</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="Share any specific details about your craft journey you'd like to include..."
                  value={storyData.customPrompt}
                  onChange={(e) => setStoryData({ ...storyData, customPrompt: e.target.value })}
                />
              </div>

              <button 
                className="btn btn-primary"
                onClick={generateStory}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate My Story'}
              </button>

              {results.story && (
                <div className="ai-result">
                  <h4>Your AI-Generated Story:</h4>
                  <div className="story-result">
                    {results.story}
                  </div>
                  <button 
                    className="btn btn-success mt-2"
                    onClick={() => navigator.clipboard.writeText(results.story)}
                  >
                    Copy Story
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'enhance' && (
            <div className="ai-section">
              <h3>Enhance Product Descriptions</h3>
              <p>Transform basic product descriptions into engaging, culturally-rich narratives.</p>
              
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter product name"
                  value={productData.productName}
                  onChange={(e) => setProductData({ ...productData, productName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Original Description*</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="Enter your basic product description..."
                  value={productData.originalDescription}
                  onChange={(e) => setProductData({ ...productData, originalDescription: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Craft Type*</label>
                <select
                  className="form-input"
                  value={productData.craftType}
                  onChange={(e) => setProductData({ ...productData, craftType: e.target.value })}
                  required
                >
                  <option value="">Select craft type</option>
                  <option value="Pottery">Pottery</option>
                  <option value="Weaving">Weaving</option>
                  <option value="Jewelry">Jewelry</option>
                  <option value="Woodwork">Woodwork</option>
                  <option value="Metalwork">Metalwork</option>
                  <option value="Textiles">Textiles</option>
                  <option value="Paintings">Paintings</option>
                  <option value="Sculptures">Sculptures</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Materials Used</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Clay, silk, silver, etc."
                  value={productData.materials}
                  onChange={(e) => setProductData({ ...productData, materials: e.target.value })}
                />
              </div>

              <button 
                className="btn btn-primary"
                onClick={enhanceDescription}
                disabled={loading}
              >
                {loading ? 'Enhancing...' : 'Enhance Description'}
              </button>

              {results.enhancedDescription && (
                <div className="ai-result">
                  <h4>Enhanced Description:</h4>
                  <div className="description-result">
                    {results.enhancedDescription}
                  </div>
                  <button 
                    className="btn btn-success mt-2"
                    onClick={() => navigator.clipboard.writeText(results.enhancedDescription)}
                  >
                    Copy Description
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'marketing' && (
            <div className="ai-section">
              <h3>Generate Marketing Content</h3>
              <p>Create social media posts, product stories, and identify your target audience.</p>
              
              <div className="form-group">
                <label className="form-label">Product Name*</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter product name"
                  value={marketingData.productName}
                  onChange={(e) => setMarketingData({ ...marketingData, productName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category*</label>
                <select
                  className="form-input"
                  value={marketingData.category}
                  onChange={(e) => setMarketingData({ ...marketingData, category: e.target.value })}
                  required
                >
                  <option value="">Select category</option>
                  <option value="Pottery">Pottery</option>
                  <option value="Weaving">Weaving</option>
                  <option value="Jewelry">Jewelry</option>
                  <option value="Woodwork">Woodwork</option>
                  <option value="Metalwork">Metalwork</option>
                  <option value="Textiles">Textiles</option>
                  <option value="Paintings">Paintings</option>
                  <option value="Sculptures">Sculptures</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Brief Description</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="Brief description of your product..."
                  value={marketingData.description}
                  onChange={(e) => setMarketingData({ ...marketingData, description: e.target.value })}
                />
              </div>

              <button 
                className="btn btn-primary"
                onClick={generateMarketing}
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate Marketing Content'}
              </button>

              {results.marketing && (
                <div className="ai-result">
                  <div className="marketing-results">
                    <div className="marketing-item">
                      <h4>Social Media Post:</h4>
                      <div className="social-post">
                        {results.marketing.socialMediaPost}
                      </div>
                      <button 
                        className="btn btn-success btn-sm mt-2"
                        onClick={() => navigator.clipboard.writeText(results.marketing.socialMediaPost)}
                      >
                        Copy Post
                      </button>
                    </div>

                    <div className="marketing-item">
                      <h4>Product Story:</h4>
                      <div className="product-story">
                        {results.marketing.productStory}
                      </div>
                      <button 
                        className="btn btn-success btn-sm mt-2"
                        onClick={() => navigator.clipboard.writeText(results.marketing.productStory)}
                      >
                        Copy Story
                      </button>
                    </div>

                    <div className="marketing-item">
                      <h4>Target Audience:</h4>
                      <div className="target-audience">
                        {results.marketing.targetAudience}
                      </div>
                    </div>

                    <div className="marketing-item">
                      <h4>Recommended Tags:</h4>
                      <div className="tags-container">
                        {results.marketing.tags?.map((tag, index) => (
                          <span key={index} className="tag">#{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
