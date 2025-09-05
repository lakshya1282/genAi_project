import React from 'react';
import AIAssistantChat from './AIAssistantChat';
import { useAuth } from '../context/AuthContext';

const ArtisanAIAssistant = ({ 
  artisanId = null  // Optional override
}) => {
  const { user, userType, isAuthenticated } = useAuth();
  
  // Use passed artisanId or get from context
  const artisanUserId = artisanId || (userType === 'artisan' ? user?._id : null);

  // Only show for authenticated artisans
  if (!isAuthenticated || userType !== 'artisan' || !artisanUserId) {
    return null;
  }

  return (
    <AIAssistantChat
      userId={artisanUserId}
      userType="Artisan"
    />
  );
};

export default ArtisanAIAssistant;
