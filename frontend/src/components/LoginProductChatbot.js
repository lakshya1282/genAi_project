import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './LoginProductChatbot.css';

const LoginProductChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [foundProducts, setFoundProducts] = useState([]);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
        role: 'assistant',
        content: "Hi! I'm here to help you find amazing handcrafted products. You can browse our marketplace even without logging in! What are you looking for today?",
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  // Search for products using Gemini AI
  const searchProducts = async (query) => {
    try {
      setIsLoading(true);
      setError(null);

      // Use the dedicated login chatbot API endpoint
      const searchResponse = await axios.post('/api/login-chatbot/search', {
        query: query,
        limit: 6
      });

      let products = [];
      let aiResponse = "";

      if (searchResponse.data.success && searchResponse.data.products) {
        products = searchResponse.data.products;
        
        // Use the AI-generated response message
        aiResponse = searchResponse.data.message || 
          `Great! I found ${products.length} products that match your request. ${products.length > 0 ? 'You can click on any product to view details, or let me know if you\'d like to search for something else!' : ''}`;
      } else {
        // If AI search fails, try basic product search as fallback
        const basicResponse = await axios.get(`/api/products?search=${encodeURIComponent(query)}&limit=6`);
        if (basicResponse.data.products && basicResponse.data.products.length > 0) {
          products = basicResponse.data.products;
          aiResponse = `I found ${products.length} products related to "${query}". Take a look and let me know if you need something specific!`;
        } else {
          aiResponse = `I couldn't find any products matching "${query}". Try searching for categories like "jewelry", "pottery", "textiles", or "woodwork". You can also browse our full marketplace to discover amazing handcrafted items!`;
        }
      }

      setFoundProducts(products);
      return aiResponse;

    } catch (error) {
      console.error('Product search error:', error);
      setError('Sorry, I had trouble searching for products. Please try again.');
      return "I'm having trouble searching right now, but you can browse our marketplace directly to discover amazing handcrafted products from talented artisans!";
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (messageText = inputMessage.trim()) => {
    if (!messageText || isLoading) return;

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
      // Search for products based on user input
      const aiResponse = await searchProducts(messageText);

      // Add assistant response
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chatbot Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: "I apologize, but I'm having trouble right now. Please try browsing our marketplace directly to discover amazing handcrafted products!",
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

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSampleQuery = (query) => {
    setInputMessage(query);
    sendMessage(query);
  };

  const sampleQueries = [
    "Show me traditional jewelry",
    "Find pottery items for home decor", 
    "Handwoven textiles for gifts",
    "Wooden crafts under ₹1000",
    "Festival decoration items"
  ];

  return (
    <div className="login-chatbot-container">
      {/* Chatbot Trigger */}
      <button 
        className="chatbot-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Find Products"
      >
        🔍
        <span className="trigger-text">Find Products</span>
      </button>

      {/* Chatbot Window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">🛍️</div>
              <div className="chatbot-info">
                <h3>Product Finder</h3>
                <p>Discover handcrafted treasures</p>
              </div>
            </div>
            <button className="close-chatbot" onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((message) => (
              <div key={message.id} className={`chatbot-message ${message.role}`}>
                <div className="message-avatar">
                  {message.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className={`message-bubble ${message.role}`}>
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
                <div className="message-avatar">🤖</div>
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

            {/* Product Results */}
            {foundProducts.length > 0 && !isLoading && (
              <div className="product-results">
                <div className="results-header">Found Products:</div>
                <div className="products-mini-grid">
                  {foundProducts.map((product, index) => (
                    <Link
                      key={product._id || index}
                      to={`/product/${product._id || product.id}`}
                      className="mini-product-card"
                    >
                      <div className="mini-product-image">
                        {product.images && product.images[0] ? (
                          <img src={product.images[0]} alt={product.name} />
                        ) : (
                          <span className="no-image">🎨</span>
                        )}
                      </div>
                      <div className="mini-product-info">
                        <div className="mini-product-name">{product.name}</div>
                        <div className="mini-product-price">₹{product.price}</div>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link to="/marketplace" className="view-all-link">
                  View All Products →
                </Link>
              </div>
            )}

            {/* Sample Queries */}
            {messages.length === 1 && !isLoading && (
              <div className="sample-queries">
                <div className="sample-queries-title">Try these searches:</div>
                <div className="sample-queries-list">
                  {sampleQueries.map((query, index) => (
                    <button
                      key={index}
                      className="sample-query-btn"
                      onClick={() => handleSampleQuery(query)}
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chatbot-input-container">
            <div className="chatbot-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="chatbot-input"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="What handcrafted items are you looking for?"
                disabled={isLoading}
              />
              <button
                className="send-btn"
                onClick={() => sendMessage()}
                disabled={isLoading || !inputMessage.trim()}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginProductChatbot;
