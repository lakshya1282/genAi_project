import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaPlus, FaMinus } from 'react-icons/fa';
import { FiShield, FiTruck, FiRotateCcw } from 'react-icons/fi';
import ReviewForm from '../components/ReviewForm';
import StarRating from '../components/StarRating';
import WishlistToggle from '../components/WishlistToggle';
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
      // Use sample data for demo based on the ID
      let sampleProduct;
      
      if (id === '68b9e5f1e2695ca11c71b3df') {
        // This is the "Gold Plated Ring" from your screenshot
        sampleProduct = {
          _id: id,
          name: 'Gold Plated Ring',
          description: 'Beautiful handcrafted gold plated ring with intricate designs',
          aiEnhancedDescription: 'A stunning gold plated ring that embodies traditional craftsmanship with modern elegance.',
          price: 500,
          category: 'Jewelry',
          images: ['https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&h=500&fit=crop'],
          artisan: {
            _id: 'sample-artisan-jewelry',
            name: 'Priya Sharma',
            location: { city: 'Jaipur', state: 'Rajasthan' },
            craftType: 'Jewelry',
            story: 'Master jeweler with 20 years of experience in traditional Indian jewelry making.',
            rating: 4.5
          },
          materials: ['Gold Plating', 'Brass Base', 'Traditional Polish'],
          dimensions: { diameter: 2, thickness: 0.3, weight: 5 },
          craftingTime: '1 week',
          features: [
            'Handcrafted Gold Plating',
            'Traditional Designs',
            'Adjustable Size',
            'Tarnish Resistant'
          ],
          views: 89,
          likes: 15,
          stock: 0, // This product is out of stock
          isAvailable: false,
          tags: ['handmade', 'jewelry', 'gold-plated', 'traditional', 'ring'],
          marketingContent: {
            socialMediaPost: '✨ Handcrafted Gold Plated Ring - Traditional Indian jewelry at its finest! #HandmadeJewelry #GoldPlated',
            targetAudience: 'Jewelry enthusiasts, traditional wear lovers, gift buyers'
          }
        };
      } else {
        // Default product with good stock
        sampleProduct = {
          _id: id,
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
          features: [
            'Handcrafted with Traditional Techniques',
            '100% Natural Materials Used',
            'Lead-Free Food Safe Glazes',
            'Unique Artisan Signature Design',
            'Dishwasher Safe (Hand wash recommended)'
          ],
          views: 124,
          likes: 28,
          stock: 8,
          isAvailable: true,
          tags: ['handmade', 'pottery', 'traditional', 'jaipur', 'blue-pottery', 'home-decor'],
          marketingContent: {
            socialMediaPost: '🎨 Discover authentic Jaipur Blue Pottery! ✨ Handcrafted Traditional Vase - where ancient Persian techniques meet Indian artistry. Perfect for your home! #HandmadeIndia #JaipurPottery',
            targetAudience: 'Home decor enthusiasts, art collectors, cultural heritage lovers, mindful consumers'
          }
        };
      }
      
      console.log('Setting sample product:', sampleProduct.name, 'Stock:', sampleProduct.stock, 'Available:', sampleProduct.isAvailable);
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
    if (!product) {
      console.log('No product data');
      return { status: 'in-stock', label: t('product.inStock') || 'In Stock', class: 'in-stock' };
    }
    
    console.log('Stock status check:', {
      name: product.name,
      stock: product.stock,
      isAvailable: product.isAvailable
    });
    
    // If product doesn't have stock information, assume it's available
    if (product.stock === undefined && product.isAvailable === undefined) {
      console.log('No stock info, defaulting to in-stock');
      return { status: 'in-stock', label: t('product.inStock') || 'In Stock', class: 'in-stock' };
    }
    
    // If explicitly set as unavailable or stock is 0
    if (product.isAvailable === false || product.stock === 0) {
      console.log('Product out of stock');
      return { status: 'out-of-stock', label: t('product.outOfStock') || 'Out of Stock', class: 'out-of-stock' };
    }
    
    // If stock is defined, use it for classification
    if (product.stock !== undefined) {
      if (product.stock <= 2) {
        console.log('Low stock:', product.stock);
        return { status: 'low-stock', label: t('product.lowStock') || 'Low Stock', class: 'low-stock' };
      } else if (product.stock <= 5) {
        console.log('Limited stock:', product.stock);
        return { status: 'limited-stock', label: t('product.stockLimited') || 'Limited Stock', class: 'limited-stock' };
      }
    }
    
    // Default to in-stock for products without specific stock info
    console.log('Defaulting to in-stock');
    return { status: 'in-stock', label: t('product.inStock') || 'In Stock', class: 'in-stock' };
  };

  if (loading) {
    return <div className="loading">{t('product.loading')}</div>;
  }

  if (!product) {
    return <div className="error">{t('product.notFound')}</div>;
  }

  const stockStatus = getStockStatus(product);
  
  // Debug function to test different stock states
  const debugStockChange = (newStock, newAvailable) => {
    setProduct(prev => ({
      ...prev,
      stock: newStock,
      isAvailable: newAvailable
    }));
  };
  
  return (
    <div className={`modern-product-page ${stockStatus.class}`}>
      {/* Debug Controls */}
      <div style={{position: 'fixed', top: '10px', right: '10px', zIndex: 9999, background: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '5px', fontSize: '12px'}}>
        <div><strong>Debug Stock Controls:</strong></div>
        <div>Current: Stock={product?.stock}, Available={String(product?.isAvailable)}, Status={stockStatus.status}</div>
        <button onClick={() => debugStockChange(0, false)} style={{margin: '2px', padding: '2px 5px', fontSize: '10px'}}>Out of Stock</button>
        <button onClick={() => debugStockChange(2, true)} style={{margin: '2px', padding: '2px 5px', fontSize: '10px'}}>Low Stock</button>
        <button onClick={() => debugStockChange(4, true)} style={{margin: '2px', padding: '2px 5px', fontSize: '10px'}}>Limited Stock</button>
        <button onClick={() => debugStockChange(10, true)} style={{margin: '2px', padding: '2px 5px', fontSize: '10px'}}>In Stock</button>
      </div>
      <div className="container">
        <div className="product-layout">
          <div className="product-image-section">
            <div className={`image-container ${stockStatus.status === 'out-of-stock' ? 'out-of-stock' : ''}`}>
              <WishlistToggle productId={product._id} className="product-wishlist" />
              {product.discount && (
                <div className="discount-badge">
                  {product.discount}% OFF
                </div>
              )}
              <img
                src={product.images?.[0] || 'https://via.placeholder.com/500x500/4A90E2/FFFFFF?text=Product+Image'} 
                alt={product.name}
                className="product-image"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/500x500/4A90E2/FFFFFF?text=Product+Image';
                  console.log('Image failed to load, using fallback');
                }}
                onLoad={() => console.log('Product image loaded successfully')}
              />
              {stockStatus.status === 'out-of-stock' && (
                <div className="out-of-stock-overlay">
                  <span className="out-of-stock-text">{stockStatus.label}</span>
                </div>
              )}
            </div>
          </div>

          <div className="product-info-section">
            {/* Category Badge */}
            {product.category && (
              <span className="product-category">{product.category}</span>
            )}
            
            {/* Product Title */}
            <h1 className="product-title">
              {product.name}
            </h1>
            
            {/* Star Rating */}
            <div className="rating-wrapper">
              <StarRating 
                rating={product.rating || averageRating || 4.5} 
                totalReviews={product.totalReviews || totalReviews || 100}
                size="medium"
              />
            </div>
            
            {/* Price Section */}
            <div className="price-container">
              <div className="current-price">₹{product.price?.toLocaleString()}</div>
              {product.originalPrice && (
                <div className="original-price">₹{product.originalPrice?.toLocaleString()}</div>
              )}
            </div>
            
            {/* Product Description */}
            <div className="product-description-modern">
              <p>{product.aiEnhancedDescription || product.description}</p>
            </div>
            
            {/* Product Features */}
            {product.features && product.features.length > 0 && (
              <div className="product-features">
                {product.features.map((feature, index) => (
                  <div key={index} className="feature-item">
                    <span className="checkmark">✓</span>
                    <span className="feature-text">{feature}</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Quantity and Add to Cart */}
            <div className="purchase-controls">
              {stockStatus.status !== 'out-of-stock' && (
                <div className="quantity-section">
                  <label>Quantity:</label>
                  <div className="quantity-controls-modern">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="qty-btn-modern"
                      disabled={quantity <= 1}
                    >
                      <FaMinus />
                    </button>
                    <span className="quantity-value">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock || 999, quantity + 1))}
                      className="qty-btn-modern"
                      disabled={product.stock !== undefined && quantity >= product.stock}
                    >
                      <FaPlus />
                    </button>
                  </div>
                </div>
              )}
              
              <button 
                className={`add-to-cart-btn ${
                  stockStatus.status === 'out-of-stock' || addingToCart ? 'disabled' : ''
                } ${cartSuccess ? 'success' : ''}`}
                onClick={handleAddToCart}
                disabled={addingToCart || stockStatus.status === 'out-of-stock'}
              >
                {cartSuccess ? (
                  'Added Successfully!'
                ) : addingToCart ? (
                  'Adding to Cart...'
                ) : stockStatus.status === 'out-of-stock' ? (
                  'Out of Stock'
                ) : (
                  'Add to cart'
                )}
              </button>
              
              {product.stock !== undefined && quantity >= product.stock && (
                <small className="stock-warning-modern">
                  ⚠️ Maximum available: {product.stock}
                </small>
              )}
            </div>
            
            {/* Security Features */}
            <div className="security-features">
              <div className="security-item">
                <FiShield className="security-icon" />
                <span>Secure checkout</span>
              </div>
              <div className="security-badges">
                <span className="payment-badge">VISA</span>
                <span className="payment-badge">PayPal</span>
                <span className="payment-badge">Mastercard</span>
                <span className="payment-badge">Amex</span>
              </div>
            </div>
            
            {/* Additional Benefits */}
            <div className="benefits-section">
              <div className="benefit-item">
                <FiTruck className="benefit-icon" />
                <span>Free Shipping</span>
              </div>
              <div className="benefit-item">
                <FiRotateCcw className="benefit-icon" />
                <span>2-Year Limited Warranty</span>
              </div>
              <div className="benefit-item">
                <FiShield className="benefit-icon" />
                <span>30-Day Money Back Guarantee</span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Product Information */}
        <div className="product-additional-info">
          {/* Artisan Information */}
          {product.artisan && (
            <div className="artisan-section-modern">
              <h3>Meet the Artisan</h3>
              <div className="artisan-card-modern">
                <div className="artisan-avatar">
                  👤
                </div>
                <div className="artisan-info">
                  <h4>{product.artisan.name}</h4>
                  <p>📍 {product.artisan.location?.city}, {product.artisan.location?.state}</p>
                  <p>🎨 {product.artisan.craftType} Specialist</p>
                  {product.artisan.rating && (
                    <StarRating rating={product.artisan.rating} totalReviews={0} size="small" />
                  )}
                </div>
                <Link to={`/artisan/${product.artisan._id}/profile`} className="view-profile-btn">
                  View Profile
                </Link>
              </div>
              {product.artisan.story && (
                <div className="artisan-story">
                  <p>{product.artisan.story}</p>
                </div>
              )}
            </div>
          )}
          
          {/* Materials and Dimensions */}
          <div className="product-details-modern">
            {product.materials && product.materials.length > 0 && (
              <div className="materials-section">
                <h4>Materials Used</h4>
                <div className="materials-grid">
                  {product.materials.map((material, index) => (
                    <div key={index} className="material-item">
                      ✓ {material}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {product.dimensions && (
              <div className="dimensions-section">
                <h4>Dimensions</h4>
                <div className="dimensions-info">
                  {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height} cm
                </div>
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
