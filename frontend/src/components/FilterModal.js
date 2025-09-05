import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './FilterModal.css';

const FilterModal = ({ isOpen, onClose, filters, onApplyFilters }) => {
  const { t } = useTranslation();
  const [tempFilters, setTempFilters] = useState(filters);

  useEffect(() => {
    setTempFilters(filters);
  }, [filters]);

  const handlePriceRangeChange = (value, isMax = false) => {
    const newPriceRange = [...tempFilters.priceRange];
    if (isMax) {
      newPriceRange[1] = parseInt(value);
    } else {
      newPriceRange[0] = parseInt(value);
    }
    setTempFilters({ ...tempFilters, priceRange: newPriceRange });
  };

  const handleSortChange = (sortBy) => {
    setTempFilters({ ...tempFilters, sortBy });
  };

  const handleAvailabilityChange = (availability) => {
    setTempFilters({ ...tempFilters, availability });
  };

  const handleLocationChange = (e) => {
    setTempFilters({ ...tempFilters, location: e.target.value });
  };

  const handleApply = () => {
    onApplyFilters(tempFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      category: '',
      search: tempFilters.search, // Keep search term
      page: 1,
      sortBy: '',
      priceRange: [0, 10000],
      availability: 'all',
      location: ''
    };
    setTempFilters(resetFilters);
  };

  if (!isOpen) return null;

  return (
    <div className="filter-modal-overlay" onClick={onClose}>
      <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="filter-modal-header">
          <h3>Filter Products</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="filter-modal-content">
          {/* Price Range */}
          <div className="filter-section">
            <h4>Price Range</h4>
            <div className="price-range-inputs">
              <div className="price-input-group">
                <label>Min Price</label>
                <input
                  type="number"
                  value={tempFilters.priceRange[0]}
                  onChange={(e) => handlePriceRangeChange(e.target.value, false)}
                  min="0"
                  max="10000"
                />
              </div>
              <div className="price-input-group">
                <label>Max Price</label>
                <input
                  type="number"
                  value={tempFilters.priceRange[1]}
                  onChange={(e) => handlePriceRangeChange(e.target.value, true)}
                  min="0"
                  max="10000"
                />
              </div>
            </div>
            <div className="price-range-display">
              ₹{tempFilters.priceRange[0].toLocaleString()} - ₹{tempFilters.priceRange[1].toLocaleString()}
            </div>
          </div>

          {/* Sort By */}
          <div className="filter-section">
            <h4>Sort By</h4>
            <div className="filter-options">
              {[
                { value: '', label: 'Relevance' },
                { value: 'price-low-high', label: 'Price: Low to High' },
                { value: 'price-high-low', label: 'Price: High to Low' },
                { value: 'popularity', label: 'Popularity' },
                { value: 'newest', label: 'Newest First' },
                { value: 'rating', label: 'Customer Rating' }
              ].map(option => (
                <label key={option.value} className="filter-option">
                  <input
                    type="radio"
                    name="sortBy"
                    value={option.value}
                    checked={tempFilters.sortBy === option.value}
                    onChange={() => handleSortChange(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="filter-section">
            <h4>Availability</h4>
            <div className="filter-options">
              {[
                { value: 'all', label: 'All Products' },
                { value: 'in-stock', label: 'In Stock' },
                { value: 'limited-stock', label: 'Limited Stock' },
                { value: 'low-stock', label: 'Few Left' }
              ].map(option => (
                <label key={option.value} className="filter-option">
                  <input
                    type="radio"
                    name="availability"
                    value={option.value}
                    checked={tempFilters.availability === option.value}
                    onChange={() => handleAvailabilityChange(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="filter-section">
            <h4>Artisan Location</h4>
            <select 
              value={tempFilters.location || ''} 
              onChange={handleLocationChange}
              className="location-select"
            >
              <option value="">All Locations</option>
              <option value="rajasthan">Rajasthan</option>
              <option value="uttar-pradesh">Uttar Pradesh</option>
              <option value="gujarat">Gujarat</option>
              <option value="bihar">Bihar</option>
              <option value="jammu-kashmir">Jammu & Kashmir</option>
              <option value="punjab">Punjab</option>
            </select>
          </div>
        </div>

        <div className="filter-modal-footer">
          <button className="reset-btn" onClick={handleReset}>
            Reset All
          </button>
          <button className="apply-btn" onClick={handleApply}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
