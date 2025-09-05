import axios from 'axios';

// Stock status constants
export const STOCK_STATUS = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  UNAVAILABLE: 'unavailable'
};

// Get stock status based on product data
export const getStockStatus = (product) => {
  if (!product) {
    return STOCK_STATUS.UNAVAILABLE;
  }
  
  if (!product.isActive || product.isOutOfStock) {
    return STOCK_STATUS.OUT_OF_STOCK;
  }

  // Use actual stock values from the product, prioritize availableStock if available
  const availableStock = product.availableStock !== undefined ? 
    product.availableStock : 
    Math.max(0, (product.stock || 0) - (product.reservedStock || 0));
  
  if (availableStock === 0) {
    return STOCK_STATUS.OUT_OF_STOCK;
  } else if (availableStock <= (product.lowStockThreshold || 5)) {
    return STOCK_STATUS.LOW_STOCK;
  } else {
    return STOCK_STATUS.IN_STOCK;
  }
};

// Get stock status display info
export const getStockDisplayInfo = (product) => {
  if (!product) {
    return {
      status: STOCK_STATUS.UNAVAILABLE,
      text: 'Unavailable',
      className: 'stock-unavailable',
      canPurchase: false,
      maxQuantity: 0
    };
  }
  
  const status = getStockStatus(product);
  // Use actual stock values from the product, prioritize availableStock if available
  const availableStock = product.availableStock !== undefined ? 
    product.availableStock : 
    Math.max(0, (product.stock || 0) - (product.reservedStock || 0));

  switch (status) {
    case STOCK_STATUS.IN_STOCK:
      return {
        status,
        text: `${availableStock} in stock`,
        className: 'stock-in-stock',
        canPurchase: true,
        maxQuantity: availableStock
      };
    case STOCK_STATUS.LOW_STOCK:
      return {
        status,
        text: `Only ${availableStock} left`,
        className: 'stock-low-stock',
        canPurchase: true,
        maxQuantity: availableStock
      };
    case STOCK_STATUS.OUT_OF_STOCK:
      return {
        status,
        text: 'Out of stock',
        className: 'stock-out-of-stock',
        canPurchase: false,
        maxQuantity: 0
      };
    default:
      return {
        status: STOCK_STATUS.UNAVAILABLE,
        text: 'Unavailable',
        className: 'stock-unavailable',
        canPurchase: false,
        maxQuantity: 0
      };
  }
};

// Validate if quantity can be added to cart
export const validateCartQuantity = async (productId, requestedQuantity, currentCartQuantity = 0) => {
  try {
    // Check stock availability through the inventory service
    const response = await axios.post('/api/cart/validate-quantity', {
      items: [{
        productId,
        quantity: requestedQuantity + currentCartQuantity
      }]
    });

    if (response.data.success) {
      const availability = response.data.availability[0];
      return {
        isValid: availability.available,
        maxQuantity: availability.availableStock,
        message: availability.available ? null : availability.reason
      };
    }
  } catch (error) {
    console.error('Error validating quantity:', error);
    return {
      isValid: false,
      maxQuantity: 0,
      message: 'Unable to validate stock availability'
    };
  }
};

// Format stock messages for user display
export const getStockMessage = (availability) => {
  // Handle undefined or null availability
  if (!availability) {
    return null;
  }

  if (availability.available) {
    return null;
  }

  switch (availability.reason) {
    case 'Product not found':
      return 'This product is no longer available';
    case 'Product not active':
      return 'This product is temporarily unavailable';
    case 'Out of stock':
      return 'This product is currently out of stock';
    case 'Insufficient quantity':
      return `Only ${availability.availableStock || 0} available`;
    default:
      return availability.reason || 'This product is not available';
  }
};

// Calculate cart summary with stock validation
export const calculateCartSummary = (cartItems) => {
  let subtotal = 0;
  let totalItems = 0;
  let availableItems = 0;
  const unavailableItems = [];

  cartItems.forEach(item => {
    totalItems += item.quantity;
    
    // Check if availability exists and item is available
    if (item.availability && item.availability.available === true) {
      subtotal += item.product.price * item.quantity;
      availableItems += item.quantity;
    } else if (item.availability && item.availability.available === false) {
      // Item has availability info but is not available
      unavailableItems.push({
        name: item.product.name,
        reason: getStockMessage(item.availability),
        quantity: item.quantity
      });
    } else {
      // No availability info - assume available for MVP
      subtotal += item.product.price * item.quantity;
      availableItems += item.quantity;
    }
  });

  const shippingCost = subtotal > 2000 ? 0 : 100;
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + shippingCost + tax;

  return {
    subtotal,
    shippingCost,
    tax,
    total,
    totalItems,
    availableItems,
    unavailableItems,
    allAvailable: unavailableItems.length === 0
  };
};

// Check if user can proceed to checkout
export const canProceedToCheckout = (cartSummary) => {
  return cartSummary.availableItems > 0 && cartSummary.allAvailable;
};

// Get quantity bounds for a product
export const getQuantityBounds = (product, currentCartQuantity = 0) => {
  if (!product) {
    return {
      min: 0,
      max: 0,
      step: 1,
      canPurchase: false
    };
  }
  
  try {
    const stockInfo = getStockDisplayInfo(product);
    
    return {
      min: stockInfo.canPurchase ? 1 : 0,
      max: Math.max(0, stockInfo.maxQuantity - currentCartQuantity),
      step: 1,
      canPurchase: stockInfo.canPurchase && stockInfo.maxQuantity > currentCartQuantity
    };
  } catch (error) {
    console.error('Error calculating quantity bounds:', error);
    return {
      min: 1,
      max: 100,
      step: 1,
      canPurchase: true
    };
  }
};

// Debounced stock check function
let stockCheckTimeout;
export const debouncedStockCheck = (callback, delay = 500) => {
  clearTimeout(stockCheckTimeout);
  stockCheckTimeout = setTimeout(callback, delay);
};
