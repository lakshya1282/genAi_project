import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaUserCog, FaMapMarkerAlt, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from 'axios';
import './CustomerComponents.css';

const AccountSettings = () => {
  const { user, userType } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    type: 'home',
    street: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await axios.get('/api/customerAccount/addresses');
      if (response.data.success) {
        setAddresses(response.data.addresses || []);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingAddress 
        ? `/api/customerAccount/addresses/${editingAddress._id}`
        : '/api/customerAccount/addresses';
      
      const method = editingAddress ? 'put' : 'post';
      const response = await axios[method](url, addressForm);
      
      if (response.data.success) {
        toast.success(editingAddress ? 'Address updated' : 'Address added');
        fetchAddresses();
        setShowAddForm(false);
        setEditingAddress(null);
        setAddressForm({
          type: 'home',
          street: '',
          city: '',
          state: '',
          pincode: '',
          isDefault: false
        });
      }
    } catch (error) {
      toast.error('Failed to save address');
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        const response = await axios.delete(`/api/customerAccount/addresses/${addressId}`);
        if (response.data.success) {
          toast.success('Address deleted');
          fetchAddresses();
        }
      } catch (error) {
        toast.error('Failed to delete address');
      }
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setAddressForm({
      type: address.type,
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault
    });
    setShowAddForm(true);
  };

  if (userType !== 'customer') {
    return <div className="not-authorized"><p>This section is only available for customers.</p></div>;
  }

  return (
    <div className="account-settings">
      <div className="section-header">
        <h2><FaUserCog /> Account Settings</h2>
        <p>Manage your profile and delivery addresses</p>
      </div>

      <div className="addresses-section">
        <div className="section-title">
          <h3><FaMapMarkerAlt /> Delivery Addresses</h3>
          <button 
            className="add-address-btn"
            onClick={() => setShowAddForm(true)}
          >
            <FaPlus /> Add New Address
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="no-addresses">
            <p>No addresses saved yet</p>
          </div>
        ) : (
          <div className="addresses-list">
            {addresses.map(address => (
              <div key={address._id} className="address-card">
                <div className="address-header">
                  <span className="address-type">{address.type}</span>
                  {address.isDefault && <span className="default-badge">Default</span>}
                </div>
                <div className="address-content">
                  <p>{address.street}</p>
                  <p>{address.city}, {address.state} - {address.pincode}</p>
                </div>
                <div className="address-actions">
                  <button onClick={() => handleEditAddress(address)}>
                    <FaEdit /> Edit
                  </button>
                  <button onClick={() => handleDeleteAddress(address._id)}>
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAddForm && (
          <div className="address-form-modal">
            <div className="modal-content">
              <h3>{editingAddress ? 'Edit Address' : 'Add New Address'}</h3>
              <form onSubmit={handleAddressSubmit}>
                <div className="form-group">
                  <label>Address Type</label>
                  <select 
                    value={addressForm.type}
                    onChange={(e) => setAddressForm({...addressForm, type: e.target.value})}
                  >
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Street Address</label>
                  <input 
                    type="text"
                    value={addressForm.street}
                    onChange={(e) => setAddressForm({...addressForm, street: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input 
                      type="text"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input 
                      type="text"
                      value={addressForm.state}
                      onChange={(e) => setAddressForm({...addressForm, state: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Pincode</label>
                  <input 
                    type="text"
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({...addressForm, pincode: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group checkbox">
                  <label>
                    <input 
                      type="checkbox"
                      checked={addressForm.isDefault}
                      onChange={(e) => setAddressForm({...addressForm, isDefault: e.target.checked})}
                    />
                    Set as default address
                  </label>
                </div>
                
                <div className="form-actions">
                  <button type="submit">
                    {editingAddress ? 'Update Address' : 'Add Address'}
                  </button>
                  <button type="button" onClick={() => {
                    setShowAddForm(false);
                    setEditingAddress(null);
                  }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountSettings;
