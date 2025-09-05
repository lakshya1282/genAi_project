import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaChevronDown, FaCog, FaShoppingBag, FaHeart, FaTicketAlt, FaQuestionCircle, FaSignOutAlt, FaUserCircle, FaTachometerAlt, FaBell, FaRobot, FaChartBar, FaBox } from 'react-icons/fa';
import './AccountButton.css';

const AccountButton = () => {
  const { t } = useTranslation();
  const { user, logout, userType } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsDropdownOpen(false);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  if (userType === 'artisan') {
    // For artisans, show dropdown menu similar to customers
    return (
      <div className="account-button-container" ref={dropdownRef}>
        <button 
          className="account-button artisan-account"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          <FaUser className="account-icon" />
          <span className="account-name">{user?.name}</span>
          <FaChevronDown className={`dropdown-arrow ${isDropdownOpen ? 'rotated' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className="account-dropdown artisan-dropdown">
            <div className="dropdown-header">
              <div className="user-info">
                <div className="user-avatar artisan-avatar">
                  <FaUser />
                </div>
                <div className="user-details">
                  <h4>{user?.name}</h4>
                  <p>{user?.email}</p>
                  <span className="user-type-badge">Artisan</span>
                </div>
              </div>
            </div>

            <div className="dropdown-menu">
              {/* Dashboard Section */}
              <Link to="/dashboard" className="dropdown-item" onClick={closeDropdown}>
                <FaTachometerAlt className="item-icon" />
                <span>{t('artisanMenu.dashboard')}</span>
              </Link>

              {/* Profile Management */}
              <Link to="/dashboard?tab=profile" className="dropdown-item" onClick={closeDropdown}>
                <FaUserCircle className="item-icon" />
                <span>{t('artisanMenu.manageProfile')}</span>
              </Link>

              {/* View Public Profile */}
              <Link to={`/artisan/${user?._id || 'current'}/profile`} className="dropdown-item" onClick={closeDropdown}>
                <FaUser className="item-icon" />
                <span>View My Public Profile</span>
              </Link>

              {/* Products */}
              <Link to="/dashboard?tab=products" className="dropdown-item" onClick={closeDropdown}>
                <FaBox className="item-icon" />
                <span>{t('artisanMenu.myProducts')}</span>
              </Link>

              {/* Analytics */}
              <Link to="/dashboard?tab=analytics" className="dropdown-item" onClick={closeDropdown}>
                <FaChartBar className="item-icon" />
                <span>{t('artisanMenu.analytics')}</span>
              </Link>

              {/* Notifications */}
              <Link to="/notifications" className="dropdown-item" onClick={closeDropdown}>
                <FaBell className="item-icon" />
                <span>{t('artisanMenu.notifications')}</span>
              </Link>

              {/* AI Assistant */}
              <Link to="/ai-assistant" className="dropdown-item" onClick={closeDropdown}>
                <FaRobot className="item-icon" />
                <span>{t('artisanMenu.aiAssistant')}</span>
              </Link>

              {/* Settings */}
              <Link to="/dashboard?tab=settings" className="dropdown-item" onClick={closeDropdown}>
                <FaCog className="item-icon" />
                <span>{t('artisanMenu.settings')}</span>
              </Link>

              {/* Help Center */}
              <Link to="/customer/help" className="dropdown-item" onClick={closeDropdown}>
                <FaQuestionCircle className="item-icon" />
                <span>{t('artisanMenu.helpCenter')}</span>
              </Link>

              <div className="dropdown-divider"></div>

              <button className="dropdown-item logout-item" onClick={handleLogout}>
                <FaSignOutAlt className="item-icon" />
                <span>{t('artisanMenu.logout')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="account-button-container" ref={dropdownRef}>
      <button 
        className="account-button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
      >
        <FaUser className="account-icon" />
        <span className="account-name">{user?.name}</span>
        <FaChevronDown className={`dropdown-arrow ${isDropdownOpen ? 'rotated' : ''}`} />
      </button>

      {isDropdownOpen && (
        <div className="account-dropdown">
          <div className="dropdown-header">
            <div className="user-info">
              <div className="user-avatar">
                <FaUser />
              </div>
              <div className="user-details">
                <h4>{user?.name}</h4>
                <p>{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="dropdown-menu">
            <Link to="/customer/settings" className="dropdown-item" onClick={closeDropdown}>
              <FaCog className="item-icon" />
              <span>{t('customerSettings.profile')}</span>
            </Link>

            <Link to="/customer/orders" className="dropdown-item" onClick={closeDropdown}>
              <FaShoppingBag className="item-icon" />
              <span>{t('customerSettings.orders')}</span>
            </Link>

            <Link to="/customer/wishlist" className="dropdown-item" onClick={closeDropdown}>
              <FaHeart className="item-icon" />
              <span>{t('customerSettings.wishlist')}</span>
            </Link>

            <Link to="/customer/coupons" className="dropdown-item" onClick={closeDropdown}>
              <FaTicketAlt className="item-icon" />
              <span>{t('customerSettings.coupons')}</span>
            </Link>

            <Link to="/customer/help" className="dropdown-item" onClick={closeDropdown}>
              <FaQuestionCircle className="item-icon" />
              <span>{t('customerSettings.helpCenter')}</span>
            </Link>

            <div className="dropdown-divider"></div>

            <button className="dropdown-item logout-item" onClick={handleLogout}>
              <FaSignOutAlt className="item-icon" />
              <span>{t('customerSettings.logout')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountButton;
