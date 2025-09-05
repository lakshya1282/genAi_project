import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const RazorpayPayment = ({ orderData, onSuccess, onFailure, disabled }) => {
  const { userToken } = useAuth();
  const [processing, setProcessing] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setProcessing(true);
    
    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      // Create order on backend
      const orderResponse = await fetch('http://localhost:5000/api/orders/create-payment-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          orderId: orderData.orderId,
          amount: orderData.total * 100 // Convert to paise
        })
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create payment order');
      }

      const paymentOrder = await orderResponse.json();

      // Configure Razorpay options
      const options = {
        key: paymentOrder.key,
        amount: paymentOrder.order.amount,
        currency: paymentOrder.order.currency,
        name: 'ArtisanAI Marketplace',
        description: `Order #${orderData.orderNumber}`,
        image: '/logo192.png', // Your app logo
        order_id: paymentOrder.order.id,
        handler: async (response) => {
          try {
            // Verify payment on backend
            const verifyResponse = await fetch('http://localhost:5000/api/orders/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: orderData.orderId
              })
            });

            if (verifyResponse.ok) {
              onSuccess({
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id
              });
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            onFailure('Payment verification failed');
          }
        },
        prefill: {
          name: orderData.customerName,
          email: orderData.customerEmail,
          contact: orderData.customerPhone || ''
        },
        notes: {
          order_id: orderData.orderId
        },
        theme: {
          color: '#007bff'
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            onFailure('Payment cancelled by user');
          }
        }
      };

      // Create Razorpay instance and open
      const rzp = new window.Razorpay(options);
      rzp.open();
      
    } catch (error) {
      console.error('Payment error:', error);
      onFailure(error.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || processing}
      className={`razorpay-payment-btn ${processing ? 'processing' : ''}`}
      style={{
        background: processing ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: processing ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        minWidth: '200px'
      }}
    >
      {processing ? (
        <>
          <span className="spinner" style={{
            display: 'inline-block',
            width: '16px',
            height: '16px',
            border: '2px solid #fff',
            borderTop: '2px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginRight: '8px'
          }}></span>
          Processing...
        </>
      ) : (
        'Pay with Razorpay'
      )}
    </button>
  );
};

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default RazorpayPayment;
