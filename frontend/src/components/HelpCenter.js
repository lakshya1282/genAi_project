import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FaQuestionCircle, FaPhone, FaEnvelope, FaMapMarkerAlt, 
  FaSearch, FaShoppingCart, FaShippingFast, FaUndo, 
  FaPlayCircle, FaComments, FaBook, FaChevronDown,
  FaChevronRight, FaHeart, FaCreditCard, FaTruck,
  FaUserShield, FaGift, FaCog, FaStar
} from 'react-icons/fa';
import axios from 'axios';
import './CustomerComponents.css';

const HelpCenter = () => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('browse');
  const [expandedItem, setExpandedItem] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [contactInfo, setContactInfo] = useState({});
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    fetchHelpData();
  }, []);

  const fetchHelpData = async () => {
    try {
      const response = await axios.get('/api/helpCenter');
      if (response.data.success) {
        setFaqs(response.data.faqs || []);
        setContactInfo(response.data.contact || {});
      }
    } catch (error) {
      console.error('Error fetching help data:', error);
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/contact', contactForm);
      if (response.data.success) {
        alert(t('helpCenter.contact.messageSent'));
        setContactForm({ name: '', email: '', subject: '', message: '' });
        setShowContactForm(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert(t('helpCenter.contact.messageFailed'));
    }
  };

  const helpSections = {
    browse: {
      icon: FaSearch,
      title: t('helpCenter.sections.browse'),
      items: [
        {
          title: t('helpCenter.browse.searchFilter'),
          content: t('helpCenter.browse.searchFilterDesc')
        },
        {
          title: t('helpCenter.browse.artisanProfiles'),
          content: t('helpCenter.browse.artisanProfilesDesc')
        },
        {
          title: t('helpCenter.browse.customization'),
          content: t('helpCenter.browse.customizationDesc')
        },
        {
          title: t('helpCenter.browse.productDetails'),
          content: t('helpCenter.browse.productDetailsDesc')
        }
      ]
    },
    orders: {
      icon: FaShoppingCart,
      title: t('helpCenter.sections.orders'),
      items: [
        {
          title: t('helpCenter.orders.howToOrder'),
          content: t('helpCenter.orders.howToOrderDesc')
        },
        {
          title: t('helpCenter.orders.paymentMethods'),
          content: t('helpCenter.orders.paymentMethodsDesc')
        },
        {
          title: t('helpCenter.orders.modifications'),
          content: t('helpCenter.orders.modificationsDesc')
        },
        {
          title: t('helpCenter.orders.shippingCharges'),
          content: t('helpCenter.orders.shippingChargesDesc')
        }
      ]
    },
    tracking: {
      icon: FaShippingFast,
      title: t('helpCenter.sections.tracking'),
      items: [
        {
          title: t('helpCenter.tracking.howToTrack'),
          content: t('helpCenter.tracking.howToTrackDesc')
        },
        {
          title: t('helpCenter.tracking.deliveryTimes'),
          content: t('helpCenter.tracking.deliveryTimesDesc')
        },
        {
          title: t('helpCenter.tracking.delays'),
          content: t('helpCenter.tracking.delaysDesc')
        },
        {
          title: t('helpCenter.tracking.receiving'),
          content: t('helpCenter.tracking.receivingDesc')
        }
      ]
    },
    returns: {
      icon: FaUndo,
      title: t('helpCenter.sections.returns'),
      items: [
        {
          title: t('helpCenter.returns.policy'),
          content: t('helpCenter.returns.policyDesc')
        },
        {
          title: t('helpCenter.returns.howToReturn'),
          content: t('helpCenter.returns.howToReturnDesc')
        },
        {
          title: t('helpCenter.returns.refundProcess'),
          content: t('helpCenter.returns.refundProcessDesc')
        },
        {
          title: t('helpCenter.returns.damagedItems'),
          content: t('helpCenter.returns.damagedItemsDesc')
        }
      ]
    },
    faqs: {
      icon: FaQuestionCircle,
      title: t('helpCenter.sections.faqs'),
      items: [
        {
          title: t('helpCenter.faqs.authenticity'),
          content: t('helpCenter.faqs.authenticityDesc')
        },
        {
          title: t('helpCenter.faqs.outOfStock'),
          content: t('helpCenter.faqs.outOfStockDesc')
        },
        {
          title: t('helpCenter.faqs.customOrders'),
          content: t('helpCenter.faqs.customOrdersDesc')
        },
        {
          title: t('helpCenter.faqs.cancellation'),
          content: t('helpCenter.faqs.cancellationDesc')
        },
        {
          title: t('helpCenter.faqs.care'),
          content: t('helpCenter.faqs.careDesc')
        }
      ]
    },
    support: {
      icon: FaComments,
      title: t('helpCenter.sections.support'),
      items: [
        {
          title: t('helpCenter.support.liveChat'),
          content: t('helpCenter.support.liveChatDesc')
        },
        {
          title: t('helpCenter.support.email'),
          content: t('helpCenter.support.emailDesc')
        },
        {
          title: t('helpCenter.support.phone'),
          content: t('helpCenter.support.phoneDesc')
        },
        {
          title: t('helpCenter.support.contactForm'),
          content: t('helpCenter.support.contactFormDesc')
        }
      ]
    },
    tutorials: {
      icon: FaPlayCircle,
      title: t('helpCenter.sections.tutorials'),
      items: [
        {
          title: t('helpCenter.tutorials.gettingStarted'),
          content: t('helpCenter.tutorials.gettingStartedDesc'),
          hasVideo: true
        },
        {
          title: t('helpCenter.tutorials.artisanStories'),
          content: t('helpCenter.tutorials.artisanStoriesDesc'),
          hasVideo: true
        },
        {
          title: t('helpCenter.tutorials.careGuides'),
          content: t('helpCenter.tutorials.careGuidesDesc'),
          hasVideo: true
        },
        {
          title: t('helpCenter.tutorials.platformFeatures'),
          content: t('helpCenter.tutorials.platformFeaturesDesc')
        }
      ]
    }
  };

  return (
    <div className="help-center">
      <div className="help-header">
        <h2><FaQuestionCircle /> {t('helpCenter.title')}</h2>
        <p>{t('helpCenter.subtitle')}</p>
      </div>

      <div className="help-navigation">
        {Object.keys(helpSections).map((key) => {
          const section = helpSections[key];
          const IconComponent = section.icon;
          return (
            <button
              key={key}
              className={`nav-button ${activeSection === key ? 'active' : ''}`}
              onClick={() => setActiveSection(key)}
            >
              <IconComponent /> {section.title}
            </button>
          );
        })}
      </div>

      <div className="help-content">
        <div className="section-content">
          <h3>
            {React.createElement(helpSections[activeSection].icon)} 
            {helpSections[activeSection].title}
          </h3>
          
          <div className="help-items">
            {helpSections[activeSection].items.map((item, index) => (
              <div key={index} className="help-item">
                <button 
                  className="help-item-header"
                  onClick={() => setExpandedItem(expandedItem === `${activeSection}-${index}` ? null : `${activeSection}-${index}`)}
                >
                  <span className="help-item-title">{item.title}</span>
                  {expandedItem === `${activeSection}-${index}` ? <FaChevronDown /> : <FaChevronRight />}
                </button>
                
                {expandedItem === `${activeSection}-${index}` && (
                  <div className="help-item-content">
                    <p>{item.content}</p>
                    {item.hasVideo && (
                      <div className="video-placeholder">
                        <FaPlayCircle className="play-icon" />
                        <span>{t('helpCenter.tutorials.videoAvailable')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {activeSection === 'support' && (
          <div className="contact-section">
            <div className="contact-options">
              <div className="contact-info">
                <h4>{t('helpCenter.support.contactInfo')}</h4>
                <div className="contact-details">
                  <div className="contact-item">
                    <FaPhone /> <span>1-800-ARTISAN (278-4726)</span>
                  </div>
                  <div className="contact-item">
                    <FaEnvelope /> <span>support@artisanmarketplace.com</span>
                  </div>
                  <div className="contact-item">
                    <FaMapMarkerAlt /> <span>123 Artisan Way, Creative District, NY 10001</span>
                  </div>
                </div>
              </div>
              
              <div className="contact-form-section">
                <button 
                  className="contact-form-button"
                  onClick={() => setShowContactForm(true)}
                >
                  <FaEnvelope /> {t('helpCenter.support.sendMessage')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showContactForm && (
        <div className="contact-form-modal">
          <div className="modal-content">
            <h3>{t('helpCenter.contact.formTitle')}</h3>
            <form onSubmit={handleContactSubmit}>
              <div className="form-group">
                <label>{t('helpCenter.contact.name')}</label>
                <input 
                  type="text" 
                  value={contactForm.name}
                  onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label>{t('helpCenter.contact.email')}</label>
                <input 
                  type="email" 
                  value={contactForm.email}
                  onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                  required 
                />
              </div>
              
              <div className="form-group">
                <label>{t('helpCenter.contact.subject')}</label>
                <select 
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                  required
                >
                  <option value="">{t('helpCenter.contact.selectTopic')}</option>
                  <option value="order">{t('helpCenter.contact.orderIssues')}</option>
                  <option value="payment">{t('helpCenter.contact.paymentProblems')}</option>
                  <option value="shipping">{t('helpCenter.contact.shippingDelivery')}</option>
                  <option value="returns">{t('helpCenter.contact.returnsRefunds')}</option>
                  <option value="account">{t('helpCenter.contact.accountIssues')}</option>
                  <option value="technical">{t('helpCenter.contact.technicalProblems')}</option>
                  <option value="other">{t('helpCenter.contact.other')}</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>{t('helpCenter.contact.message')}</label>
                <textarea 
                  value={contactForm.message}
                  onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                  rows="5"
                  required
                  placeholder={t('helpCenter.contact.messagePlaceholder')}
                />
              </div>
              
              <div className="form-actions">
                <button type="button" onClick={() => setShowContactForm(false)}>
                  {t('helpCenter.contact.cancel')}
                </button>
                <button type="submit">
                  {t('helpCenter.contact.sendMessage')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpCenter;
