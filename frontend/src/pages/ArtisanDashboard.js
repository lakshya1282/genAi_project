import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import './Dashboard.css';

const ArtisanDashboard = () => {
  const { user, userType, isAuthenticated, artisanToken } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productImages, setProductImages] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    materials: '',
    craftingTime: '',
    stock: 1,
    lowStockThreshold: 5,
    isCustomizable: false,
    customizationOptions: '',
    tags: '',
    dimensions: {
      length: '',
      width: '',
      height: '',
      weight: ''
    }
  });

  useEffect(() => {
    if (!isAuthenticated || userType !== 'artisan') {
      navigate('/login');
      return;
    }
    // Add a small delay to ensure token is available
    const timer = setTimeout(() => {
      fetchDashboardData();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate, user, userType, artisanToken]);

  const fetchDashboardData = async () => {
    try {
      console.log('🔄 Fetching dashboard data...');
      console.log('🔑 Artisan token available:', !!artisanToken);
      console.log('🌐 Axios baseURL:', axios.defaults.baseURL);
      console.log('🎯 API URL will be:', `${axios.defaults.baseURL || ''}/api/artisan/products/dashboard/summary`);
      
      if (!artisanToken) {
        throw new Error('No artisan token');
      }

      // Set proper headers for artisan API
      const config = {
        headers: {
          'Authorization': `Bearer ${artisanToken}`
        }
      };

      console.log('📡 Making API call to fetch products...');
      // Fetch artisan's products using correct endpoint
      const productsResponse = await axios.get(`/api/artisan/products`, config);
      console.log('📦 Products response:', productsResponse.data);
      setProducts(productsResponse.data.products || []);

      console.log('📡 Making API call to fetch dashboard summary...');
      // Fetch dashboard summary
      const summaryResponse = await axios.get(`/api/artisan/products/dashboard/summary`, config);
      console.log('📊 Summary response:', summaryResponse.data);
      
      if (summaryResponse.data.success) {
        console.log('✅ Setting insights with data:', summaryResponse.data.summary.productStats);
        setInsights({
          totalProducts: summaryResponse.data.summary.productStats.totalProducts,
          totalViews: summaryResponse.data.summary.productStats.totalViews,
          totalLikes: summaryResponse.data.summary.productStats.totalLikes,
          averagePrice: summaryResponse.data.summary.productStats.avgPrice,
          suggestions: [
            'Use AI to enhance your product descriptions',
            'Upload high-quality images to increase sales',
            'Monitor your inventory levels regularly',
            'Engage with customer reviews and feedback'
          ]
        });
      } else {
        console.log('❌ Summary API returned success: false');
        console.log('❌ Full summary response:', summaryResponse.data);
      }
    } catch (error) {
      console.log('❌ API Call failed completely');
      if (error.response?.status === 401) {
        console.log('🔒 Authentication failed - redirecting to login');
        navigate('/login');
        return;
      }
      console.error('❌ Error fetching dashboard data:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.log('⚠️ Using fallback data due to error');
      
      // Try to calculate stats from products if available
      if (products && products.length > 0) {
        console.log('📊 Calculating stats from products data:', products.length);
        const totalViews = products.reduce((sum, p) => sum + (p.views || 0), 0);
        const totalLikes = products.reduce((sum, p) => sum + (p.likes || 0), 0);
        const avgPrice = products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length;
        
        setInsights({
          totalProducts: products.length,
          totalViews: totalViews,
          totalLikes: totalLikes,
          averagePrice: avgPrice,
          suggestions: [
            'Dashboard API had an issue, showing calculated stats',
            'Use AI to enhance your product descriptions',
            'Upload high-quality images to increase engagement'
          ]
        });
      } else {
        // Use empty data
        setInsights({
          totalProducts: 0,
          totalViews: 0,
          totalLikes: 0,
          averagePrice: 0,
          suggestions: [
            'Add your first product to get started',
            'Use AI to enhance your product descriptions',
            'Upload high-quality images to increase engagement'
          ]
        });
      }
    }
    setLoading(false);
  };


  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }
    
    setProductImages(files);
    
    // Create preview URLs
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreview(previews);
  };

  const removeImage = (index) => {
    const newFiles = productImages.filter((_, i) => i !== index);
    const newPreviews = imagePreview.filter((_, i) => i !== index);
    
    setProductImages(newFiles);
    setImagePreview(newPreviews);
  };

  const resetForm = () => {
    setNewProduct({
      name: '',
      description: '',
      price: '',
      category: '',
      materials: '',
      craftingTime: '',
      stock: 1,
      lowStockThreshold: 5,
      isCustomizable: false,
      customizationOptions: '',
      tags: '',
      dimensions: {
        length: '',
        width: '',
        height: '',
        weight: ''
      }
    });
    setProductImages([]);
    setImagePreview([]);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    
    if (!artisanToken) {
      toast.error('Please login as an artisan');
      return;
    }

    try {
      // Create FormData for multipart/form-data
      const formDataToSend = new FormData();
      
      // Add basic product data
      formDataToSend.append('name', newProduct.name.trim());
      formDataToSend.append('description', newProduct.description.trim());
      formDataToSend.append('price', parseFloat(newProduct.price));
      formDataToSend.append('category', newProduct.category);
      formDataToSend.append('quantityAvailable', parseInt(newProduct.stock));
      formDataToSend.append('lowStockThreshold', parseInt(newProduct.lowStockThreshold));
      formDataToSend.append('isCustomizable', newProduct.isCustomizable);
      
      // Add optional fields
      if (newProduct.materials) {
        formDataToSend.append('materials', newProduct.materials);
      }
      if (newProduct.craftingTime) {
        formDataToSend.append('craftingTime', newProduct.craftingTime);
      }
      if (newProduct.tags) {
        formDataToSend.append('tags', newProduct.tags);
      }
      if (newProduct.customizationOptions) {
        formDataToSend.append('customizationOptions', newProduct.customizationOptions);
      }
      
      // Add dimensions if provided
      const hasDimensions = Object.values(newProduct.dimensions).some(val => val !== '');
      if (hasDimensions) {
        formDataToSend.append('dimensions', JSON.stringify(newProduct.dimensions));
      }
      
      // Add images
      productImages.forEach((file) => {
        formDataToSend.append('images', file);
      });

      const config = {
        headers: {
          'Authorization': `Bearer ${artisanToken}`,
          'Content-Type': 'multipart/form-data'
        }
      };

      const response = await axios.post('/api/artisan/products', formDataToSend, config);
      
      if (response.data.success) {
        toast.success('Product added successfully!');
        // Refresh products list
        fetchDashboardData();
        setShowAddProduct(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error adding product:', error);
      const errorMessage = error.response?.data?.message || 'Failed to add product';
      toast.error(errorMessage);
    }
  };

  const handleEditProduct = (product) => {
    alert('Edit functionality will be implemented in the next version!');
    console.log('Edit product:', product);
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"?`)) {
      return;
    }
    
    try {
      const config = {
        headers: {
          'Authorization': `Bearer ${artisanToken}`
        }
      };
      
      await axios.delete(`/api/artisan/products/${productId}`, config);
      toast.success('Product deleted successfully');
      
      // Remove from local state
      setProducts(products.filter(p => p._id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const toggleProductStatus = async (productId, currentStatus) => {
    try {
      const config = {
        headers: {
          'Authorization': `Bearer ${artisanToken}`
        }
      };
      
      const response = await axios.patch(`/api/artisan/products/${productId}/toggle-status`, {}, config);
      
      if (response.data.success) {
        toast.success(`Product ${response.data.isActive ? 'activated' : 'deactivated'} successfully`);
        // Update local state
        setProducts(products.map(p => 
          p._id === productId ? { ...p, isActive: response.data.isActive } : p
        ));
      }
    } catch (error) {
      console.error('Error toggling product status:', error);
      toast.error('Failed to update product status');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      {/* Enhanced Hero Section */}
      <div className="dashboard-hero">
        <div className="container">
          <header className="dashboard-header">
            <h1>Welcome back, {user?.name}! 🎨</h1>
            <p>Manage your craft business with AI-powered tools</p>
          </header>

          {/* Quick Actions */}
          <div className="quick-actions">
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddProduct(true)}
            >
              ➕ Add New Product
            </button>
            <button 
              className="btn btn-info"
              onClick={() => {
                console.log('🔄 Manual refresh triggered');
                fetchDashboardData();
              }}
            >
              🔄 Refresh Data
            </button>
            <Link to="/ai-assistant" className="btn btn-success">
              🤖 AI Assistant
            </Link>
            <Link to="/marketplace" className="btn btn-secondary">
              🛍️ View Marketplace
            </Link>
          </div>

          {/* Dashboard Stats */}
          {insights && (
            <div className="dashboard-stats">
              <div className="stat-card">
                <div className="stat-icon">📦</div>
                <div className="stat-info">
                  <div className="stat-number">{insights.totalProducts}</div>
                  <div className="stat-label">Products Listed</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👁️</div>
                <div className="stat-info">
                  <div className="stat-number">{insights.totalViews}</div>
                  <div className="stat-label">Total Views</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">❤️</div>
                <div className="stat-info">
                  <div className="stat-number">{insights.totalLikes}</div>
                  <div className="stat-label">Total Likes</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-info">
                  <div className="stat-number">₹{Math.round(insights.averagePrice)}</div>
                  <div className="stat-label">Avg. Price</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="dashboard-main">
        <div className="container">

        <div className="dashboard-content">
          {/* Products Section */}
          <div className="dashboard-section">
            <h2>Your Products</h2>
            {products.length > 0 ? (
              <div className="products-list">
                {products.map(product => (
                  <div key={product._id} className={`product-item ${!product.isActive ? 'inactive' : ''}`}>
                    <div className="product-image">
                      <img 
                        src={product.images?.[0] || 'https://via.placeholder.com/350x220?text=Product+Image'} 
                        alt={product.name} 
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/350x220?text=No+Image&bg=f8f9fa&color=666';
                        }}
                      />
                      {!product.isActive && <div className="inactive-overlay">Inactive</div>}
                    </div>
                    <div className="product-card-content">
                      <div className="product-details">
                        <h4>{product.name}</h4>
                        <p>{product.description?.substring(0, 120)}...</p>
                        <div className="product-price">₹{product.price}</div>
                        <div className="product-meta">
                          <span className="stock-info">
                            📦 Stock: {product.availableStock || product.quantityAvailable || product.stock || 0}
                            {(product.isLowStock || ((product.quantityAvailable || product.stock || 0) <= product.lowStockThreshold)) && (
                              <span className="low-stock-warning"> ⚠️ Low</span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="product-stats">
                        <div className="product-stats-left">
                          <span>👁️ {product.views || 0}</span>
                          <span>❤️ {product.likes || 0}</span>
                        </div>
                        <span className={`status ${product.isActive ? 'active' : 'inactive'}`}>
                          {product.isActive ? '🟢 Active' : '🔴 Inactive'}
                        </span>
                      </div>
                      <div className="product-actions">
                        <Link to={`/product/${product._id}`} className="btn btn-secondary btn-sm">
                          👁️ View
                        </Link>
                        <button 
                          className="btn btn-outline btn-sm"
                          onClick={() => handleEditProduct(product)}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className={`btn btn-sm ${product.isActive ? 'btn-warning' : 'btn-success'}`}
                          onClick={() => toggleProductStatus(product._id, product.isActive)}
                          title={product.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {product.isActive ? '⏸️' : '▶️'}
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteProduct(product._id, product.name)}
                          title="Delete Product"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>No products yet</h3>
                <p>Start by adding your first handcrafted product</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowAddProduct(true)}
                >
                  Add Your First Product
                </button>
              </div>
            )}
          </div>

          {/* AI Suggestions */}
          {insights && insights.suggestions && (
            <div className="dashboard-section">
              <h2>AI Recommendations</h2>
              <div className="suggestions-list">
                {insights.suggestions.map((suggestion, index) => (
                  <div key={index} className="suggestion-item">
                    💡 {suggestion}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Add Product Modal */}
        {showAddProduct && (
          <div className="modal-overlay" onClick={() => setShowAddProduct(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add New Product</h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowAddProduct(false)}
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleAddProduct} className="add-product-form">
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter product name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input form-textarea"
                    placeholder="Describe your product"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Price (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-input"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
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
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Materials</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Clay, silk, silver (comma separated)"
                      value={newProduct.materials}
                      onChange={(e) => setNewProduct({ ...newProduct, materials: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Crafting Time</label>
                    <select
                      className="form-input"
                      value={newProduct.craftingTime}
                      onChange={(e) => setNewProduct({ ...newProduct, craftingTime: e.target.value })}
                    >
                      <option value="">Select time</option>
                      <option value="1-3 days">1-3 days</option>
                      <option value="1 week">1 week</option>
                      <option value="2 weeks">2 weeks</option>
                      <option value="1 month">1 month</option>
                      <option value="2+ months">2+ months</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Stock Quantity</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="1"
                      min="0"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Low Stock Alert</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="5"
                      min="0"
                      value={newProduct.lowStockThreshold}
                      onChange={(e) => setNewProduct({ ...newProduct, lowStockThreshold: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tags</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="handmade, eco-friendly, traditional (comma separated)"
                    value={newProduct.tags}
                    onChange={(e) => setNewProduct({ ...newProduct, tags: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <input
                      type="checkbox"
                      checked={newProduct.isCustomizable}
                      onChange={(e) => setNewProduct({ ...newProduct, isCustomizable: e.target.checked })}
                    />
                    {' '} This product can be customized
                  </label>
                </div>

                {newProduct.isCustomizable && (
                  <div className="form-group">
                    <label className="form-label">Customization Options</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Size, color, design (comma separated)"
                      value={newProduct.customizationOptions}
                      onChange={(e) => setNewProduct({ ...newProduct, customizationOptions: e.target.value })}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Product Images (Max 10)</label>
                  <input
                    type="file"
                    className="form-input"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                  />
                  <small>JPG, PNG, WEBP up to 5MB each</small>
                </div>

                {imagePreview.length > 0 && (
                  <div className="image-preview-container">
                    <label className="form-label">Image Preview</label>
                    <div className="image-preview-grid">
                      {imagePreview.map((preview, index) => (
                        <div key={index} className="image-preview-item">
                          <img src={preview} alt={`Preview ${index + 1}`} />
                          <button
                            type="button"
                            className="remove-image-btn"
                            onClick={() => removeImage(index)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-section">
                  <h4>Dimensions (Optional)</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Length (cm)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        value={newProduct.dimensions.length}
                        onChange={(e) => setNewProduct({ 
                          ...newProduct, 
                          dimensions: { ...newProduct.dimensions, length: e.target.value }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Width (cm)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        value={newProduct.dimensions.width}
                        onChange={(e) => setNewProduct({ 
                          ...newProduct, 
                          dimensions: { ...newProduct.dimensions, width: e.target.value }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Height (cm)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        value={newProduct.dimensions.height}
                        onChange={(e) => setNewProduct({ 
                          ...newProduct, 
                          dimensions: { ...newProduct.dimensions, height: e.target.value }
                        })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Weight (g)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        value={newProduct.dimensions.weight}
                        onChange={(e) => setNewProduct({ 
                          ...newProduct, 
                          dimensions: { ...newProduct.dimensions, weight: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddProduct(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default ArtisanDashboard;
