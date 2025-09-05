import React, { useState, useEffect } from 'react';
import { FaFire, FaEye, FaHeart, FaShoppingCart, FaStar } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './TrendingProducts.css';

const TrendingProducts = ({ limit = 8 }) => {
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, userType } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrendingProducts();
  }, [limit]);

  const fetchTrendingProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/products-enhanced/trending?limit=${limit}`);
      
      if (response.data.success) {
        setTrendingProducts(response.data.products);
      }
    } catch (error) {
      console.error('Error fetching trending products:', error);
      toast.error('Failed to load trending products');
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

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getTrendingBadge = (product) => {
    const viewsScore = product.views || 0;
    const likesScore = (product.likes || 0) * 2;
    const salesScore = (product.quantitySold || 0) * 3;
    const totalScore = viewsScore + likesScore + salesScore;

    if (totalScore > 100) return { label: 'Hot', class: 'hot' };
    if (totalScore > 50) return { label: 'Trending', class: 'trending' };
    return { label: 'Popular', class: 'popular' };
  };

  if (loading) {
    return (
      <div className="trending-products">
        <div className="trending-header">
          <h2><FaFire className="fire-icon" /> Trending Products</h2>
        </div>
        <div className="trending-grid loading">
          {Array(limit).fill(0).map((_, index) => (
            <div key={index} className="product-card skeleton">
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

  if (trendingProducts.length === 0) {
    return (
      <div className="trending-products">
        <div className="trending-header">
          <h2><FaFire className="fire-icon" /> Trending Products</h2>
        </div>
        <div className="no-products">
          <p>No trending products available at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trending-products">
      <div className="trending-header">
        <h2><FaFire className="fire-icon" /> Trending Products</h2>
        <p>Discover what's popular among our customers</p>
      </div>
      
      <div className="trending-grid">
        {trendingProducts.map((product) => {
          const badge = getTrendingBadge(product);
          return (
            <div key={product._id} className="trending-product-card">
              <div className="product-image-container">
                <img
                  src={product.images?.[0] || '/api/placeholder/300/300'}
                  alt={product.name}
                  className="product-image"
                  onClick={() => handleProductClick(product._id)}
                  loading="lazy"
                />
                <div className={`trending-badge ${badge.class}`}>
                  <FaFire />
                  {badge.label}
                </div>
                
                {product.isCustomizable && (
                  <div className="customizable-badge">
                    Customizable
                  </div>
                )}
              </div>

              <div className="product-info">
                <div className="product-header">
                  <h3 
                    className="product-name" 
                    onClick={() => handleProductClick(product._id)}
                  >
                    {product.name}
                  </h3>
                  <div className="product-price">
                    {formatPrice(product.price)}
                  </div>
                </div>

                <div className="artisan-info">
                  <span>by {product.artisan?.name}</span>
                  <span className="artisan-location">
                    {product.artisan?.location?.city}, {product.artisan?.location?.state}
                  </span>
                </div>

                <div className="product-stats">
                  <div className="stat-item">
                    <FaEye />
                    <span>{product.views || 0}</span>
                  </div>
                  <div className="stat-item">
                    <FaHeart />
                    <span>{product.likes || 0}</span>
                  </div>
                  <div className="stat-item">
                    <FaStar />
                    <span>{product.quantitySold || 0} sold</span>
                  </div>
                </div>

                <div className="product-tags">
                  {product.tags?.slice(0, 2).map((tag, index) => (
                    <span key={index} className="product-tag">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="product-actions">
                  <button
                    className="add-to-cart-btn"
                    onClick={() => handleAddToCart(product)}
                    disabled={product.quantityAvailable === 0}
                  >
                    <FaShoppingCart />
                    {product.quantityAvailable === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                  
                  <button
                    className="view-details-btn"
                    onClick={() => handleProductClick(product._id)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {trendingProducts.length === limit && (
        <div className="view-all-container">
          <button 
            className="view-all-btn"
            onClick={() => navigate('/marketplace')}
          >
            View All Products
          </button>
        </div>
      )}
    </div>
  );
};

export default TrendingProducts;
