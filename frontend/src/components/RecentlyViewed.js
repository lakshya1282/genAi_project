import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { FaEye, FaShoppingCart } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';
import './CustomerComponents.css';

const RecentlyViewed = () => {
  const { t } = useTranslation();
  const { userType, addToCart } = useAuth();
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentlyViewed();
  }, []);

  const fetchRecentlyViewed = async () => {
    try {
      const response = await axios.get('/api/customerAccount/recently-viewed');
      if (response.data.success) {
        setRecentProducts(response.data.products || []);
      }
    } catch (error) {
      console.error('Error fetching recently viewed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId) => {
    const result = await addToCart(productId, 1);
    if (result.success) {
      toast.success(t('messages.addedToCart'));
    } else {
      toast.error(result.message);
    }
  };

  if (userType !== 'customer') {
    return <div className="not-authorized"><p>{t('customerSettings.notAuthorized')}</p></div>;
  }

  return (
    <div className="recently-viewed">
      <div className="section-header">
        <h2><FaEye /> {t('recentlyViewed.title')}</h2>
        <p>{t('recentlyViewed.subtitle')}</p>
      </div>

      {loading ? (
        <div className="loading"><p>{t('common.loading')}</p></div>
      ) : recentProducts.length === 0 ? (
        <div className="empty-state">
          <FaEye style={{ fontSize: '4rem', color: '#d4a574' }} />
          <h3>{t('recentlyViewed.noItems')}</h3>
          <p>{t('recentlyViewed.browseToSee')}</p>
        </div>
      ) : (
        <div className="products-grid">
          {recentProducts.map(product => (
            <div key={product._id} className="product-card">
              <img src={product.images?.[0] || '/placeholder.jpg'} alt={product.name} />
              <h3>{product.name}</h3>
              <p className="price">₹{product.price?.toLocaleString()}</p>
              <button onClick={() => handleAddToCart(product._id)} className="add-cart-btn">
                <FaShoppingCart /> {t('marketplace.addToCart')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentlyViewed;
