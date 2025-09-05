import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import WishlistToggle from '../components/WishlistToggle';
import FilterModal from '../components/FilterModal';
import './Marketplace.css';

const Marketplace = () => {
  const { t } = useTranslation();
  const { cartCount, userType, addToCart } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    page: 1,
    sortBy: '',
    priceRange: [0, 10000],
    availability: 'all',
    location: ''
  });

  const categories = [
    { key: 'all', label: t('marketplace.categories.all') },
    { key: 'pottery', label: t('marketplace.categories.pottery') },
    { key: 'weaving', label: t('marketplace.categories.weaving') },
    { key: 'jewelry', label: t('marketplace.categories.jewelry') },
    { key: 'woodwork', label: t('marketplace.categories.woodwork') },
    { key: 'metalwork', label: t('marketplace.categories.metalwork') },
    { key: 'textiles', label: t('marketplace.categories.textiles') },
    { key: 'paintings', label: t('marketplace.categories.paintings') },
    { key: 'sculptures', label: t('marketplace.categories.sculptures') }
  ];

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'All') params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      params.append('page', filters.page);
      params.append('limit', '12');

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

  const handleCategoryChange = (category) => {
    setFilters({ ...filters, category, page: 1 });
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

  const handleWishlistButtonClick = () => {
    if (userType === 'customer') {
      navigate('/customer/wishlist');
    } else {
      navigate('/customer/login');
    }
  };

  const handleShopNowClick = (category = '') => {
    if (category) {
      setFilters({ ...filters, category, page: 1 });
      // Scroll to products section
      setTimeout(() => {
        const productsSection = document.querySelector('.products-section');
        if (productsSection) {
          productsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      // General shop now - scroll to products
      const productsSection = document.querySelector('.products-section');
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSeeAllClick = () => {
    setFilters({ ...filters, category: '', page: 1 });
    const productsSection = document.querySelector('.products-section');
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleFilterTagClick = (filterType) => {
    let newFilters = { ...filters, page: 1 };
    
    switch (filterType) {
      case 'all':
        newFilters.sortBy = '';
        break;
      case 'best-sellers':
        newFilters.sortBy = 'popularity';
        break;
      case 'new-arrivals':
        newFilters.sortBy = 'newest';
        break;
      default:
        newFilters.sortBy = '';
    }
    
    setFilters(newFilters);
  };

  const handleAddToCart = async (productId, productName) => {
    if (userType !== 'customer') {
      toast.error('Please login as a customer to add items to cart');
      navigate('/customer/login');
      return;
    }

    const result = await addToCart(productId, 1);
    if (result.success) {
      toast.success(`${productName} added to cart!`);
    } else {
      toast.error(result.message || 'Failed to add item to cart');
      if (result.availableStock !== undefined) {
        toast.info(`Only ${result.availableStock} items available`);
      }
    }
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const applyProductFilters = (products) => {
    let filteredProducts = [...products];

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
            // Assuming newer products have higher IDs or creation dates
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

  // Sample products for demo
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
      name: 'Pashmina Shawl with Embroidery',
      description: 'Luxurious Kashmiri Pashmina shawl with delicate hand embroidery and traditional patterns',
      price: 2200,
      category: 'Textiles',
      images: ['https://via.placeholder.com/400x400/9370DB/FFFFFF?text=Pashmina+Shawl'],
      artisan: {
        name: 'Abdul Rashid',
        location: { city: 'Srinagar', state: 'Jammu & Kashmir' },
        craftType: 'Embroidery'
      },
      views: 134,
      likes: 45,
      stock: 6,
      isAvailable: true
    },
    {
      _id: 'sample10',
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
      _id: 'sample11',
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
    },
    {
      _id: 'sample12',
      name: 'Vintage Brass Antique Lamp',
      description: 'Antique-style brass oil lamp with intricate engravings, perfect for traditional home decor',
      price: 680,
      category: 'Metalwork',
      images: ['https://via.placeholder.com/400x400/CD853F/FFFFFF?text=Antique+Lamp'],
      artisan: {
        name: 'Suresh Thathera',
        location: { city: 'Amritsar', state: 'Punjab' },
        craftType: 'Metalwork'
      },
      views: 45,
      likes: 12,
      stock: 0,
      isAvailable: false
    },
    {
      _id: 'sample13',
      name: 'Handmade Paper Journal',
      description: 'Eco-friendly handmade paper journal with traditional binding and natural dyes',
      price: 320,
      category: 'Textiles',
      images: ['https://via.placeholder.com/400x400/DEB887/000000?text=Paper+Journal'],
      artisan: {
        name: 'Priya Papercraft',
        location: { city: 'Jaipur', state: 'Rajasthan' },
        craftType: 'Paper Making'
      },
      views: 52,
      likes: 15,
      stock: 1,
      isAvailable: true
    },
    {
      _id: 'sample14',
      name: 'Traditional Bandhani Dupatta',
      description: 'Vibrant Bandhani tie-dye dupatta with traditional patterns from Gujarat',
      price: 580,
      category: 'Textiles',
      images: ['https://via.placeholder.com/400x400/FF1493/FFFFFF?text=Bandhani+Dupatta'],
      artisan: {
        name: 'Kiran Bandhani',
        location: { city: 'Kutch', state: 'Gujarat' },
        craftType: 'Tie-Dye'
      },
      views: 89,
      likes: 26,
      stock: 0,
      isAvailable: false
    }
  ];

  const baseProducts = products.length > 0 ? products : sampleProducts;
  const displayProducts = applyProductFilters(baseProducts);

  // Function to get stock status
  const getStockStatus = (product) => {
    // If product doesn't have stock information, assume it's available
    if (product.stock === undefined && product.isAvailable === undefined) {
      return { status: 'in-stock', label: t('marketplace.inStock'), class: 'in-stock' };
    }
    
    // If explicitly set as unavailable or stock is 0
    if (product.isAvailable === false || product.stock === 0) {
      return { status: 'out-of-stock', label: t('marketplace.outOfStock'), class: 'out-of-stock' };
    }
    
    // If stock is defined, use it for classification
    if (product.stock !== undefined) {
      if (product.stock <= 2) {
        return { status: 'low-stock', label: t('marketplace.lowStock'), class: 'low-stock' };
      } else if (product.stock <= 5) {
        return { status: 'limited-stock', label: t('marketplace.stockLimited'), class: 'limited-stock' };
      }
    }
    
    // Default to in-stock for products without specific stock info
    return { status: 'in-stock', label: t('marketplace.inStock'), class: 'in-stock' };
  };

  if (loading && products.length === 0) {
    return <div className="loading">{t('marketplace.loading')}</div>;
  }

  return (
    <div className="marketplace">
      <div className="marketplace-container">
        {/* Top Header */}
        <header className="marketplace-header">
          <div className="header-content">
            <div className="search-container">
              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  placeholder="Search for handcrafted products..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="search-input"
                />
                <button type="submit" className="search-btn">
                  🔍
                </button>
              </form>
            </div>
            
            <div className="header-actions">
              <button className="filter-btn" onClick={handleFilterButtonClick}>
                <span className="filter-icon">⚙️</span>
              </button>
              <button className="cart-btn" onClick={handleCartButtonClick}>
                <span className="cart-icon">🛒</span>
                <span className="cart-count">{cartCount || 0}</span>
              </button>
              <button className="wishlist-btn" onClick={handleWishlistButtonClick}>
                <span className="wishlist-icon">❤️</span>
              </button>
            </div>
          </div>
        </header>

        <div className="marketplace-main">
          {/* Sidebar Navigation */}
          <aside className="marketplace-sidebar">
            <h3 className="sidebar-title">Categories</h3>
            <nav className="category-nav">
              {[
                { key: '', label: 'All Crafts', icon: '🎨' },
                { key: 'pottery', label: 'Pottery', icon: '🏺' },
                { key: 'jewelry', label: 'Jewelry', icon: '💍' },
                { key: 'textiles', label: 'Textiles', icon: '🧵' },
                { key: 'woodwork', label: 'Woodwork', icon: '🪵' },
                { key: 'metalwork', label: 'Metalwork', icon: '🔨' },
                { key: 'paintings', label: 'Paintings', icon: '🎨' },
                { key: 'sculptures', label: 'Sculptures', icon: '🗿' },
                { key: 'weaving', label: 'Weaving', icon: '🕸️' }
              ].map(category => (
                <button
                  key={category.key}
                  className={`category-nav-item ${filters.category === category.key ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(category.key)}
                >
                  <span className="category-icon">{category.icon}</span>
                  <span className="category-label">{category.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="marketplace-content">
            {/* Hero Banners */}
            <section className="hero-section">
              <div className="hero-banner main-banner">
                <div className="banner-content">
                  <h2>HANDCRAFTED TREASURES!</h2>
                  <p>Authentic artisan crafts<br/>with cultural heritage</p>
                  <button className="banner-btn" onClick={() => handleShopNowClick()}>Shop Now</button>
                </div>
                <div className="banner-image">
                  <img src="https://images.unsplash.com/photo-1528301721190-dd618d04c6ff?w=400&h=300&fit=crop" alt="Handcrafted pottery" />
                </div>
              </div>
              
              <div className="hero-banner side-banner">
                <div className="banner-content">
                  <span className="discount-badge">Get up to 30%</span>
                  <h3>OFF Traditional Jewelry</h3>
                  <button className="banner-btn-small" onClick={() => handleShopNowClick('jewelry')}>Shop now</button>
                </div>
                <div className="banner-image-small">
                  <img src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=150&fit=crop" alt="Traditional jewelry" />
                </div>
              </div>
              
              <div className="hero-banner side-banner bottom">
                <div className="banner-content">
                  <span className="promo-text">Handwoven Textiles</span>
                  <h3>Premium Collection</h3>
                  <button className="banner-btn-small" onClick={() => handleShopNowClick('textiles')}>Shop now</button>
                </div>
                <div className="banner-image-small">
                  <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&h=150&fit=crop" alt="Handwoven textiles" />
                </div>
              </div>
            </section>

            {/* Popular Categories */}
            <section className="categories-showcase">
              <div className="section-header">
                <h3>Explore popular categories</h3>
                <button className="see-all-btn" onClick={handleSeeAllClick}>See all →</button>
              </div>
              
              <div className="categories-grid">
                {[
                  { 
                    name: 'Handmade Pottery', 
                    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=150&fit=crop',
                    badge: '50+ Items',
                    category: 'pottery'
                  },
                  { 
                    name: 'Traditional Jewelry', 
                    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=150&fit=crop',
                    badge: 'New',
                    category: 'jewelry'
                  },
                  { 
                    name: 'Textile Arts', 
                    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&h=150&fit=crop',
                    category: 'textiles'
                  },
                  { 
                    name: 'Wood Crafts', 
                    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=150&fit=crop',
                    category: 'woodwork'
                  }
                ].map((cat, index) => (
                  <Link 
                    key={index} 
                    to={`/category/${cat.category}`} 
                    className="category-card-link"
                  >
                    <div className="category-card">
                      <div className="category-image">
                        <img src={cat.image} alt={cat.name} />
                        {cat.badge && <span className={`category-badge ${cat.badge === 'New' ? 'new' : 'count'}`}>{cat.badge}</span>}
                      </div>
                      <h4 className="category-name">{cat.name}</h4>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Products Section */}
            <section className="products-section">
              <div className="section-header">
                <h3>Featured Products</h3>
                <div className="filter-options">
                  <button 
                    className={`filter-tag ${filters.sortBy === '' ? 'active' : ''}`} 
                    onClick={() => handleFilterTagClick('all')}
                  >
                    All
                  </button>
                  <button 
                    className={`filter-tag ${filters.sortBy === 'popularity' ? 'active' : ''}`} 
                    onClick={() => handleFilterTagClick('best-sellers')}
                  >
                    Best Sellers
                  </button>
                  <button 
                    className={`filter-tag ${filters.sortBy === 'newest' ? 'active' : ''}`} 
                    onClick={() => handleFilterTagClick('new-arrivals')}
                  >
                    New Arrivals
                  </button>
                </div>
              </div>
              
              <div className="products-grid">
                {displayProducts.map(product => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <div key={product._id} className={`product-card modern ${stockStatus.class}`}>
                <div className="product-image">
                  <img 
                    src={product.images?.[0] || 'https://via.placeholder.com/250x200?text=Product+Image&bg=f8f9fa&color=666'} 
                    alt={product.name} 
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/250x200?text=No+Image&bg=f8f9fa&color=666';
                    }}
                  />
                  <WishlistToggle productId={product._id} className="product-wishlist" />
                  
                  {/* Stock Status Badge - Only show if stock info is available */}
                  {(product.stock !== undefined || product.isAvailable !== undefined) && (
                    <div className={`stock-badge ${stockStatus.class}`}>
                      {stockStatus.label}
                    </div>
                  )}
                  
                  {/* Out of Stock Overlay */}
                  {stockStatus.status === 'out-of-stock' && (
                    <div className="out-of-stock-overlay">
                      <span className="out-of-stock-text">{t('marketplace.outOfStock')}</span>
                    </div>
                  )}
                  
                  <div className="product-overlay">
                    <div className="product-overlay-buttons">
                      <button
                        className={`btn btn-sm ${
                          stockStatus.status === 'out-of-stock' 
                            ? 'btn-secondary disabled' 
                            : 'btn-primary'
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
                      <Link 
                        to={`/product/${product._id}`} 
                        className={`btn btn-sm btn-outline ${
                          stockStatus.status === 'out-of-stock' 
                            ? 'disabled' 
                            : ''
                        }`}
                        onClick={(e) => {
                          if (stockStatus.status === 'out-of-stock') {
                            e.preventDefault();
                          }
                        }}
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
                
                <div className="product-info">
                  <div>
                    <h3 className={`product-name ${
                      stockStatus.status === 'out-of-stock' ? 'out-of-stock-text' : ''
                    }`}>
                      {product.name}
                    </h3>
                    <p className="product-description">
                      {product.description?.substring(0, 150)}...
                    </p>
                    
                    <div className="product-meta">
                      <span className="product-category">{product.category}</span>
                      <span className={`product-price ${
                        stockStatus.status === 'out-of-stock' ? 'out-of-stock-price' : ''
                      }`}>
                        ₹{product.price?.toLocaleString()}
                      </span>
                    </div>
                    
                    {/* Stock Information - Only show if stock info is available */}
                    {(product.stock !== undefined || product.isAvailable !== undefined) && (
                      <div className="stock-info">
                        <span className={`stock-status ${stockStatus.class}`}>
                          {stockStatus.label}
                          {product.stock !== undefined && product.stock > 0 && stockStatus.status !== 'in-stock' && (
                            <span className="stock-count"> ({product.stock} left)</span>
                          )}
                        </span>
                      </div>
                    )}
                    
                    <div className="artisan-info">
                      <Link to={`/artisan/${product.artisan?._id || 'sample'}/profile`} className="artisan-link">
                        👤 {t('marketplace.by')} {product.artisan?.name}
                      </Link>
                      <span className="artisan-location">
                        📍 {product.artisan?.location?.city}, {product.artisan?.location?.state}
                      </span>
                    </div>
                  </div>
                  
                  <div className="product-stats">
                    <span>👁️ {product.views} {t('marketplace.views')}</span>
                    <span>❤️ {product.likes} {t('marketplace.likes')}</span>
                  </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              
              {displayProducts.length === 0 && !loading && (
                <div className="no-products">
                  <div className="no-products-icon">🎨</div>
                  <h3>No handcrafted products found</h3>
                  <p>Try adjusting your search or browse our categories</p>
                  <button className="browse-btn" onClick={() => setFilters({...filters, category: '', search: ''})}>
                    Browse All Products
                  </button>
                </div>
              )}
            </section>
          </main>
        </div>
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

export default Marketplace;
