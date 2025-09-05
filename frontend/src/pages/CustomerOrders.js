import React from 'react';
import OrdersHistory from '../components/OrdersHistory';
import './CustomerOrders.css';

const CustomerOrders = () => {
  return (
    <div className="customer-orders-page">
      <div className="container">
        <OrdersHistory />
      </div>
    </div>
  );
};

export default CustomerOrders;
