import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import OTPVerification from '../components/OTPVerification';
import GoogleAuthButton from '../components/GoogleAuthButton';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    craftType: '',
    city: '',
    state: '',
    bio: ''
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
    setLoading(true);

    const userData = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      phone: formData.phone,
      craftType: formData.craftType,
      bio: formData.bio,
      location: {
        city: formData.city,
        state: formData.state,
        country: 'India'
      }
    };

    try {
      const response = await fetch('/api/artisans/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
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
      // Store token and artisan data
      localStorage.setItem('token', data.token);
      localStorage.setItem('userType', 'artisan');
      
      if (data.artisan) {
        localStorage.setItem('userData', JSON.stringify(data.artisan));
      }

      // Update auth context if needed
      if (login) {
        await login(data.artisan, data.token, 'artisan');
      }

      toast.success('Account verified successfully! Welcome to ArtisanAI!');
      navigate('/dashboard');
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
        userType="artisan"
        onVerificationSuccess={handleVerificationSuccess}
        onBack={handleBackToRegistration}
        expiresIn={expiresIn}
      />
    );
  }

  return (
    <div className="auth-page">
      <div className="container">
        <div className="auth-container">
          <div className="auth-card register-card">
            <div className="auth-header">
              <h2>Join ArtisanAI Community</h2>
              <p>Empower your craft with AI-driven marketing and storytelling</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {/* Google OAuth Button */}
              <GoogleAuthButton 
                text="Sign up with Google" 
                userType="artisan"
                disabled={loading}
              />
              
              <div className="auth-divider">or</div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    className="form-input"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    name="password"
                    className="form-input"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength="6"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    className="form-input"
                    placeholder="Your phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Craft Specialization</label>
                <select
                  name="craftType"
                  className="form-input"
                  value={formData.craftType}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select your craft</option>
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
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    name="city"
                    className="form-input"
                    placeholder="Your city"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    name="state"
                    className="form-input"
                    placeholder="Your state"
                    value={formData.state}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tell us about your craft</label>
                <textarea
                  name="bio"
                  className="form-input form-textarea"
                  placeholder="Share your passion for your craft, experience, and what makes your work unique..."
                  value={formData.bio}
                  onChange={handleChange}
                  rows="4"
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary auth-btn"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Join ArtisanAI'}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                Already have an account? 
                <Link to="/login" className="auth-link"> Login here</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
