import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ProductSearchChatbot.css';

const ProductSearchChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [foundProducts, setFoundProducts] = useState([]);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const { user, userType, isAuthenticated } = useAuth();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate session ID
  useEffect(() => {
    if (isOpen && !sessionId) {
      setSessionId(Date.now().toString());
    }
  }, [isOpen, sessionId]);

  // Initialize chat with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const userName = user?.name ? `, ${user.name}` : '';
      const welcomeMessage = {
        id: Date.now(),
        role: 'assistant',
        content: `Hi there${userName}! I'm your AI shopping assistant powered by Gemini. I can help you discover amazing handcrafted products from talented Indian artisans. 

What can I help you find today? You can ask me things like:
• "Show me traditional jewelry for weddings"
• "Find pottery under ₹1500 for home decor" 
• "I need a gift for my mother who loves textiles"
• "What are popular handcrafted items right now?"

Go ahead and tell me what you're looking for!`,
        timestamp: new Date(),
        isWelcome: true
      };
      
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, user]);

  // Enhanced AI-powered search with proper NLP
  const handleConversation = async (userMessage) => {
    try {
      setIsLoading(true);
      setError(null);

      // Call the enhanced chatbot API
      const response = await axios.post('/api/product-chatbot/chat', {
        message: userMessage,
        sessionId: sessionId,
        userContext: {
          userId: user?._id,
          userType: userType,
          isAuthenticated: isAuthenticated,
          preferences: user?.preferences
        }
      });

      if (response.data.success) {
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date(),
          suggestions: response.data.suggestions || [],
          products: response.data.products || []
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Update found products for display
        if (response.data.products && response.data.products.length > 0) {
          setFoundProducts(response.data.products);
        } else {
          setFoundProducts([]);
        }

      } else {
        throw new Error(response.data.message || 'Failed to get AI response');
      }

    } catch (error) {
      console.error('Chatbot Error:', error);
      setError('I apologize, but I\'m having trouble right now. Please try again in a moment.');
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: "I apologize, but I'm experiencing some technical difficulties. Please try rephrasing your question, or you can browse our marketplace directly to discover amazing handcrafted products!",
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (messageText = inputMessage.trim()) => {
    if (!messageText || isLoading) return;

    setInputMessage('');

    // Add user message
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);

    // Process with AI
    await handleConversation(messageText);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSampleQuery = (query) => {
    setInputMessage(query);
    sendMessage(query);
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  const sampleQueries = [
    "Show me traditional jewelry",
    "Find pottery items for home decor", 
    "Handwoven textiles for gifts",
    "Wooden crafts under ₹1000",
    "What's trending in handmade products?",
    "I need a wedding gift"
  ];

  const clearChat = () => {
    setMessages([]);
    setFoundProducts([]);
    setError(null);
    setSessionId(Date.now().toString());
  };

  return (
    <div className="product-search-chatbot-container">
      {/* Chatbot Trigger */}
      <button 
        className="product-chatbot-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="AI Product Assistant"
      >
        <div className="trigger-icon">🤖</div>
        <div className="trigger-pulse"></div>
      </button>

      {/* Chatbot Window */}
      {isOpen && (
        <div className="product-chatbot-window">
          {/* Header */}
          <div className="product-chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">
                <span className="avatar-icon">🤖</span>
                <div className="status-indicator"></div>
              </div>
              <div className="chatbot-info">
                <h3>AI Shopping Assistant</h3>
                <p>Powered by Gemini AI • Find handcrafted treasures</p>
              </div>
            </div>
            <div className="header-actions">
              <button 
                className="clear-chat-btn" 
                onClick={clearChat}
                title="Clear Chat"
              >
                🗑️
              </button>
              <button 
                className="close-chatbot" 
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="product-chatbot-messages">
            {messages.map((message) => (
              <div key={message.id} className={`chatbot-message ${message.role}`}>
                <div className="message-avatar">
                  {message.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className={`message-bubble ${message.role} ${message.isWelcome ? 'welcome' : ''}`}>
                  <div className="message-content">
                    {message.content}
                  </div>
                  <div className="message-timestamp">
                    {formatTimestamp(message.timestamp)}
                  </div>
                  
                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="message-suggestions">
                      <div className="suggestions-label">Try asking:</div>
                      <div className="suggestions-list">
                        {message.suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            className="suggestion-chip"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products */}
                  {message.products && message.products.length > 0 && (
                    <div className="message-products">
                      <div className="products-label">Found Products:</div>
                      <div className="products-grid">
                        {message.products.map((product, index) => (
                          <Link
                            key={product._id || index}
                            to={`/product/${product._id || product.id}`}
                            className="product-mini-card"
                          >
                            <div className="product-image">
                              {product.images && product.images[0] ? (
                                <img src={product.images[0]} alt={product.name} />
                              ) : (
                                <span className="no-image">🎨</span>
                              )}
                            </div>
                            <div className="product-info">
                              <div className="product-name">{product.name}</div>
                              <div className="product-price">₹{product.price}</div>
                              <div className="product-artisan">by {product.artisan?.name || 'Artisan'}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <Link to="/marketplace" className="view-more-products">
                        View all products in marketplace →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="typing-indicator">
                <div className="message-avatar">🤖</div>
                <div className="typing-bubble">
                  <div className="typing-dots">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                  <span className="typing-text">AI is thinking...</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            {/* Sample Queries for new users */}
            {messages.length <= 1 && !isLoading && (
              <div className="sample-queries">
                <div className="sample-queries-title">Quick starts:</div>
                <div className="sample-queries-grid">
                  {sampleQueries.map((query, index) => (
                    <button
                      key={index}
                      className="sample-query-btn"
                      onClick={() => handleSampleQuery(query)}
                    >
                      <span className="query-icon">💬</span>
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="product-chatbot-input-container">
            <div className="chatbot-input-wrapper">
              <div className="input-container">
                <textarea
                  ref={inputRef}
                  className="chatbot-input"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about handcrafted products..."
                  disabled={isLoading}
                  rows="1"
                />
                <button
                  className="send-btn"
                  onClick={() => sendMessage()}
                  disabled={isLoading || !inputMessage.trim()}
                >
                  {isLoading ? '⏳' : '➤'}
                </button>
              </div>
              <div className="input-hint">
                💡 Try: "Show me pottery under ₹1500" or "I need a wedding gift"
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSearchChatbot;
