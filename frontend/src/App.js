import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
// Initialize i18n
import './i18n';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import CategoryExplorer from './pages/CategoryExplorer';
import ProductDetail from './pages/ProductDetail';
import ArtisanProfile from './pages/ArtisanProfile';
import ArtisanProfileView from './components/ArtisanProfileView';
import Login from './pages/Login';
import Register from './pages/Register';
import AIAssistant from './pages/AIAssistant';
import AISearch from './pages/AISearch';
import CustomerLogin from './pages/CustomerLogin';
import CustomerRegister from './pages/CustomerRegister';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderHistory from './pages/OrderHistory';
import Notifications from './components/Notifications';
import ArtisanDashboard from './components/ArtisanDashboard';
import CustomerSettings from './pages/CustomerSettings';
import CustomerOrders from './pages/CustomerOrders';
import CustomerWishlist from './pages/CustomerWishlist';
import CustomerCoupons from './pages/CustomerCoupons';
import CustomerHelp from './pages/CustomerHelp';
import TestAuth from './pages/TestAuth';
import CartErrorBoundary from './components/CartErrorBoundary';
import CustomerAIAssistant from './components/CustomerAIAssistant';
import ArtisanAIAssistant from './components/ArtisanAIAssistant';
import ProductSearchChatbot from './components/ProductSearchChatbot';
import './App.css';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/category/:category" element={<CategoryExplorer />} />
              <Route path="/dashboard" element={<ArtisanDashboard />} />
              <Route path="/ai-assistant" element={<AIAssistant />} />
              <Route path="/ai-search" element={<AISearch />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/artisan/:id" element={<ArtisanProfile />} />
              <Route path="/artisan/:artisanId/profile" element={<ArtisanProfileView />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              {/* Customer Routes */}
              <Route path="/customer/login" element={<CustomerLogin />} />
              <Route path="/customer/register" element={<CustomerRegister />} />
              <Route path="/cart" element={
                <CartErrorBoundary>
                  <Cart />
                </CartErrorBoundary>
              } />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<OrderHistory />} />
              <Route path="/customer/settings" element={<CustomerSettings />} />
              <Route path="/customer/orders" element={<CustomerOrders />} />
              <Route path="/customer/wishlist" element={<CustomerWishlist />} />
              <Route path="/customer/coupons" element={<CustomerCoupons />} />
              <Route path="/customer/help" element={<CustomerHelp />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/test-auth" element={<TestAuth />} />
            </Routes>
          </main>
          
          {/* AI Assistant Components - Show globally when authenticated */}
          <CustomerAIAssistant />
          <ArtisanAIAssistant />
          
          {/* Global Product Search Chatbot - Enhanced with NLP */}
          <ProductSearchChatbot />
          
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
