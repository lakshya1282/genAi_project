import React from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage, getSupportedLanguages } from '../i18n';

const LanguageDemo = () => {
  const { t } = useTranslation();
  const currentLanguage = getCurrentLanguage();
  const languages = getSupportedLanguages();

  const handleLanguageChange = async (languageCode) => {
    await changeLanguage(languageCode, false); // Don't update user preference for demo
  };

  return (
    <div style={{ 
      padding: '20px', 
      margin: '20px', 
      border: '2px solid #ddd', 
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h2>{t('language.title')}</h2>
      <p>{t('language.subtitle')}</p>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Current Language: </strong>
        {languages.find(lang => lang.code === currentLanguage)?.native || currentLanguage}
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Quick Language Switcher:</strong>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
          {languages.slice(0, 6).map(language => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: currentLanguage === language.code ? '#007bff' : '#fff',
                color: currentLanguage === language.code ? '#fff' : '#333',
                cursor: 'pointer'
              }}
            >
              {language.native}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>{t('navbar.home')} | {t('navbar.marketplace')} | {t('navbar.cart')}</h3>
        <p><strong>{t('customerSettings.profile')}:</strong> {t('profile.personalInfo')}</p>
        <p><strong>{t('customerSettings.orders')}:</strong> {t('orders.title')}</p>
        <p><strong>{t('customerSettings.wishlist')}:</strong> {t('wishlist.title')}</p>
      </div>

      <div>
        <h4>Sample Messages:</h4>
        <ul>
          <li>{t('common.loading')}</li>
          <li>{t('common.success')}</li>
          <li>{t('messages.languageUpdated')}</li>
        </ul>
      </div>
    </div>
  );
};

export default LanguageDemo;
