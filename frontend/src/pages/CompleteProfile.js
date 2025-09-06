import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Auth.css';

const CompleteProfile = () => {
  const [formData, setFormData] = useState({
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    }
  });
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated and from Google OAuth
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/customer/login');
      return;
    }

    // Fetch current user profile
    fetchUserProfile();
  }, [navigate]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/google/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const { user } = await response.json();
        setUserProfile(user);
        
        // Check if profile is already complete
        if (user.phone && user.phone !== '') {
          toast.info('Your profile is already complete!');
          navigate(user.userType === 'artisan' ? '/dashboard' : '/marketplace');
        }
      } else {
        throw new Error('Failed to fetch user profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile information');
      navigate('/customer/login');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/google/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phone: formData.phone,
          addresses: formData.address.street ? [{
            type: 'home',
            street: formData.address.street,
            city: formData.address.city,
            state: formData.address.state,
            country: formData.address.country,
            pincode: formData.address.pincode,
            isDefault: true
          }] : []
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Profile completed successfully!');
        
        // Redirect based on user type or default to marketplace
        const userType = data.user?.userType || userProfile?.userType || 'user';
        navigate(userType === 'artisan' ? '/dashboard' : '/marketplace');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete profile');
      }
    } catch (error) {
      console.error('Error completing profile:', error);
      toast.error(error.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="auth-page">
        <div className="container">
          <div className="auth-container">
            <div className="auth-card">
              <div className="oauth-loading">
                <div className="oauth-spinner"></div>
                <h3>Loading profile...</h3>
                <p>Please wait while we load your information</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="container">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h2>Complete Your Profile</h2>
              <p>Hi {userProfile.name}! Please provide some additional information to complete your account setup.</p>
              
              {userProfile.picture && (
                <div style={{ margin: '20px 0', textAlign: 'center' }}>
                  <img 
                    src={userProfile.picture} 
                    alt={userProfile.name}
                    style={{ 
                      width: '80px', 
                      height: '80px', 
                      borderRadius: '50%',
                      border: '3px solid #4285f4'
                    }} 
                  />
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-input"
                  placeholder="+1234567890"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Street Address (Optional)</label>
                <input
                  type="text"
                  name="address.street"
                  className="form-input"
                  placeholder="123 Main Street"
                  value={formData.address.street}
                  onChange={handleChange}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    name="address.city"
                    className="form-input"
                    placeholder="New York"
                    value={formData.address.city}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    name="address.state"
                    className="form-input"
                    placeholder="NY"
                    value={formData.address.state}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">PIN Code</label>
                  <input
                    type="text"
                    name="address.pincode"
                    className="form-input"
                    placeholder="10001"
                    value={formData.address.pincode}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <select
                    name="address.country"
                    className="form-input"
                    value={formData.address.country}
                    onChange={handleChange}
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary auth-btn"
                disabled={loading}
              >
                {loading ? 'Completing Profile...' : 'Complete Profile'}
              </button>
            </form>

            <div className="auth-footer">
              <p style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                <strong>Note:</strong> Phone number is required to complete your account setup. 
                Address information is optional but helps us provide better service.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
