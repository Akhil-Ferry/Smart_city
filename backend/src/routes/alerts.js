const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Alert = require('../models/Alert');
const SensorData = require('../models/SensorData');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/alerts
// @desc    Get alerts with filtering and pagination
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['active', 'acknowledged', 'resolved', 'false_positive', 'expired']),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  query('category').optional().isIn(['air_quality', 'traffic', 'energy', 'waste', 'system', 'security']),
  query('assignedTo').optional().isMongoId(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('search').optional().trim()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      status,
      severity,
      category,
      assignedTo,
      startDate,
      endDate,
      search
    } = req.query;

    // Build query
    const query = {};

    // Role-based filtering
    if (req.user.role === 'environment_officer') {
      query.category = 'air_quality';
    } else if (req.user.role === 'utility_officer') {
      query.category = 'energy';
    } else if (req.user.role === 'traffic_control') {
      query.category = 'traffic';
    } else if (req.user.role === 'viewer') {
      // Viewers can only see acknowledged and resolved alerts
      query.status = { $in: ['acknowledged', 'resolved'] };
    }

    // Apply filters
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (category && !query.category) query.category = category; // Don't override role-based category
    if (assignedTo) query.assignedTo = assignedTo;

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Text search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'source.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get alerts with pagination
    const alerts = await Alert.find(query)
      .populate('assignedTo', 'firstName lastName email role')
      .populate('acknowledgedBy', 'firstName lastName email')
      .populate('resolvedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalAlerts = await Alert.countDocuments(query);
    const totalPages = Math.ceil(totalAlerts / limit);

    // Get summary statistics
    const summaryStats = await Alert.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAlerts: { $sum: 1 },
          activeCount: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          criticalCount: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          highCount: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          mediumCount: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
          lowCount: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        alerts,
        pagination: {
          currentPage: page,
          totalPages,
          totalAlerts,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        summary: summaryStats[0] || {
          totalAlerts: 0,
          activeCount: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0
        },
        filters: req.query
      }
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alerts'
    });
  }
});

// @route   GET /api/alerts/:id
// @desc    Get single alert by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email role department')
      .populate('acknowledgedBy', 'firstName lastName email')
      .populate('resolvedBy', 'firstName lastName email')
      .populate('relatedAlerts', 'alertId title severity status createdAt');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Check if user has permission to view this alert
    if (req.user.role === 'viewer' && !['acknowledged', 'resolved'].includes(alert.status)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view this alert'
      });
    }

    // Get related sensor data if available
    let relatedSensorData = null;
    if (alert.source.type === 'sensor' && alert.source.id) {
      relatedSensorData = await SensorData.findOne({
        sensorId: alert.source.id
      }).sort({ timestamp: -1 });
    }

    res.json({
      success: true,
      data: {
        alert,
        relatedSensorData
      }
    });
  } catch (error) {
    console.error('Get alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alert'
    });
  }
});

// @route   POST /api/alerts
// @desc    Create a new alert
// @access  Private (Admin, officers)
router.post('/', auth, authorize('admin', 'environment_officer', 'utility_officer', 'traffic_control'), [
  body('type').isIn(['threshold', 'anomaly', 'system', 'maintenance', 'security']),
  body('category').isIn(['air_quality', 'traffic', 'energy', 'waste', 'system', 'security']),
  body('severity').isIn(['low', 'medium', 'high', 'critical']),
  body('title').trim().notEmpty().isLength({ max: 200 }),
  body('description').trim().notEmpty().isLength({ max: 1000 }),
  body('source.type').isIn(['sensor', 'system', 'user', 'analytics', 'external']),
  body('source.id').notEmpty(),
  body('assignedTo').optional().isArray(),
  body('assignedTo.*').optional().isMongoId()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const alertData = {
      ...req.body,
      createdBy: req.user.id
    };

    // Create new alert
    const alert = new Alert(alertData);
    await alert.save();

    // Populate the saved alert
    await alert.populate('assignedTo', 'firstName lastName email role');

    // In a real application, you would trigger notifications here
    // notificationService.sendAlertNotifications(alert);

    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      data: { alert }
    });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating alert'
    });
  }
});

// @route   PUT /api/alerts/:id/acknowledge
// @desc    Acknowledge an alert
// @access  Private
router.put('/:id/acknowledge', auth, [
  body('notes').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { notes = '' } = req.body;

    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Check if already acknowledged
    if (alert.status === 'acknowledged') {
      return res.status(400).json({
        success: false,
        message: 'Alert is already acknowledged'
      });
    }

    // Check if alert is still active
    if (alert.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active alerts can be acknowledged'
      });
    }

    // Acknowledge the alert
    await alert.acknowledge(req.user.id, notes);

    await alert.populate('acknowledgedBy', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
      data: { alert }
    });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Error acknowledging alert'
    });
  }
});

// @route   PUT /api/alerts/:id/resolve
// @desc    Resolve an alert
// @access  Private
router.put('/:id/resolve', auth, [
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('actions').optional().isArray(),
  body('actions.*.action').notEmpty(),
  body('actions.*.notes').optional().trim()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { notes = '', actions = [] } = req.body;

    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Check if already resolved
    if (alert.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Alert is already resolved'
      });
    }

    // Prepare resolution actions
    const resolutionActions = actions.map(action => ({
      ...action,
      performedBy: req.user.id,
      performedAt: new Date()
    }));

    // Resolve the alert
    await alert.resolve(req.user.id, notes, resolutionActions);

    await alert.populate('resolvedBy', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Alert resolved successfully',
      data: { alert }
    });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving alert'
    });
  }
});

// @route   PUT /api/alerts/:id/assign
// @desc    Assign alert to users
// @access  Private (Admin, officers)
router.put('/:id/assign', auth, authorize('admin', 'environment_officer', 'utility_officer', 'traffic_control'), [
  body('assignedTo').isArray({ min: 1 }),
  body('assignedTo.*').isMongoId()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { assignedTo } = req.body;

    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Update assigned users
    alert.assignedTo = assignedTo;
    await alert.save();

    await alert.populate('assignedTo', 'firstName lastName email role');

    res.json({
      success: true,
      message: 'Alert assigned successfully',
      data: { alert }
    });
  } catch (error) {
    console.error('Assign alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning alert'
    });
  }
});

// @route   PUT /api/alerts/:id/escalate
// @desc    Escalate an alert
// @access  Private
router.put('/:id/escalate', auth, [
  body('reason').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { reason = '' } = req.body;

    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Check if alert can be escalated
    if (!['active', 'acknowledged'].includes(alert.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only active or acknowledged alerts can be escalated'
      });
    }

    // Escalate the alert
    await alert.escalate(req.user.id, reason);

    res.json({
      success: true,
      message: 'Alert escalated successfully',
      data: { alert }
    });
  } catch (error) {
    console.error('Escalate alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Error escalating alert'
    });
  }
});

// @route   DELETE /api/alerts/:id
// @desc    Delete an alert (Admin only)
// @access  Private (Admin)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    await Alert.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting alert'
    });
  }
});

// @route   GET /api/alerts/statistics/overview
// @desc    Get alert statistics overview
// @access  Private
router.get('/statistics/overview', auth, [
  query('period').optional().isIn(['day', 'week', 'month', 'year']),
  query('category').optional().isIn(['air_quality', 'traffic', 'energy', 'waste', 'system', 'security'])
], async (req, res) => {
  try {
    const { period = 'week', category } = req.query;
    
    // Calculate time range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // week
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const matchQuery = {
      createdAt: { $gte: startDate }
    };

    if (category) {
      matchQuery.category = category;
    }

    // Get comprehensive statistics
    const stats = await Alert.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalAlerts: { $sum: 1 },
          activeAlerts: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          acknowledgedAlerts: { $sum: { $cond: [{ $eq: ['$status', 'acknowledged'] }, 1, 0] } },
          resolvedAlerts: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          criticalAlerts: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          highAlerts: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          mediumAlerts: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
          lowAlerts: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $ne: ['$resolvedAt', null] },
                { $subtract: ['$resolvedAt', '$createdAt'] },
                null
              ]
            }
          }
        }
      }
    ]);

    // Get alerts by category
    const categoryStats = await Alert.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get daily trend
    const dailyTrend = await Alert.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        period,
        category,
        overview: stats[0] || {
          totalAlerts: 0,
          activeAlerts: 0,
          acknowledgedAlerts: 0,
          resolvedAlerts: 0,
          criticalAlerts: 0,
          highAlerts: 0,
          mediumAlerts: 0,
          lowAlerts: 0,
          avgResolutionTime: 0
        },
        categoryBreakdown: categoryStats,
        dailyTrend,
        lastUpdated: now
      }
    });
  } catch (error) {
    console.error('Alert statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alert statistics'
    });
  }
});

module.exports = router;