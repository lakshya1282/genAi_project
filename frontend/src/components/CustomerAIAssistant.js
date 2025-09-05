import React from 'react';
import AIAssistantChat from './AIAssistantChat';
import { useAuth } from '../context/AuthContext';

const CustomerAIAssistant = ({ 
  currentCategory = null, 
  budget = null,
  userId = null  // Optional override
}) => {
  const { user, userType, isAuthenticated } = useAuth();
  
  // Use passed userId or get from context
  const customerId = userId || (userType === 'customer' ? user?._id : null);

  // Only show for authenticated customers
  if (!isAuthenticated || userType !== 'customer' || !customerId) {
    return null;
  }

  return (
    <AIAssistantChat
      userId={customerId}
      userType="User"
      currentCategory={currentCategory}
      budget={budget}
    />
  );
};

export default CustomerAIAssistant;
