import React, { useState, useEffect } from 'react';
import { 
  FaPlus, FaTimes, FaUpload, FaSpinner, FaCheckCircle,
  FaInfoCircle, FaImages, FaCog, FaBoxes, FaPalette, FaTags, FaShoppingCart
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './AddProductForm.css';

const AddProductForm = ({ onCancel, onSuccess }) => {
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
  const [images, setImages] = useState([]);
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
    fetchFormOptions();
  }, []);

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

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (images.length + files.length > 10) {
      setErrors(prev => ({
        ...prev,
        images: 'Maximum 10 images allowed'
      }));
      return;
    }

    setImages(prev => [...prev, ...files]);
    if (errors.images) {
      setErrors(prev => ({
        ...prev,
        images: ''
      }));
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
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

      // Add images
      images.forEach(image => {
        submitData.append('images', image);
      });

      const response = await fetch('http://localhost:5000/api/artisan/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${artisanToken}`
        },
        body: submitData
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('🎉 Product created successfully! Your amazing creation is now live.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        onSuccess(data.product);
      } else {
        toast.error(data.message || 'Failed to create product', {
          position: "top-right",
          autoClose: 5000,
        });
        setErrors({ general: data.message || 'Failed to create product' });
      }
    } catch (error) {
      toast.error('Network error occurred. Please check your connection and try again.', {
        position: "top-right",
        autoClose: 5000,
      });
      setErrors({ general: 'Error creating product' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="add-product-form-container" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <h2>
            <FaPlus className="header-icon" />
            Add New Product
          </h2>
          <button className="close-btn" onClick={onCancel}>
            <FaTimes />
          </button>
        </div>

      {errors.general && (
        <div className="error-message general-error">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="add-product-form">
        <div className="form-content">
          {/* Basic Information */}
          <div className="form-section">
            <h3><FaInfoCircle />Basic Information</h3>
          
          <div className="form-group">
            <label htmlFor="name">Product Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={errors.name ? 'error' : ''}
              placeholder="Enter product name"
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="4"
              className={errors.description ? 'error' : ''}
              placeholder="Describe your product in detail"
            />
            {errors.description && <span className="error-text">{errors.description}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
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

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={errors.category ? 'error' : ''}
              >
                <option value="">Select Category</option>
                {formOptions.categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {errors.category && <span className="error-text">{errors.category}</span>}
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="form-section">
          <h3><FaImages />Product Images</h3>
          
          <div className="image-upload-area">
            <input
              type="file"
              id="images"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="images" className="upload-btn">
              <FaUpload /> Upload Images
            </label>
            <p className="upload-hint">Upload up to 10 images (JPG, PNG)</p>
          </div>

          {images.length > 0 && (
            <div className="image-preview-grid">
              {images.map((image, index) => (
                <div key={index} className="image-preview-item">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`Preview ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={() => removeImage(index)}
                  >
                    <FaTimes />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {errors.images && <span className="error-text">{errors.images}</span>}
        </div>

        {/* Materials */}
        <div className="form-section">
          <h3><FaCog />Materials & Specifications</h3>
          
          <div className="form-group">
            <label>Materials</label>
            <div className="add-item-container">
              <input
                type="text"
                value={materialInput}
                onChange={(e) => setMaterialInput(e.target.value)}
                placeholder="Add material"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
              />
              <button type="button" onClick={addMaterial} className="add-btn">
                <FaPlus />
              </button>
            </div>
            
            {formData.materials.length > 0 && (
              <div className="tags-container">
                {formData.materials.map((material, index) => (
                  <span key={index} className="tag">
                    {material}
                    <button type="button" onClick={() => removeMaterial(index)}>
                      <FaTimes />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Dimensions</label>
            <div className="dimensions-grid">
              <input
                type="number"
                name="dimensions.length"
                value={formData.dimensions.length}
                onChange={handleInputChange}
                placeholder="Length (cm)"
                min="0"
                step="0.1"
              />
              <input
                type="number"
                name="dimensions.width"
                value={formData.dimensions.width}
                onChange={handleInputChange}
                placeholder="Width (cm)"
                min="0"
                step="0.1"
              />
              <input
                type="number"
                name="dimensions.height"
                value={formData.dimensions.height}
                onChange={handleInputChange}
                placeholder="Height (cm)"
                min="0"
                step="0.1"
              />
              <input
                type="number"
                name="dimensions.weight"
                value={formData.dimensions.weight}
                onChange={handleInputChange}
                placeholder="Weight (kg)"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div className="form-section">
          <h3><FaBoxes />Inventory & Availability</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="quantityAvailable">Available Quantity *</label>
              <input
                type="number"
                id="quantityAvailable"
                name="quantityAvailable"
                value={formData.quantityAvailable}
                onChange={handleInputChange}
                min="0"
                className={errors.quantityAvailable ? 'error' : ''}
                placeholder="0"
              />
              {errors.quantityAvailable && <span className="error-text">{errors.quantityAvailable}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="lowStockThreshold">Low Stock Alert</label>
              <input
                type="number"
                id="lowStockThreshold"
                name="lowStockThreshold"
                value={formData.lowStockThreshold}
                onChange={handleInputChange}
                min="1"
                placeholder="5"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="craftingTime">Crafting Time</label>
            <select
              id="craftingTime"
              name="craftingTime"
              value={formData.craftingTime}
              onChange={handleInputChange}
            >
              <option value="">Select Crafting Time</option>
              {formOptions.craftingTimes.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Customization */}
        <div className="form-section">
          <h3><FaPalette />Customization Options</h3>
          
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isCustomizable"
                checked={formData.isCustomizable}
                onChange={handleInputChange}
              />
              This product can be customized
            </label>
          </div>

          {formData.isCustomizable && (
            <div className="form-group">
              <label>Customization Options</label>
              <div className="add-item-container">
                <input
                  type="text"
                  value={customizationInput}
                  onChange={(e) => setCustomizationInput(e.target.value)}
                  placeholder="Add customization option"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomizationOption())}
                />
                <button type="button" onClick={addCustomizationOption} className="add-btn">
                  <FaPlus />
                </button>
              </div>
              
              {formData.customizationOptions.length > 0 && (
                <div className="tags-container">
                  {formData.customizationOptions.map((option, index) => (
                    <span key={index} className="tag">
                      {option}
                      <button type="button" onClick={() => removeCustomizationOption(index)}>
                        <FaTimes />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="form-section">
          <h3><FaTags />Tags & Keywords</h3>
          
          <div className="form-group">
            <label>Tags</label>
            <div className="add-item-container">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <button type="button" onClick={addTag} className="add-btn">
                <FaPlus />
              </button>
            </div>
            
            {formData.tags.length > 0 && (
              <div className="tags-container">
                {formData.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                    <button type="button" onClick={() => removeTag(index)}>
                      <FaTimes />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="button" onClick={onCancel} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? (
              <>
                <FaSpinner className="spinning" /> Creating...
              </>
            ) : (
              'Create Product'
            )}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default AddProductForm;
