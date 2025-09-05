/**
 * Centralized Error Response Utility
 * Provides consistent error response format across the application
 */

class ErrorResponse {
  /**
   * Creates a standardized error response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} errorCode - Application-specific error code
   * @param {object} details - Additional error details
   */
  static create(message, statusCode = 500, errorCode = null, details = null) {
    const errorResponse = {
      success: false,
      message,
      error: {
        statusCode,
        timestamp: new Date().toISOString(),
      }
    };

    if (errorCode) {
      errorResponse.error.code = errorCode;
    }

    if (details) {
      errorResponse.error.details = details;
    }

    return errorResponse;
  }

  /**
   * Common error responses
   */
  static badRequest(message = 'Bad Request', details = null) {
    return this.create(message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Unauthorized') {
    return this.create(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden') {
    return this.create(message, 403, 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found') {
    return this.create(message, 404, 'NOT_FOUND');
  }

  static conflict(message = 'Conflict', details = null) {
    return this.create(message, 409, 'CONFLICT', details);
  }

  static validationError(message = 'Validation failed', details = null) {
    return this.create(message, 422, 'VALIDATION_ERROR', details);
  }

  static internalError(message = 'Internal server error') {
    return this.create(message, 500, 'INTERNAL_ERROR');
  }

  static serviceUnavailable(message = 'Service unavailable') {
    return this.create(message, 503, 'SERVICE_UNAVAILABLE');
  }

  /**
   * Cart specific errors
   */
  static insufficientStock(availableStock, requestedQty, productName = 'Product') {
    return this.create(
      `Insufficient stock for ${productName}`,
      409,
      'INSUFFICIENT_STOCK',
      {
        availableStock,
        requestedQuantity: requestedQty,
        productName
      }
    );
  }

  static cartEmpty() {
    return this.create('Cart is empty', 400, 'CART_EMPTY');
  }

  /**
   * Authentication specific errors
   */
  static invalidToken() {
    return this.create('Invalid or expired token', 401, 'INVALID_TOKEN');
  }

  static tokenMissing() {
    return this.create('Authentication token is required', 401, 'TOKEN_MISSING');
  }

  /**
   * Database specific errors
   */
  static mongoError(error) {
    let message = 'Database error occurred';
    let code = 'DATABASE_ERROR';

    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      message = `${field} already exists`;
      code = 'DUPLICATE_KEY';
    }

    return this.create(message, 500, code, { mongoError: error.message });
  }
}

/**
 * Success Response Utility
 */
class SuccessResponse {
  static create(message, data = null, meta = null) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };

    if (data !== null) {
      response.data = data;
    }

    if (meta) {
      response.meta = meta;
    }

    return response;
  }

  static ok(message = 'Success', data = null) {
    return this.create(message, data);
  }

  static created(message = 'Resource created successfully', data = null) {
    return this.create(message, data, { statusCode: 201 });
  }

  static updated(message = 'Resource updated successfully', data = null) {
    return this.create(message, data);
  }

  static deleted(message = 'Resource deleted successfully') {
    return this.create(message);
  }
}

module.exports = { ErrorResponse, SuccessResponse };
