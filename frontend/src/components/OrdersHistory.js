import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaShoppingBag, FaCalendarAlt, FaRupeeSign, FaTruck, FaCheck, FaClock, FaTimes, FaEye, FaDownload } from 'react-icons/fa';
import axios from 'axios';
import './OrdersHistory.css';

const OrdersHistory = () => {
  const { t } = useTranslation();
  const { userType } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, completed, pending, cancelled
  const [sortBy, setSortBy] = useState('latest'); // latest, oldest, amount-high, amount-low

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/api/customer/orders');
      
      if (response.data.success) {
        setOrders(response.data.orders || []);
      } else {
        toast.error(response.data.message || t('orders.failedToFetch'));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error(t('orders.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'pending':
      case 'awaiting_payment':
        return 'warning';
      case 'cancelled':
        return 'danger';
      case 'processing':
        return 'info';
      case 'shipped':
        return 'primary';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <FaCheck />;
      case 'pending':
      case 'awaiting_payment':
        return <FaClock />;
      case 'cancelled':
        return <FaTimes />;
      case 'processing':
        return <FaTruck />;
      case 'shipped':
        return <FaTruck />;
      default:
        return <FaClock />;
    }
  };

  const getFilteredAndSortedOrders = () => {
    let filteredOrders = orders;

    // Apply filter
    if (filter !== 'all') {
      filteredOrders = orders.filter(order => {
        const status = order.status?.toLowerCase();
        switch (filter) {
          case 'completed':
            return status === 'completed';
          case 'pending':
            return status === 'pending' || status === 'awaiting_payment' || status === 'processing';
          case 'cancelled':
            return status === 'cancelled';
          default:
            return true;
        }
      });
    }

    // Apply sorting
    const sortedOrders = [...filteredOrders].sort((a, b) => {
      switch (sortBy) {
        case 'latest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'amount-high':
          return b.totalAmount - a.totalAmount;
        case 'amount-low':
          return a.totalAmount - b.totalAmount;
        default:
          return 0;
      }
    });

    return sortedOrders;
  };

  const handleViewOrder = (orderId) => {
    // Navigate to order details page or show modal
    window.open(`/order/${orderId}`, '_blank');
  };

  if (userType !== 'customer') {
    return (
      <div className="not-authorized">
        <p>{t('customerSettings.notAuthorized')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="orders-loading">
        <p>{t('orders.loadingOrders')}</p>
      </div>
    );
  }

  const filteredOrders = getFilteredAndSortedOrders();

  return (
    <div className="orders-history">
      <div className="orders-header">
        <div className="header-info">
          <h2>
            <FaShoppingBag /> {t('orders.title')}
          </h2>
          <p>{t('orders.trackAndManage')}</p>
        </div>
        
        <div className="orders-stats">
          <div className="stat-card">
            <span className="stat-number">{orders.length}</span>
            <span className="stat-label">{t('orders.totalOrders')}</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {orders.filter(o => o.status?.toLowerCase() === 'completed').length}
            </span>
            <span className="stat-label">{t('orders.completed')}</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              ₹{orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0).toLocaleString()}
            </span>
            <span className="stat-label">{t('orders.totalSpent')}</span>
          </div>
        </div>
      </div>

      <div className="orders-controls">
        <div className="filter-controls">
          <label>
            {t('orders.filterByStatus')}:
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">{t('orders.allOrders')}</option>
              <option value="completed">{t('orders.completed')}</option>
              <option value="pending">{t('orders.pending')}</option>
              <option value="cancelled">{t('orders.cancelled')}</option>
            </select>
          </label>
        </div>

        <div className="sort-controls">
          <label>
            {t('orders.sortBy')}:
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="latest">{t('orders.latestFirst')}</option>
              <option value="oldest">{t('orders.oldestFirst')}</option>
              <option value="amount-high">{t('orders.amountHighToLow')}</option>
              <option value="amount-low">{t('orders.amountLowToHigh')}</option>
            </select>
          </label>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="no-orders">
          <FaShoppingBag />
          <h3>{t('orders.noOrdersFound')}</h3>
          <p>
            {filter === 'all' 
              ? t('orders.noOrdersYet')
              : t('orders.noFilteredOrders', { filter: t(`orders.${filter}`) })}
          </p>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map((order) => (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <div className="order-id">
                  <strong>{t('orders.orderNumber')} {order.orderNumber || order._id.slice(-8)}</strong>
                  <span className="order-date">
                    <FaCalendarAlt />
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="order-status">
                  <span className={`status-badge ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    {order.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                  </span>
                </div>
              </div>

              <div className="order-body">
                <div className="order-items">
                  <h4>{t('orders.items', { count: order.items?.length || 0 })}</h4>
                  <div className="items-preview">
                    {order.items?.slice(0, 3).map((item, index) => (
                      <div key={index} className="item-preview">
                        <span className="item-name">{item.product?.name || item.name}</span>
                        <span className="item-qty">x{item.qty || item.quantity}</span>
                      </div>
                    ))}
                    {order.items?.length > 3 && (
                      <div className="more-items">
                        +{t('orders.moreItems', { count: order.items.length - 3 })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="order-summary">
                  <div className="order-amount">
                    <FaRupeeSign />
                    <span className="amount">{(order.totalAmount || 0).toLocaleString()}</span>
                  </div>
                  
                  <div className="order-actions">
                    <button 
                      className="btn-view"
                      onClick={() => handleViewOrder(order._id)}
                      title={t('orders.viewOrderDetails')}
                    >
                      <FaEye /> {t('orders.viewOrder')}
                    </button>
                  </div>
                </div>
              </div>

              {order.deliveryAddress && (
                <div className="order-footer">
                  <div className="delivery-info">
                    <span className="delivery-label">{t('orders.deliveredTo')}:</span>
                    <span className="delivery-address">
                      {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.pincode}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersHistory;
