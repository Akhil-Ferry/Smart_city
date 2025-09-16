const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private - Admin only
router.get('/', auth, authorize('admin'), [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('role').optional().isIn(['admin', 'environment_officer', 'utility_officer', 'traffic_control', 'viewer']),
  query('status').optional().isIn(['active', 'inactive', 'suspended']),
  query('search').optional().trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { page = 1, limit = 20, role, status, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    // Get users with pagination
    const users = await User.find(query)
      .select('-password -__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    // Get user statistics
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          inactiveUsers: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
          suspendedUsers: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
          roleDistribution: {
            $push: '$role'
          },
          averageLastLogin: { $avg: '$lastLogin' }
        }
      }
    ]);

    // Calculate role distribution
    const roleStats = {};
    if (stats.length > 0) {
      stats[0].roleDistribution.forEach(role => {
        roleStats[role] = (roleStats[role] || 0) + 1;
      });
    }

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        statistics: {
          total: stats[0]?.totalUsers || 0,
          active: stats[0]?.activeUsers || 0,
          inactive: stats[0]?.inactiveUsers || 0,
          suspended: stats[0]?.suspendedUsers || 0,
          roleDistribution: roleStats
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private - Admin or own profile
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user can access this profile
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findById(id)
      .select('-password -__v')
      .populate('assignedDistricts', 'name coordinates');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add activity statistics for the user
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // This would typically come from an activity log collection
    const activityStats = {
      loginCount: Math.floor(Math.random() * 50 + 10),
      averageSessionDuration: Math.floor(Math.random() * 120 + 30), // minutes
      lastActivity: user.lastLogin,
      featuresUsed: [
        'dashboard',
        'alerts',
        'reports',
        'analytics'
      ].filter(() => Math.random() > 0.3)
    };

    res.json({
      success: true,
      data: {
        user,
        activityStats
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
});

// @route   POST /api/users
// @desc    Create new user (admin only)
// @access  Private - Admin only
router.post('/', auth, authorize('admin'), [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
  body('role').isIn(['admin', 'environment_officer', 'utility_officer', 'traffic_control', 'viewer'])
    .withMessage('Invalid role'),
  body('department').trim().isLength({ min: 2, max: 100 }).withMessage('Department must be 2-100 characters'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('assignedDistricts').optional().isArray().withMessage('Assigned districts must be an array'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, role, department, phone, assignedDistricts, permissions } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role,
      department,
      phone,
      assignedDistricts: assignedDistricts || [],
      permissions: permissions || [],
      status: 'active',
      createdBy: req.user.id
    });

    await user.save();

    // Return user without password
    const userResponse = await User.findById(user._id).select('-password -__v');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private - Admin or own profile
router.put('/:id', auth, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('role').optional().isIn(['admin', 'environment_officer', 'utility_officer', 'traffic_control', 'viewer'])
    .withMessage('Invalid role'),
  body('department').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Department must be 2-100 characters'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
  body('assignedDistricts').optional().isArray().withMessage('Assigned districts must be an array'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updates = req.body;

    // Check permissions
    const isOwnProfile = req.user.id === id;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Non-admin users can only update their own profile and limited fields
    if (!isAdmin) {
      const allowedFields = ['name', 'phone', 'email'];
      const updateFields = Object.keys(updates);
      const invalidFields = updateFields.filter(field => !allowedFields.includes(field));
      
      if (invalidFields.length > 0) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Cannot update fields: ${invalidFields.join(', ')}`
        });
      }
    }

    // Check if email is already taken by another user
    if (updates.email) {
      const existingUser = await User.findOne({ 
        email: updates.email, 
        _id: { $ne: id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      id,
      { 
        ...updates,
        updatedAt: new Date(),
        updatedBy: req.user.id
      },
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
});

// @route   PUT /api/users/:id/password
// @desc    Change user password
// @access  Private - Admin or own profile
router.put('/:id/password', auth, [
  body('currentPassword').if((value, { req }) => req.user.id === req.params.id)
    .notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Check permissions
    const isOwnProfile = req.user.id === id;
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isOwnProfile) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // For own profile, verify current password
    if (isOwnProfile) {
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
    }

    // Update password
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    user.updatedBy = req.user.id;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
// @access  Private - Admin only
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete - just mark as inactive
    user.status = 'inactive';
    user.deletedAt = new Date();
    user.deletedBy = req.user.id;
    await user.save();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
});

// @route   PUT /api/users/:id/activate
// @desc    Activate/deactivate user (admin only)
// @access  Private - Admin only
router.put('/:id/activate', auth, authorize('admin'), [
  body('status').isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { 
        status,
        updatedAt: new Date(),
        updatedBy: req.user.id
      },
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User ${status} successfully`,
      data: user
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status'
    });
  }
});

// @route   GET /api/users/:id/activity
// @desc    Get user activity log (admin only)
// @access  Private - Admin only
router.get('/:id/activity', auth, authorize('admin'), [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('days').optional().isInt({ min: 1, max: 365 }).toInt()
], async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, days = 30 } = req.query;

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Mock activity data (in production, this would come from audit logs)
    const activities = [
      {
        timestamp: new Date(),
        action: 'login',
        details: 'User logged in',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...'
      },
      {
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        action: 'view_dashboard',
        details: 'Accessed main dashboard',
        ipAddress: '192.168.1.100'
      },
      {
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        action: 'create_alert',
        details: 'Created alert for air quality threshold',
        resource: 'alert_12345'
      }
    ];

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        activities,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(activities.length / limit),
          total: activities.length
        }
      }
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user activity'
    });
  }
});

module.exports = router;