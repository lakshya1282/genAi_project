import React, { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { FaStar } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './ReviewForm.css';

const ReviewForm = ({ productId, onReviewAdded }) => {
  const { t } = useTranslation();
  const { userType, user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingClick = (selectedRating) => {
    setRating(selectedRating);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userType || userType !== 'customer') {
      toast.error(t('reviews.loginRequired'));
      return;
    }

    if (rating === 0) {
      toast.error(t('reviews.ratingRequired'));
      return;
    }

    if (comment.trim().length < 10) {
      toast.error(t('reviews.commentTooShort'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Make API call to save review
      const reviewData = {
        productId,
        rating,
        comment: comment.trim()
      };
      
      console.log('📝 Submitting review with data:', reviewData);
      console.log('🔐 Token:', localStorage.getItem('customer_token') ? 'Present' : 'Missing');
      
      const response = await axios.post('/api/reviews', reviewData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('customer_token')}`
        }
      });
      
      console.log('✅ Review API response:', response.data);
      
      if (response.data.success) {
        // Create review object for immediate display
        const newReview = {
          _id: response.data.review._id,
          rating,
          comment: comment.trim(),
          customerName: user?.name || 'You',
          createdAt: new Date().toISOString()
        };

        // Call the callback to add the review to the parent component
        if (onReviewAdded) {
          onReviewAdded(newReview);
        }

        toast.success(t('reviews.reviewSuccess'));
      
        // Reset form
        setRating(0);
        setComment('');
      }
      
    } catch (error) {
      console.error('❌ Error submitting review:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(t('reviews.reviewError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return [...Array(5)].map((_, index) => {
      const starNumber = index + 1;
      const isActive = starNumber <= (hoveredRating || rating);
      
      return (
        <FaStar
          key={index}
          className={`review-star ${isActive ? 'active' : ''}`}
          onClick={() => handleRatingClick(starNumber)}
          onMouseEnter={() => setHoveredRating(starNumber)}
          onMouseLeave={() => setHoveredRating(0)}
        />
      );
    });
  };

  if (userType !== 'customer') {
    return (
      <div className="review-form-container">
        <div className="login-prompt">
          <p>{t('reviews.loginToReview')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="review-form-container">
      <h3>{t('reviews.writeReview')}</h3>
      
      <form onSubmit={handleSubmit} className="review-form">
        <div className="rating-section">
          <label>{t('reviews.yourRating')}</label>
          <div className="star-rating">
            {renderStars()}
            <span className="rating-text">
              {rating > 0 && `${rating}/5`}
            </span>
          </div>
        </div>

        <div className="comment-section">
          <label htmlFor="review-comment">{t('reviews.yourReview')}</label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('reviews.reviewPlaceholder')}
            rows={4}
            maxLength={500}
            required
          />
          <div className="character-count">
            {comment.length}/500 {t('reviews.characters')}
          </div>
        </div>

        <button 
          type="submit" 
          className="submit-review-btn"
          disabled={isSubmitting || rating === 0}
        >
          {isSubmitting ? t('reviews.submitting') : t('reviews.submitReview')}
        </button>
      </form>
    </div>
  );
};

export default ReviewForm;
