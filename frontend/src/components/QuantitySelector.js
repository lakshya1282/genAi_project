import React, { useState, useEffect } from 'react';
import { FaPlus, FaMinus, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';
import './QuantitySelector.css';

const QuantitySelector = ({ 
  product, 
  quantity = 1, 
  onChange, 
  currentCartQuantity = 0,
  disabled = false,
  size = 'medium', // 'small', 'medium', 'large'
  showRealTimeStock = false // Temporarily disabled until backend is stable
}) => {
  const [localQuantity, setLocalQuantity] = useState(quantity);
  const [isUpdating, setIsUpdating] = useState(false);
  const [stockInfo, setStockInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch real-time stock information
  const fetchStockInfo = async () => {
    if (!product?._id || !showRealTimeStock) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`/api/stock/${product._id}`);
      if (response.data.success) {
        setStockInfo(response.data.stockInfo);
      }
    } catch (error) {
      console.error('Failed to fetch stock info:', error);
      // Fallback to product data
      setStockInfo({
        availableStock: product.availableStock || product.stock || 0,
        totalStock: product.stock || 0,
        stockStatus: 'unknown'
      });
    } finally {
      setLoading(false);
    }
  };

  // Update stock info when product changes
  useEffect(() => {
    fetchStockInfo();
  }, [product?._id, showRealTimeStock]);

  // Calculate display values
  const maxQuantity = stockInfo ? stockInfo.availableStock : 
    (product ? (product.availableStock || product.stock || 0) : 0);
  
  const getStockText = () => {
    if (loading) return 'Checking stock...';
    if (!product) return 'Unavailable';
    if (!stockInfo) return `${maxQuantity} in stock`;
    
    const { availableStock, totalStock, reservedByOthers, stockStatus, userReservation } = stockInfo;
    
    if (stockStatus === 'out_of_stock') {
      return 'Out of stock';
    } else if (stockStatus === 'low_stock') {
      return `Only ${availableStock} left`;
    } else if (reservedByOthers > 0) {
      return `${availableStock} available (${reservedByOthers} reserved by others)`;
    } else if (userReservation) {
      return `${availableStock} available (${userReservation.quantity} reserved for you)`;
    } else {
      return `${availableStock} in stock`;
    }
  };

  // Sync local quantity with parent quantity
  useEffect(() => {
    if (quantity !== localQuantity) {
      setLocalQuantity(quantity);
    }
  }, [quantity]);

  const handleIncrement = () => {
    if (disabled || isUpdating || localQuantity >= maxQuantity) {
      return;
    }
    
    const newQuantity = localQuantity + 1;
    setIsUpdating(true);
    setLocalQuantity(newQuantity);
    
    if (onChange) {
      onChange(newQuantity);
    }
    
    // Reset updating state
    setTimeout(() => setIsUpdating(false), 300);
  };

  const handleDecrement = () => {
    if (disabled || isUpdating || localQuantity <= 1) {
      return;
    }
    
    const newQuantity = localQuantity - 1;
    setIsUpdating(true);
    setLocalQuantity(newQuantity);
    
    if (onChange) {
      onChange(newQuantity);
    }
    
    // Reset updating state
    setTimeout(() => setIsUpdating(false), 300);
  };

  const handleInputChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    const clampedValue = Math.max(1, Math.min(maxQuantity, value));
    
    setLocalQuantity(clampedValue);
    if (onChange && clampedValue !== localQuantity) {
      onChange(clampedValue);
    }
  };

  // Return disabled state if product is unavailable
  if (disabled && product && !product.isActive) {
    return (
      <div className={`quantity-selector ${size} disabled`}>
        <div className="stock-status">
          <span className="stock-unavailable">
            Product unavailable
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`quantity-selector ${size} ${disabled ? 'disabled' : ''} ${isUpdating ? 'updating' : ''}`}>
      <div className="quantity-controls">
        <button
          type="button"
          className="quantity-btn decrement"
          onClick={handleDecrement}
          disabled={disabled || isUpdating || localQuantity <= 1}
          aria-label="Decrease quantity"
        >
          <FaMinus />
        </button>
        
        <input
          type="number"
          className="quantity-input"
          value={localQuantity}
          onChange={handleInputChange}
          min={1}
          max={maxQuantity}
          disabled={disabled}
          aria-label="Quantity"
        />
        
        <button
          type="button"
          className="quantity-btn increment"
          onClick={handleIncrement}
          disabled={disabled || isUpdating || localQuantity >= maxQuantity}
          aria-label="Increase quantity"
        >
          <FaPlus />
        </button>
      </div>
      
      <div className="stock-info">
        <span className={`stock-status ${
          stockInfo?.stockStatus === 'out_of_stock' ? 'stock-out' :
          stockInfo?.stockStatus === 'low_stock' ? 'stock-low' :
          'stock-available'
        }`}>
          {loading && <FaClock className="loading-icon" />}
          {stockInfo?.stockStatus === 'out_of_stock' && <FaExclamationTriangle className="warning-icon" />}
          {stockInfo?.stockStatus === 'low_stock' && <FaExclamationTriangle className="warning-icon" />}
          {getStockText()}
        </span>
        {maxQuantity < 10 && maxQuantity > 0 && (
          <span className="max-quantity-info">
            Max: {maxQuantity}
          </span>
        )}
        {stockInfo?.userReservation && (
          <span className="reservation-info">
            <FaClock className="reservation-icon" />
            Reserved until {new Date(stockInfo.userReservation.expiresAt).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
};

export default QuantitySelector;
