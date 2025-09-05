import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './locales/en.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import gu from './locales/gu.json';

// Translation resources
const resources = {
  en: { translation: en },
  hi: { translation: hi },
  bn: { translation: bn },
  ta: { translation: ta },
  te: { translation: te },
  gu: { translation: gu },
  // Add more languages as needed
  mr: { translation: en }, // Fallback to English for now
  kn: { translation: en }, // Fallback to English for now
  ml: { translation: en }, // Fallback to English for now
  or: { translation: en }, // Fallback to English for now
  pa: { translation: en }, // Fallback to English for now
  as: { translation: en }, // Fallback to English for now
};

// Language detection options
const detection = {
  // Order of language detection methods
  order: ['localStorage', 'navigator', 'htmlTag'],
  
  // Cache user language in localStorage
  caches: ['localStorage'],
  
  // Check all available languages
  checkWhitelist: true,
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    
    // Default language
    fallbackLng: 'en',
    
    // Supported languages
    supportedLngs: ['en', 'hi', 'bn', 'ta', 'te', 'gu', 'mr', 'kn', 'ml', 'or', 'pa', 'as'],
    
    // Detection options
    detection,
    
    // Debug mode (set to false in production)
    debug: process.env.NODE_ENV === 'development',
    
    // Interpolation options
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    // React options
    react: {
      useSuspense: false, // Disable suspense for now
    },
    
    // Namespace options
    ns: ['translation'],
    defaultNS: 'translation',
    
    // Key separator
    keySeparator: '.',
    
    // Namespace separator
    nsSeparator: ':',
    
    // Return objects instead of empty strings for missing keys
    returnEmptyString: false,
    returnNull: false,
    returnObjects: true,
    
    // Load missing keys
    saveMissing: process.env.NODE_ENV === 'development',
    
    // Missing key handler for development
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Missing translation: ${lng}:${ns}:${key}`);
      }
    },
  });

// Function to change language and sync with user preferences
export const changeLanguage = async (languageCode, updateUserPreference = true) => {
  try {
    // Change i18n language
    await i18n.changeLanguage(languageCode);
    
    // Store in localStorage
    localStorage.setItem('i18nextLng', languageCode);
    
    // Update user preference if requested and user is logged in
    if (updateUserPreference) {
      const user = JSON.parse(localStorage.getItem('customer_user') || '{}');
      if (user && user.id) {
        try {
          const response = await fetch('/api/customer/language', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('customer_token')}`
            },
            body: JSON.stringify({ language: languageCode })
          });
          
          if (response.ok) {
            const updatedUser = { 
              ...user, 
              preferences: { 
                ...user.preferences, 
                language: languageCode 
              } 
            };
            localStorage.setItem('customer_user', JSON.stringify(updatedUser));
          }
        } catch (error) {
          console.warn('Failed to update user language preference:', error);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to change language:', error);
    return false;
  }
};

// Function to get current language
export const getCurrentLanguage = () => {
  return i18n.language || 'en';
};

// Function to get supported languages with their native names
export const getSupportedLanguages = () => {
  return [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिंदी' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
    { code: 'mr', name: 'Marathi', native: 'मराठी' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
    { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
    { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
    { code: 'as', name: 'Assamese', native: 'অসমীয়া' }
  ];
};

// Initialize language from user preference if logged in
const initializeLanguage = () => {
  try {
    const user = JSON.parse(localStorage.getItem('customer_user') || '{}');
    const userLanguage = user?.preferences?.language;
    
    if (userLanguage && userLanguage !== getCurrentLanguage()) {
      changeLanguage(userLanguage, false); // Don't update server preference during init
    }
  } catch (error) {
    console.warn('Failed to initialize language from user preference:', error);
  }
};

// Initialize language on app start
if (typeof window !== 'undefined') {
  initializeLanguage();
}

export default i18n;
