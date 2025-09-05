import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null); // 'artisan' or 'customer'
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [cartLastUpdated, setCartLastUpdated] = useState(Date.now());


  useEffect(() => {
    // Check for both artisan and customer tokens
    const artisanToken = localStorage.getItem('artisan_token');
    const artisanUser = localStorage.getItem('artisan_user');
    const customerToken = localStorage.getItem('customer_token');
    const customerUser = localStorage.getItem('customer_user');
    
    if (artisanToken && artisanUser) {
      setUser(JSON.parse(artisanUser));
      setUserType('artisan');
      axios.defaults.headers.common['Authorization'] = `Bearer ${artisanToken}`;
    } else if (customerToken && customerUser) {
      setUser(JSON.parse(customerUser));
      setUserType('customer');
      axios.defaults.headers.common['Authorization'] = `Bearer ${customerToken}`;
      // Load cart for customer
      loadCart();
    }
    setLoading(false);
  }, []);

  const loadCart = async () => {
    console.log('🔄 loadCart called - fetching cart from API');
    try {
      const response = await axios.get('/api/cart');
      console.log('📦 Raw cart API response:', response.data);
      
      if (response.data.success) {
        const responseCart = response.data.cart;
        console.log('📋 Response cart data:', responseCart);
        
        // Check if this is the new Cart model structure or legacy structure
        if (responseCart && typeof responseCart === 'object' && responseCart.items) {
          // Handle new Cart model structure
          const cartData = responseCart;
          const cartItems = cartData.items || [];
          console.log('📝 Raw cart items from API:', cartItems);
          
          // Map the new cart item structure to match the existing frontend expectations
          const mappedItems = cartItems.map(item => ({
            _id: item.product?._id || item.variantId,
            product: item.product,
            quantity: item.qty,
            itemTotal: item.itemTotal || (item.unitPrice * item.qty),
            addedAt: item.addedAt,
            availability: item.availability
          }));
          
          console.log('🎯 Mapped cart items for frontend:', mappedItems);
          console.log('🔢 Setting cart count to:', cartData.itemCount || 0);
          
          setCart(mappedItems);
          setCartCount(cartData.itemCount || 0);
          setCartLastUpdated(Date.now());
          
          console.log('✅ Cart state updated successfully');
        } else if (Array.isArray(responseCart)) {
          // Handle legacy cart format (array of items)
          console.log('📜 Using legacy cart format:', responseCart);
          setCart(responseCart);
          setCartCount(response.data.summary ? response.data.summary.totalItems : responseCart.length);
          setCartLastUpdated(Date.now());
        } else {
          // Handle empty cart
          console.log('🈳 Empty cart detected');
          setCart([]);
          setCartCount(0);
          setCartLastUpdated(Date.now());
        }
      } else {
        console.log('❌ Cart API returned success: false');
        setCart([]);
        setCartCount(0);
        setCartLastUpdated(Date.now());
      }
    } catch (error) {
      console.error('❌ Error loading cart:', error.response ? error.response.data : error.message);
      setCart([]);
      setCartCount(0);
      setCartLastUpdated(Date.now());
    }
  };

  const login = async (email, password, type = 'artisan') => {
    try {
      console.log('🔐 Attempting login:', { email, type });
      const endpoint = type === 'artisan' ? '/api/artisans/login' : '/api/users/login';
      console.log('📡 Login endpoint:', endpoint);
      
      const response = await axios.post(endpoint, { email, password });
      console.log('✅ Login response received:', response.data);
      
      const { token, artisan, user } = response.data;
      const userData = artisan || user;
      
      console.log('🔍 Extracted data:', { token: !!token, userData: !!userData });
      
      if (!token || !userData) {
        console.error('❌ Missing token or user data in response');
        return { 
          success: false, 
          message: 'Invalid response from server' 
        };
      }
      
      const tokenKey = type === 'artisan' ? 'artisan_token' : 'customer_token';
      const userKey = type === 'artisan' ? 'artisan_user' : 'customer_user';
      
      localStorage.setItem(tokenKey, token);
      localStorage.setItem(userKey, JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      setUserType(type);
      
      console.log('✅ Login successful, user set:', userData);
      
      // Load cart if customer
      if (type === 'customer') {
        loadCart();
      }
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error response:', error.response?.data);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async (userData, type = 'artisan') => {
    try {
      const endpoint = type === 'artisan' ? '/api/artisans/register' : '/api/users/register';
      const response = await axios.post(endpoint, userData);
      const { token, artisan, user } = response.data;
      const responseUser = artisan || user;
      
      const tokenKey = type === 'artisan' ? 'artisan_token' : 'customer_token';
      const userKey = type === 'artisan' ? 'artisan_user' : 'customer_user';
      
      localStorage.setItem(tokenKey, token);
      localStorage.setItem(userKey, JSON.stringify(responseUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(responseUser);
      setUserType(type);
      
      return { success: true, user: responseUser };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('artisan_token');
    localStorage.removeItem('artisan_user');
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setUserType(null);
    setCart([]);
    setCartCount(0);
  };

  // Cart management functions
  const addToCart = async (productId, quantity = 1) => {
    console.log('addToCart called:', { productId, quantity, userType });
    
    if (userType !== 'customer') {
      return { success: false, message: 'Please login as a customer to add items to cart' };
    }
    
    try {
      const requestData = { variantId: productId, qty: quantity };
      console.log('Adding to cart with data:', requestData);
      
      const response = await axios.post('/api/cart/items', requestData);
      console.log('Add to cart API response:', response.data);
      
      // Handle both old and new response formats
      const isSuccess = response.data.success;
      const message = response.data.message || response.data.data?.message || (isSuccess ? 'Item added to cart' : 'Failed to add to cart');
      
      if (isSuccess) {
        console.log('Add to cart successful, reloading cart');
        await loadCart();
        return { success: true, message };
      }
      
      console.log('Add to cart failed:', message);
      return { success: false, message };
    } catch (error) {
      console.error('addToCart error:', error);
      
      // Try legacy endpoint as fallback
      try {
        console.log('Trying legacy endpoint...');
        const legacyResponse = await axios.post('/api/cart/add', { 
          productId, 
          quantity 
        });
        
        if (legacyResponse.data.success) {
          console.log('Legacy add to cart successful');
          await loadCart();
          return { success: true, message: legacyResponse.data.message || 'Item added to cart' };
        }
      } catch (legacyError) {
        console.error('Legacy endpoint also failed:', legacyError);
      }
      
      return { 
        success: false, 
        message: error.response?.data?.message || error.response?.data?.error?.details?.message || 'Failed to add to cart',
        availableStock: error.response?.data?.availableStock || error.response?.data?.error?.details?.availableStock,
        outOfStock: error.response?.data?.outOfStock || error.response?.data?.error?.details?.outOfStock
      };
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      // itemId should now be the product ID directly
      const variantId = itemId;
      
      const response = await axios.delete(`/api/cart/items/${variantId}`);
      
      if (response.data.success) {
        await loadCart();
        return { success: true, message: 'Item removed from cart' };
      }
      return { success: false, message: response.data.message || 'Failed to remove from cart' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to remove from cart' };
    }
  };

  const updateCartQuantity = async (itemId, quantity) => {
    try {
      const requestData = { variantId: itemId, qty: quantity };
      const response = await axios.post('/api/cart/items', requestData);
      
      if (response.data.success) {
        // Update local state immediately for responsive UI
        const updatedCart = cart.map(item => {
          const isMatch = item._id === itemId || item.product?._id === itemId;
          
          if (isMatch) {
            return {
              ...item,
              quantity: quantity,
              itemTotal: item.product.price * quantity
            };
          }
          return item;
        });
        
        setCart([...updatedCart]);
        setCartLastUpdated(Date.now());
        
        // Reload cart for consistency
        await loadCart();
        
        return { success: true, message: response.data.message || 'Cart updated successfully' };
      }
      
      return { success: false, message: response.data.message || 'Failed to update cart' };
    } catch (error) {
      console.error('updateCartQuantity error:', error);
      // Handle both old and new error response formats
      const errorData = error.response?.data;
      const errorDetails = errorData?.error?.details;
      
      return { 
        success: false, 
        message: errorData?.message || 'Failed to update cart',
        availableStock: errorData?.availableStock || errorDetails?.availableStock,
        outOfStock: errorData?.outOfStock || errorDetails?.outOfStock
      };
    }
  };

  // Validate cart before checkout
  const validateCart = async () => {
    if (userType !== 'customer') {
      return { success: false, message: 'Please login as a customer' };
    }
    
    try {
      const response = await axios.post('/api/cart/validate');
      return {
        success: response.data.success,
        validation: response.data.validation,
        pricing: response.data.pricing
      };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to validate cart' };
    }
  };

  // Get cart count
  const getCartCount = async () => {
    if (userType !== 'customer') {
      return { count: 0, totalItems: 0 };
    }
    
    try {
      const response = await axios.get('/api/cart/count');
      if (response.data.success) {
        return {
          count: response.data.count,
          totalItems: response.data.totalItems
        };
      }
    } catch (error) {
      console.error('Error getting cart count:', error);
    }
    return { count: 0, totalItems: 0 };
  };

  const value = {
    user,
    userType,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user,
    // Token getters
    get artisanToken() {
      return localStorage.getItem('artisan_token');
    },
    get userToken() {
      return localStorage.getItem('customer_token');
    },
    // Cart functions
    cart,
    cartCount,
    cartLastUpdated,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    loadCart,
    validateCart,
    getCartCount
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
