import React, { useState, useRef, useEffect, useContext } from 'react';
import axios from 'axios';
import './AIAssistantChat.css';

// Icons (using simple text alternatives for compatibility)
const Icons = {
  Bot: '🤖',
  User: '👤',
  Send: '➤',
  Close: '✕',
  Robot: '🤖',
  Sparkles: '✨',
  ShoppingBag: '🛍️',
  Palette: '🎨'
};

const AIAssistantChat = ({ 
  userId, 
  userType = 'User', // 'User' or 'Artisan'
  currentCategory = null,
  budget = null 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isArtisan = userType === 'Artisan';
  const apiEndpoint = isArtisan ? '/api/ai-assistant/artisan/chat' : '/api/ai-assistant/customer/chat';

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Initialize chat with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = isArtisan 
        ? "Hello! I'm your business assistant. I can help you with product descriptions, business strategies, pricing advice, and growing your craft business. How can I assist you today?"
        : "Hi there! I'm your shopping assistant. I can help you discover amazing handcrafted products, find the perfect items for any occasion, and guide you through your shopping journey. What are you looking for today?";
      
      setMessages([{
        id: Date.now(),
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date(),
        suggestions: isArtisan 
          ? ['Generate Product Description', 'Business Tips', 'Pricing Advice', 'Marketing Help']
          : ['Browse Categories', 'Gift Ideas', 'Popular Items', 'Budget Options']
      }]);
      
      setSuggestions(isArtisan 
        ? ['Generate Product Description', 'Business Tips', 'Pricing Advice', 'Marketing Help']
        : ['Browse Categories', 'Gift Ideas', 'Popular Items', 'Budget Options']
      );
    }
  }, [isOpen, messages.length, isArtisan]);

  const sendMessage = async (messageText = inputMessage.trim()) => {
    if (!messageText || isLoading || !userId) return;

    setError(null);
    setInputMessage('');
    setIsLoading(true);

    // Add user message
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);

    try {
      const requestData = {
        userId,
        userType,
        sessionId,
        message: messageText,
        currentCategory,
        budget
      };

      if (isArtisan) {
        // Add any artisan-specific data here if needed
      }

      const response = await axios.post(apiEndpoint, requestData);
      
      if (response.data.success) {
        // Add assistant message
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date(),
          suggestions: response.data.suggestions || [],
          recommendations: response.data.recommendations || [],
          insights: response.data.insights || null
        };

        setMessages(prev => [...prev, assistantMessage]);
        setSuggestions(response.data.suggestions || []);
        setRecommendations(response.data.recommendations || []);
        setInsights(response.data.insights || null);
        
        if (response.data.sessionId && !sessionId) {
          setSessionId(response.data.sessionId);
        }
      } else {
        throw new Error(response.data.message || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('AI Assistant Error:', error);
      setError(error.response?.data?.message || 'Failed to send message. Please try again.');
      
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  const handleRecommendationClick = (product) => {
    // Navigate to product page (implement based on your routing)
    console.log('Navigate to product:', product);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen && error) {
      setError(null);
    }
  };

  if (!userId) {
    return null; // Don't render if no user ID
  }

  return (
    <div className="ai-assistant-container">
      {/* Chat Trigger Button */}
      <button 
        className={`ai-assistant-trigger ${isArtisan ? 'artisan' : ''}`}
        onClick={toggleChat}
        title={isArtisan ? 'AI Business Assistant' : 'AI Shopping Assistant'}
      >
        {isArtisan ? Icons.Palette : Icons.ShoppingBag}
        {messages.length > 0 && !isOpen && (
          <span className="notification-badge">!</span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="ai-chat-window">
          {/* Header */}
          <div className={`chat-header ${isArtisan ? 'artisan' : ''}`}>
            <div className="chat-header-info">
              <div className="assistant-avatar">
                {isArtisan ? Icons.Palette : Icons.ShoppingBag}
              </div>
              <div className="assistant-info">
                <h3>{isArtisan ? 'Business Assistant' : 'Shopping Assistant'}</h3>
                <p>{isArtisan ? 'Powered by Gemini AI' : 'Find perfect handcrafted items'}</p>
              </div>
            </div>
            <button className="close-button" onClick={toggleChat}>
              {Icons.Close}
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.role}`}>
                <div className={`message-avatar ${message.role} ${isArtisan && message.role === 'assistant' ? 'artisan-assistant' : ''}`}>
                  {message.role === 'user' ? Icons.User : (isArtisan ? Icons.Palette : Icons.Robot)}
                </div>
                <div className={`message-bubble ${message.role} ${isArtisan && message.role === 'assistant' ? 'artisan-assistant' : ''}`}>
                  {message.content}
                  <div className="message-timestamp">
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="typing-indicator">
                <div className={`message-avatar assistant ${isArtisan ? 'artisan-assistant' : ''}`}>
                  {isArtisan ? Icons.Palette : Icons.Robot}
                </div>
                <div className="typing-dots">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && !isLoading && (
              <div className="suggestions-container">
                <div className="suggestions-list">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className={`suggestion-chip ${isArtisan ? 'artisan' : ''}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Product Recommendations (for customers) */}
            {!isArtisan && recommendations.length > 0 && (
              <div className="recommendations-section">
                <div className="recommendations-title">Recommended Products</div>
                <div className="recommendations-grid">
                  {recommendations.map((product, index) => (
                    <div
                      key={product._id || index}
                      className="recommendation-card"
                      onClick={() => handleRecommendationClick(product)}
                    >
                      <div className="recommendation-image">
                        {product.images && product.images[0] ? (
                          <img src={product.images[0]} alt={product.name} />
                        ) : (
                          '🎨'
                        )}
                      </div>
                      <div className="recommendation-name">{product.name}</div>
                      <div className="recommendation-price">₹{product.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Business Insights (for artisans) */}
            {isArtisan && insights && insights.insights && insights.insights.length > 0 && (
              <div className="insights-section">
                <div className="recommendations-title">Business Insights</div>
                <div className="insights-grid">
                  {insights.insights.map((insight, index) => (
                    <div key={index} className="insight-card">
                      <div className="insight-value">{insight.value}</div>
                      <div className="insight-label">{insight.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-container">
            <div className="chat-input-wrapper">
              <textarea
                ref={inputRef}
                className="chat-input"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isArtisan ? "Ask about business strategies, pricing, marketing..." : "Ask about products, recommendations, help..."}
                rows="1"
                disabled={isLoading}
              />
              <button
                className={`send-button ${isArtisan ? 'artisan' : ''}`}
                onClick={() => sendMessage()}
                disabled={isLoading || !inputMessage.trim()}
              >
                {Icons.Send}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistantChat;
