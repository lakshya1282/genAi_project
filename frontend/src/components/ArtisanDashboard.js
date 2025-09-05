import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { FaHome, FaUser, FaBox, FaChartBar, FaCog, FaSignOutAlt } from 'react-icons/fa';
import ArtisanProfile from './ArtisanProfile';
import ProductManagement from './ProductManagement';
import AnalyticsDashboard from './AnalyticsDashboard';
import './ArtisanDashboard.css';

const ArtisanDashboard = () => {
  const { artisanToken, logout } = useAuth();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', note: '' });

  useEffect(() => {
    fetchDashboardData();
    fetchOrders();
    
    // Handle URL parameters for direct tab navigation
    const tabParam = searchParams.get('tab');
    if (tabParam && ['dashboard', 'profile', 'products', 'analytics', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/artisan/dashboard', {
        headers: {
          'Authorization': `Bearer ${artisanToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.dashboard);
      } else {
        setError('Failed to fetch dashboard data');
      }
    } catch (error) {
      setError('Error fetching dashboard data');
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/artisan/orders', {
        headers: {
          'Authorization': `Bearer ${artisanToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      } else {
        setError('Failed to fetch orders');
      }
    } catch (error) {
      setError('Error fetching orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/artisan/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${artisanToken}`
        },
        body: JSON.stringify(statusUpdate)
      });

      if (response.ok) {
        // Refresh orders
        fetchOrders();
        setSelectedOrder(null);
        setStatusUpdate({ status: '', note: '' });
      } else {
        setError('Failed to update order status');
      }
    } catch (error) {
      setError('Error updating order status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#ffc107';
      case 'confirmed':
        return '#17a2b8';
      case 'preparing':
        return '#007bff';
      case 'shipped':
        return '#6f42c1';
      case 'delivered':
        return '#28a745';
      case 'cancelled':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const navigationItems = [
    { id: 'dashboard', label: t('navbar.dashboard'), icon: FaHome },
    { id: 'profile', label: t('artisanProfile.title'), icon: FaUser },
    { id: 'products', label: 'Products', icon: FaBox },
    { id: 'analytics', label: 'Analytics', icon: FaChartBar },
    { id: 'settings', label: 'Settings', icon: FaCog }
  ];

  const handleLogout = () => {
    logout();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ArtisanProfile />;
      case 'products':
        return <ProductManagement />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'settings':
        return <div className="coming-soon">Settings coming soon...</div>;
      case 'dashboard':
      default:
        return renderDashboardContent();
    }
  };

  const renderDashboardContent = () => (
    <>
      {/* Dashboard Stats */}
      {dashboardData && (
        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Total Orders</h3>
            <div className="stat-value">{dashboardData.stats.totalOrders}</div>
          </div>
          <div className="stat-card">
            <h3>Pending Orders</h3>
            <div className="stat-value pending">{dashboardData.stats.pendingOrders}</div>
          </div>
          <div className="stat-card">
            <h3>Completed Orders</h3>
            <div className="stat-value completed">{dashboardData.stats.completedOrders}</div>
          </div>
          <div className="stat-card">
            <h3>Total Revenue</h3>
            <div className="stat-value">{formatCurrency(dashboardData.stats.totalRevenue)}</div>
          </div>
        </div>
      )}

      {/* Orders Section */}
      <div className="orders-section">
        <h2>Recent Orders</h2>
        {orders.length === 0 ? (
          <div className="no-orders">
            <p>No orders yet</p>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <div className="order-info">
                    <h3>Order #{order.orderNumber}</h3>
                    <p className="order-date">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="order-status">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(order.orderStatus) }}
                    >
                      {order.orderStatus}
                    </span>
                  </div>
                </div>

                <div className="customer-info">
                  <p><strong>Customer:</strong> {order.user.name}</p>
                  <p><strong>Email:</strong> {order.user.email}</p>
                  {order.user.phone && <p><strong>Phone:</strong> {order.user.phone}</p>}
                </div>

                <div className="order-items">
                  {order.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <div className="item-info">
                        <span className="item-name">{item.product.name}</span>
                        <span className="item-quantity">Qty: {item.quantity}</span>
                        <span className="item-price">{formatCurrency(item.price)}</span>
                      </div>
                      <div className="item-total">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="order-actions">
                  <button 
                    className="update-status-btn"
                    onClick={() => setSelectedOrder(order)}
                  >
                    Update Status
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="artisan-dashboard">
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>Artisan Dashboard</h2>
          {dashboardData && (
            <div className="artisan-info">
              <h3>{dashboardData.artisan.name}</h3>
              <p className="craft-type">{dashboardData.artisan.craftType}</p>
            </div>
          )}
        </div>
        
        <nav className="sidebar-nav">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <FaSignOutAlt className="nav-icon" />
            <span className="nav-label">{t('navbar.logout')}</span>
          </button>
        </div>
      </div>

      <div className="dashboard-main">
        <div className="main-header">
          <h1>{navigationItems.find(item => item.id === activeTab)?.label || 'Dashboard'}</h1>
        </div>
        
        <div className="main-content">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          {renderContent()}
        </div>
      </div>

      {/* Status Update Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="status-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Update Order Status</h3>
            <p>Order #{selectedOrder.orderNumber}</p>
            
            <div className="form-group">
              <label>New Status:</label>
              <select 
                value={statusUpdate.status}
                onChange={(e) => setStatusUpdate({...statusUpdate, status: e.target.value})}
              >
                <option value="">Select Status</option>
                <option value="confirmed">Confirmed</option>
                <option value="preparing">Preparing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>

            <div className="form-group">
              <label>Note (optional):</label>
              <textarea
                value={statusUpdate.note}
                onChange={(e) => setStatusUpdate({...statusUpdate, note: e.target.value})}
                placeholder="Add a note about this status update..."
                rows="3"
              />
            </div>

            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={() => setSelectedOrder(null)}
              >
                Cancel
              </button>
              <button 
                className="update-btn"
                onClick={() => updateOrderStatus(selectedOrder._id)}
                disabled={!statusUpdate.status}
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtisanDashboard;
