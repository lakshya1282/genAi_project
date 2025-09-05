import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaCreditCard, FaLock, FaShieldAlt, FaSpinner } from 'react-icons/fa';
import axios from 'axios';
import './Payment.css';

const Payment = () => {
  const { user, userType, validateCart } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [cartValidation, setCartValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    // Payment Details
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardHolder: user?.name || '',
    
    // Billing Address
    billingAddress: {
      street: '',
      city: '',
      state: '',
      country: 'India',
      pincode: ''
    },
    
    // Shipping Address
    shippingAddress: {
      street: '',
      city: '',
      state: '',
      country: 'India',
      pincode: ''
    },
    
    sameAsBilling: true,
    paymentMethod: 'card'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (userType !== 'customer') {
      navigate('/customer/login');
      return;
    }

    // Load cart validation data passed from checkout
    if (location.state?.cartValidation) {
      setCartValidation(location.state.cartValidation);
    } else {
      // Validate cart if no data passed
      loadCartValidation();
    }

    // Pre-fill addresses if user has them
    if (user?.addresses && user.addresses.length > 0) {
      const defaultAddress = user.addresses.find(addr => addr.isDefault) || user.addresses[0];
      setFormData(prev => ({
        ...prev,
        billingAddress: {
          street: defaultAddress.street || '',
          city: defaultAddress.city || '',
          state: defaultAddress.state || '',
          country: defaultAddress.country || 'India',
          pincode: defaultAddress.pincode || ''
        },
        shippingAddress: {
          street: defaultAddress.street || '',
          city: defaultAddress.city || '',
          state: defaultAddress.state || '',
          country: defaultAddress.country || 'India',
          pincode: defaultAddress.pincode || ''
        }
      }));
    }
  }, [user, userType, navigate, location.state]);

  const loadCartValidation = async () => {
    setLoading(true);
    try {
      const result = await validateCart();
      if (result.success) {
        setCartValidation({
          validation: result.validation,
          pricing: result.pricing
        });
        
        if (!result.validation.isValid) {
          toast.error('Your cart has items that are no longer available');
          navigate('/cart');
          return;
        }
      } else {
        toast.error('Unable to validate cart');
        navigate('/cart');
        return;
      }
    } catch (error) {
      toast.error('Error validating cart');
      navigate('/cart');
      return;
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else if (name === 'sameAsBilling' && checked) {
      setFormData(prev => ({
        ...prev,
        sameAsBilling: true,
        shippingAddress: { ...prev.billingAddress }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, '').length <= 16) {
      setFormData(prev => ({ ...prev, cardNumber: formatted }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Card validation
    if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, '').length < 16) {
      newErrors.cardNumber = 'Please enter a valid 16-digit card number';
    }
    
    if (!formData.cardHolder.trim()) {
      newErrors.cardHolder = 'Cardholder name is required';
    }
    
    if (!formData.expiryMonth || !formData.expiryYear) {
      newErrors.expiry = 'Please select expiry date';
    }
    
    if (!formData.cvv || formData.cvv.length < 3) {
      newErrors.cvv = 'Please enter a valid CVV';
    }

    // Address validation
    if (!formData.billingAddress.street.trim()) {
      newErrors['billingAddress.street'] = 'Street address is required';
    }
    if (!formData.billingAddress.city.trim()) {
      newErrors['billingAddress.city'] = 'City is required';
    }
    if (!formData.billingAddress.state.trim()) {
      newErrors['billingAddress.state'] = 'State is required';
    }
    if (!formData.billingAddress.pincode.trim()) {
      newErrors['billingAddress.pincode'] = 'Pincode is required';
    }

    if (!formData.sameAsBilling) {
      if (!formData.shippingAddress.street.trim()) {
        newErrors['shippingAddress.street'] = 'Shipping street address is required';
      }
      if (!formData.shippingAddress.city.trim()) {
        newErrors['shippingAddress.city'] = 'Shipping city is required';
      }
      if (!formData.shippingAddress.state.trim()) {
        newErrors['shippingAddress.state'] = 'Shipping state is required';
      }
      if (!formData.shippingAddress.pincode.trim()) {
        newErrors['shippingAddress.pincode'] = 'Shipping pincode is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Create order
      const orderData = {
        items: cartValidation.validation.availableItems,
        shippingAddress: formData.sameAsBilling ? formData.billingAddress : formData.shippingAddress,
        paymentDetails: {
          method: formData.paymentMethod,
          transactionId: `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
          paymentStatus: 'completed'
        },
        subtotal: cartValidation.pricing.subtotal,
        shippingCost: cartValidation.pricing.shippingCost,
        tax: cartValidation.pricing.tax,
        total: cartValidation.pricing.total,
        notes: `Payment processed via ${formData.paymentMethod} ending in ${formData.cardNumber.slice(-4)}`
      };

      const response = await axios.post('/api/orders/create', orderData);
      
      if (response.data.success) {
        // Navigate to success page with order details
        navigate('/order-success', { 
          state: { 
            order: response.data.order,
            isNewOrder: true 
          }
        });
      } else {
        throw new Error(response.data.message || 'Failed to create order');
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.message || 'Payment failed. Please try again.');
      setProcessing(false);
    }
  };

  if (!user || userType !== 'customer') {
    return (
      <div className="payment-container">
        <div className="payment-error">
          <h2>Please Login</h2>
          <p>You need to login as a customer to make a payment.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="payment-container">
        <div className="loading-state">
          <FaSpinner className="spin" />
          <p>Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!cartValidation) {
    return (
      <div className="payment-container">
        <div className="payment-error">
          <h2>Unable to process payment</h2>
          <p>Cart validation failed. Please go back to your cart.</p>
          <button onClick={() => navigate('/cart')} className="btn-primary">
            Back to Cart
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-container">
      <div className="payment-header">
        <h1>
          <FaLock className="icon" />
          Secure Checkout
        </h1>
        <div className="security-badges">
          <FaShieldAlt className="icon" />
          <span>256-bit SSL Encrypted</span>
        </div>
      </div>

      <div className="payment-content">
        <div className="payment-form-section">
          <form onSubmit={handleSubmit} className="payment-form">
            {/* Payment Method */}
            <div className="form-section">
              <h3>Payment Method</h3>
              <div className="payment-methods">
                <label className="payment-method active">
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="card" 
                    checked={formData.paymentMethod === 'card'}
                    onChange={handleInputChange}
                  />
                  <FaCreditCard />
                  <span>Credit/Debit Card</span>
                </label>
              </div>
            </div>

            {/* Card Details */}
            <div className="form-section">
              <h3>Card Details</h3>
              <div className="form-group">
                <label>Card Number</label>
                <input
                  type="text"
                  value={formData.cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="1234 5678 9012 3456"
                  className={errors.cardNumber ? 'error' : ''}
                />
                {errors.cardNumber && <span className="error-message">{errors.cardNumber}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Expiry Month</label>
                  <select 
                    name="expiryMonth" 
                    value={formData.expiryMonth}
                    onChange={handleInputChange}
                    className={errors.expiry ? 'error' : ''}
                  >
                    <option value="">Month</option>
                    {Array.from({length: 12}, (_, i) => (
                      <option key={i+1} value={String(i+1).padStart(2, '0')}>
                        {String(i+1).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Expiry Year</label>
                  <select 
                    name="expiryYear" 
                    value={formData.expiryYear}
                    onChange={handleInputChange}
                    className={errors.expiry ? 'error' : ''}
                  >
                    <option value="">Year</option>
                    {Array.from({length: 10}, (_, i) => {
                      const year = new Date().getFullYear() + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="form-group">
                  <label>CVV</label>
                  <input
                    type="password"
                    name="cvv"
                    value={formData.cvv}
                    onChange={handleInputChange}
                    placeholder="123"
                    maxLength="4"
                    className={errors.cvv ? 'error' : ''}
                  />
                </div>
              </div>
              {errors.expiry && <span className="error-message">{errors.expiry}</span>}

              <div className="form-group">
                <label>Cardholder Name</label>
                <input
                  type="text"
                  name="cardHolder"
                  value={formData.cardHolder}
                  onChange={handleInputChange}
                  placeholder="Name as on card"
                  className={errors.cardHolder ? 'error' : ''}
                />
                {errors.cardHolder && <span className="error-message">{errors.cardHolder}</span>}
              </div>
            </div>

            {/* Billing Address */}
            <div className="form-section">
              <h3>Billing Address</h3>
              <div className="form-group">
                <label>Street Address</label>
                <input
                  type="text"
                  name="billingAddress.street"
                  value={formData.billingAddress.street}
                  onChange={handleInputChange}
                  placeholder="House no, Building, Street"
                  className={errors['billingAddress.street'] ? 'error' : ''}
                />
                {errors['billingAddress.street'] && <span className="error-message">{errors['billingAddress.street']}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    name="billingAddress.city"
                    value={formData.billingAddress.city}
                    onChange={handleInputChange}
                    placeholder="City"
                    className={errors['billingAddress.city'] ? 'error' : ''}
                  />
                  {errors['billingAddress.city'] && <span className="error-message">{errors['billingAddress.city']}</span>}
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    name="billingAddress.state"
                    value={formData.billingAddress.state}
                    onChange={handleInputChange}
                    placeholder="State"
                    className={errors['billingAddress.state'] ? 'error' : ''}
                  />
                  {errors['billingAddress.state'] && <span className="error-message">{errors['billingAddress.state']}</span>}
                </div>
                <div className="form-group">
                  <label>Pincode</label>
                  <input
                    type="text"
                    name="billingAddress.pincode"
                    value={formData.billingAddress.pincode}
                    onChange={handleInputChange}
                    placeholder="Pincode"
                    className={errors['billingAddress.pincode'] ? 'error' : ''}
                  />
                  {errors['billingAddress.pincode'] && <span className="error-message">{errors['billingAddress.pincode']}</span>}
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="form-section">
              <div className="shipping-header">
                <h3>Shipping Address</h3>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="sameAsBilling"
                    checked={formData.sameAsBilling}
                    onChange={handleInputChange}
                  />
                  Same as billing address
                </label>
              </div>

              {!formData.sameAsBilling && (
                <>
                  <div className="form-group">
                    <label>Street Address</label>
                    <input
                      type="text"
                      name="shippingAddress.street"
                      value={formData.shippingAddress.street}
                      onChange={handleInputChange}
                      placeholder="House no, Building, Street"
                      className={errors['shippingAddress.street'] ? 'error' : ''}
                    />
                    {errors['shippingAddress.street'] && <span className="error-message">{errors['shippingAddress.street']}</span>}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>City</label>
                      <input
                        type="text"
                        name="shippingAddress.city"
                        value={formData.shippingAddress.city}
                        onChange={handleInputChange}
                        placeholder="City"
                        className={errors['shippingAddress.city'] ? 'error' : ''}
                      />
                      {errors['shippingAddress.city'] && <span className="error-message">{errors['shippingAddress.city']}</span>}
                    </div>
                    <div className="form-group">
                      <label>State</label>
                      <input
                        type="text"
                        name="shippingAddress.state"
                        value={formData.shippingAddress.state}
                        onChange={handleInputChange}
                        placeholder="State"
                        className={errors['shippingAddress.state'] ? 'error' : ''}
                      />
                      {errors['shippingAddress.state'] && <span className="error-message">{errors['shippingAddress.state']}</span>}
                    </div>
                    <div className="form-group">
                      <label>Pincode</label>
                      <input
                        type="text"
                        name="shippingAddress.pincode"
                        value={formData.shippingAddress.pincode}
                        onChange={handleInputChange}
                        placeholder="Pincode"
                        className={errors['shippingAddress.pincode'] ? 'error' : ''}
                      />
                      {errors['shippingAddress.pincode'] && <span className="error-message">{errors['shippingAddress.pincode']}</span>}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button 
              type="submit" 
              className="pay-button"
              disabled={processing}
            >
              {processing ? (
                <>
                  <FaSpinner className="spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <FaLock />
                  Pay ₹{cartValidation.pricing.total}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="order-summary-section">
          <div className="order-summary">
            <h3>Order Summary</h3>
            <div className="summary-row">
              <span>Subtotal ({cartValidation.validation.availableItems} items)</span>
              <span>₹{cartValidation.pricing.subtotal}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>{cartValidation.pricing.shippingCost === 0 ? 'Free' : `₹${cartValidation.pricing.shippingCost}`}</span>
            </div>
            <div className="summary-row">
              <span>Tax (GST 18%)</span>
              <span>₹{cartValidation.pricing.tax}</span>
            </div>
            <hr />
            <div className="summary-row total">
              <span>Total</span>
              <span>₹{cartValidation.pricing.total}</span>
            </div>
            
            <div className="security-info">
              <FaShieldAlt className="icon" />
              <div>
                <strong>Your payment is secure</strong>
                <p>All transactions are encrypted and processed securely.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
