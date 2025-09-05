const Product = require('../models/Product');
const notificationService = require('./notificationService');

class InventoryService {
  // Reserve stock for items in cart (with timeout)
  async reserveStock(items, userId, timeoutMinutes = 15) {
    const reservations = [];
    const errors = [];

    try {
      for (const item of items) {
        const product = await Product.findById(item.productId);
        
        if (!product) {
          errors.push(`Product ${item.productId} not found`);
          continue;
        }

        if (!product.isQuantityAvailable(item.quantity)) {
          errors.push(`${product.name} - Insufficient stock. Available: ${product.quantityAvailable}, Requested: ${item.quantity}`);
          continue;
        }

        // No reservation needed in the new system
        reservations.push({
          productId: item.productId,
          quantity: item.quantity,
          reservedAt: new Date(),
          userId,
          timeoutAt: new Date(Date.now() + timeoutMinutes * 60 * 1000)
        });
      }

      if (errors.length > 0) {
        // Release any successful reservations if there were errors
        await this.releaseReservations(reservations);
        return {
          success: false,
          errors,
          message: 'Some items could not be reserved'
        };
      }

      // Set timeout to release reservations automatically
      setTimeout(async () => {
        await this.releaseReservations(reservations);
      }, timeoutMinutes * 60 * 1000);

      return {
        success: true,
        reservations,
        message: `Stock reserved for ${timeoutMinutes} minutes`
      };
    } catch (error) {
      // Release any successful reservations
      await this.releaseReservations(reservations);
      throw error;
    }
  }

  // Release stock reservations (deprecated - no longer used)
  async releaseReservations(reservations) {
    // No-op since we don't use reservations anymore
    console.log('releaseReservations called but reservations are disabled');
  }

  // Confirm stock reduction after successful payment
  async confirmStockReduction(orderItems) {
    const results = [];

    for (const item of orderItems) {
      try {
        const product = await Product.findById(item.product);
        if (product) {
          // Stock reduction is now handled at order creation
          // Just check for notifications
          if (product.quantityAvailable <= product.lowStockThreshold && product.quantityAvailable > 0) {
            await this.notifyLowStock(product);
          }
          
          // Notify if out of stock
          if (product.quantityAvailable === 0) {
            await this.notifyOutOfStock(product);
          }

          results.push({
            productId: item.product,
            success: true,
          newStock: product.quantityAvailable
          });
        }
      } catch (error) {
        results.push({
          productId: item.product,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Restore stock (for cancelled orders)
  async restoreStock(orderItems) {
    const results = [];

    for (const item of orderItems) {
      try {
        const product = await Product.findByIdAndUpdate(
          item.product,
          {
            $inc: { quantityAvailable: item.quantity, quantitySold: -item.quantity },
            $set: { isOutOfStock: false }
          },
          { new: true }
        );

        if (product) {
          results.push({
            productId: item.product,
            success: true,
            newStock: product.quantityAvailable
          });

          // Notify artisan that stock is back
          await this.notifyStockRestored(product, item.quantity);
        }
      } catch (error) {
        results.push({
          productId: item.product,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Check stock availability for multiple items
  async checkStockAvailability(items) {
    const results = [];

    for (const item of items) {
      try {
        const product = await Product.findById(item.productId).select('name quantityAvailable isActive isOutOfStock');
        
        if (!product) {
          results.push({
            productId: item.productId,
            available: false,
            reason: 'Product not found'
          });
          continue;
        }

        const isAvailable = product.isQuantityAvailable(item.quantity);
        results.push({
          productId: item.productId,
          productName: product.name,
          requested: item.quantity,
          available: isAvailable,
          availableStock: product.quantityAvailable,
          reason: !isAvailable ? 
            (!product.isActive ? 'Product not active' : 
             product.isOutOfStock ? 'Out of stock' : 
             'Insufficient quantity') : null
        });
      } catch (error) {
        results.push({
          productId: item.productId,
          available: false,
          reason: error.message
        });
      }
    }

    return results;
  }

  // Get low stock products for an artisan
  async getLowStockProducts(artisanId) {
    try {
      const products = await Product.find({
        artisan: artisanId,
        isActive: true,
        $expr: { $lte: ['$quantityAvailable', '$lowStockThreshold'] }
      }).select('name quantityAvailable lowStockThreshold isOutOfStock');

      return {
        success: true,
        products: products.map(product => ({
          ...product.toObject(),
          availableStock: product.quantityAvailable,
          isLowStock: product.quantityAvailable <= product.lowStockThreshold
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update stock for a product (for artisan dashboard)
  async updateStock(productId, newStock, artisanId) {
    try {
      const product = await Product.findOne({
        _id: productId,
        artisan: artisanId
      });

      if (!product) {
        return {
          success: false,
          message: 'Product not found or access denied'
        };
      }

      const oldStock = product.quantityAvailable;
      product.quantityAvailable = Math.max(0, newStock);
      await product.save();

      return {
        success: true,
        message: 'Stock updated successfully',
        oldStock,
        newStock: product.quantityAvailable,
        isOutOfStock: product.isOutOfStock
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Notify artisan about low stock
  async notifyLowStock(product) {
    try {
      await notificationService.createNotification(
        product.artisan,
        'low_stock_alert',
        'Low Stock Alert',
        `Your product "${product.name}" is running low on stock. Current stock: ${product.quantityAvailable}`,
        {
          product: product._id,
          currentStock: product.quantityAvailable,
          threshold: product.lowStockThreshold,
          actionUrl: `/dashboard/products/${product._id}/edit`
        },
        'medium'
      );
    } catch (error) {
      console.error('Error sending low stock notification:', error);
    }
  }

  // Notify artisan about out of stock
  async notifyOutOfStock(product) {
    try {
      await notificationService.createNotification(
        product.artisan,
        'out_of_stock_alert',
        'Product Out of Stock',
        `Your product "${product.name}" is now out of stock. Please restock to continue sales.`,
        {
          product: product._id,
          actionUrl: `/dashboard/products/${product._id}/edit`
        },
        'high'
      );
    } catch (error) {
      console.error('Error sending out of stock notification:', error);
    }
  }

  // Notify artisan about stock restored
  async notifyStockRestored(product, restoredQuantity) {
    try {
      await notificationService.createNotification(
        product.artisan,
        'stock_restored',
        'Stock Restored',
        `Stock for "${product.name}" has been restored by ${restoredQuantity} units due to order cancellation. Current stock: ${product.quantityAvailable}`,
        {
          product: product._id,
          restoredQuantity,
          currentStock: product.quantityAvailable,
          actionUrl: `/dashboard/products/${product._id}`
        },
        'low'
      );
    } catch (error) {
      console.error('Error sending stock restored notification:', error);
    }
  }

  // Bulk stock update (for artisan dashboard)
  async bulkUpdateStock(updates, artisanId) {
    const results = [];

    for (const update of updates) {
      const result = await this.updateStock(update.productId, update.newStock, artisanId);
      results.push({
        productId: update.productId,
        ...result
      });
    }

    return results;
  }

  // Get inventory summary for artisan
  async getInventorySummary(artisanId) {
    try {
      const products = await Product.find({
        artisan: artisanId,
        isActive: true
      }).select('name quantityAvailable lowStockThreshold isOutOfStock price');

      const summary = {
        totalProducts: products.length,
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
        totalValue: 0,
        products: []
      };

      products.forEach(product => {
        const availableStock = product.quantityAvailable;
        const isLowStock = availableStock <= product.lowStockThreshold && availableStock > 0;
        const isOutOfStock = product.quantityAvailable === 0;

        if (isOutOfStock) {
          summary.outOfStock++;
        } else if (isLowStock) {
          summary.lowStock++;
        } else {
          summary.inStock++;
        }

        summary.totalValue += product.quantityAvailable * product.price;

        summary.products.push({
          id: product._id,
          name: product.name,
          stock: product.quantityAvailable,
          availableStock,
          reservedStock: 0, // No reservations in new system
          lowStockThreshold: product.lowStockThreshold,
          isLowStock,
          isOutOfStock,
          price: product.price,
          value: product.quantityAvailable * product.price
        });
      });

      return {
        success: true,
        summary
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new InventoryService();
