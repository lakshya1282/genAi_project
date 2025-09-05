import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import WishlistToggle from '../components/WishlistToggle';
import FilterModal from '../components/FilterModal';
import './CategoryExplorer.css';

const CategoryExplorer = () => {
  const { t } = useTranslation();
  const { category } = useParams();
  const { cartCount, userType, addToCart } = useAuth();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    sortBy: '',
    priceRange: [0, 10000],
    availability: 'all',
    location: ''
  });

  // Category information mapping
  const categoryInfo = {
    pottery: {
      title: 'Handmade Pottery',
      description: 'Discover exquisite handcrafted pottery pieces that blend traditional techniques with contemporary designs. Each piece tells a story of skilled artisans and their centuries-old craft.',
      icon: '🏺',
      color: '#8B4513',
      gradient: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
      features: ['Hand-thrown ceramics', 'Traditional glazing', 'Functional & decorative', 'Eco-friendly materials']
    },
    jewelry: {
      title: 'Traditional Jewelry',
      description: 'Explore our stunning collection of handcrafted jewelry that showcases the rich heritage of Indian craftsmanship. From intricate silver work to precious stone settings.',
      icon: '💍',
      color: '#FFD700',
      gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
      features: ['Handcrafted designs', 'Premium materials', 'Traditional techniques', 'Unique patterns']
    },
    textiles: {
      title: 'Textile Arts',
      description: 'Immerse yourself in the world of handwoven textiles, featuring traditional fabrics, patterns, and techniques passed down through generations.',
      icon: '🧵',
      color: '#4169E1',
      gradient: 'linear-gradient(135deg, #4169E1 0%, #6495ED 100%)',
      features: ['Hand-woven fabrics', 'Natural dyes', 'Traditional patterns', 'Sustainable practices']
    },
    woodwork: {
      title: 'Wood Crafts',
      description: 'Browse beautiful wooden creations carved by master craftsmen, showcasing the natural beauty of wood combined with artistic expertise.',
      icon: '🪵',
      color: '#8B4513',
      gradient: 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)',
      features: ['Hand-carved pieces', 'Premium wood', 'Traditional tools', 'Artistic designs']
    },
    metalwork: {
      title: 'Metalwork',
      description: 'Discover the art of metalworking with our collection of brass, copper, and silver items crafted using time-honored techniques.',
      icon: '🔨',
      color: '#B8860B',
      gradient: 'linear-gradient(135deg, #B8860B 0%, #DAA520 100%)',
      features: ['Hand-forged items', 'Traditional alloys', 'Intricate detailing', 'Functional art']
    },
    paintings: {
      title: 'Traditional Paintings',
      description: 'Explore vibrant paintings that capture the essence of Indian folk art, featuring traditional themes and contemporary interpretations.',
      icon: '🎨',
      color: '#FF6347',
      gradient: 'linear-gradient(135deg, #FF6347 0%, #FF4500 100%)',
      features: ['Folk art styles', 'Natural pigments', 'Cultural themes', 'Hand-painted']
    },
    sculptures: {
      title: 'Sculptures',
      description: 'Admire masterful sculptures that showcase the artisan\'s skill in transforming raw materials into expressive works of art.',
      icon: '🗿',
      color: '#708090',
      gradient: 'linear-gradient(135deg, #708090 0%, #2F4F4F 100%)',
      features: ['Stone carving', 'Metal casting', 'Traditional themes', 'Artistic expression']
    },
    weaving: {
      title: 'Handwoven Items',
      description: 'Experience the art of weaving with our collection of handwoven baskets, mats, and decorative items made using traditional techniques.',
      icon: '🕸️',
      color: '#32CD32',
      gradient: 'linear-gradient(135deg, #32CD32 0%, #228B22 100%)',
      features: ['Hand-woven patterns', 'Natural fibers', 'Traditional techniques', 'Functional designs']
    }
  };

  const currentCategory = categoryInfo[category] || {
    title: 'All Crafts',
    description: 'Explore our complete collection of handcrafted items from talented artisans.',
    icon: '🎨',
    color: '#667eea',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    features: ['Diverse crafts', 'Skilled artisans', 'Quality materials', 'Cultural heritage']
  };

  // Sample products for demo (same as Marketplace)
  const sampleProducts = [
    {
      _id: 'sample1',
      name: 'Traditional Blue Pottery Vase',
      description: 'Beautiful handcrafted vase with traditional Jaipur blue pottery design featuring intricate floral patterns',
      price: 1250,
      category: 'Pottery',
      images: ['https://via.placeholder.com/400x400/4A90E2/FFFFFF?text=Blue+Pottery+Vase'],
      artisan: {
        name: 'Rajesh Kumar',
        location: { city: 'Jaipur', state: 'Rajasthan' },
        craftType: 'Pottery'
      },
      views: 124,
      likes: 28,
      stock: 7,
      isAvailable: true
    },
    {
      _id: 'sample2',
      name: 'Handwoven Banarasi Silk Saree',
      description: 'Exquisite Banarasi silk saree with gold zari work, perfect for special occasions and celebrations',
      price: 3500,
      category: 'Textiles',
      images: ['https://via.placeholder.com/400x400/E91E63/FFFFFF?text=Banarasi+Silk+Saree'],
      artisan: {
        name: 'Meera Devi',
        location: { city: 'Varanasi', state: 'Uttar Pradesh' },
        craftType: 'Weaving'
      },
      views: 89,
      likes: 34,
      stock: 6,
      isAvailable: true
    },
    {
      _id: 'sample3',
      name: 'Silver Kundan Jewelry Set',
      description: 'Traditional Kundan jewelry set with intricate silver work and semi-precious stones',
      price: 2800,
      category: 'Jewelry',
      images: ['https://via.placeholder.com/400x400/FFD700/000000?text=Kundan+Jewelry'],
      artisan: {
        name: 'Anita Sharma',
        location: { city: 'Pushkar', state: 'Rajasthan' },
        craftType: 'Jewelry'
      },
      views: 156,
      likes: 42,
      stock: 6,
      isAvailable: true
    },
    {
      _id: 'sample4',
      name: 'Carved Wooden Elephant Figurine',
      description: 'Intricately carved wooden elephant with traditional Indian motifs, perfect for home decoration',
      price: 890,
      category: 'Woodwork',
      images: ['https://via.placeholder.com/400x400/8B4513/FFFFFF?text=Wooden+Elephant'],
      artisan: {
        name: 'Ravi Kaul',
        location: { city: 'Saharanpur', state: 'Uttar Pradesh' },
        craftType: 'Woodwork'
      },
      views: 78,
      likes: 19,
      stock: 7,
      isAvailable: true
    },
    {
      _id: 'sample5',
      name: 'Brass Diya Set with Stand',
      description: 'Authentic brass diya set with decorative stand, perfect for festivals and daily worship',
      price: 450,
      category: 'Metalwork',
      images: ['https://via.placeholder.com/400x400/B8860B/FFFFFF?text=Brass+Diya+Set'],
      artisan: {
        name: 'Mohan Das',
        location: { city: 'Moradabad', state: 'Uttar Pradesh' },
        craftType: 'Metalwork'
      },
      views: 67,
      likes: 22,
      stock: 6,
      isAvailable: true
    },
    {
      _id: 'sample6',
      name: 'Madhubani Painting on Canvas',
      description: 'Traditional Madhubani folk art painting depicting nature and mythology on canvas',
      price: 1200,
      category: 'Paintings',
      images: ['https://via.placeholder.com/400x400/FF6347/FFFFFF?text=Madhubani+Art'],
      artisan: {
        name: 'Sunita Jha',
        location: { city: 'Darbhanga', state: 'Bihar' },
        craftType: 'Painting'
      },
      views: 102,
      likes: 38,
      stock: 7,
      isAvailable: true
    },
    {
      _id: 'sample7',
      name: 'Block Printed Cotton Bedsheet',
      description: 'Hand block printed cotton bedsheet with traditional Rajasthani patterns in vibrant colors',
      price: 750,
      category: 'Textiles',
      images: ['https://via.placeholder.com/400x400/32CD32/FFFFFF?text=Block+Print'],
      artisan: {
        name: 'Ramesh Chhipa',
        location: { city: 'Sanganer', state: 'Rajasthan' },
        craftType: 'Block Printing'
      },
      views: 93,
      likes: 27,
      stock: 6,
      isAvailable: true
    },
    {
      _id: 'sample8',
      name: 'Terracotta Garden Planters',
      description: 'Set of handcrafted terracotta planters with traditional designs, perfect for garden and home',
      price: 650,
      category: 'Pottery',
      images: ['https://via.placeholder.com/400x400/D2691E/FFFFFF?text=Terracotta+Planters'],
      artisan: {
        name: 'Kamala Kumhar',
        location: { city: 'Khanapur', state: 'Gujarat' },
        craftType: 'Pottery'
      },
      views: 85,
      likes: 31,
      stock: 7,
      isAvailable: true
    },
    {
      _id: 'sample9',
      name: 'Stone Carved Ganesha Statue',
      description: 'Beautifully carved Lord Ganesha statue from red sandstone with intricate detailing',
      price: 1800,
      category: 'Sculptures',
      images: ['https://via.placeholder.com/400x400/708090/FFFFFF?text=Ganesha+Statue'],
      artisan: {
        name: 'Vishnu Sharma',
        location: { city: 'Mathura', state: 'Uttar Pradesh' },
        craftType: 'Stone Carving'
      },
      views: 78,
      likes: 29,
      stock: 7,
      isAvailable: true
    },
    {
      _id: 'sample10',
      name: 'Handwoven Khadi Cotton Kurta',
      description: 'Premium Khadi cotton kurta with traditional hand-spun fabric, comfortable for daily wear',
      price: 950,
      category: 'Textiles',
      images: ['https://via.placeholder.com/400x400/F0E68C/000000?text=Khadi+Kurta'],
      artisan: {
        name: 'Govind Weaver',
        location: { city: 'Ahmedabad', state: 'Gujarat' },
        craftType: 'Weaving'
      },
      views: 67,
      likes: 18,
      stock: 2,
      isAvailable: true
    }
  ];

  useEffect(() => {
    fetchProducts();
  }, [category, filters]);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (category && category !== 'all') params.append('category', category);
      if (filters.search) params.append('search', filters.search);
      params.append('page', filters.page);
      params.append('limit', '20');

      const response = await axios.get(`/api/products?${params}`);
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters({ ...filters, page: 1 });
  };

  const handleFilterButtonClick = () => {
    setShowFilterModal(true);
  };

  const handleCartButtonClick = () => {
    if (userType === 'customer') {
      navigate('/cart');
    } else {
      navigate('/customer/login');
    }
  };

  const handleAddToCart = async (productId, productName) => {
    if (userType !== 'customer') {
      toast.error('Please login as a customer to add items to cart');
      navigate('/customer/login');
      return;
    }

    if (!addToCart || typeof addToCart !== 'function') {
      toast.error('Cart functionality is not available');
      return;
    }

    try {
      console.log('Adding to cart:', { productId, productName });
      const result = await addToCart(productId, 1);
      
      if (result && result.success) {
        toast.success(result.message || `${productName} added to cart!`);
      } else {
        toast.error(result?.message || 'Failed to add item to cart');
        if (result?.availableStock !== undefined) {
          toast.info(`Only ${result.availableStock} items available`);
        }
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error('Failed to add item to cart. Please try again.');
    }
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const applyProductFilters = (products) => {
    let filteredProducts = [...products];

    // Filter by category
    if (category && category !== 'all') {
      filteredProducts = filteredProducts.filter(product => 
        product.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by price range
    filteredProducts = filteredProducts.filter(product => 
      product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1]
    );

    // Filter by availability
    if (filters.availability !== 'all') {
      filteredProducts = filteredProducts.filter(product => {
        const stockStatus = getStockStatus(product);
        return stockStatus.status === filters.availability;
      });
    }

    // Filter by location
    if (filters.location) {
      filteredProducts = filteredProducts.filter(product => {
        const state = product.artisan?.location?.state?.toLowerCase().replace(/\s+/g, '-');
        return state === filters.location;
      });
    }

    // Sort products
    if (filters.sortBy) {
      filteredProducts.sort((a, b) => {
        switch (filters.sortBy) {
          case 'price-low-high':
            return a.price - b.price;
          case 'price-high-low':
            return b.price - a.price;
          case 'popularity':
            return (b.likes || 0) - (a.likes || 0);
          case 'newest':
            return b._id.localeCompare(a._id);
          case 'rating':
            return (b.rating || 0) - (a.rating || 0);
          default:
            return 0;
        }
      });
    }

    return filteredProducts;
  };

  // Function to get stock status
  const getStockStatus = (product) => {
    if (product.stock === undefined && product.isAvailable === undefined) {
      return { status: 'in-stock', label: 'In Stock', class: 'in-stock' };
    }
    
    if (product.isAvailable === false || product.stock === 0) {
      return { status: 'out-of-stock', label: 'Out of Stock', class: 'out-of-stock' };
    }
    
    if (product.stock !== undefined) {
      if (product.stock <= 2) {
        return { status: 'low-stock', label: 'Low Stock', class: 'low-stock' };
      } else if (product.stock <= 5) {
        return { status: 'limited-stock', label: 'Limited Stock', class: 'limited-stock' };
      }
    }
    
    return { status: 'in-stock', label: 'In Stock', class: 'in-stock' };
  };

  const baseProducts = products.length > 0 ? products : sampleProducts;
  const displayProducts = applyProductFilters(baseProducts);

  if (loading) {
    return <div className="category-explorer-loading">Loading products...</div>;
  }

  return (
    <div className="category-explorer">
      <div className="category-explorer-container">
        {/* Header */}
        <header className="category-header" style={{background: currentCategory.gradient}}>
          <div className="category-header-content">
            <div className="category-breadcrumb">
              <Link to="/marketplace" className="breadcrumb-link">Marketplace</Link>
              <span className="breadcrumb-separator">→</span>
              <span className="breadcrumb-current">{currentCategory.title}</span>
            </div>
            
            <div className="category-hero">
              <div className="category-info">
                <div className="category-icon">{currentCategory.icon}</div>
                <h1 className="category-title">{currentCategory.title}</h1>
                <p className="category-description">{currentCategory.description}</p>
                
                <div className="category-features">
                  {currentCategory.features.map((feature, index) => (
                    <span key={index} className="feature-tag">{feature}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="category-search-bar">
              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  placeholder={`Search in ${currentCategory.title}...`}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="search-input"
                />
                <button type="submit" className="search-btn">🔍</button>
              </form>
              
              <div className="header-actions">
                <button className="filter-btn" onClick={handleFilterButtonClick}>
                  <span className="filter-icon">⚙️</span>
                  <span>Filters</span>
                </button>
                <button className="cart-btn" onClick={handleCartButtonClick}>
                  <span className="cart-icon">🛒</span>
                  <span className="cart-count">{cartCount || 0}</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Products Section */}
        <main className="category-main">
          <div className="products-header">
            <h2>
              {displayProducts.length} Products in {currentCategory.title}
            </h2>
            <div className="sort-options">
              <select 
                value={filters.sortBy} 
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                className="sort-select"
              >
                <option value="">Sort by: Relevance</option>
                <option value="price-low-high">Price: Low to High</option>
                <option value="price-high-low">Price: High to Low</option>
                <option value="popularity">Popularity</option>
                <option value="newest">Newest First</option>
                <option value="rating">Customer Rating</option>
              </select>
            </div>
          </div>

          <div className="products-grid">
            {displayProducts.map(product => {
              const stockStatus = getStockStatus(product);
              return (
                <div key={product._id} className={`meesho-card ${stockStatus.class}`}>
                  <Link to={`/product/${product._id}`} className="card-link">
                    <div className="meesho-image-container">
                      <img 
                        src={product.images?.[0] || 'https://via.placeholder.com/240x200?text=Product+Image&bg=f8f9fa&color=666'} 
                        alt={product.name} 
                        className="meesho-product-image"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/240x200?text=No+Image&bg=f8f9fa&color=666';
                        }}
                      />
                      <button 
                        className="meesho-wishlist"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Simple wishlist toggle for demo
                          toast.success(`${product.name} added to wishlist!`);
                        }}
                        title="Add to wishlist"
                      >
                        ❤️
                      </button>
                      {stockStatus.status === 'out-of-stock' && (
                        <div className="out-of-stock-overlay">
                          <span className="out-of-stock-text">Out of Stock</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="meesho-product-info">
                      <h3 className="meesho-product-title">
                        {product.name}
                      </h3>
                      
                      <div className="meesho-price-section">
                        <span className="meesho-price">₹{product.price?.toLocaleString()}</span>
                        <span className="meesho-delivery">Free Delivery</span>
                      </div>
                      
                      <div className="meesho-rating">
                        <span className="rating-badge">
                          <span className="rating-value">{(Math.random() * (4.9 - 3.5) + 3.5).toFixed(1)}</span>
                          <span className="rating-star">★</span>
                        </span>
                        <span className="review-count">{Math.floor(Math.random() * 5000) + 100} Reviews</span>
                      </div>
                      
                      <div className="meesho-actions">
                        <button
                          className={`add-to-cart-btn ${
                            stockStatus.status === 'out-of-stock' ? 'disabled' : ''
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (stockStatus.status !== 'out-of-stock') {
                              handleAddToCart(product._id, product.name);
                            }
                          }}
                          disabled={stockStatus.status === 'out-of-stock'}
                        >
                          {stockStatus.status === 'out-of-stock' ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                        <button
                          className="view-details-btn"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/product/${product._id}`);
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
          
          {displayProducts.length === 0 && !loading && (
            <div className="no-products">
              <div className="no-products-icon">{currentCategory.icon}</div>
              <h3>No products found in {currentCategory.title}</h3>
              <p>Try adjusting your filters or browse other categories</p>
              <Link to="/marketplace" className="browse-btn">
                Browse All Products
              </Link>
            </div>
          )}
        </main>
      </div>
      
      <FilterModal 
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApplyFilters={handleApplyFilters}
      />
    </div>
  );
};

export default CategoryExplorer;
