import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { 
  FaUser, FaMapMarkerAlt, FaPhone, FaEnvelope, FaGlobe, 
  FaInstagram, FaFacebook, FaStar, FaAward, FaHistory,
  FaHeart, FaShare, FaEye, FaCalendarAlt
} from 'react-icons/fa';
import ProductCard from './ProductCard';
import './ArtisanProfileView.css';

const ArtisanProfileView = () => {
  const { artisanId } = useParams();
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [stats, setStats] = useState({
    followers: 0,
    products: 0,
    views: 0,
    joinedDate: null
  });

  useEffect(() => {
    fetchProfile();
    fetchProducts();
    fetchStats();
  }, [artisanId]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`/api/artisan/profile/${artisanId}`);
      if (response.data.success) {
        setProfile(response.data.profile);
        setFollowing(response.data.isFollowing || false);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Don't set sample data - let it remain null to show "profile not found"
    }
    setLoading(false);
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`/api/artisan/${artisanId}/products`);
      if (response.data.success) {
        setProducts(response.data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      // Don't set sample data - let products remain empty
    }
    setProductsLoading(false);
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`/api/artisan/${artisanId}/stats`);
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Don't set sample data - use default empty stats
    }
  };

  const handleFollow = async () => {
    try {
      const response = await axios.post(`/api/artisan/${artisanId}/follow`);
      if (response.data.success) {
        setFollowing(!following);
        setStats(prev => ({
          ...prev,
          followers: following ? prev.followers - 1 : prev.followers + 1
        }));
      }
    } catch (error) {
      console.error('Error following artisan:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.displayName} - ${t('artisanProfile.artisanProfile')}`,
          text: profile?.bio || '',
          url: window.location.href
        });
      } catch (error) {
        console.log('Sharing failed:', error);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      // You could show a toast notification here
    }
  };

  if (loading) {
    return (
      <div className="artisan-profile-view">
        <div className="loading">{t('artisanProfile.loading')}</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="artisan-profile-view">
        <div className="profile-not-found">
          <div className="not-found-content">
            <h2>👨‍🎨 Profile Not Found</h2>
            <p>This artisan hasn't created their public profile yet.</p>
            <p>If you're this artisan, you can create your public profile from your dashboard.</p>
            <div className="not-found-actions">
              <button onClick={() => window.history.back()} className="btn btn-secondary">
                ← Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="artisan-profile-view">
      <div className="profile-header">
        <div className="cover-photo-container">
          <div 
            className="cover-photo" 
            style={{
              backgroundImage: profile.coverPhoto 
                ? `url(${profile.coverPhoto})` 
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          >
            <div className="cover-overlay">
              <div className="profile-actions">
                <button 
                  className={`btn ${following ? 'btn-following' : 'btn-follow'}`}
                  onClick={handleFollow}
                >
                  <FaHeart /> 
                  {following ? t('artisanProfile.following') : t('artisanProfile.follow')}
                </button>
                <button className="btn btn-share" onClick={handleShare}>
                  <FaShare />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-info-header">
          <div className="profile-photo-container">
            <div className="profile-photo">
              {profile.profilePhoto ? (
                <img src={profile.profilePhoto} alt={profile.displayName} />
              ) : (
                <FaUser />
              )}
            </div>
          </div>

          <div className="profile-basic-info">
            <h1 className="profile-name">{profile.displayName || t('artisanProfile.unnamed')}</h1>
            
            <div className="profile-meta">
              {profile.specialization && (
                <span className="specialization">
                  <FaAward /> {profile.specialization}
                </span>
              )}
              {profile.experience && (
                <span className="experience">
                  <FaHistory /> {profile.experience}
                </span>
              )}
              {profile.location && profile.location.city && (
                <span className="location">
                  <FaMapMarkerAlt /> {profile.location.city}{profile.location.state ? `, ${profile.location.state}` : ''}
                </span>
              )}
            </div>

            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-number">{stats.followers}</span>
                <span className="stat-label">{t('artisanProfile.followers')}</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.products}</span>
                <span className="stat-label">{t('artisanProfile.products')}</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.views}</span>
                <span className="stat-label">{t('artisanProfile.profileViews')}</span>
              </div>
              {stats.joinedDate && (
                <div className="stat-item">
                  <span className="stat-icon"><FaCalendarAlt /></span>
                  <span className="stat-label">{t('artisanProfile.joinedDate', { date: new Date(stats.joinedDate).getFullYear() })}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="profile-content">
        {profile.bio && (
          <div className="profile-section">
            <h3>{t('artisanProfile.about')}</h3>
            <p className="bio-text">{profile.bio}</p>
          </div>
        )}

        {profile.story && (
          <div className="profile-section">
            <h3>{t('artisanProfile.story')}</h3>
            <div className="story-text">
              <p>{profile.story}</p>
            </div>
          </div>
        )}

        <div className="profile-section">
          <h3>{t('artisanProfile.contact')}</h3>
          <div className="contact-display">
            {profile.contact?.phone && (
              <div className="contact-item">
                <FaPhone /> 
                <a href={`tel:${profile.contact.phone}`}>{profile.contact.phone}</a>
              </div>
            )}
            {profile.contact?.email && (
              <div className="contact-item">
                <FaEnvelope /> 
                <a href={`mailto:${profile.contact.email}`}>{profile.contact.email}</a>
              </div>
            )}
            {profile.contact?.website && (
              <div className="contact-item">
                <FaGlobe /> 
                <a href={profile.contact.website} target="_blank" rel="noopener noreferrer">
                  {t('artisanProfile.website')}
                </a>
              </div>
            )}
            {profile.contact?.instagram && (
              <div className="contact-item">
                <FaInstagram /> 
                <a href={`https://instagram.com/${profile.contact.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
                  @{profile.contact.instagram.replace('@', '')}
                </a>
              </div>
            )}
            {profile.contact?.facebook && (
              <div className="contact-item">
                <FaFacebook /> 
                <a href={profile.contact.facebook} target="_blank" rel="noopener noreferrer">
                  {t('artisanProfile.facebookPage')}
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="profile-section">
          <h3>{t('artisanProfile.products')} ({stats.products})</h3>
          {productsLoading ? (
            <div className="products-loading">{t('artisanProfile.loadingProducts')}</div>
          ) : products.length > 0 ? (
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard 
                  key={product._id} 
                  product={product} 
                  showArtisan={false}
                />
              ))}
            </div>
          ) : (
            <div className="no-products">
              <p>{t('artisanProfile.noProductsYet')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtisanProfileView;
