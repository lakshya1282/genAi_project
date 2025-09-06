import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import OTPVerification from '../components/OTPVerification';
import GoogleAuthButton from '../components/GoogleAuthButton';
import './Auth.css';

const CustomerRegister = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [expiresIn, setExpiresIn] = useState(10);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error(t('auth.passwordsNoMatch'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone
        })
      });

      const data = await response.json();

      if (data.success) {
        setVerificationEmail(data.email);
        setExpiresIn(data.expiresIn || 10);
        setShowOTPVerification(true);
        toast.success('Verification code sent! Please check your email.');
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = async (data) => {
    if (data.token) {
      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('userType', 'user');
      
      if (data.user) {
        localStorage.setItem('userData', JSON.stringify(data.user));
      }

      // Update auth context if needed
      if (login) {
        await login(data.user, data.token, 'user');
      }

      toast.success('Account verified successfully! Welcome to ArtisanAI!');
      navigate('/marketplace');
    }
  };

  const handleBackToRegistration = () => {
    setShowOTPVerification(false);
    setVerificationEmail('');
  };

  // Show OTP verification if needed
  if (showOTPVerification) {
    return (
      <OTPVerification
        email={verificationEmail}
        userType="user"
        onVerificationSuccess={handleVerificationSuccess}
        onBack={handleBackToRegistration}
        expiresIn={expiresIn}
      />
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{t('auth.customerRegister')}</h2>
          <p>{t('auth.customerRegisterDesc')}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Google OAuth Button */}
          <GoogleAuthButton 
            text={t('auth.signUpWithGoogle') || "Sign up with Google"} 
            userType="user"
            disabled={loading}
          />
          
          <div className="auth-divider">or</div>
          
          <div className="form-group">
            <label htmlFor="name">{t('auth.name')}</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder={t('auth.fullNamePlaceholder')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder={t('auth.emailPlaceholder')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">{t('auth.phone')}</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder={t('auth.phonePlaceholder')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder={t('auth.createPasswordPlaceholder')}
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder={t('auth.confirmPasswordPlaceholder')}
              minLength="6"
            />
          </div>

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                {t('auth.creatingAccount')}
              </>
            ) : (
              t('auth.createAccount')
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {t('auth.hasAccount')} 
            <Link to="/customer/login"> {t('auth.signIn')}</Link>
          </p>
          <p>
            {t('auth.wantToSell')} 
            <Link to="/register"> {t('auth.joinAsArtisan')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerRegister;
