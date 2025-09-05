import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import WishlistToggle from './WishlistToggle';
import './ProductCard.css';

const ProductCard = ({ product, showArtisan = true }) => {
  const { t } = useTranslation();

  // Function to get stock status
  const getStockStatus = (product) => {
    // If product doesn't have stock information, assume it's available
    if (product.stock === undefined && product.isAvailable === undefined) {
      return { status: 'in-stock', label: t('marketplace.inStock'), class: 'in-stock' };
    }
    
    // If explicitly set as unavailable or stock is 0
    if (product.isAvailable === false || product.stock === 0) {
      return { status: 'out-of-stock', label: t('marketplace.outOfStock'), class: 'out-of-stock' };
    }
    
    // If stock is defined, use it for classification
    if (product.stock !== undefined) {
      if (product.stock <= 2) {
        return { status: 'low-stock', label: t('marketplace.lowStock'), class: 'low-stock' };
      } else if (product.stock <= 5) {
        return { status: 'limited-stock', label: t('marketplace.stockLimited'), class: 'limited-stock' };
      }
    }
    
    // Default to in-stock for products without specific stock info
    return { status: 'in-stock', label: t('marketplace.inStock'), class: 'in-stock' };
  };

  const stockStatus = getStockStatus(product);

  return (
    <div className={`product-card ${stockStatus.class}`}>
      <div className="product-image">
        <img 
          src={product.images?.[0] || 'https://via.placeholder.com/300x300?text=Handcraft'} 
          alt={product.name} 
        />
        <WishlistToggle productId={product._id} className="product-wishlist" />
        
        {/* Stock Status Badge - Only show if stock info is available */}
        {(product.stock !== undefined || product.isAvailable !== undefined) && (
          <div className={`stock-badge ${stockStatus.class}`}>
            {stockStatus.label}
          </div>
        )}
        
        {/* Out of Stock Overlay */}
        {stockStatus.status === 'out-of-stock' && (
          <div className="out-of-stock-overlay">
            <span className="out-of-stock-text">{t('marketplace.outOfStock')}</span>
          </div>
        )}
        
        <div className="product-overlay">
          <Link 
            to={`/product/${product._id}`} 
            className={`btn btn-sm ${
              stockStatus.status === 'out-of-stock' 
                ? 'btn-secondary disabled' 
                : 'btn-primary'
            }`}
            onClick={(e) => {
              if (stockStatus.status === 'out-of-stock') {
                e.preventDefault();
              }
            }}
          >
            {t('marketplace.viewDetails')}
          </Link>
        </div>
      </div>
      
      <div className="product-info">
        <h3 className={`product-name ${
          stockStatus.status === 'out-of-stock' ? 'out-of-stock-text' : ''
        }`}>
          {product.name}
        </h3>
        <p className="product-description">
          {product.description?.substring(0, 100)}...
        </p>
        
        <div className="product-meta">
          <span className="product-category">{product.category}</span>
          <span className={`product-price ${
            stockStatus.status === 'out-of-stock' ? 'out-of-stock-price' : ''
          }`}>
            ₹{product.price}
          </span>
        </div>
        
        {/* Stock Information - Only show if stock info is available */}
        {(product.stock !== undefined || product.isAvailable !== undefined) && (
          <div className="stock-info">
            <span className={`stock-status ${stockStatus.class}`}>
              {stockStatus.label}
              {product.stock !== undefined && product.stock > 0 && stockStatus.status !== 'in-stock' && (
                <span className="stock-count"> ({product.stock} left)</span>
              )}
            </span>
          </div>
        )}
        
        {showArtisan && (
          <div className="artisan-info">
            <Link to={`/artisan/${product.artisan?._id || 'sample'}/profile`} className="artisan-link">
              👤 {t('marketplace.by')} {product.artisan?.name}
            </Link>
            <span className="artisan-location">
              📍 {product.artisan?.location?.city}, {product.artisan?.location?.state}
            </span>
          </div>
        )}
        
        <div className="product-stats">
          <span>👁️ {product.views} {t('marketplace.views')}</span>
          <span>❤️ {product.likes} {t('marketplace.likes')}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
