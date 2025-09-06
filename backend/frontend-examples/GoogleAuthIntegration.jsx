/**
 * Google OAuth Frontend Integration Examples
 * 
 * These examples show how to integrate Google OAuth with your React frontend
 */

import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Example 1: Google Login Button Component
export const GoogleLoginButton = ({ onSuccess, onError, disabled = false }) => {
  const handleGoogleLogin = () => {
    if (disabled) return;
    
    // Redirect to backend Google OAuth endpoint
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  return (
    <button 
      onClick={handleGoogleLogin}
      disabled={disabled}
      className="google-oauth-button"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 20px',
        border: '1px solid #dadce0',
        borderRadius: '4px',
        backgroundColor: '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        color: '#3c4043',
        transition: 'background-color 0.2s',
        opacity: disabled ? 0.6 : 1
      }}
      onMouseEnter={(e) => !disabled && (e.target.style.backgroundColor = '#f8f9fa')}
      onMouseLeave={(e) => (e.target.style.backgroundColor = '#fff')}
    >
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    </button>
  );
};

// Example 2: OAuth Callback Handler Hook
export const useOAuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(location.search);
      const token = urlParams.get('token');
      const provider = urlParams.get('provider');
      const error = urlParams.get('error');

      if (error) {
        setError(getErrorMessage(error));
        return;
      }

      if (token && provider === 'google') {
        setLoading(true);
        
        try {
          // Store token
          localStorage.setItem('authToken', token);
          
          // Fetch user profile to check if complete
          const response = await fetch('/api/auth/google/profile', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const { user } = await response.json();
            
            // Check if profile needs completion
            if (!user.phone || user.phone === '') {
              navigate('/complete-profile');
            } else {
              navigate('/dashboard');
            }
          } else {
            throw new Error('Failed to fetch user profile');
          }
          
        } catch (err) {
          setError('Authentication failed. Please try again.');
          localStorage.removeItem('authToken');
        } finally {
          setLoading(false);
        }
      }
    };

    handleOAuthCallback();
  }, [location, navigate]);

  const getErrorMessage = (errorCode) => {
    const errorMessages = {
      'google_auth_failed': 'Google authentication failed. Please try again.',
      'oauth_not_configured': 'Google OAuth is not properly configured.',
      'auth_callback_failed': 'Authentication callback failed. Please try again.'
    };
    
    return errorMessages[errorCode] || 'An authentication error occurred.';
  };

  return { loading, error };
};

// Example 3: Complete Profile Component
export const CompleteProfileForm = () => {
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch('/api/auth/google/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phone,
          addresses: [{
            ...address,
            type: 'home',
            isDefault: true
          }]
        })
      });

      if (response.ok) {
        navigate('/dashboard');
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to complete profile');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="complete-profile-form">
      <h2>Complete Your Profile</h2>
      <p>Please provide some additional information to complete your account setup.</p>
      
      <div className="form-group">
        <label htmlFor="phone">Phone Number *</label>
        <input
          type="tel"
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="+1234567890"
        />
      </div>

      <div className="form-group">
        <label htmlFor="street">Street Address</label>
        <input
          type="text"
          id="street"
          value={address.street}
          onChange={(e) => setAddress({...address, street: e.target.value})}
          placeholder="123 Main Street"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="city">City</label>
          <input
            type="text"
            id="city"
            value={address.city}
            onChange={(e) => setAddress({...address, city: e.target.value})}
            placeholder="New York"
          />
        </div>
        <div className="form-group">
          <label htmlFor="state">State</label>
          <input
            type="text"
            id="state"
            value={address.state}
            onChange={(e) => setAddress({...address, state: e.target.value})}
            placeholder="NY"
          />
        </div>
        <div className="form-group">
          <label htmlFor="pincode">PIN Code</label>
          <input
            type="text"
            id="pincode"
            value={address.pincode}
            onChange={(e) => setAddress({...address, pincode: e.target.value})}
            placeholder="10001"
          />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <button type="submit" disabled={loading || !phone}>
        {loading ? 'Completing...' : 'Complete Profile'}
      </button>
    </form>
  );
};

// Example 4: User Profile Component with Google OAuth Info
export const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlinkLoading, setUnlinkLoading] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/google/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkGoogle = async () => {
    const password = prompt('Enter a new password to unlink your Google account:');
    if (!password) return;

    setUnlinkLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/google/unlink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        alert('Google account unlinked successfully!');
        fetchUserProfile(); // Refresh profile
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to unlink Google account');
      }
    } catch (error) {
      alert('Error unlinking Google account');
    } finally {
      setUnlinkLoading(false);
    }
  };

  if (loading) return <div>Loading profile...</div>;
  if (!user) return <div>Profile not found</div>;

  return (
    <div className="user-profile">
      <div className="profile-header">
        <div className="profile-picture">
          {user.picture ? (
            <img src={user.picture} alt={user.name} />
          ) : (
            <div className="placeholder-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="profile-info">
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <div className="auth-provider">
            {user.authProvider === 'google' ? (
              <span className="google-badge">
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                </svg>
                Signed in with Google
              </span>
            ) : (
              <span className="local-badge">Local Account</span>
            )}
          </div>
        </div>
      </div>

      <div className="profile-details">
        <div className="detail-item">
          <label>Phone:</label>
          <span>{user.phone || 'Not provided'}</span>
        </div>
        <div className="detail-item">
          <label>Email Verified:</label>
          <span>{user.isEmailVerified ? '✅ Verified' : '❌ Not verified'}</span>
        </div>
        <div className="detail-item">
          <label>Member Since:</label>
          <span>{new Date(user.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {user.authProvider === 'google' && (
        <div className="google-actions">
          <button 
            onClick={handleUnlinkGoogle} 
            disabled={unlinkLoading}
            className="unlink-button"
          >
            {unlinkLoading ? 'Unlinking...' : 'Unlink Google Account'}
          </button>
          <p className="unlink-description">
            Unlinking will require you to set a password for email/password login.
          </p>
        </div>
      )}
    </div>
  );
};

// Example 5: Auth Context Provider with Google OAuth Support
export const AuthContext = React.createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/auth/google/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token might be expired
        localStorage.removeItem('authToken');
      }
    } catch (error) {
      console.error('Auth error:', error);
      localStorage.removeItem('authToken');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login: fetchUser,
    logout,
    isAuthenticated: !!user,
    isGoogleUser: user?.authProvider === 'google'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Example 6: Protected Route Component
export const ProtectedRoute = ({ children, requireCompleteProfile = false }) => {
  const { user, loading, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    } else if (requireCompleteProfile && user && (!user.phone || user.phone === '')) {
      navigate('/complete-profile');
    }
  }, [user, loading, isAuthenticated, requireCompleteProfile, navigate]);

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  if (requireCompleteProfile && (!user.phone || user.phone === '')) {
    return null; // Will redirect to complete profile
  }

  return children;
};
