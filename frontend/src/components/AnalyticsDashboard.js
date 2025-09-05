import React, { useState, useEffect } from 'react';
import { FaChartLine, FaEye, FaHeart, FaShoppingCart, FaArrowUp, FaArrowDown, FaBox, FaDollarSign, FaUsers, FaCalendarAlt, FaFilter, FaDownload } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = () => {
  const { artisanToken } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30'); // days
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchAnalyticsData();
    fetchProductsAnalytics();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`http://localhost:5000/api/artisan/analytics/overview?days=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${artisanToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setAnalytics(data.analytics);
      } else {
        throw new Error(data.message || 'Failed to fetch analytics data');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(error.message || 'Failed to load analytics data. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsAnalytics = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/artisan/products', {
        headers: {
          'Authorization': `Bearer ${artisanToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const getTrendIcon = (trend) => {
    return trend >= 0 ? <FaArrowUp className="trend-up" /> : <FaArrowDown className="trend-down" />;
  };

  const getTrendClass = (trend) => {
    return trend >= 0 ? 'trend-positive' : 'trend-negative';
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-error">
        <h3>⚠️ Unable to Load Analytics</h3>
        <p>{error}</p>
        <button onClick={fetchAnalyticsData} className="retry-btn">
          <FaArrowUp /> Try Again
        </button>
      </div>
    );
  }

  // Show message when no products exist
  if (analytics && analytics.overview.totalProducts === 0) {
    return (
      <div className="analytics-dashboard">
        <div className="analytics-header">
          <div className="header-info">
            <h2>📊 Analytics Overview</h2>
            <p>Track your product performance and business insights</p>
          </div>
        </div>
        
        <div className="no-products-message">
          <div className="no-products-card">
            <div className="no-products-icon">📦</div>
            <h3>No Products Yet</h3>
            <p>Create your first product to start seeing analytics data here.</p>
            <div className="getting-started-tips">
              <h4>Getting Started:</h4>
              <ul>
                <li>Go to the "Products" section</li>
                <li>Click "Add New Product"</li>
                <li>Fill in your product details</li>
                <li>Start tracking your performance!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      {/* Header Controls */}
      <div className="analytics-header">
        <div className="header-info">
          <h2>📊 Analytics Overview</h2>
          <p>Track your product performance and business insights</p>
        </div>
        
        <div className="header-controls">
          <div className="time-range-selector">
            <FaCalendarAlt className="calendar-icon" />
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
              <option value="365">Last year</option>
            </select>
          </div>
          
          <button className="export-btn">
            <FaDownload /> Export Report
          </button>
        </div>
      </div>

      {analytics && (
        <>
          {/* Key Metrics Overview */}
          <div className="metrics-overview">
            <div className="metric-card total-products">
              <div className="metric-icon">
                <FaBox />
              </div>
              <div className="metric-content">
                <div className="metric-value">{analytics.overview.totalProducts}</div>
                <div className="metric-label">Total Products</div>
                <div className="metric-subtitle">Active listings</div>
              </div>
            </div>

            <div className="metric-card total-views">
              <div className="metric-icon">
                <FaEye />
              </div>
              <div className="metric-content">
                <div className="metric-value">{formatNumber(analytics.overview.totalViews)}</div>
                <div className="metric-label">Total Views</div>
                <div className={`metric-trend ${getTrendClass(analytics.trends.viewsTrend)}`}>
                  {getTrendIcon(analytics.trends.viewsTrend)}
                  {Math.abs(analytics.trends.viewsTrend)}%
                </div>
              </div>
            </div>

            <div className="metric-card total-likes">
              <div className="metric-icon">
                <FaHeart />
              </div>
              <div className="metric-content">
                <div className="metric-value">{formatNumber(analytics.overview.totalLikes)}</div>
                <div className="metric-label">Total Likes</div>
                <div className={`metric-trend ${getTrendClass(analytics.trends.likesTrend)}`}>
                  {getTrendIcon(analytics.trends.likesTrend)}
                  {Math.abs(analytics.trends.likesTrend)}%
                </div>
              </div>
            </div>

            <div className="metric-card total-sales">
              <div className="metric-icon">
                <FaShoppingCart />
              </div>
              <div className="metric-content">
                <div className="metric-value">{analytics.overview.totalSales}</div>
                <div className="metric-label">Total Sales</div>
                <div className={`metric-trend ${getTrendClass(analytics.trends.salesTrend)}`}>
                  {getTrendIcon(analytics.trends.salesTrend)}
                  {Math.abs(analytics.trends.salesTrend)}%
                </div>
              </div>
            </div>

            <div className="metric-card total-revenue">
              <div className="metric-icon">
                <FaDollarSign />
              </div>
              <div className="metric-content">
                <div className="metric-value">{formatCurrency(analytics.overview.totalRevenue)}</div>
                <div className="metric-label">Total Revenue</div>
                <div className={`metric-trend ${getTrendClass(analytics.trends.revenueTrend)}`}>
                  {getTrendIcon(analytics.trends.revenueTrend)}
                  {Math.abs(analytics.trends.revenueTrend)}%
                </div>
              </div>
            </div>

            <div className="metric-card conversion-rate">
              <div className="metric-icon">
                <FaChartLine />
              </div>
              <div className="metric-content">
                <div className="metric-value">{analytics.overview.conversionRate}%</div>
                <div className="metric-label">Conversion Rate</div>
                <div className="metric-subtitle">Views to sales</div>
              </div>
            </div>
          </div>

          {/* Top Performing Products */}
          <div className="analytics-section">
            <div className="section-header">
              <h3>🏆 Top Performing Products</h3>
              <span className="section-subtitle">Your best sellers in the last {timeRange} days</span>
            </div>

            <div className="top-products-grid">
              {analytics.topPerforming.map((product, index) => (
                <div key={product._id} className="top-product-card">
                  <div className="product-rank">#{index + 1}</div>
                  <div className="product-info">
                    <h4 className="product-name">{product.name}</h4>
                    <span className="product-category">{product.category}</span>
                  </div>
                  
                  <div className="product-metrics">
                    <div className="product-metric">
                      <FaEye className="metric-icon-small" />
                      <span>{formatNumber(product.views)} views</span>
                    </div>
                    <div className="product-metric">
                      <FaHeart className="metric-icon-small" />
                      <span>{product.likes} likes</span>
                    </div>
                    <div className="product-metric">
                      <FaShoppingCart className="metric-icon-small" />
                      <span>{product.sales} sold</span>
                    </div>
                  </div>
                  
                  <div className="product-performance">
                    <div className="revenue-info">
                      <span className="revenue-value">{formatCurrency(product.revenue)}</span>
                      <span className="conversion-rate">{product.conversionRate}% conversion</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="analytics-section">
            <div className="section-header">
              <h3>📋 Category Performance</h3>
              <span className="section-subtitle">Revenue distribution by product category</span>
            </div>

            <div className="category-breakdown">
              {analytics.categoryBreakdown.map((category) => (
                <div key={category.category} className="category-item">
                  <div className="category-info">
                    <h4 className="category-name">{category.category}</h4>
                    <span className="category-count">{category.count} products</span>
                  </div>
                  
                  <div className="category-metrics">
                    <div className="category-revenue">
                      <span className="revenue-amount">{formatCurrency(category.revenue)}</span>
                      <span className="revenue-percentage">{category.percentage}%</span>
                    </div>
                    
                    <div className="category-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${category.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="analytics-section">
            <div className="section-header">
              <h3>🔔 Recent Activity</h3>
              <span className="section-subtitle">Latest interactions with your products</span>
            </div>

            <div className="recent-activity">
              {analytics.recentActivity.map((activity, index) => (
                <div key={index} className={`activity-item ${activity.type}`}>
                  <div className="activity-icon">
                    {activity.type === 'sale' && <FaShoppingCart />}
                    {activity.type === 'view' && <FaEye />}
                    {activity.type === 'like' && <FaHeart />}
                  </div>
                  
                  <div className="activity-content">
                    <div className="activity-text">
                      {activity.type === 'sale' && `New sale: ${activity.product}`}
                      {activity.type === 'view' && `Product viewed: ${activity.product}`}
                      {activity.type === 'like' && `Product liked: ${activity.product}`}
                    </div>
                    <div className="activity-time">
                      {new Date(activity.date).toLocaleString()}
                    </div>
                  </div>
                  
                  {activity.amount && (
                    <div className="activity-amount">
                      {formatCurrency(activity.amount)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* All Products Summary */}
          {products.length > 0 && (
            <div className="analytics-section">
              <div className="section-header">
                <h3>📦 All Products Summary</h3>
                <span className="section-subtitle">Performance overview of all your products</span>
              </div>

              <div className="products-table">
                <div className="table-header">
                  <div className="th product-name">Product</div>
                  <div className="th category">Category</div>
                  <div className="th views">Views</div>
                  <div className="th likes">Likes</div>
                  <div className="th sold">Sold</div>
                  <div className="th stock">Stock</div>
                  <div className="th status">Status</div>
                </div>
                
                <div className="table-body">
                  {products.map((product) => (
                    <div key={product._id} className="table-row">
                      <div className="td product-name">
                        <div className="product-name-cell">
                          <span className="name">{product.name}</span>
                          <span className="price">{formatCurrency(product.price)}</span>
                        </div>
                      </div>
                      <div className="td category">
                        <span className="category-badge">{product.category}</span>
                      </div>
                      <div className="td views">{formatNumber(product.views || 0)}</div>
                      <div className="td likes">{product.likes || 0}</div>
                      <div className="td sold">{product.quantitySold || 0}</div>
                      <div className="td stock">
                        <span className={`stock-badge ${product.isLowStock ? 'low' : product.isOutOfStock ? 'out' : 'normal'}`}>
                          {product.quantityAvailable || 0}
                        </span>
                      </div>
                      <div className="td status">
                        <span className={`status-badge ${product.isActive ? 'active' : 'inactive'}`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
