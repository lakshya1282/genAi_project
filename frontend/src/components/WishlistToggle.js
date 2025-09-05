import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from 'axios';
import './WishlistToggle.css';

const WishlistToggle = ({ productId, className = '', showText = false }) => {
  const { user, userType } = useAuth();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userType === 'customer' && productId) {
      checkWishlistStatus();
    }
  }, [productId, userType]);

  const checkWishlistStatus = async () => {
    try {
      const response = await axios.get('/api/customer/wishlist');
      if (response.data.success) {
        const isProductInWishlist = response.data.wishlist.some(
          item => item.id === productId || item._id === productId
        );
        setIsInWishlist(isProductInWishlist);
      }
    } catch (error) {
      // Silently handle error - wishlist status check is not critical
      console.error('Error checking wishlist status:', error);
    }
  };

  const toggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (userType !== 'customer') {
      toast.error('Please login as a customer to add items to wishlist');
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      if (isInWishlist) {
        // Remove from wishlist
        const response = await axios.delete(`/api/customer/wishlist/${productId}`);
        if (response.data.success) {
          setIsInWishlist(false);
          toast.success('Removed from wishlist');
        } else {
          toast.error(response.data.message || 'Failed to remove from wishlist');
        }
      } else {
        // Add to wishlist
        const response = await axios.post('/api/customer/wishlist', { productId });
        if (response.data.success) {
          setIsInWishlist(true);
          toast.success('Added to wishlist');
        } else {
          toast.error(response.data.message || 'Failed to add to wishlist');
        }
      }
    } catch (error) {
      console.error('Wishlist toggle error:', error);
      toast.error(error.response?.data?.message || 'Failed to update wishlist');
    } finally {
      setLoading(false);
    }
  };

  if (userType !== 'customer') {
    return null; // Don't show wishlist button for artisans
  }

  return (
    <button
      className={`wishlist-toggle ${isInWishlist ? 'active' : ''} ${className}`}
      onClick={toggleWishlist}
      disabled={loading}
      title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      type="button"
    >
      {loading ? (
        <div className="wishlist-loading">
          <div className="loading-spinner"></div>
        </div>
      ) : isInWishlist ? (
        <FaHeart className="wishlist-icon filled" />
      ) : (
        <FaRegHeart className="wishlist-icon empty" />
      )}
      {showText && (
        <span className="wishlist-text">
          {isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
        </span>
      )}
    </button>
  );
};

export default WishlistToggle;
