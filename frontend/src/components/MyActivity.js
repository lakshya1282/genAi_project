import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { FaComments, FaStar, FaCalendarAlt } from 'react-icons/fa';
import axios from 'axios';
import './CustomerComponents.css';

const MyActivity = () => {
  const { t } = useTranslation();
  const { userType } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyActivity();
  }, []);

  const fetchMyActivity = async () => {
    try {
      const token = localStorage.getItem('customer_token');
      const userStr = localStorage.getItem('customer_user');
      
      if (!token || !userStr) {
        console.error('No authentication token or user data found');
        setLoading(false);
        return;
      }
      
      const user = JSON.parse(userStr);
      const response = await axios.get(`/api/reviews/customer/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setReviews(response.data.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      // Don't show error for 403 or 401, just log it
      if (error.response?.status !== 403 && error.response?.status !== 401) {
        console.error('Failed to fetch reviews:', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <FaStar 
        key={i} 
        className={i < rating ? 'star-filled' : 'star-empty'} 
      />
    ));
  };

  if (userType !== 'customer') {
    return <div className="not-authorized"><p>{t('customerSettings.notAuthorized')}</p></div>;
  }

  if (loading) {
    return <div className="loading"><p>{t('myActivity.loadingActivity')}</p></div>;
  }

  return (
    <div className="my-activity">
      <div className="section-header">
        <h2><FaComments /> {t('myActivity.title')}</h2>
        <p>{t('myActivity.subtitle')}</p>
      </div>

      <div className="activity-section">
        <h3>{t('myActivity.postedReviews', { count: reviews.length })}</h3>
        
        {reviews.length === 0 ? (
          <div className="empty-activity">
            <FaComments style={{ fontSize: '4rem', color: '#d4a574' }} />
            <h4>{t('myActivity.noReviews')}</h4>
            <p>{t('myActivity.purchaseAndReview')}</p>
          </div>
        ) : (
          <div className="reviews-list">
            {reviews.map(review => (
              <div key={review._id} className="review-card">
                <div className="review-header">
                  <div className="product-info">
                    <h4>{review.productId?.name || 'Product'}</h4>
                    <div className="rating">
                      {renderStars(review.rating)}
                      <span className="rating-text">({review.rating}/5)</span>
                    </div>
                  </div>
                  <div className="review-date">
                    <FaCalendarAlt />
                    <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="review-content">
                  <p>{review.comment}</p>
                </div>
                
                {review.images && review.images.length > 0 && (
                  <div className="review-images">
                    {review.images.map((image, index) => (
                      <img key={index} src={image} alt={t('myActivity.reviewImageAlt')} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyActivity;
