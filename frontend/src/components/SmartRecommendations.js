import React, { useState, useEffect } from 'react';
import { 
  FaMagic, 
  FaHeart, 
  FaShoppingCart, 
  FaEye, 
  FaStar,
  FaChevronLeft,
  FaChevronRight,
  FaRefresh
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import './SmartRecommendations.css';

const SmartRecommendations = ({ 
  userId = null, 
  productId = null,
  limit = 8, 
  title = "Recommended for You",
  className = '',
  type = 'personal' // 'personal', 'similar', 'trending', 'category'
}) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(4);
  
  const { user, userType, addToCart } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecommendations();
    updateItemsPerView();
    
    const handleResize = () => updateItemsPerView();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [userId, productId, type, limit]);

  const updateItemsPerView = () => {
    const width = window.innerWidth;
    if (width >= 1200) setItemsPerView(4);
    else if (width >= 768) setItemsPerView(3);
    else if (width >= 480) setItemsPerView(2);
    else setItemsPerView(1);
  };

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      let response;

      switch (type) {
        case 'personal':
          if (user?.id) {
            response = await axios.get(`/api/products-enhanced/recommendations/${user.id}?limit=${limit}`);
          } else {
            // Fallback to trending for non-logged users
            response = await axios.get(`/api/products-enhanced/trending?limit=${limit}`);
          }
          break;
          
        case 'trending':
          response = await axios.get(`/api/products-enhanced/trending?limit=${limit}`);
          break;
          
        case 'similar':
          if (productId) {
            response = await axios.get(`/api/products-enhanced/similar/${productId}?limit=${limit}`);
          } else {
            response = await axios.get(`/api/products-enhanced/trending?limit=${limit}`);
          }
          break;
          
        default:
          response = await axios.get(`/api/products-enhanced/trending?limit=${limit}`);
      }

      if (response?.data?.success) {
        setRecommendations(response.data.products || []);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (product) => {
    if (userType !== 'customer') {
      toast.error('Please login as a customer to add items to cart');
      return;
    }

    try {
      const result = await addToCart(product._id, 1);
      if (result.success) {
        toast.success('Added to cart successfully!');
      } else {
        toast.error(result.message || 'Failed to add to cart');
      }
    } catch (error) {
      toast.error('Error adding to cart');
    }
  };

  const handleProductClick = async (productId) => {
    // Update view count
    try {
      await axios.post(`/api/products-enhanced/view/${productId}`);
    } catch (error) {
      console.error('Error updating view count:', error);
    }
    
    navigate(`/product/${productId}`);
  };

  const nextSlide = () => {
    const maxSlide = Math.max(0, recommendations.length - itemsPerView);
    setCurrentSlide(prev => Math.min(prev + itemsPerView, maxSlide));
  };

  const prevSlide = () => {
    setCurrentSlide(prev => Math.max(prev - itemsPerView, 0));
  };

  const getReasonText = (product) => {
    // Generate recommendation reason based on user behavior
    if (type === 'trending') return 'Trending now';
    if (type === 'similar') return 'Similar to viewed items';
    
    if (user?.preferences?.favoriteCategories?.includes(product.category)) {
      return `Based on your interest in ${product.category}`;
    }
    
    if (product.quantitySold > 10) return 'Popular choice';
    if (product.views > 50) return 'Highly viewed';
    
    return 'Recommended for you';
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getDiscountPercentage = (product) => {
    // Calculate discount if there's an original price vs current price
    // This would be implemented based on your pricing structure
    return null;
  };

  if (loading) {
    return (
      <div className={`smart-recommendations ${className} loading`}>
        <div className="recommendations-header">
          <h2><FaMagic className="magic-icon" /> {title}</h2>
        </div>
        <div className="recommendations-grid">
          {Array(itemsPerView).fill(0).map((_, index) => (
            <div key={index} className="recommendation-card skeleton">
              <div className="skeleton-image"></div>
              <div className="skeleton-content">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
                <div className="skeleton-line"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className={`smart-recommendations ${className} empty`}>
        <div className="empty-recommendations">
          <FaMagic className="empty-icon" />
          <p>No recommendations available at the moment</p>
          <button onClick={fetchRecommendations} className="refresh-btn">
            <FaRefresh /> Refresh
          </button>
        </div>
      </div>
    );
  }

  const canGoPrev = currentSlide > 0;
  const canGoNext = currentSlide < recommendations.length - itemsPerView;

  return (
    <div className={`smart-recommendations ${className}`}>
      <div className="recommendations-header">
        <h2>
          <FaMagic className="magic-icon" /> 
          {title}
        </h2>
        <div className="navigation-controls">
          <button 
            onClick={prevSlide} 
            disabled={!canGoPrev}
            className="nav-control prev"
          >
            <FaChevronLeft />
          </button>
          <button 
            onClick={nextSlide} 
            disabled={!canGoNext}
            className="nav-control next"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      <div className="recommendations-container">
        <div 
          className="recommendations-track"
          style={{
            transform: `translateX(-${(currentSlide * 100) / itemsPerView}%)`
          }}
        >
          {recommendations.map((product) => {
            const discount = getDiscountPercentage(product);
            
            return (
              <div key={product._id} className="recommendation-card">
                <div className="product-image-container">
                  <img
                    src={product.images?.[0] || '/api/placeholder/250/250'}
                    alt={product.name}
                    className="product-image"
                    onClick={() => handleProductClick(product._id)}
                    loading="lazy"
                  />
                  
                  {discount && (
                    <div className="discount-badge">
                      -{discount}%
                    </div>
                  )}
                  
                  {product.isCustomizable && (
                    <div className="feature-badge customizable">
                      Customizable
                    </div>
                  )}
                  
                  {product.quantityAvailable <= 5 && product.quantityAvailable > 0 && (
                    <div className="feature-badge low-stock">
                      Only {product.quantityAvailable} left
                    </div>
                  )}

                  <div className="product-overlay">
                    <button
                      className="quick-add-btn"
                      onClick={() => handleAddToCart(product)}
                      disabled={product.quantityAvailable === 0}
                    >
                      <FaShoppingCart />
                      {product.quantityAvailable === 0 ? 'Out of Stock' : 'Quick Add'}
                    </button>
                  </div>
                </div>

                <div className="product-info">
                  <div className="recommendation-reason">
                    {getReasonText(product)}
                  </div>
                  
                  <h3 
                    className="product-name" 
                    onClick={() => handleProductClick(product._id)}
                  >
                    {product.name}
                  </h3>

                  <div className="artisan-info">
                    <span>by {product.artisan?.name}</span>
                  </div>

                  <div className="product-stats">
                    <div className="stat-item">
                      <FaEye className="stat-icon" />
                      <span>{product.views || 0}</span>
                    </div>
                    <div className="stat-item">
                      <FaHeart className="stat-icon" />
                      <span>{product.likes || 0}</span>
                    </div>
                    <div className="stat-item">
                      <FaStar className="stat-icon" />
                      <span>{product.quantitySold || 0} sold</span>
                    </div>
                  </div>

                  <div className="price-section">
                    <div className="price-main">
                      {formatPrice(product.price)}
                    </div>
                    {discount && (
                      <div className="price-original">
                        {formatPrice(product.price * (1 + discount / 100))}
                      </div>
                    )}
                  </div>

                  <div className="product-tags">
                    {product.tags?.slice(0, 2).map((tag, index) => (
                      <span key={index} className="product-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="recommendations-indicators">
        {Array(Math.ceil(recommendations.length / itemsPerView)).fill(0).map((_, index) => (
          <button
            key={index}
            className={`indicator ${Math.floor(currentSlide / itemsPerView) === index ? 'active' : ''}`}
            onClick={() => setCurrentSlide(index * itemsPerView)}
          />
        ))}
      </div>

      <div className="recommendations-footer">
        <button 
          className="view-all-btn"
          onClick={() => navigate('/marketplace')}
        >
          View All Products
        </button>
        <button 
          className="refresh-recommendations"
          onClick={fetchRecommendations}
          title="Refresh Recommendations"
        >
          <FaRefresh />
        </button>
      </div>
    </div>
  );
};

// Specific recommendation components for different use cases
export const PersonalRecommendations = (props) => (
  <SmartRecommendations 
    {...props}
    type="personal"
    title="Recommended for You"
  />
);

export const TrendingRecommendations = (props) => (
  <SmartRecommendations 
    {...props}
    type="trending"
    title="Trending Now"
  />
);

export const SimilarRecommendations = (props) => (
  <SmartRecommendations 
    {...props}
    type="similar"
    title="Similar Products"
  />
);

export default SmartRecommendations;
