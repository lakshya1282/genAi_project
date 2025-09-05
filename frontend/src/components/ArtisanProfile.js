import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { 
  FaCamera, FaEdit, FaSave, FaTimes, FaUser, FaMapMarkerAlt, 
  FaPhone, FaEnvelope, FaGlobe, FaInstagram, FaFacebook, 
  FaStar, FaAward, FaHistory, FaCrop
} from 'react-icons/fa';
import './ArtisanProfile.css';

const ArtisanProfile = () => {
  const { t } = useTranslation();
  const { user, artisanToken } = useAuth();
  const [profile, setProfile] = useState({
    coverPhoto: '',
    profilePhoto: '',
    displayName: '',
    bio: '',
    specialization: '',
    experience: '',
    location: {
      city: '',
      state: '',
      country: 'India'
    },
    contact: {
      phone: '',
      email: '',
      website: '',
      instagram: '',
      facebook: ''
    },
    achievements: [],
    story: '',
    skills: [],
    languages: []
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  
  // Image cropping states
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [crop, setCrop] = useState({ aspect: 16 / 9 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [currentCropField, setCurrentCropField] = useState('');
  const imgRef = useRef();

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    let completed = 0;
    const total = 6; // Total fields to complete
    
    if (profile.displayName) completed++;
    if (profile.bio) completed++;
    if (profile.specialization) completed++;
    if (profile.location?.city || profile.location?.state) completed++;
    if (profile.contact?.phone || profile.contact?.email) completed++;
    if (profile.story) completed++;
    
    return Math.round((completed / total) * 100);
  };
  
  const completionPercentage = calculateCompletion();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      // Set up axios headers for authentication
      const config = {
        headers: {
          'Authorization': `Bearer ${artisanToken}`,
          'Content-Type': 'application/json'
        }
      };
      
      const response = await axios.get('/api/artisan/profile', config);
      if (response.data.success && response.data.profile) {
        setProfile(response.data.profile);
        setProfileExists(true);
      } else {
        // Profile doesn't exist - set up for first time creation
        setProfile(prev => ({
          ...prev,
          displayName: user?.name || '',
          contact: {
            ...prev.contact,
            email: user?.email || ''
          }
        }));
        setProfileExists(false);
        setIsFirstTimeSetup(true);
        setIsEditing(true); // Start in edit mode for first-time setup
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Profile doesn't exist or error occurred - set up for creation
      setProfile(prev => ({
        ...prev,
        displayName: user?.name || '',
        contact: {
          ...prev.contact,
          email: user?.email || ''
        }
      }));
      setProfileExists(false);
      setIsFirstTimeSetup(true);
      setIsEditing(true);
    }
    setLoading(false);
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setProfile(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setProfile(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleArrayChange = (field, index, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field) => {
    setProfile(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field, index) => {
    setProfile(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleImageUpload = (field, file) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setCropImageSrc(e.target.result);
      setCurrentCropField(field);
      
      // Set different aspect ratios for different fields
      if (field === 'coverPhoto') {
        setCrop({ aspect: 16 / 9 }); // Wide for cover
      } else if (field === 'profilePhoto') {
        setCrop({ aspect: 1 }); // Square for profile
      }
      
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };
  
  const getCroppedImg = (image, crop) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!crop || !ctx) {
      return null;
    }
    
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = crop.width;
    canvas.height = crop.height;
    
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );
    
    return canvas.toDataURL('image/jpeg', 0.9);
  };
  
  const handleCropComplete = () => {
    if (completedCrop && imgRef.current) {
      const croppedImageUrl = getCroppedImg(imgRef.current, completedCrop);
      if (croppedImageUrl) {
        setProfile(prev => ({
          ...prev,
          [currentCropField]: croppedImageUrl
        }));
      }
    }
    setShowCropModal(false);
    setCropImageSrc('');
    setCurrentCropField('');
    setCompletedCrop(null);
  };
  
  const handleCropCancel = () => {
    setShowCropModal(false);
    setCropImageSrc('');
    setCurrentCropField('');
    setCompletedCrop(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('Saving profile:', profile);
      console.log('Profile exists:', profileExists);
      console.log('Is first time setup:', isFirstTimeSetup);
      
      // Set up axios headers for authentication
      const config = {
        headers: {
          'Authorization': `Bearer ${artisanToken}`,
          'Content-Type': 'application/json'
        }
      };
      
      // Use the same endpoint for both create and update
      const response = await axios.post('/api/artisan/profile', profile, config);
      
      console.log('Save response:', response.data);
      
      if (response.data.success) {
        if (isFirstTimeSetup) {
          toast.success('Public profile created successfully! Customers can now view your profile.');
          setProfileExists(true);
          setIsFirstTimeSetup(false);
        } else {
          toast.success('Profile updated successfully!');
        }
        setIsEditing(false);
        // Refresh the profile data
        fetchProfile();
      } else {
        throw new Error(response.data.message || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      console.error('Error response:', error.response?.data);
      
      let message;
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (isFirstTimeSetup) {
        message = 'Failed to create profile. Please check your connection and try again.';
      } else {
        message = 'Failed to update profile. Please try again.';
      }
      
      toast.error(message);
    }
    setSaving(false);
  };

  const handleCancel = () => {
    fetchProfile(); // Reload original data
    setIsEditing(false);
  };

  if (loading) {
    return <div className="loading">{t('artisanProfile.loading')}</div>;
  }

  return (
    <div className="artisan-profile">
      <div className="profile-container">
        {isFirstTimeSetup && (
          <div className="welcome-section">
            <div className="welcome-card">
              <div className="welcome-icon">
                🎨
              </div>
              <h2>Create Your Artisan Profile</h2>
              <p>Let's showcase your craftsmanship to the world. Complete your profile to help customers discover your unique work.</p>
              
              <div className="progress-section">
                <div className="progress-header">
                  <span className="progress-text">Profile Progress</span>
                  <span className="progress-percentage">{completionPercentage}%</span>
                </div>
                <div className="progress-bar-modern">
                  <div 
                    className="progress-fill-modern" 
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="checklist">
                <div className={`checklist-item ${profile.displayName ? 'completed' : ''}`}>
                  <div className="checklist-icon">{profile.displayName ? '✓' : '○'}</div>
                  <span>Basic Information</span>
                </div>
                <div className={`checklist-item ${(profile.coverPhoto || profile.profilePhoto) ? 'completed' : ''}`}>
                  <div className="checklist-icon">{(profile.coverPhoto || profile.profilePhoto) ? '✓' : '○'}</div>
                  <span>Profile Photos</span>
                </div>
                <div className={`checklist-item ${profile.story ? 'completed' : ''}`}>
                  <div className="checklist-icon">{profile.story ? '✓' : '○'}</div>
                  <span>Your Story</span>
                </div>
                <div className={`checklist-item ${(profile.location?.city || profile.location?.state) ? 'completed' : ''}`}>
                  <div className="checklist-icon">{(profile.location?.city || profile.location?.state) ? '✓' : '○'}</div>
                  <span>Location Details</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="profile-main-section">
          {/* Action Buttons */}
          <div className="action-buttons">
            {!isEditing ? (
              <button className="btn-modern btn-edit" onClick={() => setIsEditing(true)}>
                <FaEdit /> Edit Profile
              </button>
            ) : (
              <div className="save-cancel-buttons">
                <button 
                  className="btn-modern btn-save" 
                  onClick={handleSave}
                  disabled={saving}
                >
                  <FaSave /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button className="btn-modern btn-cancel" onClick={handleCancel}>
                  <FaTimes /> Cancel
                </button>
              </div>
            )}
          </div>

          {/* Cover Photo Section */}
          <div className="cover-section">
            <div 
              className="cover-photo-modern" 
              style={{
                backgroundImage: profile.coverPhoto 
                  ? `url(${profile.coverPhoto})` 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}
            >
              {isEditing && (
                <label className="upload-overlay cover-upload-modern">
                  <div className="upload-content">
                    <FaCamera className="upload-icon" />
                    <span>Upload Cover Photo</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload('coverPhoto', e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Profile Info Card */}
          <div className="profile-info-card">
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                {profile.profilePhoto ? (
                  <img src={profile.profilePhoto} alt={profile.displayName} />
                ) : (
                  <div className="avatar-placeholder">
                    <FaUser />
                  </div>
                )}
                {isEditing && (
                  <label className="avatar-upload-btn">
                    <FaCamera />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('profilePhoto', e.target.files[0])}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>
            </div>
            
            <div className="profile-info-content">
              {isEditing ? (
                <input
                  type="text"
                  className="name-input-modern"
                  value={profile.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="Enter your display name"
                />
              ) : (
                <h1 className="profile-name-modern">{profile.displayName || 'Unnamed Artisan'}</h1>
              )}
              
              <div className="profile-badges">
                {profile.specialization && (
                  <div className="badge specialization-badge">
                    <FaAward /> {profile.specialization}
                  </div>
                )}
                {profile.experience && (
                  <div className="badge experience-badge">
                    <FaHistory /> {profile.experience}
                  </div>
                )}
                {profile.location && profile.location.city && (
                  <div className="badge location-badge">
                    <FaMapMarkerAlt /> {profile.location.city}{profile.location.state ? `, ${profile.location.state}` : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="form-sections">
        <div className="form-section-card">
          <div className="card-header">
            <h3>📋 About You</h3>
          </div>
          <div className="card-content">
            {isEditing ? (
              <div className="input-group">
                <label className="modern-label">Bio</label>
                <textarea
                  className="modern-textarea"
                  value={profile.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us about yourself and your craft..."
                  rows="4"
                />
              </div>
            ) : (
              <div className="display-content">
                {profile.bio ? (
                  <p className="bio-text">{profile.bio}</p>
                ) : (
                  <p className="empty-state">Add a bio to tell customers about yourself</p>
                )}
              </div>
            )}
          </div>
        </div>

        
        <div className="form-section-card">
          <div className="card-header">
            <h3>💼 Professional Details</h3>
          </div>
          <div className="card-content">
            {isEditing ? (
              <div className="input-grid">
                <div className="input-group">
                  <label className="modern-label">Specialization</label>
                  <input
                    type="text"
                    className="modern-input"
                    value={profile.specialization}
                    onChange={(e) => handleInputChange('specialization', e.target.value)}
                    placeholder="e.g., Pottery, Woodworking, Jewelry Making"
                  />
                </div>
                
                <div className="input-group">
                  <label className="modern-label">Experience</label>
                  <input
                    type="text"
                    className="modern-input"
                    value={profile.experience}
                    onChange={(e) => handleInputChange('experience', e.target.value)}
                    placeholder="e.g., 5+ years, Beginner, Expert"
                  />
                </div>
              </div>
            ) : (
              <div className="info-grid">
                {profile.specialization && (
                  <div className="info-card">
                    <div className="info-icon">🎨</div>
                    <div>
                      <div className="info-label">Specialization</div>
                      <div className="info-value">{profile.specialization}</div>
                    </div>
                  </div>
                )}
                {profile.experience && (
                  <div className="info-card">
                    <div className="info-icon">⏱️</div>
                    <div>
                      <div className="info-label">Experience</div>
                      <div className="info-value">{profile.experience}</div>
                    </div>
                  </div>
                )}
                {(!profile.specialization && !profile.experience) && (
                  <p className="empty-state">Add your professional details to showcase your expertise</p>
                )}
              </div>
            )}
          </div>
        </div>

        
        <div className="form-section-card">
          <div className="card-header">
            <h3>📍 Location</h3>
          </div>
          <div className="card-content">
            {isEditing ? (
              <div className="input-grid">
                <div className="input-group">
                  <label className="modern-label">City</label>
                  <input
                    type="text"
                    className="modern-input"
                    value={profile.location?.city || ''}
                    onChange={(e) => handleInputChange('location.city', e.target.value)}
                    placeholder="Enter your city"
                  />
                </div>
                
                <div className="input-group">
                  <label className="modern-label">State</label>
                  <input
                    type="text"
                    className="modern-input"
                    value={profile.location?.state || ''}
                    onChange={(e) => handleInputChange('location.state', e.target.value)}
                    placeholder="Enter your state"
                  />
                </div>
              </div>
            ) : (
              <div className="location-display-modern">
                {profile.location && (profile.location.city || profile.location.state) ? (
                  <div className="location-info">
                    <FaMapMarkerAlt className="location-icon" />
                    <span className="location-text">
                      {profile.location.city}{profile.location.city && profile.location.state ? ', ' : ''}{profile.location.state}
                    </span>
                  </div>
                ) : (
                  <p className="empty-state">Add your location to help customers find you</p>
                )}
              </div>
            )}
          </div>
        </div>

        
        <div className="form-section-card">
          <div className="card-header">
            <h3>📞 Contact Information</h3>
          </div>
          <div className="card-content">
            {isEditing ? (
              <div className="input-grid">
                <div className="input-group">
                  <label className="modern-label">Phone</label>
                  <input
                    type="tel"
                    className="modern-input"
                    value={profile.contact?.phone || ''}
                    onChange={(e) => handleInputChange('contact.phone', e.target.value)}
                    placeholder="Your phone number"
                  />
                </div>
                
                <div className="input-group">
                  <label className="modern-label">Website</label>
                  <input
                    type="url"
                    className="modern-input"
                    value={profile.contact?.website || ''}
                    onChange={(e) => handleInputChange('contact.website', e.target.value)}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
                
                <div className="input-group">
                  <label className="modern-label">Instagram</label>
                  <input
                    type="text"
                    className="modern-input"
                    value={profile.contact?.instagram || ''}
                    onChange={(e) => handleInputChange('contact.instagram', e.target.value)}
                    placeholder="@yourusername"
                  />
                </div>
                
                <div className="input-group">
                  <label className="modern-label">Facebook</label>
                  <input
                    type="text"
                    className="modern-input"
                    value={profile.contact?.facebook || ''}
                    onChange={(e) => handleInputChange('contact.facebook', e.target.value)}
                    placeholder="Facebook page URL"
                  />
                </div>
              </div>
            ) : (
              <div className="contact-grid">
                {profile.contact?.phone && (
                  <div className="contact-card">
                    <FaPhone className="contact-icon" />
                    <span>{profile.contact.phone}</span>
                  </div>
                )}
                {profile.contact?.email && (
                  <div className="contact-card">
                    <FaEnvelope className="contact-icon" />
                    <span>{profile.contact.email}</span>
                  </div>
                )}
                {profile.contact?.website && (
                  <div className="contact-card">
                    <FaGlobe className="contact-icon" />
                    <a href={profile.contact.website} target="_blank" rel="noopener noreferrer">
                      Visit Website
                    </a>
                  </div>
                )}
                {profile.contact?.instagram && (
                  <div className="contact-card">
                    <FaInstagram className="contact-icon" />
                    <a href={`https://instagram.com/${profile.contact.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
                      {profile.contact.instagram}
                    </a>
                  </div>
                )}
                {profile.contact?.facebook && (
                  <div className="contact-card">
                    <FaFacebook className="contact-icon" />
                    <a href={profile.contact.facebook} target="_blank" rel="noopener noreferrer">
                      Facebook Page
                    </a>
                  </div>
                )}
                {(!profile.contact?.phone && !profile.contact?.email && !profile.contact?.website && !profile.contact?.instagram && !profile.contact?.facebook) && (
                  <p className="empty-state">Add your contact information to help customers reach you</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="form-section-card">
          <div className="card-header">
            <h3>✍️ Your Story</h3>
          </div>
          <div className="card-content">
            {isEditing ? (
              <div className="input-group">
                <label className="modern-label">Tell your story</label>
                <textarea
                  className="modern-textarea story-textarea"
                  value={profile.story}
                  onChange={(e) => handleInputChange('story', e.target.value)}
                  placeholder="Share your journey, inspiration, and what makes your craft unique..."
                  rows="6"
                />
              </div>
            ) : (
              <div className="story-display-modern">
                {profile.story ? (
                  <div className="story-content">
                    <p className="story-text">{profile.story}</p>
                  </div>
                ) : (
                  <p className="empty-state">Share your story to connect with customers on a personal level</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Image Crop Modal */}
      {showCropModal && (
        <div className="crop-modal-overlay" onClick={(e) => e.target === e.currentTarget && handleCropCancel()}>
          <div className="crop-modal">
            <div className="crop-modal-header">
              <h3><FaCrop /> Crop Your Image</h3>
              <button className="crop-close-btn" onClick={handleCropCancel}>
                <FaTimes />
              </button>
            </div>
            
            <div className="crop-container">
              <ReactCrop
                crop={crop}
                onChange={(newCrop) => setCrop(newCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={crop.aspect}
                minWidth={100}
                minHeight={currentCropField === 'coverPhoto' ? 56 : 100}
              >
                <img
                  ref={imgRef}
                  src={cropImageSrc}
                  alt="Crop preview"
                  style={{ maxHeight: '60vh', maxWidth: '100%' }}
                  onLoad={() => {
                    const { width, height } = imgRef.current;
                    const newCrop = {
                      unit: '%',
                      width: 90,
                      height: currentCropField === 'coverPhoto' ? 50 : 90,
                      x: 5,
                      y: currentCropField === 'coverPhoto' ? 25 : 5
                    };
                    setCrop(newCrop);
                  }}
                />
              </ReactCrop>
            </div>
            
            <div className="crop-modal-actions">
              <button className="btn-modern btn-cancel" onClick={handleCropCancel}>
                <FaTimes /> Cancel
              </button>
              <button 
                className="btn-modern btn-save" 
                onClick={handleCropComplete}
                disabled={!completedCrop}
              >
                <FaCrop /> Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtisanProfile;
