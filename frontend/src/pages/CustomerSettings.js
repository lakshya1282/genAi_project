import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCog, FaShoppingBag, FaHeart, FaTicketAlt, FaQuestionCircle, FaEye, FaLanguage, FaUserCog, FaComments, FaSignOutAlt, FaUser, FaMapMarkerAlt } from 'react-icons/fa';
import ProfileSettings from '../components/ProfileSettings';
import OrdersHistory from '../components/OrdersHistory';
import Wishlist from '../components/Wishlist';
import Coupons from '../components/Coupons';
import HelpCenter from '../components/HelpCenter';
import RecentlyViewed from '../components/RecentlyViewed';
import LanguageSelector from '../components/LanguageSelector';
import AccountSettings from '../components/AccountSettings';
import MyActivity from '../components/MyActivity';
import './CustomerSettings.css';

const CustomerSettings = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('profile');

  // Map URL paths to section IDs
  const urlToSection = {
    '/customer/settings': 'profile',
    '/customer/orders': 'orders',
    '/customer/wishlist': 'wishlist',
    '/customer/coupons': 'coupons',
    '/customer/help': 'help'
  };

  // Set active section based on current URL
  useEffect(() => {
    const currentSection = urlToSection[location.pathname] || 'profile';
    setActiveSection(currentSection);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const settingsSections = [
    { 
      id: 'profile', 
      name: t('customerSettings.changeProfile'), 
      icon: <FaUser />,
      component: <ProfileSettings />
    },
    { 
      id: 'orders', 
      name: t('customerSettings.orders'), 
      icon: <FaShoppingBag />,
      component: <OrdersHistory />
    },
    { 
      id: 'wishlist', 
      name: t('customerSettings.wishlist'), 
      icon: <FaHeart />,
      component: <Wishlist />
    },
    { 
      id: 'coupons', 
      name: t('customerSettings.coupons'), 
      icon: <FaTicketAlt />,
      component: <Coupons />
    },
    { 
      id: 'help', 
      name: t('customerSettings.helpCentre'), 
      icon: <FaQuestionCircle />,
      component: <HelpCenter />
    }
  ];

  const additionalSections = [
    {
      id: 'recently-viewed',
      name: t('customerSettings.recentlyViewed'),
      icon: <FaEye />,
      component: <RecentlyViewed />
    },
    {
      id: 'language',
      name: t('customerSettings.changeLanguage'),
      icon: <FaLanguage />,
      component: <LanguageSelector />
    }
  ];

  const accountSections = [
    {
      id: 'account-settings',
      name: t('customerSettings.accountSettings'),
      icon: <FaUserCog />,
      component: <AccountSettings />
    }
  ];

  const activitySections = [
    {
      id: 'my-activity',
      name: t('customerSettings.myActivity'),
      icon: <FaComments />,
      component: <MyActivity />
    }
  ];

  const getCurrentComponent = () => {
    const allSections = [...settingsSections, ...additionalSections, ...accountSections, ...activitySections];
    const section = allSections.find(s => s.id === activeSection);
    return section ? section.component : <ProfileSettings />;
  };

  const getCurrentSectionName = () => {
    const allSections = [...settingsSections, ...additionalSections, ...accountSections, ...activitySections];
    const section = allSections.find(s => s.id === activeSection);
    return section ? section.name : t('customerSettings.profile');
  };

  return (
    <div className="customer-settings">
      <div className="settings-container">
        <div className="settings-header">
          <h1>{t('customerSettings.title')}</h1>
          <p>{t('customerSettings.description')}</p>
        </div>

        <div className="settings-layout">
          <aside className="settings-sidebar">
            {/* Main Settings */}
            <div className="sidebar-section">
              <h3>{t('customerSettings.sections.settings')}</h3>
              <ul className="settings-menu">
                {settingsSections.map((section) => (
                  <li key={section.id}>
                    <button
                      className={`menu-item ${activeSection === section.id ? 'active' : ''}`}
                      onClick={() => {
                        const sectionToUrl = {
                          'profile': '/customer/settings',
                          'orders': '/customer/orders',
                          'wishlist': '/customer/wishlist',
                          'coupons': '/customer/coupons',
                          'help': '/customer/help'
                        };
                        navigate(sectionToUrl[section.id] || '/customer/settings');
                      }}
                    >
                      <span className="menu-icon">{section.icon}</span>
                      <span className="menu-text">{section.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Additional Options */}
            <div className="sidebar-section">
              <h3>{t('customerSettings.sections.additionalOptions')}</h3>
              <ul className="settings-menu">
                {additionalSections.map((section) => (
                  <li key={section.id}>
                    <button
                      className={`menu-item ${activeSection === section.id ? 'active' : ''}`}
                      onClick={() => setActiveSection(section.id)}
                    >
                      <span className="menu-icon">{section.icon}</span>
                      <span className="menu-text">{section.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account Settings */}
            <div className="sidebar-section">
              <h3>{t('customerSettings.sections.account')}</h3>
              <ul className="settings-menu">
                {accountSections.map((section) => (
                  <li key={section.id}>
                    <button
                      className={`menu-item ${activeSection === section.id ? 'active' : ''}`}
                      onClick={() => setActiveSection(section.id)}
                    >
                      <span className="menu-icon">{section.icon}</span>
                      <span className="menu-text">{section.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* My Activity */}
            <div className="sidebar-section">
              <h3>{t('customerSettings.sections.activity')}</h3>
              <ul className="settings-menu">
                {activitySections.map((section) => (
                  <li key={section.id}>
                    <button
                      className={`menu-item ${activeSection === section.id ? 'active' : ''}`}
                      onClick={() => setActiveSection(section.id)}
                    >
                      <span className="menu-icon">{section.icon}</span>
                      <span className="menu-text">{section.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Logout */}
            <div className="sidebar-section">
              <ul className="settings-menu">
                <li>
                  <button className="menu-item logout-menu-item" onClick={handleLogout}>
                    <span className="menu-icon">
                      <FaSignOutAlt />
                    </span>
                    <span className="menu-text">{t('customerSettings.logout')}</span>
                  </button>
                </li>
              </ul>
            </div>
          </aside>

          <main className="settings-content">
            <div className="content-header">
              <h2>{getCurrentSectionName()}</h2>
            </div>
            <div className="content-body">
              {getCurrentComponent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default CustomerSettings;
