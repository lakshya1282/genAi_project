const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ErrorResponse } = require('../utils/errorResponse');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json(ErrorResponse.tokenMissing());
    }

    // Ensure JWT_SECRET is set - no fallback for security
    if (!process.env.JWT_SECRET) {
      console.error('CRITICAL: JWT_SECRET environment variable not set');
      return res.status(500).json(ErrorResponse.internalError('Server configuration error - JWT_SECRET not configured'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user and attach to request
    const userId = decoded.id || decoded.userId; // Support both formats
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(401).json(ErrorResponse.unauthorized('Token is valid but user not found'));
    }

    req.user = {
      userId: userId,
      userType: 'customer', // All users in this model are customers
      id: userId, // For compatibility
      name: user.name,
      email: user.email
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(ErrorResponse.invalidToken());
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json(ErrorResponse.unauthorized('Token expired'));
    }
    
    res.status(500).json(ErrorResponse.internalError('Server error in authentication'));
  }
};

module.exports = auth;
