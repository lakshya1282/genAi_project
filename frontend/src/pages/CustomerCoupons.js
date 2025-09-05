import React from 'react';
import Coupons from '../components/Coupons';
import './CustomerCoupons.css';

const CustomerCoupons = () => {
  return (
    <div className="customer-coupons-page">
      <div className="container">
        <Coupons />
      </div>
    </div>
  );
};

export default CustomerCoupons;
