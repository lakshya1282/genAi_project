import React from 'react';
import Wishlist from '../components/Wishlist';
import './CustomerWishlist.css';

const CustomerWishlist = () => {
  return (
    <div className="customer-wishlist-page">
      <div className="container">
        <Wishlist />
      </div>
    </div>
  );
};

export default CustomerWishlist;
