import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import RazorpayPayment from '../components/RazorpayPayment';
import './Checkout.css';

const Checkout = () => {
  const { cart, cartCount, userType, user, userToken } = useAuth();
  const [cartTotal, setCartTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [formData, setFormData] = useState({
    shippingAddress: {
      street: '',
      city: '',
      state: '',
      country: 'India',
      pincode: ''
    },
    paymentMethod: 'cod'
  });

  const navigate = useNavigate();

  // Calculate totals for display
  const shippingCost = cartTotal > 2000 ? 0 : 100;
  const tax = Math.round(cartTotal * 0.18);
  const grandTotal = cartTotal + shippingCost + tax;

  useEffect(() => {
    if (userType !== 'customer') {
      navigate('/customer/login');
      return;
    }

    if (cart.length === 0) {
      navigate('/cart');
      return;
    }

    // Calculate cart total
    const total = cart.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);
    setCartTotal(total);
  }, [cart, userType, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        shippingAddress: {
          ...prev.shippingAddress,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // For COD, directly place order
      if (formData.paymentMethod === 'cod') {
        const response = await axios.post('http://localhost:5000/api/orders/checkout', formData, {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        });
        
        if (response.data.success) {
          toast.success('Order placed successfully!');
          navigate('/orders');
        }
      } else {
        // For online payments, create order first then process payment
        const response = await axios.post('http://localhost:5000/api/orders/checkout', {
          ...formData,
          paymentMethod: 'online'
        }, {
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        });
        
        if (response.data.success) {
          // Set pending order for payment processing
          setPendingOrder({
            orderId: response.data.order._id,
            orderNumber: response.data.order.orderNumber,
            total: grandTotal,
            customerName: user.name,
            customerEmail: user.email,
            customerPhone: user.phone
          });
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error processing order');
    }

    setLoading(false);
  };

  const handlePaymentSuccess = (paymentData) => {
    toast.success('Payment successful! Order confirmed.');
    navigate('/orders');
    setPendingOrder(null);
  };

  const handlePaymentFailure = (error) => {
    toast.error(error || 'Payment failed. Please try again.');
    setPendingOrder(null);
  };

  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <h1>Checkout</h1>
        <p>Review your order and complete your purchase</p>
      </div>

      <form className="checkout-form" onSubmit={handleSubmit}>
        <div className="checkout-content">
          {/* Order Summary */}
          <div className="order-summary">
            <h2>Order Summary</h2>
            <div className="order-items">
              {cart.map((item) => (
                <div key={item.product._id} className="checkout-item">
                  <div className="item-info">
                    <h4>{item.product.name}</h4>
                    <p>by {item.product.artisan?.name}</p>
                    <p className="item-price">₹{item.product.price} × {item.quantity}</p>
                  </div>
                  <div className="item-total">
                    ₹{item.product.price * item.quantity}
                  </div>
                </div>
              ))}
            </div>

            <div className="order-totals">
              <div className="total-row">
                <span>Subtotal ({cartCount} items)</span>
                <span>₹{cartTotal}</span>
              </div>
              <div className="total-row">
                <span>Shipping</span>
                <span>{shippingCost === 0 ? 'Free' : `₹${shippingCost}`}</span>
              </div>
              <div className="total-row">
                <span>Tax (GST 18%)</span>
                <span>₹{tax}</span>
              </div>
              <div className="total-row final-total">
                <span>Total</span>
                <span>₹{grandTotal}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="shipping-section">
            <h2>Shipping Address</h2>
            <div className="form-grid">
              <div className="form-group full-width">
                <label htmlFor="street">Street Address</label>
                <input
                  type="text"
                  id="street"
                  name="address.street"
                  value={formData.shippingAddress.street}
                  onChange={handleChange}
                  required
                  placeholder="Enter street address"
                />
              </div>

              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  type="text"
                  id="city"
                  name="address.city"
                  value={formData.shippingAddress.city}
                  onChange={handleChange}
                  required
                  placeholder="City"
                />
              </div>

              <div className="form-group">
                <label htmlFor="state">State</label>
                <input
                  type="text"
                  id="state"
                  name="address.state"
                  value={formData.shippingAddress.state}
                  onChange={handleChange}
                  required
                  placeholder="State"
                />
              </div>

              <div className="form-group">
                <label htmlFor="country">Country</label>
                <input
                  type="text"
                  id="country"
                  name="address.country"
                  value={formData.shippingAddress.country}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="pincode">PIN Code</label>
                <input
                  type="text"
                  id="pincode"
                  name="address.pincode"
                  value={formData.shippingAddress.pincode}
                  onChange={handleChange}
                  required
                  placeholder="PIN Code"
                  pattern="[0-9]{6}"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="payment-section">
            <h2>Payment Method</h2>
            <div className="payment-options">
              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={formData.paymentMethod === 'cod'}
                  onChange={handleChange}
                />
                <span>Cash on Delivery</span>
              </label>

              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="upi"
                  checked={formData.paymentMethod === 'upi'}
                  onChange={handleChange}
                />
                <span>UPI Payment</span>
              </label>

              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={formData.paymentMethod === 'card'}
                  onChange={handleChange}
                />
                <span>Credit/Debit Card</span>
              </label>

              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="netbanking"
                  checked={formData.paymentMethod === 'netbanking'}
                  onChange={handleChange}
                />
                <span>Net Banking</span>
              </label>
            </div>
          </div>
        </div>

        <div className="checkout-footer">
          {pendingOrder ? (
            <div className="payment-gateway">
              <p>Order created successfully! Please complete the payment.</p>
              <RazorpayPayment
                orderData={pendingOrder}
                onSuccess={handlePaymentSuccess}
                onFailure={handlePaymentFailure}
                disabled={false}
              />
            </div>
          ) : (
            <button
              type="submit"
              className="place-order-btn"
              disabled={loading}
            >
              {loading ? 'Processing...' : 
                formData.paymentMethod === 'cod' ? 
                `Place Order - ₹${grandTotal}` : 
                `Continue to Payment - ₹${grandTotal}`
              }
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default Checkout;
