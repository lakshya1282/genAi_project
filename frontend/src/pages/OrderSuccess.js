import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaCheckCircle, FaShoppingBag, FaTruck, FaMapMarkerAlt, FaCreditCard, FaCalendarAlt, FaReceipt } from 'react-icons/fa';
import './OrderSuccess.css';

const OrderSuccess = () => {
  const { user, userType } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userType !== 'customer') {
      navigate('/customer/login');
      return;
    }

    // Get order data from navigation state
    if (location.state?.order) {
      setOrder(location.state.order);
      setLoading(false);
      
      // Clear the state to prevent refresh issues
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // If no order data, redirect to orders page
      navigate('/orders');
    }
  }, [user, userType, navigate, location.state]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.street}, ${address.city}, ${address.state}, ${address.country} - ${address.pincode}`;
  };

  if (loading) {
    return (
      <div className="order-success-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-success-container">
        <div className="error-state">
          <h2>Order Not Found</h2>
          <p>We couldn't find your order details.</p>
          <Link to="/orders" className="btn-primary">View Your Orders</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="order-success-container">
      {/* Success Header */}
      <div className="success-header">
        <div className="success-icon">
          <FaCheckCircle />
        </div>
        <h1>Order Placed Successfully!</h1>
        <p className="success-message">
          Thank you for your purchase! Your order has been confirmed and is being processed.
        </p>
        <div className="order-number">
          <strong>Order #{order.orderNumber}</strong>
        </div>
      </div>

      {/* Order Details */}
      <div className="order-details-section">
        <div className="order-info-grid">
          {/* Order Summary */}
          <div className="order-summary-card">
            <h3>
              <FaReceipt className="icon" />
              Order Summary
            </h3>
            <div className="order-items">
              {order.items && order.items.map((item, index) => (
                <div key={index} className="order-item">
                  <div className="item-info">
                    <h4>{item.product?.name || 'Product'}</h4>
                    <p>Quantity: {item.quantity}</p>
                    <p className="item-price">₹{item.price} × {item.quantity}</p>
                  </div>
                  <div className="item-total">
                    ₹{item.total}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="price-breakdown">
              <div className="price-row">
                <span>Subtotal</span>
                <span>₹{order.subtotal}</span>
              </div>
              <div className="price-row">
                <span>Shipping</span>
                <span>{order.shippingCost === 0 ? 'Free' : `₹${order.shippingCost}`}</span>
              </div>
              <div className="price-row">
                <span>Tax (GST)</span>
                <span>₹{order.tax}</span>
              </div>
              <div className="price-row total">
                <span>Total</span>
                <span>₹{order.total}</span>
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div className="delivery-info-card">
            <h3>
              <FaTruck className="icon" />
              Delivery Information
            </h3>
            <div className="delivery-details">
              <div className="detail-item">
                <FaMapMarkerAlt className="detail-icon" />
                <div>
                  <strong>Shipping Address</strong>
                  <p>{formatAddress(order.shippingAddress)}</p>
                </div>
              </div>
              
              <div className="detail-item">
                <FaCalendarAlt className="detail-icon" />
                <div>
                  <strong>Estimated Delivery</strong>
                  <p>
                    {order.estimatedDelivery 
                      ? formatDate(order.estimatedDelivery)
                      : '5-7 business days'
                    }
                  </p>
                </div>
              </div>
              
              {order.trackingNumber && (
                <div className="detail-item">
                  <FaTruck className="detail-icon" />
                  <div>
                    <strong>Tracking Number</strong>
                    <p className="tracking-number">{order.trackingNumber}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Information */}
          <div className="payment-info-card">
            <h3>
              <FaCreditCard className="icon" />
              Payment Information
            </h3>
            <div className="payment-details">
              <div className="detail-item">
                <div>
                  <strong>Payment Method</strong>
                  <p className="capitalize">{order.paymentDetails?.method || 'Card'}</p>
                </div>
              </div>
              
              <div className="detail-item">
                <div>
                  <strong>Transaction ID</strong>
                  <p className="transaction-id">{order.paymentDetails?.transactionId}</p>
                </div>
              </div>
              
              <div className="detail-item">
                <div>
                  <strong>Payment Status</strong>
                  <span className={`status-badge ${order.paymentDetails?.paymentStatus}`}>
                    {order.paymentDetails?.paymentStatus || 'Completed'}
                  </span>
                </div>
              </div>
              
              <div className="detail-item">
                <div>
                  <strong>Order Date</strong>
                  <p>{formatDate(order.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Status */}
        <div className="order-status-card">
          <h3>Order Status</h3>
          <div className="status-timeline">
            <div className="status-step active">
              <div className="status-dot"></div>
              <div className="status-info">
                <strong>Order Placed</strong>
                <p>{formatDate(order.createdAt)}</p>
              </div>
            </div>
            <div className="status-step">
              <div className="status-dot"></div>
              <div className="status-info">
                <strong>Order Confirmed</strong>
                <p>Pending</p>
              </div>
            </div>
            <div className="status-step">
              <div className="status-dot"></div>
              <div className="status-info">
                <strong>Processing</strong>
                <p>Pending</p>
              </div>
            </div>
            <div className="status-step">
              <div className="status-dot"></div>
              <div className="status-info">
                <strong>Shipped</strong>
                <p>Pending</p>
              </div>
            </div>
            <div className="status-step">
              <div className="status-dot"></div>
              <div className="status-info">
                <strong>Delivered</strong>
                <p>Pending</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="next-steps-section">
        <h3>What's Next?</h3>
        <div className="next-steps-grid">
          <div className="step-card">
            <FaCheckCircle className="step-icon" />
            <h4>Order Confirmation</h4>
            <p>You'll receive an email confirmation with your order details shortly.</p>
          </div>
          
          <div className="step-card">
            <FaTruck className="step-icon" />
            <h4>Tracking Updates</h4>
            <p>We'll send you tracking information once your order ships.</p>
          </div>
          
          <div className="step-card">
            <FaShoppingBag className="step-icon" />
            <h4>View Orders</h4>
            <p>Track your order status anytime in your orders section.</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <Link to="/orders" className="btn-primary">
          <FaShoppingBag />
          View All Orders
        </Link>
        <Link to="/marketplace" className="btn-secondary">
          Continue Shopping
        </Link>
      </div>

      {/* Support Information */}
      <div className="support-info">
        <h4>Need Help?</h4>
        <p>
          If you have any questions about your order, please contact our support team.
          We're here to help you with any concerns.
        </p>
        <Link to="/support" className="support-link">Contact Support</Link>
      </div>
    </div>
  );
};

export default OrderSuccess;
