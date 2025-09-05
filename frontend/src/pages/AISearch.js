import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import axios from 'axios';
import EnhancedSearch from '../components/EnhancedSearch';
import { Link } from 'react-router-dom';
import './AISearch.css';

const AISearch = () => {
  const { t } = useTranslation();
  const { isAuthenticated, userType } = useAuth();
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [searchMode, setSearchMode] = useState('basic'); // 'basic' or 'ai'
  const [pagination, setPagination] = useState({});

  // AI-powered search suggestions
  const generateAISuggestions = async (query) => {
    if (!query.trim()) {
      setAiSuggestions([]);
      return;
    }

    try {
      const response = await axios.post('/api/ai/search-suggestions', {
        query: query.trim()
      });
      
      if (response.data.success) {
        setAiSuggestions(response.data.suggestions || []);
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    }
  };

  // Handle search results from EnhancedSearch component
  const handleSearchResults = (results) => {
    setSearchResults(results.products || []);
    setPagination(results.pagination || {});
  };

  // Handle loading state from EnhancedSearch component
  const handleLoading = (isLoading) => {
    setLoading(isLoading);
  };

  // AI-powered smart search
  const performAISearch = async (query) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/ai/smart-search', {
        query,
        userPreferences: isAuthenticated ? {
          userType,
          language: localStorage.getItem('i18nextLng') || 'en'
        } : null
      });

      if (response.data.success) {
        setSearchResults(response.data.products || []);
        setPagination(response.data.pagination || {});
        
        // Show AI insights if available
        if (response.data.insights) {
          toast.info(`AI Insight: ${response.data.insights}`, { autoClose: 5000 });
        }
      }
    } catch (error) {
      console.error('AI search error:', error);
      toast.error('AI search failed. Using standard search...');
      // Fallback to regular search
      setSearchMode('basic');
    } finally {
      setLoading(false);
    }
  };

  // Handle search input change
  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Generate AI suggestions for queries longer than 2 characters
    if (searchMode === 'ai' && query.length > 2) {
      const timer = setTimeout(() => {
        generateAISuggestions(query);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  };

  // Handle AI suggestion click
  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    performAISearch(suggestion);
    setAiSuggestions([]);
  };

  const ProductCard = ({ product }) => (
    <div className="product-card">
      <Link to={`/product/${product.id}`} className="product-link">
        <div className="product-image">
          {product.images && product.images.length > 0 ? (
            <img src={product.images[0]} alt={product.name} />
          ) : (
            <div className="no-image-placeholder">
              <span>📷</span>
              <p>No Image</p>
            </div>
          )}
        </div>
        <div className="product-info">
          <h3 className="product-name">{product.name}</h3>
          <p className="product-artisan">by {product.artisanName || 'Unknown Artisan'}</p>
          <p className="product-price">₹{product.price}</p>
          <div className="product-meta">
            <span className="product-category">{product.category}</span>
            {product.isCustomizable && (
              <span className="customizable-tag">✨ Customizable</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );

  return (
    <div className="ai-search-page">
      <div className="container">
        <header className="search-header">
          <h1>🔍 AI-Powered Search</h1>
          <p>Discover handcrafted treasures with intelligent search that understands your needs</p>
          
          {/* Search Mode Toggle */}
          <div className="search-mode-toggle">
            <button
              className={`mode-btn ${searchMode === 'basic' ? 'active' : ''}`}
              onClick={() => setSearchMode('basic')}
            >
              📋 Standard Search
            </button>
            <button
              className={`mode-btn ${searchMode === 'ai' ? 'active' : ''}`}
              onClick={() => setSearchMode('ai')}
            >
              🤖 AI Search
            </button>
          </div>
        </header>

        {searchMode === 'basic' ? (
          // Standard Enhanced Search
          <div className="search-section">
            <EnhancedSearch 
              onSearchResults={handleSearchResults}
              onLoading={handleLoading}
            />
          </div>
        ) : (
          // AI-Powered Search
          <div className="ai-search-section">
            <div className="ai-search-container">
              <div className="ai-search-input-container">
                <input
                  type="text"
                  placeholder="Ask me anything... 'Find blue pottery for gifts', 'Show me traditional jewelry', etc."
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  className="ai-search-input"
                />
                <button
                  onClick={() => performAISearch(searchQuery)}
                  disabled={loading || !searchQuery.trim()}
                  className="ai-search-button"
                >
                  {loading ? '🧠 Thinking...' : '🔍 AI Search'}
                </button>
              </div>

              {/* AI Suggestions */}
              {aiSuggestions.length > 0 && (
                <div className="ai-suggestions">
                  <p>💡 AI Suggestions:</p>
                  <div className="suggestions-list">
                    {aiSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="suggestion-chip"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample AI Queries */}
              <div className="sample-queries">
                <p>🎯 Try these AI-powered searches:</p>
                <div className="sample-queries-grid">
                  {[
                    "Find pottery perfect for Diwali decoration",
                    "Show me blue textiles under ₹1000",
                    "Traditional jewelry for wedding gifts",
                    "Handcrafted items from Rajasthan",
                    "Eco-friendly wooden crafts",
                    "Festival-specific decorative items"
                  ].map((query, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSearchQuery(query);
                        performAISearch(query);
                      }}
                      className="sample-query-btn"
                      disabled={loading}
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {loading && (
          <div className="search-loading">
            <div className="loading-spinner"></div>
            <p>{searchMode === 'ai' ? '🤖 AI is analyzing your request...' : 'Searching products...'}</p>
          </div>
        )}

        {searchResults.length > 0 && !loading && (
          <div className="search-results">
            <div className="results-header">
              <h2>
                {searchMode === 'ai' ? '🎯 AI Search Results' : 'Search Results'} 
                ({pagination.total || searchResults.length})
              </h2>
              {searchQuery && (
                <p className="search-query">Showing results for: "{searchQuery}"</p>
              )}
            </div>
            
            <div className="products-grid">
              {searchResults.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <p>
                  Page {pagination.currentPage} of {pagination.totalPages} 
                  ({pagination.total} total results)
                </p>
              </div>
            )}
          </div>
        )}

        {searchResults.length === 0 && !loading && searchQuery && (
          <div className="no-results">
            <div className="no-results-content">
              <h3>🔍 No results found</h3>
              <p>We couldn't find any products matching your search.</p>
              <div className="no-results-suggestions">
                <h4>Try:</h4>
                <ul>
                  <li>Using different keywords</li>
                  <li>Checking your spelling</li>
                  <li>Using more general terms</li>
                  <li>Switching to {searchMode === 'ai' ? 'Standard' : 'AI'} search mode</li>
                </ul>
              </div>
              <button
                onClick={() => setSearchMode(searchMode === 'ai' ? 'basic' : 'ai')}
                className="btn btn-secondary"
              >
                Try {searchMode === 'ai' ? 'Standard' : 'AI'} Search
              </button>
            </div>
          </div>
        )}

        {searchResults.length === 0 && !loading && !searchQuery && (
          <div className="search-welcome">
            <div className="welcome-content">
              <h2>🎨 Discover Authentic Crafts</h2>
              <p>Use our {searchMode === 'ai' ? 'AI-powered' : 'enhanced'} search to find exactly what you're looking for</p>
              
              <div className="search-features">
                <div className="feature">
                  <span className="feature-icon">🤖</span>
                  <h4>AI Search</h4>
                  <p>Natural language queries like "pottery for gifts"</p>
                </div>
                <div className="feature">
                  <span className="feature-icon">🔧</span>
                  <h4>Advanced Filters</h4>
                  <p>Filter by category, price, location, and more</p>
                </div>
                <div className="feature">
                  <span className="feature-icon">🎯</span>
                  <h4>Smart Suggestions</h4>
                  <p>Get AI-powered recommendations</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AISearch;
