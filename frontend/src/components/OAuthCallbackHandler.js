import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const OAuthCallbackHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(location.search);
        const token = urlParams.get('token');
        const provider = urlParams.get('provider');
        const error = urlParams.get('error');

        if (error) {
          const errorMessage = getErrorMessage(error);
          setError(errorMessage);
          toast.error(errorMessage);
          
          // Redirect to login page after 3 seconds
          setTimeout(() => {
            navigate('/customer/login');
          }, 3000);
          return;
        }

        if (token && provider === 'google') {
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
            
            // Update auth context
            if (login) {
              await login(user, token, user.authProvider === 'google' ? 'user' : 'user');
            }
            
            // Check if profile needs completion
            if (!user.phone || user.phone === '') {
              toast.info('Please complete your profile to continue');
              navigate('/complete-profile');
            } else {
              toast.success('Welcome back! Successfully signed in with Google');
              
              // Determine redirect based on stored user type preference or user data
              const userType = localStorage.getItem('googleAuthUserType') || 'user';
              localStorage.removeItem('googleAuthUserType'); // Clean up
              
              if (userType === 'artisan' || user.userType === 'artisan') {
                navigate('/dashboard');
              } else {
                navigate('/marketplace');
              }
            }
          } else {
            throw new Error('Failed to fetch user profile');
          }
          
        } else {
          throw new Error('Invalid callback parameters');
        }
        
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError('Authentication failed. Please try again.');
        toast.error('Authentication failed. Please try again.');
        
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          navigate('/customer/login');
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    handleOAuthCallback();
  }, [location, navigate, login]);

  const getErrorMessage = (errorCode) => {
    const errorMessages = {
      'google_auth_failed': 'Google authentication failed. Please try again.',
      'oauth_not_configured': 'Google OAuth is not properly configured on the server.',
      'auth_callback_failed': 'Authentication callback failed. Please try again.',
      'access_denied': 'Access was denied. You canceled the Google sign-in process.',
      'invalid_request': 'Invalid authentication request.',
      'server_error': 'Server error occurred during authentication.'
    };
    
    return errorMessages[errorCode] || 'An authentication error occurred. Please try again.';
  };

  const handleRetry = () => {
    navigate('/customer/login');
  };

  if (loading) {
    return (
      <div className="oauth-callback-container">
        <div className="oauth-callback-card">
          <div className="oauth-loading">
            <div className="oauth-spinner"></div>
            <h3>Completing sign-in...</h3>
            <p>Please wait while we verify your Google account</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="oauth-callback-container">
        <div className="oauth-callback-card">
          <div className="oauth-error">
            <div className="error-icon">⚠️</div>
            <h3>Authentication Failed</h3>
            <p>{error}</p>
            <div className="oauth-actions">
              <button onClick={handleRetry} className="btn btn-primary">
                Try Again
              </button>
            </div>
            <p className="redirect-message">
              Redirecting to login page in a few seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null; // This shouldn't be reached
};

export default OAuthCallbackHandler;
