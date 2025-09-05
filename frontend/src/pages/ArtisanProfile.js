import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const ArtisanProfile = () => {
  const { id } = useParams();
  const [artisan, setArtisan] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchArtisanProfile();
      fetchArtisanProducts();
    }
  }, [id]);

  const fetchArtisanProfile = async () => {
    try {
      const response = await axios.get(`/api/artisans/${id}`);
      setArtisan(response.data);
    } catch (error) {
      console.error('Error fetching artisan profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArtisanProducts = async () => {
    try {
      const response = await axios.get(`/api/products?artisan=${id}&limit=6`);
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error fetching artisan products:', error);
    }
  };

  if (loading) {
    return (
      <div className="artisan-profile">
        <div className="container">
          <div className="loading">
            <h2>Loading artisan profile...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (!artisan) {
    return (
      <div className="artisan-profile">
        <div className="container">
          <div className="error">
            <h2>Artisan Not Found</h2>
            <p>The artisan profile you're looking for doesn't exist.</p>
            <Link to="/marketplace" className="btn btn-primary">
              Back to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="artisan-profile">
      <div className="container">
        <div className="profile-header">
          <div className="profile-image">
            {artisan.profileImage ? (
              <img src={artisan.profileImage} alt={artisan.name} />
            ) : (
              <div className="default-profile-image">
                {artisan.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="profile-info">
            <h1>{artisan.name}</h1>
            <span className="craft-badge">{artisan.craftType}</span>
            
            <div className="profile-meta">
              {artisan.location && (
                <div className="meta-item">
                  <span>📍</span>
                  <span>{artisan.location}</span>
                </div>
              )}
              {artisan.experience && (
                <div className="meta-item">
                  <span>🎨</span>
                  <span>{artisan.experience} years experience</span>
                </div>
              )}
              {artisan.rating && (
                <div className="meta-item">
                  <span>⭐</span>
                  <span>{artisan.rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            <div className="stats-row">
              <div className="stat">
                <span className="stat-number">{products.length}</span>
                <span className="stat-label">Products</span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-content">
          <div className="main-content">
            <div className="content-tabs">
              <button className="tab-button active">Products</button>
            </div>
            
            <div className="tab-content">
              <div className="products-grid">
                {products.length === 0 ? (
                  <p>No products available</p>
                ) : (
                  products.map(product => (
                    <div key={product.id || product._id} className="product-card">
                      <Link to={`/product/${product.id || product._id}`}>
                        <div className="product-image">
                          {product.images && product.images[0] ? (
                            <img src={product.images[0]} alt={product.name} />
                          ) : (
                            <div className="no-image">No Image</div>
                          )}
                        </div>
                        <div className="product-info">
                          <h3>{product.name}</h3>
                          <p className="product-price">₹{product.price}</p>
                        </div>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="sidebar">
            {artisan.bio && (
              <div className="sidebar-section bio-section">
                <h3>📖 About</h3>
                <p>{artisan.bio}</p>
              </div>
            )}
            
            {artisan.story && (
              <div className="sidebar-section story-section">
                <h3>📚 Story</h3>
                <p>{artisan.story}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtisanProfile;
