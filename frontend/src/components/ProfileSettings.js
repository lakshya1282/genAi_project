import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaUser, FaEnvelope, FaPhone, FaSave, FaEdit } from 'react-icons/fa';
import axios from 'axios';
import './ProfileSettings.css';

const ProfileSettings = () => {
  const { t } = useTranslation();
  const { user, userType } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    bio: ''
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        gender: user.gender || '',
        bio: user.bio || ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!profileData.name.trim()) {
      toast.error(t('profile.nameRequired'));
      return;
    }

    if (!profileData.email.trim()) {
      toast.error(t('profile.emailRequired'));
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put('/api/customer/profile', profileData);
      
      if (response.data.success) {
        toast.success(t('profile.profileUpdated'));
        setIsEditing(false);
        
        // Update local storage with new user data
        const updatedUser = response.data.user;
        localStorage.setItem('customer_user', JSON.stringify(updatedUser));
        
        // Trigger a page reload or context update to reflect changes
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || t('profile.profileUpdateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset to original data
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        gender: user.gender || '',
        bio: user.bio || ''
      });
    }
    setIsEditing(false);
  };

  if (userType !== 'customer') {
    return (
      <div className="not-authorized">
        <p>{t('customerSettings.notAuthorized')}</p>
      </div>
    );
  }

  return (
    <div className="profile-settings">
      <div className="profile-header">
        <div className="profile-avatar">
          <FaUser />
        </div>
        <div className="profile-info">
          <h3>{user?.name}</h3>
          <p>{t('profile.customerSince')} {new Date(user?.createdAt || Date.now()).toLocaleDateString()}</p>
        </div>
        {!isEditing && (
          <button className="edit-btn" onClick={() => setIsEditing(true)}>
            <FaEdit /> {t('profile.editProfile')}
          </button>
        )}
      </div>

      <div className="profile-form">
        <div className="form-group">
          <label htmlFor="name">
            <FaUser /> {t('profile.name')} *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={profileData.name}
            onChange={handleInputChange}
            disabled={!isEditing}
            placeholder={t('profile.namePlaceholder')}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">
            <FaEnvelope /> {t('profile.email')} *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={profileData.email}
            onChange={handleInputChange}
            disabled={!isEditing}
            placeholder={t('profile.emailPlaceholder')}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">
            <FaPhone /> {t('profile.phone')}
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={profileData.phone}
            onChange={handleInputChange}
            disabled={!isEditing}
            placeholder={t('profile.phonePlaceholder')}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="dateOfBirth">Date of Birth</label>
            <input
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              value={profileData.dateOfBirth}
              onChange={handleInputChange}
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              name="gender"
              value={profileData.gender}
              onChange={handleInputChange}
              disabled={!isEditing}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            name="bio"
            value={profileData.bio}
            onChange={handleInputChange}
            disabled={!isEditing}
            placeholder="Tell us about yourself..."
            rows="4"
          />
        </div>

        {isEditing && (
          <div className="form-actions">
            <button 
              className="save-btn" 
              onClick={handleSaveProfile}
              disabled={loading}
            >
              <FaSave /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button 
              className="cancel-btn" 
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="profile-stats">
        <div className="stat-item">
          <h4>Account Status</h4>
          <span className="status-badge active">Active</span>
        </div>
        <div className="stat-item">
          <h4>Member Since</h4>
          <span>{new Date(user?.createdAt || Date.now()).toLocaleDateString()}</span>
        </div>
        <div className="stat-item">
          <h4>Email Verified</h4>
          <span className="status-badge verified">Verified</span>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
