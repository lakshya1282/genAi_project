import React, { useState, useEffect } from 'react';
import { FaTimes, FaChartLine, FaEye, FaHeart, FaShoppingCart } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './ProductAnalytics.css';

const ProductAnalytics = ({ product, onClose }) => {
  const { artisanToken } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    if (product) {
      fetchAnalytics();
    }
  }, [product, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (dateRange.dateFrom) queryParams.append('dateFrom', dateRange.dateFrom);
      if (dateRange.dateTo) queryParams.append('dateTo', dateRange.dateTo);

      const response = await fetch(`http://localhost:5000/api/artisan/products/${product._id}/analytics?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${artisanToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      } else {
        setError('Failed to fetch analytics data');
      }
    } catch (error) {
      setError('Error fetching analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="analytics-modal">
          <div className="analytics-loading">
            <div className="loading-spinner"></div>
            <p>Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="analytics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="analytics-header">
          <div>
            <h2>Product Analytics</h2>
            <p>{product.name}</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="analytics-content">
          {/* Date Range Filter */}
          <div className="date-range-section">
            <h3>Date Range</h3>
            <div className="date-inputs">
              <div>
                <label>From:</label>
                <input
                  type="date"
                  value={dateRange.dateFrom}
                  onChange={(e) => handleDateChange('dateFrom', e.target.value)}
                />
              </div>
              <div>
                <label>To:</label>
                <input
                  type="date"
                  value={dateRange.dateTo}
                  onChange={(e) => handleDateChange('dateTo', e.target.value)}
                />
              </div>
            </div>
          </div>

          {analytics && (
            <>
              {/* Key Metrics */}
              <div className="metrics-section">
                <h3>Key Metrics</h3>
                <div className="metrics-grid">
                  <div className="metric-card">
                    <div className="metric-icon views">
                      <FaEye />
                    </div>
                    <div className="metric-info">
                      <div className="metric-value">{analytics.engagementMetrics.views}</div>
                      <div className="metric-label">Total Views</div>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon likes">
                      <FaHeart />
                    </div>
                    <div className="metric-info">
                      <div className="metric-value">{analytics.engagementMetrics.likes}</div>
                      <div className="metric-label">Total Likes</div>
                      <div className="metric-sub">
                        {analytics.engagementMetrics.likeRate}% like rate
                      </div>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon sales">
                      <FaShoppingCart />
                    </div>
                    <div className="metric-info">
                      <div className="metric-value">{analytics.salesMetrics.totalSold}</div>
                      <div className="metric-label">Units Sold</div>
                      <div className="metric-sub">
                        {analytics.salesMetrics.orderCount} orders
                      </div>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon revenue">
                      <FaChartLine />
                    </div>
                    <div className="metric-info">
                      <div className="metric-value">{formatCurrency(analytics.salesMetrics.totalRevenue)}</div>
                      <div className="metric-label">Total Revenue</div>
                      <div className="metric-sub">
                        Avg: {formatCurrency(analytics.salesMetrics.avgOrderValue)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Information */}
              <div className="product-info-section">
                <h3>Product Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Category:</label>
                    <span>{analytics.productInfo.category}</span>
                  </div>
                  <div className="info-item">
                    <label>Price:</label>
                    <span>{formatCurrency(analytics.productInfo.price)}</span>
                  </div>
                  <div className="info-item">
                    <label>Current Stock:</label>
                    <span>{analytics.productInfo.currentStock} units</span>
                  </div>
                  <div className="info-item">
                    <label>Conversion Rate:</label>
                    <span>{analytics.salesMetrics.conversionRate}%</span>
                  </div>
                </div>
              </div>

              {/* Inventory Status */}
              <div className="inventory-section">
                <h3>Inventory Status</h3>
                <div className="inventory-stats">
                  <div className="inventory-item">
                    <label>Available Stock:</label>
                    <span className={analytics.inventoryMetrics.isLowStock ? 'low-stock' : 'normal-stock'}>
                      {analytics.inventoryMetrics.availableStock} units
                      {analytics.inventoryMetrics.isLowStock && ' (Low Stock)'}
                      {analytics.inventoryMetrics.isOutOfStock && ' (Out of Stock)'}
                    </span>
                  </div>
                  <div className="inventory-item">
                    <label>Stock Value:</label>
                    <span>{formatCurrency(analytics.inventoryMetrics.stockValue)}</span>
                  </div>
                  <div className="inventory-item">
                    <label>Low Stock Threshold:</label>
                    <span>{analytics.inventoryMetrics.lowStockThreshold} units</span>
                  </div>
                </div>
              </div>

              {/* Performance Summary */}
              <div className="performance-section">
                <h3>Performance Summary</h3>
                <div className="performance-stats">
                  <div className="performance-row">
                    <span>Average Order Value:</span>
                    <strong>{formatCurrency(analytics.salesMetrics.avgOrderValue)}</strong>
                  </div>
                  <div className="performance-row">
                    <span>Conversion Rate:</span>
                    <strong>{analytics.salesMetrics.conversionRate}%</strong>
                  </div>
                  <div className="performance-row">
                    <span>Like Rate:</span>
                    <strong>{analytics.engagementMetrics.likeRate}%</strong>
                  </div>
                  <div className="performance-row">
                    <span>Stock Status:</span>
                    <strong className={analytics.inventoryMetrics.isOutOfStock ? 'out-of-stock' : 
                      analytics.inventoryMetrics.isLowStock ? 'low-stock' : 'in-stock'}>
                      {analytics.inventoryMetrics.isOutOfStock ? 'Out of Stock' : 
                       analytics.inventoryMetrics.isLowStock ? 'Low Stock' : 'In Stock'}
                    </strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="analytics-footer">
          <button className="close-analytics-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductAnalytics;
