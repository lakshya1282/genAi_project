import React from 'react';
import { Link } from 'react-router-dom';

class CartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error for debugging
    console.error('Cart Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="cart-container">
          <div className="cart-empty">
            <h2>Oops! Something went wrong</h2>
            <p>We encountered an issue loading your cart. Please try refreshing the page.</p>
            <div style={{ margin: '20px 0' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => window.location.reload()}
                style={{ marginRight: '10px' }}
              >
                Refresh Page
              </button>
              <Link to="/marketplace" className="btn btn-secondary">
                Continue Shopping
              </Link>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details style={{ marginTop: '20px', textAlign: 'left' }}>
                <summary>Error Details (Development Only)</summary>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '10px', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflow: 'auto'
                }}>
                  {this.state.error && this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CartErrorBoundary;
