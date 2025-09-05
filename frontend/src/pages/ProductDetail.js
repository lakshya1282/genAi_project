import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaShoppingCart, FaHeart, FaPlus, FaMinus } from 'react-icons/fa';
import WishlistToggle from '../components/WishlistToggle';
import ReviewForm from '../components/ReviewForm';
import './ProductDetail.css';

const ProductDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  
  const { userType, addToCart } = useAuth();

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`/api/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
      // Use sample data for demo  
      // Generate a consistent ObjectId for the sample product
      const sampleProductId = '507f1f77bcf86cd799439011'; // Valid ObjectId for demo
      const sampleProduct = {
        _id: sampleProductId,
        name: 'Traditional Blue Pottery Vase',
        description: 'Beautiful handcrafted vase with traditional Jaipur blue pottery design featuring intricate floral patterns',
        aiEnhancedDescription: 'This exquisite handcrafted pottery piece embodies centuries of traditional Indian craftsmanship. Each curve and glaze tells a story of dedication, skill passed down through generations. Made with locally sourced clay and traditional firing techniques, this masterpiece represents the rich cultural heritage of Jaipur\'s pottery artisans. The deep blue color is achieved through natural mineral pigments, and the intricate floral patterns are hand-painted with precision that comes only from years of practice.',
        price: 1250,
        category: 'Pottery',
        images: ['https://via.placeholder.com/500x500/4A90E2/FFFFFF?text=Blue+Pottery+Vase'],
        artisan: {
          _id: 'sample-artisan',
          name: 'Rajesh Kumar',
          location: { city: 'Jaipur', state: 'Rajasthan' },
          craftType: 'Pottery',
          story: 'Meet Rajesh Kumar, a passionate pottery artisan from Jaipur with over 15 years of experience. Growing up in a family of craftspeople, he learned the intricate techniques of blue pottery passed down through generations. Rajesh sources his clay from the Alwar region and uses traditional Persian techniques brought to India centuries ago. His workshop in the old city of Jaipur is where magic happens - each piece is individually crafted, painted, and fired with the utmost care.',
          rating: 4.8
        },
        materials: ['Premium Clay from Alwar', 'Natural Cobalt Blue Pigments', 'Traditional Lead-Free Glazes', 'Gold Accents'],
        dimensions: { length: 15, width: 15, height: 25 },
        craftingTime: '2 weeks (including drying time)',
        views: 124,
        likes: 28,
        stock: 6,
        isAvailable: true,
        tags: ['handmade', 'pottery', 'traditional', 'jaipur', 'blue-pottery', 'home-decor'],
        marketingContent: {
          socialMediaPost: '🎨 Discover authentic Jaipur Blue Pottery! ✨ Handcrafted Traditional Vase - where ancient Persian techniques meet Indian artistry. Perfect for your home! #HandmadeIndia #JaipurPottery',
          targetAudience: 'Home decor enthusiasts, art collectors, cultural heritage lovers, mindful consumers'
        }
      };
      setProduct(sampleProduct);
    }
    setLoading(false);
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`/api/reviews/product/${id}`);
      if (response.data.success) {
        setReviews(response.data.reviews);
        setAverageRating(response.data.averageRating);
        setTotalReviews(response.data.totalReviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      // Don't show error toast, just log it
    }
  };

  const handleLike = async () => {
    try {
      await axios.post(`/api/products/${id}/like`);
      setProduct({ ...product, likes: product.likes + 1 });
      toast.success(t('product.liked'));
    } catch (error) {
      toast.error(t('product.likeFailed'));
    }
  };

  const handleAddToCart = async () => {
    if (!userType || userType !== 'customer') {
      toast.error(t('product.loginToAddCart'));
      return;
    }

    const stockStatus = getStockStatus(product);
    if (stockStatus.status === 'out-of-stock') {
      toast.error('This item is currently out of stock');
      return;
    }

    // Only check stock limits if stock is defined
    if (product.stock !== undefined && quantity > product.stock) {
      toast.error(`Only ${product.stock} items available`);
      return;
    }

    setAddingToCart(true);
    const result = await addToCart(product._id, quantity);
    
    if (result.success) {
      setCartSuccess(true);
      toast.success(t('product.addedToCart'));
      
      // Reset success animation after 2 seconds
      setTimeout(() => {
        setCartSuccess(false);
      }, 2000);
    } else {
      toast.error(result.message);
    }
    
    setAddingToCart(false);
  };

  const handleAddReview = (newReview) => {
    // Add the review to local state for immediate display
    setReviews((prev) => [newReview, ...prev]);
    setTotalReviews(prev => prev + 1);
    
    // Recalculate average rating
    const newTotal = totalReviews + 1;
    const newAverage = ((averageRating * totalReviews) + newReview.rating) / newTotal;
    setAverageRating(newAverage);
  };

  // Function to get stock status
  const getStockStatus = (product) => {
    if (!product) return { status: 'in-stock', label: t('product.inStock'), class: 'in-stock' };
    
    // If product doesn't have stock information, assume it's available
    if (product.stock === undefined && product.isAvailable === undefined) {
      return { status: 'in-stock', label: t('product.inStock'), class: 'in-stock' };
    }
    
    // If explicitly set as unavailable or stock is 0
    if (product.isAvailable === false || product.stock === 0) {
      return { status: 'out-of-stock', label: t('product.outOfStock'), class: 'out-of-stock' };
    }
    
    // If stock is defined, use it for classification
    if (product.stock !== undefined) {
      if (product.stock <= 2) {
        return { status: 'low-stock', label: t('product.lowStock'), class: 'low-stock' };
      } else if (product.stock <= 5) {
        return { status: 'limited-stock', label: t('product.stockLimited'), class: 'limited-stock' };
      }
    }
    
    // Default to in-stock for products without specific stock info
    return { status: 'in-stock', label: t('product.inStock'), class: 'in-stock' };
  };

  if (loading) {
    return <div className="loading">{t('product.loading')}</div>;
  }

  if (!product) {
    return <div className="error">{t('product.notFound')}</div>;
  }

  const stockStatus = getStockStatus(product);
  
  return (
    <div className={`product-detail ${stockStatus.class}`}>
      <div className="container">
        <div className="product-content">
          <div className="product-images">
            <div className="main-image">
              <img 
                src={product.images?.[0] || 'https://via.placeholder.com/500x500?text=Handcraft'} 
                alt={product.name} 
              />
              {/* Stock Status Badge - Only show if stock info is available */}
              {(product.stock !== undefined || product.isAvailable !== undefined) && (
                <div className={`stock-badge ${stockStatus.class}`}>
                  {stockStatus.label}
                </div>
              )}
              {/* Out of Stock Overlay */}
              {stockStatus.status === 'out-of-stock' && (
                <div className="out-of-stock-overlay">
                  <span className="out-of-stock-text">{stockStatus.label}</span>
                </div>
              )}
            </div>
          </div>

          <div className="product-info">
            <div className="product-header">
              <h1 className={stockStatus.status === 'out-of-stock' ? 'out-of-stock-text' : ''}>
                {product.name}
              </h1>
              <div className="product-meta">
                <span className="category-badge">{product.category}</span>
                <div className="product-stats">
                  <span>👁️ {product.views} {t('product.views')}</span>
                  <span>❤️ {product.likes} {t('product.likes')}</span>
                </div>
              </div>
            </div>

            <div className="price-section">
              <div className={`price ${stockStatus.status === 'out-of-stock' ? 'out-of-stock-price' : ''}`}>
                ₹{product.price?.toLocaleString()}
              </div>
              <div className="crafting-time">
                ⏱️ {t('product.craftingTime')}: {product.craftingTime || t('product.contactArtisan')}
              </div>
              
              {/* Quick Add to Cart Section */}
              <div className="quick-purchase">
                {stockStatus.status !== 'out-of-stock' && (
                  <div className="quantity-selector-inline">
                    <label>Quantity:</label>
                    <div className="quantity-controls-inline">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="qty-btn-small"
                        disabled={quantity <= 1}
                      >
                        <FaMinus />
                      </button>
                      <span className="quantity-display">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(product.stock || 999, quantity + 1))}
                        className="qty-btn-small"
                        disabled={product.stock !== undefined && quantity >= product.stock}
                      >
                        <FaPlus />
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="primary-actions">
                  <button 
                    className={`btn btn-cart-primary ${
                      stockStatus.status === 'out-of-stock' || addingToCart ? 'disabled' : ''
                    } ${cartSuccess ? 'success' : ''}`}
                    onClick={handleAddToCart}
                    disabled={addingToCart || stockStatus.status === 'out-of-stock'}
                  >
                    {cartSuccess ? (
                      <>✓ Added Successfully!</>
                    ) : addingToCart ? (
                      <>🔄 Adding...</>
                    ) : stockStatus.status === 'out-of-stock' ? (
                      'Out of Stock'
                    ) : (
                      <>
                        <FaShoppingCart />
                        Add {quantity} to Cart
                      </>
                    )}
                  </button>
                  
                  <WishlistToggle productId={product._id} className="wishlist-btn-inline" />
                </div>
                
                {product.stock !== undefined && quantity >= product.stock && (
                  <small className="stock-warning-inline">
                    ⚠️ Maximum available: {product.stock}
                  </small>
                )}
              </div>
            </div>
            
            {/* Stock Information - Only show if stock info is available */}
            {(product.stock !== undefined || product.isAvailable !== undefined) && (
              <div className="stock-section">
                <div className="stock-info-detail">
                  <span className={`stock-status ${stockStatus.class}`}>
                    {stockStatus.label}
                    {product.stock !== undefined && product.stock > 0 && stockStatus.status !== 'in-stock' && (
                      <span className="stock-count"> - {product.stock} remaining</span>
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="product-description">
              <h3>📝 About This Handcraft</h3>
              <p>{product.aiEnhancedDescription || product.description}</p>
              
              {product.tags && product.tags.length > 0 && (
                <div className="product-tags">
                  <h4>Tags</h4>
                  <div className="tags-list">
                    {product.tags.map((tag, index) => (
                      <span key={index} className="tag-item">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {product.materials && product.materials.length > 0 && (
              <div className="materials-section">
                <h3>🎨 {t('product.materialsUsed')}</h3>
                <div className="materials-list">
                  {product.materials.map((material, index) => (
                    <span key={index} className="material-tag">
                      ✓ {material}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {product.dimensions && (
              <div className="dimensions-section">
                <h3>📏 Dimensions</h3>
                <div className="dimensions">
                  L: {product.dimensions.length}cm × W: {product.dimensions.width}cm × H: {product.dimensions.height}cm
                </div>
                <div className="dimensions-visual">
                  <div className="dimension-box">
                    <div className="dimension-item">
                      <span className="dimension-label">Length</span>
                      <span className="dimension-value">{product.dimensions.length}cm</span>
                    </div>
                    <div className="dimension-item">
                      <span className="dimension-label">Width</span>
                      <span className="dimension-value">{product.dimensions.width}cm</span>
                    </div>
                    <div className="dimension-item">
                      <span className="dimension-label">Height</span>
                      <span className="dimension-value">{product.dimensions.height}cm</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quantity and Add to Cart */}
            <div className="purchase-section">
              {stockStatus.status !== 'out-of-stock' && (
                <div className="quantity-selector">
                  <label>{t('product.quantity')}:</label>
                  <div className="quantity-controls">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="qty-btn"
                      disabled={quantity <= 1}
                    >
                      -
                    </button>
                    <span className="quantity">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock || 999, quantity + 1))}
                      className="qty-btn"
                      disabled={product.stock !== undefined && quantity >= product.stock}
                    >
                      +
                    </button>
                  </div>
                  {product.stock !== undefined && quantity >= product.stock && (
                    <small className="stock-warning">
                      Maximum available: {product.stock}
                    </small>
                  )}
                </div>
              )}
              
              <div className="action-buttons">
                <button 
                  className={`btn btn-cart btn-lg ${
                    stockStatus.status === 'out-of-stock' ? 'btn-secondary disabled' : ''
                  }`}
                  onClick={handleAddToCart}
                  disabled={addingToCart || stockStatus.status === 'out-of-stock'}
                >
                  <FaShoppingCart /> 
                  {stockStatus.status === 'out-of-stock' 
                    ? t('product.outOfStock') 
                    : (addingToCart ? t('product.adding') : t('product.addToCart'))
                  }
                </button>
                <WishlistToggle productId={product._id} className="with-text" showText={true} />
                <button className="btn btn-secondary" onClick={handleLike}>
                  <FaHeart /> {t('product.like')} ({product.likes})
                </button>
                <button className="btn btn-primary">
                  💬 {t('product.contactArtisanButton')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Artisan Section */}
        <div className="artisan-section">
          <div className="artisan-card">
            <div className="artisan-header">
              <div className="artisan-avatar">
                👤
              </div>
              <div className="artisan-info">
                <h3>{product.artisan?.name}</h3>
                <p>📍 {product.artisan?.location?.city}, {product.artisan?.location?.state}</p>
                <p>🎨 {product.artisan?.craftType} {t('product.specialist')}</p>
                {product.artisan?.rating && (
                  <div className="rating">
                    ⭐ {product.artisan.rating}/5.0
                  </div>
                )}
              </div>
              <Link to={`/artisan/${product.artisan?._id}/profile`} className="btn btn-primary">
                {t('product.viewProfile')}
              </Link>
            </div>
            
            {product.artisan?.story && (
              <div className="artisan-story">
                <h4>{t('product.artisanStory')}</h4>
                <p>{product.artisan.story}</p>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="reviews-section">
          <h3>{t('product.customerReviews')}</h3>

          <div className="review-stats">
            <div className="average-rating">
              <span>⭐</span>
              <strong>{totalReviews > 0 ? `${averageRating.toFixed(1)}/5` : t('product.noRatingsYet')}</strong>
            </div>
            <div className="rating-summary">
              {totalReviews} {totalReviews === 1 ? t('reviews.review') : t('reviews.reviews')}
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="no-reviews">
              <h4>{t('product.noReviewsYet')}</h4>
              <p>{t('product.beFirstReview')}</p>
            </div>
          ) : (
            <div className="reviews-list">
              {reviews.map((rev) => (
                <div key={rev._id} className="review-item">
                  <div className="review-header">
                    <div className="reviewer-info">
                      <span className="reviewer-name">{rev.customerName || 'Customer'}</span>
                      <span className="review-date">{new Date(rev.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="review-rating">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`review-star ${i < (rev.rating || 0) ? 'active' : ''}`}>★</span>
                      ))}
                    </div>
                  </div>
                  <p className="review-content">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Review Form */}
        <ReviewForm 
          productId={product._id}
          onReviewAdded={handleAddReview}
        />

        {/* Marketing Content */}
        {product.marketingContent && (
          <div className="marketing-section">
            <h2>{t('product.shareProduct')}</h2>
            <div className="marketing-content">
              <div className="social-media-post">
                <h4>{t('product.socialMediaPost')}</h4>
                <div className="social-post-content">
                  {product.marketingContent.socialMediaPost}
                </div>
                <button 
                  className="btn btn-success btn-sm"
                  onClick={() => navigator.clipboard.writeText(product.marketingContent.socialMediaPost)}
                >
                  {t('product.copyPost')}
                </button>
              </div>
              
              {product.marketingContent.targetAudience && (
                <div className="target-audience">
                  <h4>{t('product.targetAudience')}</h4>
                  <p>{product.marketingContent.targetAudience}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
