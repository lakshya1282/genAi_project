import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { FaShoppingCart } from 'react-icons/fa';
import AccountButton from './AccountButton';
import './Navbar.css';

const Navbar = () => {
  const { t } = useTranslation();
  const { user, logout, isAuthenticated, userType, cartCount } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          <Link to="/" className="navbar-brand">
            <span className="brand-icon">🕉</span>
            Kaarigari
          </Link>

          <div className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
            <Link to="/" className="navbar-link" onClick={() => setIsMenuOpen(false)}>
              {t('navbar.home')}
            </Link>
            <Link to="/marketplace" className="navbar-link" onClick={() => setIsMenuOpen(false)}>
              {t('navbar.marketplace')}
            </Link>
            
            {/* Customer Cart and User Actions */}
            <div className="navbar-actions">
              {userType === 'customer' && (
                <Link to="/cart" className="cart-link" onClick={() => setIsMenuOpen(false)}>
                  <FaShoppingCart />
                  {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                </Link>
              )}

              {isAuthenticated ? (
                <>
                  {/* Artisan links now moved to dropdown menu */}
                  
                  {userType === 'customer' && (
                    <Link to="/orders" className="navbar-link" onClick={() => setIsMenuOpen(false)}>
                      My Orders
                    </Link>
                  )}

                  <AccountButton />
                </>
              ) : (
                <div className="navbar-auth">
                  <div className="auth-dropdown">
                    <span className="auth-toggle">{t('navbar.login')}</span>
                    <div className="auth-dropdown-content">
                      <Link to="/customer/login" onClick={() => setIsMenuOpen(false)}>
                        {t('auth.customerLogin')}
                      </Link>
                      <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                        {t('auth.artisanLogin')}
                      </Link>
                    </div>
                  </div>
                  <div className="auth-dropdown">
                    <span className="auth-toggle">{t('navbar.register')}</span>
                    <div className="auth-dropdown-content">
                      <Link to="/customer/register" onClick={() => setIsMenuOpen(false)}>
                        Join as Customer
                      </Link>
                      <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                        Join as Artisan
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button 
            className="navbar-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
