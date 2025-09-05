import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaTicketAlt, FaCopy, FaCheck, FaClock } from 'react-icons/fa';
import axios from 'axios';
import './Coupons.css';

const Coupons = () => {
  const { t } = useTranslation();
  const { userType } = useAuth();
  const [coupons, setCoupons] = useState([]);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-coupons');

  useEffect(() => {
    fetchCoupons();
    fetchAvailableCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await axios.get('/api/coupons/user');
      if (response.data.success) {
        setCoupons(response.data.coupons || []);
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
    }
  };

  const fetchAvailableCoupons = async () => {
    try {
      const response = await axios.get('/api/coupons/available');
      if (response.data.success) {
        setAvailableCoupons(response.data.coupons || []);
      }
    } catch (error) {
      console.error('Error fetching available coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCollectCoupon = async (couponId) => {
    try {
      const response = await axios.post(`/api/coupons/collect/${couponId}`);
      if (response.data.success) {
        toast.success(t('coupons.collectedSuccessfully'));
        fetchCoupons();
        fetchAvailableCoupons();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('coupons.failedToCollect'));
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    toast.success(t('coupons.copiedToClipboard'));
  };

  if (userType !== 'customer') {
    return <div className="not-authorized"><p>{t('customerSettings.notAuthorized')}</p></div>;
  }

  return (
    <div className="coupons">
      <div className="coupons-header">
        <h2><FaTicketAlt /> {t('coupons.title')}</h2>
        <p>{t('coupons.subtitle')}</p>
      </div>

      <div className="coupons-tabs">
        <button 
          className={`tab ${activeTab === 'my-coupons' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-coupons')}
        >
          {t('coupons.myCoupons')} ({coupons.length})
        </button>
        <button 
          className={`tab ${activeTab === 'available' ? 'active' : ''}`}
          onClick={() => setActiveTab('available')}
        >
          {t('coupons.availableCoupons')} ({availableCoupons.length})
        </button>
      </div>

      {loading ? (
        <div className="coupons-loading"><p>{t('coupons.loading')}</p></div>
      ) : (
        <div className="coupons-content">
          {activeTab === 'my-coupons' ? (
            <div className="my-coupons">
              {coupons.length === 0 ? (
                <div className="empty-coupons">
                  <FaTicketAlt style={{ fontSize: '4rem', color: '#d4a574' }} />
                  <h3>{t('coupons.noCouponsAvailable')}</h3>
                  <p>{t('coupons.checkAvailableCoupons')}</p>
                </div>
              ) : (
                <div className="coupons-grid">
                  {coupons.map(coupon => (
                    <div key={coupon._id} className="coupon-card">
                      <div className="coupon-header">
                        <div className="coupon-discount">
                          {coupon.type === 'percentage' ? `${coupon.discount}% OFF` : `₹${coupon.discount} OFF`}
                        </div>
                        <div className="coupon-status">
                          {coupon.isUsed ? <FaCheck color="#28a745" /> : <FaClock color="#ffc107" />}
                        </div>
                      </div>
                      
                      <div className="coupon-body">
                        <h3>{coupon.title}</h3>
                        <p>{coupon.description}</p>
                        <div className="coupon-code">
                          <span>{coupon.code}</span>
                          <button onClick={() => copyToClipboard(coupon.code)}>
                            <FaCopy />
                          </button>
                        </div>
                      </div>
                      
                      <div className="coupon-footer">
                        <small>{t('coupons.validUntil')}: {new Date(coupon.validUntil).toLocaleDateString()}</small>
                        <small>{t('coupons.minOrder')}: ₹{coupon.minAmount}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="available-coupons">
              {availableCoupons.length === 0 ? (
                <div className="empty-coupons">
                  <FaTicketAlt style={{ fontSize: '4rem', color: '#d4a574' }} />
                  <h3>{t('coupons.noNewCoupons')}</h3>
                  <p>{t('coupons.checkBackLater')}</p>
                </div>
              ) : (
                <div className="coupons-grid">
                  {availableCoupons.map(coupon => (
                    <div key={coupon._id} className="coupon-card available">
                      <div className="coupon-header">
                        <div className="coupon-discount">
                          {coupon.type === 'percentage' ? `${coupon.discount}% OFF` : `₹${coupon.discount} OFF`}
                        </div>
                      </div>
                      
                      <div className="coupon-body">
                        <h3>{coupon.title}</h3>
                        <p>{coupon.description}</p>
                        <button 
                          className="collect-btn"
                          onClick={() => handleCollectCoupon(coupon._id)}
                        >
                          {t('coupons.collectCoupon')}
                        </button>
                      </div>
                      
                      <div className="coupon-footer">
                        <small>{t('coupons.validUntil')}: {new Date(coupon.validUntil).toLocaleDateString()}</small>
                        <small>{t('coupons.minOrder')}: ₹{coupon.minAmount}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Coupons;
