const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { ErrorResponse, SuccessResponse } = require('../utils/errorResponse');

class CartController {
  // Get user's cart
  static async getCart(req, res) {
    try {
      const userId = req.user.id;
      
      let cart = await Cart.findOne({ userId }).populate({
        path: 'items.variantId',
        populate: {
          path: 'artisan',
          select: 'name location'
        }
      });

      if (!cart) {
        cart = await Cart.findOrCreateCart(userId);
      }

      // Ensure cart.items is an array
      if (!Array.isArray(cart.items)) {
        cart.items = [];
        await cart.save();
      }

      // Validate items and update prices if needed
      const validatedItems = [];
      let hasChanges = false;

      for (const item of cart.items) {
        const product = item.variantId;
        
        if (!product || !product.isActive) {
          // Remove inactive products
          hasChanges = true;
          continue;
        }

        // Check if price has changed (convert product price to cents)
        const currentPriceCents = Math.round(product.price * 100);
        if (item.unitPriceCents !== currentPriceCents) {
          item.unitPriceCents = currentPriceCents;
          hasChanges = true;
        }

// Simple stock info without reservations
        const stockInfo = {
          totalStock: product.quantityAvailable + product.quantitySold,
          availableStock: product.quantityAvailable,
          reservedByOthers: 0,
          userReservation: null,
          isOutOfStock: product.isOutOfStock,
          isLowStock: product.quantityAvailable <= product.lowStockThreshold,
          stockStatus: product.isOutOfStock ? 'out_of_stock' : 
                      product.quantityAvailable <= product.lowStockThreshold ? 'low_stock' : 'in_stock'
        };
        
        const isAvailable = product.isQuantityAvailable ? 
          product.isQuantityAvailable(item.qty) : 
          product.quantityAvailable >= item.qty && product.isActive && !product.isOutOfStock;
        
        validatedItems.push({
          _id: item._id,
          product: {
            _id: product._id,
            name: product.name,
            price: product.price,
            images: product.images,
            category: product.category,
            artisan: product.artisan,
            quantityAvailable: product.quantityAvailable,
            availableStock: stockInfo.availableStock,
            totalStock: stockInfo.totalStock,
            reservedByOthers: stockInfo.reservedByOthers,
            isActive: product.isActive,
            stockStatus: stockInfo.stockStatus,
            isLowStock: stockInfo.isLowStock
          },
          qty: item.qty,
          unitPriceCents: item.unitPriceCents,
          unitPrice: item.unitPriceCents / 100,
          itemTotal: (item.unitPriceCents * item.qty) / 100,
          addedAt: item.addedAt,
          availability: {
            isAvailable,
            availableStock: stockInfo.availableStock,
            totalStock: stockInfo.totalStock,
            reservedByOthers: stockInfo.reservedByOthers,
            userReservation: stockInfo.userReservation,
            stockStatus: stockInfo.stockStatus,
            reason: !isAvailable ? (
              !product.isActive ? 'Product not available' :
              stockInfo.isOutOfStock ? 'Out of stock' :
              stockInfo.availableStock < item.qty ? `Only ${stockInfo.availableStock} available` : 'Unknown'
            ) : null
          }
        });
      }

      // Update cart if there were changes
      if (hasChanges) {
        cart.items = cart.items.filter(item => 
          item.variantId && item.variantId.isActive
        );
        cart.calculateTotals();
        await cart.save();
      }

      res.json({
        success: true,
        cart: {
          _id: cart._id,
          userId: cart.userId,
          items: validatedItems,
          totals: {
            itemsTotal: cart.totals.itemsTotal / 100,
            shippingEstimate: cart.totals.shippingEstimate / 100,
            taxEstimate: cart.totals.taxEstimate / 100,
            grandTotal: cart.totals.grandTotal / 100,
            itemsTotalCents: cart.totals.itemsTotal,
            shippingEstimateCents: cart.totals.shippingEstimate,
            taxEstimateCents: cart.totals.taxEstimate,
            grandTotalCents: cart.totals.grandTotal
          },
          appliedCoupons: cart.appliedCoupons,
          itemCount: cart.getItemCount(),
          updatedAt: cart.updatedAt
        }
      });
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json(ErrorResponse.internalError('Error fetching cart'));
    }
  }

  // Add or update item in cart
  static async addOrUpdateItem(req, res) {
    try {
      console.log('=== addOrUpdateItem called ===');
      console.log('Request body:', req.body);
      console.log('User:', req.user);
      
      const userId = req.user.id;
      const { variantId, qty } = req.body;

      console.log('Extracted data:', { userId, variantId, qty });

      if (!variantId || !qty || qty < 1) {
        console.log('Validation failed: missing variantId or qty');
        return res.status(400).json(ErrorResponse.badRequest('Valid variantId and quantity are required', { variantId, qty }));
      }

      // Validate product exists and get current price
      console.log('Finding product:', variantId);
      const product = await Product.findById(variantId).populate('artisan');
      if (!product) {
        console.log('Product not found:', variantId);
        return res.status(404).json(ErrorResponse.notFound('Product not found'));
      }

      console.log('Product found:', { name: product.name, quantityAvailable: product.quantityAvailable });

      if (!product.isActive) {
        console.log('Product is not active');
        return res.status(400).json(ErrorResponse.badRequest('Product is not available'));
      }

      // Simple stock check
      console.log('Checking stock availability...');
      const simpleAvailableStock = product.quantityAvailable;
      console.log('Simple available stock:', simpleAvailableStock);
      
      if (simpleAvailableStock < qty) {
        console.log('Insufficient stock - simple check failed');
        return res.status(409).json(ErrorResponse.insufficientStock(simpleAvailableStock, qty, product.name));
      }

      // Get current price in cents to prevent price tampering
      const currentPriceCents = Math.round(product.price * 100);
      console.log('Price in cents:', currentPriceCents);

      // Find or create cart
      console.log('Finding or creating cart for user:', userId);
      let cart = await Cart.findOrCreateCart(userId);
      console.log('Cart found/created:', cart._id);

      // Add or update item
      console.log('Adding item to cart...');
      cart.addOrUpdateItem(variantId, qty, currentPriceCents);
      await cart.save();
      console.log('Cart saved successfully');

      res.json(SuccessResponse.ok('Item added to cart successfully', {
        cart: {
          itemCount: cart.getItemCount(),
          totals: {
            itemsTotal: cart.totals.itemsTotal / 100,
            grandTotal: cart.totals.grandTotal / 100
          }
        }
      }));
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(500).json(ErrorResponse.internalError('Error adding item to cart'));
    }
  }

  // Remove item from cart
  static async removeItem(req, res) {
    try {
      const userId = req.user.id;
      const { variantId } = req.params;

      if (!variantId) {
        return res.status(400).json({
          success: false,
          message: 'Variant ID is required'
        });
      }

      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }

      // Check if item exists in cart
      const itemExists = cart.items.some(item => 
        item.variantId.toString() === variantId
      );

      if (!itemExists) {
        return res.status(404).json({
          success: false,
          message: 'Item not found in cart'
        });
      }

      // Remove item
      cart.removeItem(variantId);
      await cart.save();

      res.json({
        success: true,
        message: 'Item removed from cart successfully',
        cart: {
          itemCount: cart.getItemCount(),
          totals: {
            itemsTotal: cart.totals.itemsTotal / 100,
            grandTotal: cart.totals.grandTotal / 100
          }
        }
      });
    } catch (error) {
      console.error('Remove from cart error:', error);
      res.status(500).json({
        success: false,
        message: 'Error removing item from cart',
        error: error.message
      });
    }
  }

  // Apply coupon (stub implementation)
  static async applyCoupon(req, res) {
    try {
      const userId = req.user.id;
      const { couponCode } = req.body;

      if (!couponCode) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code is required'
        });
      }

      // Stub implementation - in real application, validate against coupon database
      const validCoupons = {
        'WELCOME10': { discount: 10, type: 'percentage', description: '10% off on first order' },
        'FLAT100': { discount: 10000, type: 'fixed', description: 'Flat ₹100 off' }  // 100 in paise
      };

      const coupon = validCoupons[couponCode.toUpperCase()];
      if (!coupon) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coupon code'
        });
      }

      const cart = await Cart.findOne({ userId });
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cart is empty'
        });
      }

      // Check if coupon is already applied
      const isCouponApplied = cart.appliedCoupons.some(c => c.code === couponCode.toUpperCase());
      if (isCouponApplied) {
        return res.status(400).json({
          success: false,
          message: 'Coupon already applied'
        });
      }

      // Apply coupon
      cart.appliedCoupons.push({
        code: couponCode.toUpperCase(),
        discount: coupon.discount,
        type: coupon.type
      });

      cart.calculateTotals();
      await cart.save();

      res.json({
        success: true,
        message: `Coupon "${couponCode.toUpperCase()}" applied successfully`,
        coupon: {
          code: couponCode.toUpperCase(),
          description: coupon.description,
          discount: coupon.type === 'percentage' ? `${coupon.discount}%` : `₹${coupon.discount / 100}`
        },
        cart: {
          totals: {
            itemsTotal: cart.totals.itemsTotal / 100,
            shippingEstimate: cart.totals.shippingEstimate / 100,
            taxEstimate: cart.totals.taxEstimate / 100,
            grandTotal: cart.totals.grandTotal / 100
          },
          appliedCoupons: cart.appliedCoupons
        }
      });
    } catch (error) {
      console.error('Apply coupon error:', error);
      res.status(500).json({
        success: false,
        message: 'Error applying coupon',
        error: error.message
      });
    }
  }

  // Remove coupon
  static async removeCoupon(req, res) {
    try {
      const userId = req.user.id;
      const { couponCode } = req.params;

      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }

      // Remove coupon
      const initialLength = cart.appliedCoupons.length;
      cart.appliedCoupons = cart.appliedCoupons.filter(c => c.code !== couponCode.toUpperCase());
      
      if (cart.appliedCoupons.length === initialLength) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found in cart'
        });
      }

      cart.calculateTotals();
      await cart.save();

      res.json({
        success: true,
        message: 'Coupon removed successfully',
        cart: {
          totals: {
            itemsTotal: cart.totals.itemsTotal / 100,
            shippingEstimate: cart.totals.shippingEstimate / 100,
            taxEstimate: cart.totals.taxEstimate / 100,
            grandTotal: cart.totals.grandTotal / 100
          },
          appliedCoupons: cart.appliedCoupons
        }
      });
    } catch (error) {
      console.error('Remove coupon error:', error);
      res.status(500).json({
        success: false,
        message: 'Error removing coupon',
        error: error.message
      });
    }
  }

  // Clear cart
  static async clearCart(req, res) {
    try {
      const userId = req.user.id;
      
      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }

      cart.clearCart();
      await cart.save();

      res.json({
        success: true,
        message: 'Cart cleared successfully',
        cart: {
          itemCount: 0,
          totals: {
            itemsTotal: 0,
            shippingEstimate: 0,
            taxEstimate: 0,
            grandTotal: 0
          }
        }
      });
    } catch (error) {
      console.error('Clear cart error:', error);
      res.status(500).json({
        success: false,
        message: 'Error clearing cart',
        error: error.message
      });
    }
  }

  // Get cart item count
  static async getCartCount(req, res) {
    try {
      const userId = req.user.id;
      
      const cart = await Cart.findOne({ userId });
      const itemCount = cart ? cart.getItemCount() : 0;
      const itemsInCart = cart ? cart.items.length : 0;

      res.json({
        success: true,
        count: itemsInCart,
        totalItems: itemCount
      });
    } catch (error) {
      console.error('Get cart count error:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting cart count',
        error: error.message
      });
    }
  }
}

module.exports = CartController;
