import React, { useState } from 'react';
import ProductList from './ProductList';
import AddProductForm from './AddProductForm';
import EditProductForm from './EditProductForm';
import './ProductManagement.css';

const ProductManagement = () => {
  const [currentView, setCurrentView] = useState('list');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAddProduct = () => {
    setCurrentView('add');
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setCurrentView('edit');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedProduct(null);
    // Trigger refresh of product list
    setRefreshTrigger(prev => prev + 1);
  };

  const handleProductAdded = (newProduct) => {
    // Show success message or notification here if needed
    console.log('Product added successfully:', newProduct);
    handleBackToList();
  };

  const handleProductUpdated = (updatedProduct) => {
    // Show success message or notification here if needed
    console.log('Product updated successfully:', updatedProduct);
    handleBackToList();
  };

  const renderContent = () => {
    switch (currentView) {
      case 'add':
        return (
          <AddProductForm
            onCancel={handleBackToList}
            onSuccess={handleProductAdded}
          />
        );
      
      case 'edit':
        return (
          <EditProductForm
            product={selectedProduct}
            onCancel={handleBackToList}
            onSuccess={handleProductUpdated}
          />
        );
      
      case 'list':
      default:
        return (
          <ProductList
            key={refreshTrigger} // Force re-render when refreshTrigger changes
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
          />
        );
    }
  };

  return (
    <div className="product-management-container">
      {renderContent()}
    </div>
  );
};

export default ProductManagement;
