import React from 'react';
import './StarRating.css';

const StarRating = ({ 
  rating = 0, 
  totalReviews = 0, 
  size = 'medium',
  showReviewCount = true,
  interactive = false,
  onRatingChange = null 
}) => {
  const stars = Array.from({ length: 5 }, (_, index) => {
    const starValue = index + 1;
    const isFilled = rating >= starValue;
    const isHalfFilled = rating >= starValue - 0.5 && rating < starValue;

    return (
      <span
        key={index}
        className={`star ${size} ${isFilled ? 'filled' : ''} ${isHalfFilled ? 'half-filled' : ''} ${interactive ? 'interactive' : ''}`}
        onClick={interactive ? () => onRatingChange?.(starValue) : undefined}
        onMouseEnter={interactive ? () => {} : undefined}
      >
        ★
      </span>
    );
  });

  return (
    <div className={`star-rating ${size}`}>
      <div className="stars-container">
        {stars}
      </div>
      {showReviewCount && (
        <div className="rating-info">
          <span className="rating-value">{rating.toFixed(1)}</span>
          {totalReviews > 0 && (
            <span className="review-count">({totalReviews} reviews)</span>
          )}
        </div>
      )}
    </div>
  );
};

export default StarRating;
