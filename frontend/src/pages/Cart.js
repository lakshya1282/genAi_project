import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaTrash, FaPlus, FaMinus, FaExclamationTriangle, FaHeart } from 'react-icons/fa';
import QuantitySelector from '../components/QuantitySelector';
import { calculateCartSummary, canProceedToCheckout, getStockMessage } from '../utils/stockUtils';
import './Cart.css';

const Cart = () => {
  const { t } = useTranslation();
  const { cart, cartCount, removeFromCart, updateCartQuantity, userType, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Calculate cart summary using useMemo to prevent unnecessary recalculations
  const cartSummary = useMemo(() => {
    if (!cart || cart.length === 0) {
      return null;
    }

    try {
      return calculateCartSummary(cart);
    } catch (error) {
      console.error('Error calculating cart summary:', error);
      // Return a default summary to prevent crashes
      return {
        subtotal: 0,
        shippingCost: 100,
        tax: 0,
        total: 100,
        totalItems: 0,
        availableItems: 0,
        unavailableItems: [],
        allAvailable: true
      };
    }
  }, [cart]);

  // Handle navigation for non-customer users
  useEffect(() => {
    if (userType !== 'customer') {
      navigate('/customer/login');
    }
  }, [userType, navigate]);

  const handleRemoveItem = async (itemId, productName) => {
    // Show confirmation dialog
    const confirmed = window.confirm(`Are you sure you want to remove "${productName}" from your cart?`);
    if (!confirmed) return;

    setLoading(true);
    const result = await removeFromCart(itemId);
    if (result.success) {
      toast.success('Item removed from cart');
    } else {
      toast.error(result.message);
    }
    setLoading(false);
  };

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    try {
      const result = await updateCartQuantity(itemId, newQuantity);
      
      if (!result.success) {
        toast.error(result.message);
        if (result.availableStock !== undefined) {
          toast.info(`Only ${result.availableStock} items available`);
        }
      } else {
        toast.success('Quantity updated!');
      }
    } catch (error) {
      console.error('Error updating cart quantity:', error);
      toast.error('Failed to update quantity');
    }
  };

  const handleCheckout = () => {
    if (!cart || cart.length === 0) {
      toast.error(t('messages.cartEmpty'));
      return;
    }
    
    if (!cartSummary || !canProceedToCheckout(cartSummary)) {
      toast.error(t('cart.stockWarnings.resolveIssues'));
      return;
    }
    
    navigate('/checkout');
  };

  // Loading state
  if (loading) {
    return (
      <div className="cart-container">
        <div className="cart-empty">
          <h2>{t('cart.loading')}</h2>
          <p>{t('cart.loadingCart')}</p>
        </div>
      </div>
    );
  }

  // Authentication check
  if (!user || userType !== 'customer') {
    return (
      <div className="cart-container">
        <div className="cart-empty">
          <h2>{t('cart.pleaseLogin')}</h2>
          <p>{t('cart.loginRequired')}</p>
          <Link to="/customer/login" className="login-link">{t('cart.login')}</Link>
        </div>
      </div>
    );
  }

  // Cart not initialized
  if (!cart) {
    return (
      <div className="cart-container">
        <div className="cart-empty">
          <h2>Initializing Cart...</h2>
          <p>Please wait while we set up your cart.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h1>{t('cart.title')}</h1>
        <p>{cartCount} {t('cart.itemsInCart')}</p>
      </div>

      {!cart || cart.length === 0 ? (
        <div className="cart-empty">
          <h2>{t('cart.empty')}</h2>
          <p>{t('cart.emptyDesc')}</p>
          <Link to="/marketplace" className="continue-shopping">
            {t('cart.continueShopping')}
          </Link>
        </div>
      ) : (
        <div className="cart-content">
          {/* Stock availability warnings */}
          {cartSummary && !cartSummary.allAvailable && (
            <div className="stock-warnings">
              <div className="warning-header">
                <FaExclamationTriangle className="warning-icon" />
                <h3>{t('cart.stockWarnings.title')}</h3>
              </div>
              <div className="warning-items">
                {cartSummary.unavailableItems.map((unavailableItem, index) => (
                  <div key={index} className="warning-item">
                    <strong>{unavailableItem.name}</strong>: {unavailableItem.reason}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="cart-items">
            {cart.map((item) => {
              // Handle missing availability property - assume available for MVP
              const isAvailable = item.availability ? item.availability.available !== false : true;
              const stockMessage = item.availability && item.availability.available === false ? getStockMessage(item.availability) : null;
              
              return (
                <div key={item._id} className={`cart-item ${!isAvailable ? 'unavailable' : ''}`}>
                  <div className="item-image">
                    {item.product.images && item.product.images.length > 0 ? (
                      <img 
                        src={item.product.images[0]} 
                        alt={item.product.name}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/100x100?text=Product';
                        }}
                      />
                    ) : (
                      <div className="placeholder-image">{t('cart.noImage')}</div>
                    )}
                    {!isAvailable && (
                      <div className="unavailable-overlay">
                        <FaExclamationTriangle />
                      </div>
                    )}
                  </div>

                  <div className="item-details">
                    <h3>{item.product.name}</h3>
                    <p className="artisan-name">
                      {t('cart.by')} {item.product.artisan?.name}
                    </p>
                    <p className="item-price">₹{item.product.price}</p>
                    
                    {stockMessage && (
                      <div className="stock-message error">
                        <FaExclamationTriangle className="icon" />
                        {stockMessage}
                      </div>
                    )}
                  </div>

                  <div className="quantity-section">
                    <QuantitySelector
                      product={item.product}
                      quantity={item.quantity}
                      onChange={(newQuantity) => handleQuantityChange(item._id, newQuantity)}
                      disabled={!isAvailable}
                      size="medium"
                    />
                  </div>

                  <div className="item-total">
                    <div className="price">
                      ₹{item.itemTotal || (item.product.price * item.quantity)}
                    </div>
                    {!isAvailable && (
                      <div className="unavailable-text">{t('cart.stockWarnings.notIncludedInTotal')}</div>
                    )}
                  </div>

                  <div className="item-actions">
                    <button
                      onClick={() => handleRemoveItem(item._id, item.product.name)}
                      className="delete-btn"
                      title="Remove from cart"
                      aria-label="Delete item from cart"
                    >
                      <FaTrash />
                      <span className="delete-text">Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cart-summary">
            <div className="summary-card">
              <h3>Order Summary</h3>
              
              {cartSummary && (
                <>
                  <div className="summary-row">
                    <span>Subtotal ({cartSummary.availableItems} available items)</span>
                    <span>₹{cartSummary.subtotal}</span>
                  </div>
                  
                  {cartSummary.totalItems !== cartSummary.availableItems && (
                    <div className="summary-row unavailable">
                      <span>Unavailable items ({cartSummary.totalItems - cartSummary.availableItems})</span>
                      <span>Not included</span>
                    </div>
                  )}
                  
                  <div className="summary-row">
                    <span>Shipping</span>
                    <span>{cartSummary.shippingCost === 0 ? 'Free' : `₹${cartSummary.shippingCost}`}</span>
                  </div>
                  
                  <div className="summary-row">
                    <span>Tax (GST 18%)</span>
                    <span>₹{cartSummary.tax}</span>
                  </div>
                  
                  <hr />
                  
                  <div className="summary-row total">
                    <span>Total</span>
                    <span>₹{cartSummary.total}</span>
                  </div>

                  {cartSummary.subtotal <= 2000 && cartSummary.availableItems > 0 && (
                    <p className="shipping-notice">
                      Add ₹{2000 - cartSummary.subtotal} more for free shipping!
                    </p>
                  )}

                  {!cartSummary.allAvailable && (
                    <div className="checkout-warning">
                      <FaExclamationTriangle className="icon" />
                      <span>{t('cart.stockWarnings.resolveToCheckout')}</span>
                    </div>
                  )}

                  <button 
                    className={`checkout-btn ${!canProceedToCheckout(cartSummary) ? 'disabled' : ''}`}
                    onClick={handleCheckout}
                    disabled={!canProceedToCheckout(cartSummary)}
                  >
                    {canProceedToCheckout(cartSummary) ? t('cart.checkout') : t('cart.cannotCheckout')}
                  </button>
                </>
              )}

              <Link to="/marketplace" className="continue-shopping">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
