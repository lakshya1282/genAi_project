import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaFilter, FaSort, FaTrash, FaEye, FaEyeSlash, FaBox } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import ArtisanProductCard from './ArtisanProductCard';
import ProductAnalytics from './ProductAnalytics';
import './ProductList.css';

const ProductList = ({ onAddProduct, onEditProduct }) => {
  const { artisanToken } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters and pagination
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    hasNext: false,
    hasPrev: false,
    totalCount: 0
  });
  
  // Bulk operations
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  
  // Modal states
  const [deleteModal, setDeleteModal] = useState({ show: false, product: null });
  const [duplicateLoading, setDuplicateLoading] = useState({});
  const [analyticsModal, setAnalyticsModal] = useState({ show: false, product: null });

  useEffect(() => {
    fetchProducts();
  }, [filters, pagination.current]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.current,
        limit: 12,
        ...filters
      });

      const response = await fetch(`http://localhost:5000/api/artisan/products?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${artisanToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
        setPagination(data.pagination);
      } else {
        setError('Failed to fetch products');
      }
    } catch (error) {
      setError('Error fetching products');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, current: newPage }));
  };

  const handleToggleStatus = async (product) => {
    try {
      const response = await fetch(`http://localhost:5000/api/artisan/products/${product._id}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${artisanToken}`
        }
      });

      if (response.ok) {
        fetchProducts();
      } else {
        setError('Failed to update product status');
      }
    } catch (error) {
      setError('Error updating product status');
    }
  };

  const handleDuplicate = async (product) => {
    try {
      setDuplicateLoading(prev => ({ ...prev, [product._id]: true }));
      
      const response = await fetch(`http://localhost:5000/api/artisan/products/${product._id}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${artisanToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchProducts();
      } else {
        setError('Failed to duplicate product');
      }
    } catch (error) {
      setError('Error duplicating product');
    } finally {
      setDuplicateLoading(prev => ({ ...prev, [product._id]: false }));
    }
  };

  const handleDelete = async (product, permanently = false) => {
    try {
      const response = await fetch(`http://localhost:5000/api/artisan/products/${product._id}?permanently=${permanently}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${artisanToken}`
        }
      });

      if (response.ok) {
        fetchProducts();
        setDeleteModal({ show: false, product: null });
      } else {
        setError('Failed to delete product');
      }
    } catch (error) {
      setError('Error deleting product');
    }
  };

  const handleAnalytics = (product) => {
    setAnalyticsModal({ show: true, product });
  };

  const handleBulkSelect = (productId, checked) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const handleBulkSelectAll = (checked) => {
    if (checked) {
      setSelectedProducts(products.map(p => p._id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleBulkOperation = async (operation, data = null) => {
    try {
      setBulkLoading(true);
      
      const response = await fetch('http://localhost:5000/api/artisan/products/bulk-operations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${artisanToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation,
          productIds: selectedProducts,
          data
        })
      });

      if (response.ok) {
        fetchProducts();
        setSelectedProducts([]);
        setShowBulkActions(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to perform bulk operation');
      }
    } catch (error) {
      setError('Error performing bulk operation');
    } finally {
      setBulkLoading(false);
    }
  };

  useEffect(() => {
    setShowBulkActions(selectedProducts.length > 0);
  }, [selectedProducts]);

  if (loading && products.length === 0) {
    return (
      <div className="products-loading">
        <div className="loading-spinner"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div className="product-list-container">
      {/* Header */}
      <div className="product-list-header">
        <div className="header-left">
          <h2>My Products</h2>
          <span className="product-count">
            {pagination.totalCount} product{pagination.totalCount !== 1 ? 's' : ''}
          </span>
        </div>
        <button className="add-product-btn" onClick={onAddProduct}>
          <FaPlus /> Add Product
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')} className="close-error">×</button>
        </div>
      )}

      {/* Filters and Search */}
      <div className="product-filters">
        <div className="search-section">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search products..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>

        <div className="filter-section">
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="Pottery">Pottery</option>
            <option value="Weaving">Weaving</option>
            <option value="Jewelry">Jewelry</option>
            <option value="Woodwork">Woodwork</option>
            <option value="Metalwork">Metalwork</option>
            <option value="Textiles">Textiles</option>
            <option value="Paintings">Paintings</option>
            <option value="Sculptures">Sculptures</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="outOfStock">Out of Stock</option>
            <option value="lowStock">Low Stock</option>
          </select>

          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              handleFilterChange('sortBy', sortBy);
              handleFilterChange('sortOrder', sortOrder);
            }}
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="price-asc">Price Low-High</option>
            <option value="price-desc">Price High-Low</option>
            <option value="views-desc">Most Viewed</option>
            <option value="quantitySold-desc">Best Selling</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="bulk-actions-bar">
          <div className="bulk-info">
            {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
          </div>
          <div className="bulk-buttons">
            <button
              onClick={() => handleBulkOperation('activate')}
              disabled={bulkLoading}
              className="bulk-btn activate-btn"
            >
              <FaEye /> Activate
            </button>
            <button
              onClick={() => handleBulkOperation('deactivate')}
              disabled={bulkLoading}
              className="bulk-btn deactivate-btn"
            >
              <FaEyeSlash /> Deactivate
            </button>
            <button
              onClick={() => setSelectedProducts([])}
              className="bulk-btn cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Select All */}
      {products.length > 0 && (
        <div className="select-all-section">
          <label className="select-all-label">
            <input
              type="checkbox"
              checked={selectedProducts.length === products.length}
              onChange={(e) => handleBulkSelectAll(e.target.checked)}
            />
            Select All
          </label>
        </div>
      )}

      {/* Products Grid */}
      {products.length > 0 ? (
        <div className="products-grid">
          {products.map((product) => (
            <div key={product._id} className="product-item">
              <div className="product-select">
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(product._id)}
                  onChange={(e) => handleBulkSelect(product._id, e.target.checked)}
                />
              </div>
              <ArtisanProductCard
                product={product}
                onEdit={onEditProduct}
                onDelete={(product) => setDeleteModal({ show: true, product })}
                onToggleStatus={handleToggleStatus}
                onDuplicate={handleDuplicate}
                onAnalytics={handleAnalytics}
              />
              {duplicateLoading[product._id] && (
                <div className="duplicate-loading">
                  <div className="loading-spinner"></div>
                  <span>Duplicating...</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-products">
          <div className="no-products-icon">
            <FaBox />
          </div>
          <h3>No Products Found</h3>
          <p>
            {filters.search || filters.category !== 'all' || filters.status !== 'all' 
              ? 'Try adjusting your filters or search terms.'
              : "You haven't created any products yet. Start by adding your first product!"
            }
          </p>
          {(!filters.search && filters.category === 'all' && filters.status === 'all') && (
            <button className="add-first-product-btn" onClick={onAddProduct}>
              <FaPlus /> Add Your First Product
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.total > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(pagination.current - 1)}
            disabled={!pagination.hasPrev}
            className="pagination-btn"
          >
            Previous
          </button>
          
          <div className="pagination-info">
            Page {pagination.current} of {pagination.total}
          </div>
          
          <button
            onClick={() => handlePageChange(pagination.current + 1)}
            disabled={!pagination.hasNext}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="modal-overlay" onClick={() => setDeleteModal({ show: false, product: null })}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Product</h3>
            <p>Are you sure you want to delete "{deleteModal.product?.name}"?</p>
            
            <div className="delete-options">
              <label>
                <input type="radio" name="deleteType" value="soft" defaultChecked />
                Deactivate (can be reactivated later)
              </label>
              <label>
                <input type="radio" name="deleteType" value="permanent" />
                Delete permanently (cannot be undone)
              </label>
            </div>
            
            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={() => setDeleteModal({ show: false, product: null })}
              >
                Cancel
              </button>
              <button 
                className="delete-btn"
                onClick={() => {
                  const deleteType = document.querySelector('input[name="deleteType"]:checked').value;
                  handleDelete(deleteModal.product, deleteType === 'permanent');
                }}
              >
                <FaTrash /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Analytics Modal */}
      {analyticsModal.show && (
        <ProductAnalytics
          product={analyticsModal.product}
          onClose={() => setAnalyticsModal({ show: false, product: null })}
        />
      )}
    </div>
  );
};

export default ProductList;
