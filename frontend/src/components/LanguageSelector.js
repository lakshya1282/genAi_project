import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { FaLanguage, FaCheck } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { changeLanguage, getSupportedLanguages } from '../i18n';
import './CustomerComponents.css';

const LanguageSelector = () => {
  const { t, i18n } = useTranslation();
  const { user, userType } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState(user?.preferences?.language || 'en');
  const [loading, setLoading] = useState(false);

  const languages = getSupportedLanguages();

  const handleLanguageChange = async (languageCode) => {
    if (languageCode === selectedLanguage) return;

    setLoading(true);
    try {
      // Use the i18n changeLanguage function which handles everything
      const success = await changeLanguage(languageCode, true);
      
      if (success) {
        setSelectedLanguage(languageCode);
        toast.success(t('messages.languageUpdated'));
      } else {
        toast.error(t('messages.languageUpdateError'));
      }
    } catch (error) {
      toast.error(t('messages.languageUpdateError'));
    } finally {
      setLoading(false);
    }
  };

  if (userType !== 'customer') {
    return <div className="not-authorized"><p>This section is only available for customers.</p></div>;
  }

  return (
    <div className="language-selector">
      <div className="section-header">
        <h2><FaLanguage /> {t('language.title')}</h2>
        <p>{t('language.subtitle')}</p>
      </div>

      <div className="languages-grid">
        {languages.map(lang => (
          <div 
            key={lang.code}
            className={`language-option ${selectedLanguage === lang.code ? 'selected' : ''}`}
            onClick={() => handleLanguageChange(lang.code)}
          >
            <div className="language-info">
              <span className="language-name">{lang.name}</span>
              <span className="language-native">{lang.native}</span>
            </div>
            {selectedLanguage === lang.code && (
              <FaCheck className="selected-icon" />
            )}
          </div>
        ))}
      </div>
      
      {loading && <p>{t('common.loading')}</p>}
    </div>
  );
};

export default LanguageSelector;
