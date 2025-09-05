import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaHeart, FaTrash, FaShoppingCart, FaEye } from 'react-icons/fa';
import axios from 'axios';
import './Wishlist.css';

const Wishlist = () => {
  const { t } = useTranslation();
  const { userType, addToCart } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const response = await axios.get('/api/customer/wishlist');
      if (response.data.success) {
        setWishlist(response.data.wishlist || []);
      }
    } catch (error) {
      toast.error(t('wishlist.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (productId) => {
    try {
      const response = await axios.delete(`/api/customer/wishlist/${productId}`);
      if (response.data.success) {
        setWishlist(prev => prev.filter(item => {
          const product = item.product || item;
          const id = product._id || product.id;
          return id !== productId;
        }));
        toast.success(t('wishlist.removedFromWishlist'));
      }
    } catch (error) {
      toast.error(t('wishlist.failedToRemove'));
    }
  };

  const handleAddToCart = async (productId) => {
    const result = await addToCart(productId, 1);
    if (result.success) {
      toast.success(t('wishlist.addedToCart'));
    } else {
      toast.error(result.message);
    }
  };

  if (userType !== 'customer') {
    return <div className="not-authorized"><p>{t('customerSettings.notAuthorized')}</p></div>;
  }

  if (loading) {
    return <div className="wishlist-loading"><p>{t('wishlist.loading')}</p></div>;
  }

  return (
    <div className="wishlist">
      <div className="wishlist-header">
        <h2><FaHeart /> {t('wishlist.titleWithCount', { count: wishlist.length })}</h2>
        <p>{t('wishlist.emptyDesc')}</p>
      </div>

      {wishlist.length === 0 ? (
        <div className="empty-wishlist">
          <FaHeart style={{ fontSize: '4rem', color: '#d4a574', marginBottom: '1rem' }} />
          <h3>{t('wishlist.empty')}</h3>
          <p>{t('wishlist.emptyMessage')}</p>
        </div>
      ) : (
        <div className="wishlist-grid">
          {wishlist.map(item => {
            // Handle both direct product format and wrapped format
            const product = item.product || item;
            const productId = product._id || product.id;
            
            return (
              <div key={productId} className="wishlist-item">
                <div className="item-image">
                  <img 
                    src={product.images?.[0] || '/placeholder.jpg'} 
                    alt={product.name}
                    onError={(e) => { e.target.src = '/placeholder.jpg'; }}
                  />
                </div>
                
                <div className="item-details">
                  <h3>{product.name}</h3>
                  <p className="item-price">₹{product.price?.toLocaleString()}</p>
                  <p className="item-artisan">{t('wishlist.by')} {product.artisan?.name}</p>
                  
                  <div className="item-actions">
                    <button 
                      className="btn-add-cart"
                      onClick={() => handleAddToCart(productId)}
                    >
                      <FaShoppingCart /> {t('wishlist.addToCart')}
                    </button>
                    <button 
                      className="btn-remove"
                      onClick={() => handleRemoveFromWishlist(productId)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
