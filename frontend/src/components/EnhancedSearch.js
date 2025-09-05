import React, { useState, useEffect } from 'react';
import { FaSearch, FaFilter, FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import axios from 'axios';
import './EnhancedSearch.css';

const EnhancedSearch = ({ onSearchResults, onLoading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [availableFilters, setAvailableFilters] = useState({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [sortBy, setSortBy] = useState('relevance');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(false);

  // Fetch available filter options
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const response = await axios.get('/api/products-enhanced/filters');
      if (response.data.success) {
        setAvailableFilters(response.data.filters);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  // Perform search with filters
  const performSearch = async () => {
    setLoading(true);
    if (onLoading) onLoading(true);

    try {
      const params = new URLSearchParams();
      
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }
      
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });
      
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('limit', '12');

      const response = await axios.get(`/api/products-enhanced/search?${params}`);
      
      if (response.data.success && onSearchResults) {
        onSearchResults({
          products: response.data.products,
          pagination: response.data.pagination
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
      if (onLoading) onLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Remove specific filter
  const removeFilter = (filterType) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[filterType];
      return newFilters;
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters({});
    setSearchQuery('');
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    return Object.keys(activeFilters).length + (searchQuery.trim() ? 1 : 0);
  };

  // Handle search input
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch();
  };

  // Auto-search when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch();
    }, 500);

    return () => clearTimeout(timer);
  }, [activeFilters, sortBy, sortOrder]);

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'newest', label: 'Newest First' },
    { value: 'price', label: 'Price: Low to High' },
    { value: 'popularity', label: 'Most Popular' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'sales', label: 'Best Selling' }
  ];

  const FilterSection = ({ title, filterKey, options, isSelect = false }) => (
    <div className="filter-section">
      <h4>{title}</h4>
      {isSelect ? (
        <select
          value={activeFilters[filterKey] || 'all'}
          onChange={(e) => handleFilterChange(filterKey, e.target.value)}
          className="filter-select"
        >
          <option value="all">All {title}</option>
          {options.map((option, index) => (
            <option key={index} value={option.value || option}>
              {option.label || option}
            </option>
          ))}
        </select>
      ) : (
        <div className="filter-options">
          {options.slice(0, 5).map((option, index) => (
            <label key={index} className="filter-option">
              <input
                type="radio"
                name={filterKey}
                value={option.value || option}
                checked={activeFilters[filterKey] === (option.value || option)}
                onChange={(e) => handleFilterChange(filterKey, e.target.value)}
              />
              <span>{option.label || option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="enhanced-search">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="search-form">
        <div className="search-input-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search for handcrafted products, artisans, or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => setSearchQuery('')}
              className="clear-search"
            >
              <FaTimes />
            </button>
          )}
        </div>
        <button type="submit" className="search-button" disabled={loading}>
          Search
        </button>
      </form>

      {/* Filter Controls */}
      <div className="filter-controls">
        <button
          className={`filter-toggle ${getActiveFilterCount() > 0 ? 'has-filters' : ''}`}
          onClick={() => setIsFilterOpen(!isFilterOpen)}
        >
          <FaFilter />
          Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
          {isFilterOpen ? <FaChevronUp /> : <FaChevronDown />}
        </button>

        <div className="sort-controls">
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split('-');
              setSortBy(sort);
              setSortOrder(order);
            }}
            className="sort-select"
          >
            {sortOptions.map(option => (
              <option 
                key={option.value} 
                value={`${option.value}-${option.value === 'price' ? 'asc' : 'desc'}`}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filters */}
      {getActiveFilterCount() > 0 && (
        <div className="active-filters">
          <span className="active-filters-label">Active filters:</span>
          {searchQuery && (
            <div className="filter-tag">
              Search: "{searchQuery}"
              <button onClick={() => setSearchQuery('')}>
                <FaTimes />
              </button>
            </div>
          )}
          {Object.entries(activeFilters).map(([key, value]) => (
            <div key={key} className="filter-tag">
              {key}: {value}
              <button onClick={() => removeFilter(key)}>
                <FaTimes />
              </button>
            </div>
          ))}
          <button className="clear-all-filters" onClick={clearAllFilters}>
            Clear All
          </button>
        </div>
      )}

      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="filter-panel">
          <div className="filter-grid">
            <FilterSection
              title="Category"
              filterKey="category"
              options={availableFilters.categories || []}
              isSelect={true}
            />

            <FilterSection
              title="Price Range"
              filterKey="priceRange"
              options={[
                { value: 'budget', label: 'Budget (₹0-500)' },
                { value: 'mid-range', label: 'Mid-range (₹500-2000)' },
                { value: 'premium', label: 'Premium (₹2000-10000)' },
                { value: 'luxury', label: 'Luxury (₹10000+)' }
              ]}
            />

            <FilterSection
              title="Crafting Time"
              filterKey="craftingTime"
              options={availableFilters.craftingTimes || []}
              isSelect={true}
            />

            <FilterSection
              title="Occasion"
              filterKey="occasion"
              options={availableFilters.occasions || []}
              isSelect={true}
            />

            <div className="filter-section">
              <h4>Location</h4>
              <select
                value={activeFilters.location || 'all'}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="filter-select"
              >
                <option value="all">All Locations</option>
                {availableFilters.locations?.states?.map((state, index) => (
                  <option key={index} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-section">
              <h4>Custom Price Range</h4>
              <div className="price-range-inputs">
                <input
                  type="number"
                  placeholder="Min Price"
                  value={activeFilters.minPrice || ''}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  className="price-input"
                />
                <span>to</span>
                <input
                  type="number"
                  placeholder="Max Price"
                  value={activeFilters.maxPrice || ''}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  className="price-input"
                />
              </div>
            </div>

            <div className="filter-section">
              <label className="filter-option checkbox-option">
                <input
                  type="checkbox"
                  checked={activeFilters.isCustomizable === 'true'}
                  onChange={(e) => handleFilterChange('isCustomizable', e.target.checked ? 'true' : '')}
                />
                <span>Customizable Only</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSearch;
