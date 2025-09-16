const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided or invalid format. Access denied.',
      });
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-fallback-secret');

    // Find user by ID from token
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid - user not found.',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Access denied.',
      });
    }

    // Add user to request object
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Access denied.',
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
      });
    } else {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error in authentication.',
      });
    }
  }
};

// Authorization middleware - check for specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to access this resource.',
      });
    }

    next();
  };
};

// Permission-based authorization middleware
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // Super admin and admin have all permissions
    if (req.user.role === 'super_admin' || req.user.role === 'admin') {
      return next();
    }

    // Check if user has specific permission
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission '${permission}' required to access this resource.`,
      });
    }

    next();
  };
};

// Admin only middleware
const adminOnly = authorize('admin', 'super_admin');

// Check if user owns resource or is admin
const ownerOrAdmin = (getOwnerId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
        });
      }

      // Admins can access any resource
      if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        return next();
      }

      // Get owner ID using the provided function
      const ownerId = await getOwnerId(req);
      
      if (req.user.id.toString() !== ownerId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only access your own resources.',
        });
      }

      next();
    } catch (error) {
      console.error('Owner/Admin check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error checking resource ownership.',
      });
    }
  };
};

module.exports = {
  auth,
  authorize,
  checkPermission,
  adminOnly,
  ownerOrAdmin,
};