import React from 'react';
import { FaEdit, FaTrash, FaCopy, FaEye, FaEyeSlash, FaChartLine } from 'react-icons/fa';
import './ArtisanProductCard.css';

const ArtisanProductCard = ({ product, onEdit, onDelete, onToggleStatus, onDuplicate, onAnalytics }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStockStatusColor = (product) => {
    if (product.isOutOfStock) return '#dc3545';
    if (product.isLowStock) return '#ffc107';
    return '#28a745';
  };

  const getStockStatusText = (product) => {
    if (product.isOutOfStock) return 'Out of Stock';
    if (product.isLowStock) return 'Low Stock';
    return 'In Stock';
  };

  return (
    <div className={`artisan-product-card ${!product.isActive ? 'inactive' : ''}`}>
      <div className="product-image-container">
        {product.images && product.images.length > 0 ? (
          <img 
            src={`http://localhost:5000${product.images[0]}`} 
            alt={product.name}
            className="product-image"
            onError={(e) => {
              e.target.src = '/placeholder-image.png';
            }}
          />
        ) : (
          <div className="no-image-placeholder">
            <FaEye className="placeholder-icon" />
            <span>No Image</span>
          </div>
        )}
        
        {!product.isActive && (
          <div className="inactive-overlay">
            <span>Inactive</span>
          </div>
        )}
      </div>

      <div className="product-info">
        <div className="product-header">
          <h3 className="product-name" title={product.name}>
            {product.name}
          </h3>
          <div className="product-category">
            {product.category}
          </div>
        </div>

        <div className="product-description">
          <p>{product.description?.substring(0, 100)}{product.description?.length > 100 ? '...' : ''}</p>
        </div>

        <div className="product-details">
          <div className="price-info">
            <span className="price">{formatCurrency(product.price)}</span>
            <span className="price-range">({product.priceRange})</span>
          </div>
          
          <div className="stock-info">
            <span 
              className="stock-status"
              style={{ color: getStockStatusColor(product) }}
            >
              {getStockStatusText(product)}
            </span>
            <span className="stock-quantity">
              {product.quantityAvailable} available
            </span>
          </div>
        </div>

        <div className="product-metadata">
          {product.materials && product.materials.length > 0 && (
            <div className="metadata-item">
              <strong>Materials: </strong>
              <span>{product.materials.join(', ')}</span>
            </div>
          )}

          {product.craftingTime && (
            <div className="metadata-item">
              <strong>Crafting Time: </strong>
              <span>{product.craftingTime}</span>
            </div>
          )}
        </div>

        <div className="product-stats-compact">
          <div className="stat-compact">
            <strong>{product.views || 0}</strong><span>VIEWS</span>
          </div>
          <div className="stat-compact">
            <strong>{product.likes || 0}</strong><span>LIKES</span>
          </div>
          <div className="stat-compact">
            <strong>{product.quantitySold || 0}</strong><span>SOLD</span>
          </div>
        </div>
      </div>

      <div className="product-actions">
        <button 
          className="action-btn primary"
          onClick={() => onEdit(product)}
          title="Edit Product"
        >
          <FaEdit /> Edit
        </button>
        
        <button 
          className={`action-btn ${product.isActive ? 'warning' : 'success'}`}
          onClick={() => onToggleStatus(product)}
          title={product.isActive ? 'Hide Product' : 'Show Product'}
        >
          {product.isActive ? <FaEyeSlash /> : <FaEye />}
        </button>
        
        <button 
          className="action-btn secondary"
          onClick={() => onAnalytics(product)}
          title="View Analytics"
        >
          <FaChartLine />
        </button>
      </div>
    </div>
  );
};

export default ArtisanProductCard;
