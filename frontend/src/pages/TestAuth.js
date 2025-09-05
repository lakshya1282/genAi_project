import React, { useState } from 'react';
import axios from 'axios';

const TestAuth = () => {
  const [credentials, setCredentials] = useState({
    name: 'Test Artisan',
    email: 'test@example.com',
    password: 'password123',
    phone: '1234567890',
    craftType: 'Pottery',
    location: 'Test City'
  });
  
  const [token, setToken] = useState('');
  const [response, setResponse] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleRegister = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/artisans/register', credentials);
      setResponse(JSON.stringify(res.data, null, 2));
      if (res.data.token) {
        setToken(res.data.token);
        localStorage.setItem('artisan_token', res.data.token);
        localStorage.setItem('artisan_user', JSON.stringify(res.data.artisan));
        setIsLoggedIn(true);
      }
    } catch (error) {
      setResponse(JSON.stringify(error.response?.data || error.message, null, 2));
    }
  };

  const handleLogin = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/artisans/login', {
        email: credentials.email,
        password: credentials.password
      });
      setResponse(JSON.stringify(res.data, null, 2));
      if (res.data.token) {
        setToken(res.data.token);
        localStorage.setItem('artisan_token', res.data.token);
        localStorage.setItem('artisan_user', JSON.stringify(res.data.artisan));
        setIsLoggedIn(true);
      }
    } catch (error) {
      setResponse(JSON.stringify(error.response?.data || error.message, null, 2));
    }
  };

  const testProductsEndpoint = async () => {
    try {
      const config = {
        headers: {
          'Authorization': `Bearer ${token || localStorage.getItem('artisan_token')}`
        }
      };
      const res = await axios.get('http://localhost:5000/api/artisan/products', config);
      setResponse(JSON.stringify(res.data, null, 2));
    } catch (error) {
      setResponse(JSON.stringify(error.response?.data || error.message, null, 2));
    }
  };

  const testProductCreation = async () => {
    try {
      const productData = {
        name: 'Test Handmade Vase',
        description: 'A beautiful test vase',
        price: 299.99,
        category: 'Pottery',
        materials: 'Clay, Glaze',
        stock: 5,
        lowStockThreshold: 2,
        craftingTime: '1 week'
      };

      const config = {
        headers: {
          'Authorization': `Bearer ${token || localStorage.getItem('artisan_token')}`,
          'Content-Type': 'application/json'
        }
      };

      const res = await axios.post('http://localhost:5000/api/artisan/products', productData, config);
      setResponse(JSON.stringify(res.data, null, 2));
    } catch (error) {
      setResponse(JSON.stringify(error.response?.data || error.message, null, 2));
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Artisan Authentication Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Credentials:</h3>
        <div>
          <input 
            placeholder="Name" 
            value={credentials.name} 
            onChange={(e) => setCredentials({...credentials, name: e.target.value})}
            style={{ margin: '5px', padding: '8px', width: '200px' }}
          />
          <input 
            placeholder="Email" 
            value={credentials.email} 
            onChange={(e) => setCredentials({...credentials, email: e.target.value})}
            style={{ margin: '5px', padding: '8px', width: '200px' }}
          />
        </div>
        <div>
          <input 
            type="password"
            placeholder="Password" 
            value={credentials.password} 
            onChange={(e) => setCredentials({...credentials, password: e.target.value})}
            style={{ margin: '5px', padding: '8px', width: '200px' }}
          />
          <input 
            placeholder="Phone" 
            value={credentials.phone} 
            onChange={(e) => setCredentials({...credentials, phone: e.target.value})}
            style={{ margin: '5px', padding: '8px', width: '200px' }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={handleRegister} style={{ margin: '5px', padding: '10px 15px' }}>
          Register Artisan
        </button>
        <button onClick={handleLogin} style={{ margin: '5px', padding: '10px 15px' }}>
          Login Artisan
        </button>
      </div>

      {isLoggedIn && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Test Artisan Endpoints:</h3>
          <button onClick={testProductsEndpoint} style={{ margin: '5px', padding: '10px 15px', backgroundColor: '#007bff', color: 'white' }}>
            Test Get Products
          </button>
          <button onClick={testProductCreation} style={{ margin: '5px', padding: '10px 15px', backgroundColor: '#28a745', color: 'white' }}>
            Test Create Product
          </button>
        </div>
      )}

      <div>
        <h3>Current Token:</h3>
        <textarea 
          value={token || localStorage.getItem('artisan_token') || 'No token'} 
          readOnly 
          style={{ width: '100%', height: '60px', fontFamily: 'monospace', fontSize: '12px' }}
        />
      </div>

      <div>
        <h3>Response:</h3>
        <pre style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '5px', 
          overflow: 'auto',
          maxHeight: '400px',
          fontSize: '12px'
        }}>
          {response || 'No response yet'}
        </pre>
      </div>
    </div>
  );
};

export default TestAuth;
