import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
  const { t } = useTranslation();
  const { isAuthenticated, userType } = useAuth();

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                {t('home.hero.title')}
              </h1>
              <p className="hero-subtitle">
                {t('home.hero.subtitle')}
              </p>
              <div className="hero-actions">
                {isAuthenticated ? (
                  <>
                    {userType === 'customer' ? (
                      <Link to="/marketplace" className="btn btn-primary btn-lg">
                        {t('home.hero.goToShop')}
                      </Link>
                    ) : (
                      <Link to="/dashboard" className="btn btn-primary btn-lg">
                        {t('home.hero.goToDashboard')}
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link to="/register" className="btn btn-primary btn-lg">
                      {t('home.hero.joinAsArtisan')}
                    </Link>
                    <Link to="/marketplace" className="btn btn-secondary btn-lg">
                      {t('home.hero.exploreMarketplace')}
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="hero-image">
              <div className="hero-graphic">
                <span className="craft-emoji">🕊</span>
                <span className="craft-emoji">🪩</span>
                <span className="craft-emoji">👑</span>
                <span className="craft-emoji">🚕</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title text-center">{t('home.features.title')}</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📜</div>
              <h3>{t('home.features.heritageStorytelling')}</h3>
              <p>{t('home.features.heritageStorytellingDesc')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🕉</div>
              <h3>{t('home.features.spiritualCraftNarratives')}</h3>
              <p>{t('home.features.spiritualCraftNarrativesDesc')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏰</div>
              <h3>{t('home.features.culturalDigitalPresence')}</h3>
              <p>{t('home.features.culturalDigitalPresenceDesc')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌅</div>
              <h3>{t('home.features.festivalMarketIntelligence')}</h3>
              <p>{t('home.features.festivalMarketIntelligenceDesc')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🕰</div>
              <h3>{t('home.features.heritageBasedTargeting')}</h3>
              <p>{t('home.features.heritageBasedTargetingDesc')}</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌍</div>
              <h3>{t('home.features.glocalHeritageReach')}</h3>
              <p>{t('home.features.glocalHeritageReachDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">500+</div>
              <div className="stat-label">{t('home.stats.karigarsEmpowered')}</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">2000+</div>
              <div className="stat-label">{t('home.stats.productsListed')}</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">50+</div>
              <div className="stat-label">{t('home.stats.craftCategories')}</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">95%</div>
              <div className="stat-label">{t('home.stats.satisfactionRate')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2>{t('home.cta.title')}</h2>
            <p>{t('home.cta.subtitle')}</p>
            {!isAuthenticated && (
              <Link to="/register" className="btn btn-primary btn-lg">
                {t('home.cta.getStartedToday')}
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
