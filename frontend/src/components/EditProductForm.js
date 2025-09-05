import React, { useState, useEffect } from 'react';
import { FaPlus, FaTimes, FaUpload, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './EditProductForm.css'; // Modern clean styles

const EditProductForm = ({ product, onCancel, onSuccess }) => {
  const { artisanToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    materials: [],
    dimensions: {
      length: '',
      width: '',
      height: '',
      weight: ''
    },
    isCustomizable: false,
    customizationOptions: [],
    quantityAvailable: '',
    lowStockThreshold: '5',
    craftingTime: '',
    tags: []
  });
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [imagesToRemove, setImagesToRemove] = useState([]);
  const [formOptions, setFormOptions] = useState({
    categories: [],
    craftingTimes: [],
    commonMaterials: [],
    popularTags: []
  });
  const [errors, setErrors] = useState({});
  const [materialInput, setMaterialInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [customizationInput, setCustomizationInput] = useState('');

  useEffect(() => {
    if (product) {
      // Populate form with existing product data
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        category: product.category || '',
        materials: product.materials || [],
        dimensions: {
          length: product.dimensions?.length?.toString() || '',
          width: product.dimensions?.width?.toString() || '',
          height: product.dimensions?.height?.toString() || '',
          weight: product.dimensions?.weight?.toString() || ''
        },
        isCustomizable: product.isCustomizable || false,
        customizationOptions: product.customizationOptions || [],
        quantityAvailable: product.quantityAvailable?.toString() || '',
        lowStockThreshold: product.lowStockThreshold?.toString() || '5',
        craftingTime: product.craftingTime || '',
        tags: product.tags || []
      });
      setExistingImages(product.images || []);
    }
    fetchFormOptions();
  }, [product]);

  const fetchFormOptions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/artisan/products/form-data/options', {
        headers: {
          'Authorization': `Bearer ${artisanToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFormOptions(data.formData);
      }
    } catch (error) {
      console.error('Error fetching form options:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('dimensions.')) {
      const dimensionField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        dimensions: {
          ...prev.dimensions,
          [dimensionField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleNewImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    const totalImages = existingImages.length - imagesToRemove.length + newImages.length + files.length;
    if (totalImages > 10) {
      setErrors(prev => ({
        ...prev,
        images: 'Maximum 10 images allowed'
      }));
      return;
    }

    setNewImages(prev => [...prev, ...files]);
    if (errors.images) {
      setErrors(prev => ({
        ...prev,
        images: ''
      }));
    }
  };

  const removeNewImage = (index) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (imageUrl) => {
    setImagesToRemove(prev => [...prev, imageUrl]);
  };

  const restoreExistingImage = (imageUrl) => {
    setImagesToRemove(prev => prev.filter(url => url !== imageUrl));
  };

  const addMaterial = () => {
    if (materialInput.trim() && !formData.materials.includes(materialInput.trim())) {
      setFormData(prev => ({
        ...prev,
        materials: [...prev.materials, materialInput.trim()]
      }));
      setMaterialInput('');
    }
  };

  const removeMaterial = (index) => {
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const addCustomizationOption = () => {
    if (customizationInput.trim() && !formData.customizationOptions.includes(customizationInput.trim())) {
      setFormData(prev => ({
        ...prev,
        customizationOptions: [...prev.customizationOptions, customizationInput.trim()]
      }));
      setCustomizationInput('');
    }
  };

  const removeCustomizationOption = (index) => {
    setFormData(prev => ({
      ...prev,
      customizationOptions: prev.customizationOptions.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.quantityAvailable || parseInt(formData.quantityAvailable) < 0) {
      newErrors.quantityAvailable = 'Valid quantity is required';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      
      // Add form data
      Object.keys(formData).forEach(key => {
        if (key === 'materials' || key === 'tags' || key === 'customizationOptions') {
          formData[key].forEach(item => {
            submitData.append(key, item);
          });
        } else if (key === 'dimensions') {
          submitData.append(key, JSON.stringify(formData[key]));
        } else {
          submitData.append(key, formData[key]);
        }
      });

      // Add images to keep (existing images not marked for removal)
      const imagesToKeep = existingImages.filter(img => !imagesToRemove.includes(img));
      imagesToKeep.forEach(img => {
        submitData.append('existingImages', img);
      });

      // Add images to remove
      imagesToRemove.forEach(img => {
        submitData.append('removeImages', img);
      });

      // Add new images
      newImages.forEach(image => {
        submitData.append('newImages', image);
      });

      const response = await fetch(`http://localhost:5000/api/artisan/products/${product._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${artisanToken}`
        },
        body: submitData
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess(data.product);
      } else {
        setErrors({ general: data.message || 'Failed to update product' });
      }
    } catch (error) {
      setErrors({ general: 'Error updating product' });
    } finally {
      setLoading(false);
    }
  };

  const getVisibleExistingImages = () => {
    return existingImages.filter(img => !imagesToRemove.includes(img));
  };

  return (
    <div className="product-edit-modal">
      <div className="modal-backdrop" onClick={onCancel}></div>
      
      <div className="edit-form-container">
        <div className="form-header-modern">
          <div className="header-content">
            <h2>✏️ Edit Product</h2>
            <p>Update your product details</p>
          </div>
          <button className="close-btn-modern" onClick={onCancel}>
            <FaTimes />
          </button>
        </div>

        {errors.general && (
          <div className="error-banner">
            <span>⚠️ {errors.general}</span>
          </div>
        )}

        <div className="form-content">
          <form onSubmit={handleSubmit} className="modern-product-form">
            
            {/* Essential Information Card */}
            <div className="form-card">
              <div className="card-header">
                <div className="card-icon">📝</div>
                <div className="card-title">
                  <h3>Essential Details</h3>
                  <span>Basic product information</span>
                </div>
              </div>
              
              <div className="card-content">
                <div className="input-group">
                  <label htmlFor="name">Product Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={errors.name ? 'error' : ''}
                    placeholder="Enter a catchy product name"
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>

                <div className="input-group">
                  <label htmlFor="description">Description *</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className={errors.description ? 'error' : ''}
                    placeholder="Tell customers about your product's unique features and story"
                  />
                  {errors.description && <span className="error-text">{errors.description}</span>}
                </div>

                <div className="input-row">
                  <div className="input-group">
                    <label htmlFor="price">Price (₹) *</label>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      min="1"
                      step="0.01"
                      className={errors.price ? 'error' : ''}
                      placeholder="0.00"
                    />
                    {errors.price && <span className="error-text">{errors.price}</span>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="category">Category *</label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className={errors.category ? 'error' : ''}
                    >
                      <option value="">Choose category</option>
                      {formOptions.categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    {errors.category && <span className="error-text">{errors.category}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory & Images Card */}
            <div className="form-card">
              <div className="card-header">
                <div className="card-icon">📦</div>
                <div className="card-title">
                  <h3>Inventory & Images</h3>
                  <span>Stock and visual content</span>
                </div>
              </div>
              
              <div className="card-content">
                <div className="input-row">
                  <div className="input-group">
                    <label htmlFor="quantityAvailable">Available Quantity *</label>
                    <input
                      type="number"
                      id="quantityAvailable"
                      name="quantityAvailable"
                      value={formData.quantityAvailable}
                      onChange={handleInputChange}
                      min="0"
                      className={errors.quantityAvailable ? 'error' : ''}
                      placeholder="How many do you have?"
                    />
                    {errors.quantityAvailable && <span className="error-text">{errors.quantityAvailable}</span>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="craftingTime">Crafting Time</label>
                    <select
                      id="craftingTime"
                      name="craftingTime"
                      value={formData.craftingTime}
                      onChange={handleInputChange}
                    >
                      <option value="">Select crafting time</option>
                      {formOptions.craftingTimes.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Materials */}
                <div className="input-group">
                  <label>Materials</label>
                  <div className="materials-input">
                    <input
                      type="text"
                      value={materialInput}
                      onChange={(e) => setMaterialInput(e.target.value)}
                      placeholder="Add material (e.g., Wood, Cotton, Silver)"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
                    />
                    <button type="button" onClick={addMaterial} className="add-material-btn">
                      <FaPlus />
                    </button>
                  </div>
                  
                  {formData.materials.length > 0 && (
                    <div className="materials-list">
                      {formData.materials.map((material, index) => (
                        <span key={index} className="material-tag">
                          {material}
                          <button type="button" onClick={() => removeMaterial(index)}>
                            <FaTimes />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Images Section */}
                <div className="images-section">
                  <label>Product Images</label>
                  
                  <div className="images-container">
                    {/* Existing Images */}
                    {existingImages.length > 0 && (
                      <div className="current-images">
                        <span className="images-label">Current Images:</span>
                        <div className="images-grid">
                          {existingImages.map((imageUrl, index) => (
                            <div key={index} className={`image-item ${imagesToRemove.includes(imageUrl) ? 'removing' : ''}`}>
                              <img
                                src={`http://localhost:5000${imageUrl}`}
                                alt={`Current ${index + 1}`}
                                onError={(e) => {
                                  e.target.src = '/placeholder-image.png';
                                }}
                              />
                              {imagesToRemove.includes(imageUrl) ? (
                                <button
                                  type="button"
                                  className="restore-btn"
                                  onClick={() => restoreExistingImage(imageUrl)}
                                  title="Restore image"
                                >
                                  <FaPlus />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="remove-btn"
                                  onClick={() => removeExistingImage(imageUrl)}
                                  title="Remove image"
                                >
                                  <FaTimes />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* New Images */}
                    {newImages.length > 0 && (
                      <div className="new-images">
                        <span className="images-label">New Images:</span>
                        <div className="images-grid">
                          {newImages.map((image, index) => (
                            <div key={index} className="image-item">
                              <img
                                src={URL.createObjectURL(image)}
                                alt={`New ${index + 1}`}
                              />
                              <button
                                type="button"
                                className="remove-btn"
                                onClick={() => removeNewImage(index)}
                              >
                                <FaTimes />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Upload Button */}
                    <div className="upload-section">
                      <input
                        type="file"
                        id="newImages"
                        accept="image/*"
                        multiple
                        onChange={handleNewImageChange}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="newImages" className="upload-btn-modern">
                        <FaUpload /> Add Images
                      </label>
                      <span className="upload-hint">
                        {10 - (getVisibleExistingImages().length + newImages.length)} more images allowed
                      </span>
                    </div>
                  </div>
                  
                  {errors.images && <span className="error-text">{errors.images}</span>}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="form-actions-modern">
              <button type="button" onClick={onCancel} className="cancel-btn-modern">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="submit-btn-modern">
                {loading ? (
                  <>
                    <FaSpinner className="spinning" /> Updating...
                  </>
                ) : (
                  <>💾 Update Product</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProductForm;
