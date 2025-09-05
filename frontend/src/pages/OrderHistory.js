import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FaEye, FaTimes } from 'react-icons/fa';
import './OrderHistory.css';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userType } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (userType !== 'customer') {
      navigate('/customer/login');
      return;
    }

    fetchOrders();
  }, [userType, navigate]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/api/orders/my-orders');
      if (response.data.success) {
        setOrders(response.data.orders);
      }
    } catch (error) {
      toast.error('Error fetching orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        const response = await axios.put(`/api/orders/${orderId}/cancel`);
        if (response.data.success) {
          toast.success('Order cancelled successfully');
          fetchOrders(); // Refresh the list
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Error cancelling order');
      }
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'placed': '#f39c12',
      'confirmed': '#3498db',
      'processing': '#9b59b6',
      'shipped': '#e67e22',
      'delivered': '#27ae60',
      'cancelled': '#e74c3c'
    };
    return statusColors[status] || '#95a5a6';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="order-history-container">
        <div className="loading-state">
          <p>Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="order-history-container">
      <div className="order-history-header">
        <h1>Your Orders</h1>
        <p>Track and manage your purchases</p>
      </div>

      {orders.length === 0 ? (
        <div className="no-orders">
          <h2>No orders yet</h2>
          <p>You haven't placed any orders yet. Start shopping to see your orders here!</p>
          <Link to="/marketplace" className="shop-now-btn">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order._id} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <h3>Order #{order.orderNumber}</h3>
                  <p className="order-date">Placed on {formatDate(order.createdAt)}</p>
                </div>
                <div className="order-status">
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(order.orderStatus) }}
                  >
                    {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                  </span>
                </div>
              </div>

              <div className="order-items">
                {order.items.map((item) => (
                  <div key={item._id} className="order-item">
                    <div className="item-details">
                      <h4>{item.product.name}</h4>
                      <p>by {item.artisan.name}</p>
                      <p className="item-quantity">Quantity: {item.quantity}</p>
                    </div>
                    <div className="item-price">
                      ₹{item.total}
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-footer">
                <div className="order-total">
                  <span>Total: ₹{order.total}</span>
                </div>
                <div className="order-actions">
                  <Link 
                    to={`/orders/${order.orderNumber}`}
                    className="view-order-btn"
                  >
                    <FaEye /> View Details
                  </Link>
                  {['placed', 'confirmed', 'processing'].includes(order.orderStatus) && (
                    <button
                      onClick={() => handleCancelOrder(order._id)}
                      className="cancel-order-btn"
                    >
                      <FaTimes /> Cancel Order
                    </button>
                  )}
                </div>
              </div>

              {order.estimatedDelivery && (
                <div className="delivery-info">
                  <p>Estimated delivery: {formatDate(order.estimatedDelivery)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
