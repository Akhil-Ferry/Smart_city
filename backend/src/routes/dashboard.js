const express = require('express');
const { body, validationResult, query } = require('express-validator');
const SensorData = require('../models/SensorData');
const Alert = require('../models/Alert');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview data
// @access  Private
router.get('/overview', auth, async (req, res) => {
  try {
    const currentTime = new Date();
    const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);

    // Get recent sensor data summary
    const sensorSummary = await SensorData.aggregate([
      {
        $match: {
          timestamp: { $gte: oneHourAgo },
          status: 'active'
        }
      },
      {
        $group: {
          _id: '$sensorType',
          count: { $sum: 1 },
          latestReading: { $max: '$timestamp' },
          avgValue: { $avg: '$data.value' },
          locations: { $addToSet: '$location.district' }
        }
      }
    ]);

    // Get active alerts summary
    const alertSummary = await Alert.getActiveCountByCategory();

    // Get system statistics
    const systemStats = await Alert.getStatistics(24); // Last 24 hours

    // Get latest sensor readings by type
    const latestReadings = await Promise.all([
      SensorData.findOne({ sensorType: 'air_quality', status: 'active' })
        .sort({ timestamp: -1 })
        .limit(1),
      SensorData.findOne({ sensorType: 'traffic', status: 'active' })
        .sort({ timestamp: -1 })
        .limit(1),
      SensorData.findOne({ sensorType: 'energy', status: 'active' })
        .sort({ timestamp: -1 })
        .limit(1),
      SensorData.findOne({ sensorType: 'waste', status: 'active' })
        .sort({ timestamp: -1 })
        .limit(1)
    ]);

    // Calculate system health score
    const totalSensors = await SensorData.countDocuments({
      timestamp: { $gte: oneDayAgo }
    });
    const activeSensors = await SensorData.countDocuments({
      timestamp: { $gte: oneHourAgo },
      status: 'active'
    });
    const healthScore = totalSensors > 0 ? Math.round((activeSensors / totalSensors) * 100) : 100;

    res.json({
      success: true,
      data: {
        summary: {
          totalSensors,
          activeSensors,
          healthScore,
          lastUpdated: currentTime
        },
        sensorSummary,
        alertSummary,
        systemStats: systemStats[0] || {
          totalAlerts: 0,
          activeAlerts: 0,
          resolvedAlerts: 0,
          criticalAlerts: 0,
          avgResolutionTime: 0
        },
        latestReadings: {
          airQuality: latestReadings[0],
          traffic: latestReadings[1],
          energy: latestReadings[2],
          waste: latestReadings[3]
        }
      }
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard overview'
    });
  }
});

// @route   GET /api/dashboard/real-time
// @desc    Get real-time data for dashboard
// @access  Private
router.get('/real-time', auth, [
  query('type').optional().isIn(['air_quality', 'traffic', 'energy', 'waste', 'weather']),
  query('district').optional().trim(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
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

    const { type, district, limit = 10 } = req.query;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Build query
    const query = {
      timestamp: { $gte: fiveMinutesAgo },
      status: 'active'
    };

    if (type) query.sensorType = type;
    if (district) query['location.district'] = district;

    // Get real-time sensor data
    const realtimeData = await SensorData.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    // Get data trends (last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const trends = await SensorData.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyMinutesAgo },
          status: 'active',
          ...(type && { sensorType: type }),
          ...(district && { 'location.district': district })
        }
      },
      {
        $group: {
          _id: {
            sensorType: '$sensorType',
            timeWindow: {
              $dateToString: {
                format: '%Y-%m-%d %H:%M',
                date: {
                  $dateTrunc: {
                    date: '$timestamp',
                    unit: 'minute',
                    binSize: 5
                  }
                }
              }
            }
          },
          avgValue: { $avg: '$data.value' },
          count: { $sum: 1 },
          timestamp: { $max: '$timestamp' }
        }
      },
      {
        $sort: { '_id.timeWindow': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        realtimeData,
        trends,
        lastUpdated: new Date(),
        filters: { type, district, limit }
      }
    });
  } catch (error) {
    console.error('Real-time data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching real-time data'
    });
  }
});

// @route   GET /api/dashboard/map-data
// @desc    Get geospatial data for map visualization
// @access  Private
router.get('/map-data', auth, [
  query('bounds').optional().isJSON(),
  query('type').optional().isIn(['air_quality', 'traffic', 'energy', 'waste', 'weather'])
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

    const { bounds, type } = req.query;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    let geoQuery = {
      timestamp: { $gte: oneHourAgo },
      status: 'active'
    };

    // Add type filter if specified
    if (type) {
      geoQuery.sensorType = type;
    }

    // Add geographic bounds if specified
    if (bounds) {
      try {
        const boundingBox = JSON.parse(bounds);
        geoQuery.location = {
          $geoWithin: {
            $box: [
              [boundingBox.southwest.lng, boundingBox.southwest.lat],
              [boundingBox.northeast.lng, boundingBox.northeast.lat]
            ]
          }
        };
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid bounds format'
        });
      }
    }

    // Get latest data for each sensor location
    const mapData = await SensorData.aggregate([
      { $match: geoQuery },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: {
            sensorId: '$sensorId',
            coordinates: '$location.coordinates'
          },
          latestData: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: {
          newRoot: '$latestData'
        }
      }
    ]);

    // Also get active alerts with location data
    const alertsWithLocation = await Alert.find({
      status: 'active',
      'source.location.coordinates': { $exists: true, $ne: [] }
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      data: {
        sensors: mapData,
        alerts: alertsWithLocation,
        lastUpdated: new Date(),
        filters: { bounds, type }
      }
    });
  } catch (error) {
    console.error('Map data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching map data'
    });
  }
});

// @route   GET /api/dashboard/kpi
// @desc    Get Key Performance Indicators
// @access  Private
router.get('/kpi', auth, [
  query('period').optional().isIn(['hour', 'day', 'week', 'month']),
  query('category').optional().isIn(['air_quality', 'traffic', 'energy', 'waste', 'system'])
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

    const { period = 'day', category } = req.query;
    
    // Calculate time ranges
    const now = new Date();
    let timeRange, previousTimeRange;
    
    switch (period) {
      case 'hour':
        timeRange = new Date(now.getTime() - 60 * 60 * 1000);
        previousTimeRange = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        break;
      case 'week':
        timeRange = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousTimeRange = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        timeRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousTimeRange = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        break;
      default: // day
        timeRange = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        previousTimeRange = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    }

    // Build base query
    const baseQuery = {
      timestamp: { $gte: timeRange },
      status: 'active'
    };

    if (category) {
      baseQuery.sensorType = category;
    }

    // Get current period KPIs
    const currentKPIs = await SensorData.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$sensorType',
          avgValue: { $avg: '$data.value' },
          minValue: { $min: '$data.value' },
          maxValue: { $max: '$data.value' },
          count: { $sum: 1 },
          lastReading: { $max: '$timestamp' }
        }
      }
    ]);

    // Get previous period KPIs for comparison
    const previousQuery = {
      ...baseQuery,
      timestamp: { $gte: previousTimeRange, $lt: timeRange }
    };

    const previousKPIs = await SensorData.aggregate([
      { $match: previousQuery },
      {
        $group: {
          _id: '$sensorType',
          avgValue: { $avg: '$data.value' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate percentage changes
    const kpiWithChanges = currentKPIs.map(current => {
      const previous = previousKPIs.find(p => p._id === current._id);
      const change = previous ? 
        ((current.avgValue - previous.avgValue) / previous.avgValue) * 100 : 0;

      return {
        ...current,
        previousAvgValue: previous?.avgValue || 0,
        percentageChange: Math.round(change * 100) / 100,
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
      };
    });

    // Get system performance KPIs
    const systemKPIs = {
      uptime: Math.round(Math.random() * 5 + 95), // Mock uptime percentage
      dataAccuracy: Math.round(Math.random() * 5 + 95), // Mock accuracy
      responseTime: Math.round(Math.random() * 500 + 200), // Mock response time in ms
      activeDevices: await SensorData.distinct('sensorId', {
        timestamp: { $gte: timeRange },
        status: 'active'
      }).then(devices => devices.length)
    };

    res.json({
      success: true,
      data: {
        period,
        category,
        timeRange: {
          start: timeRange,
          end: now
        },
        sensorKPIs: kpiWithChanges,
        systemKPIs,
        lastUpdated: now
      }
    });
  } catch (error) {
    console.error('KPI data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching KPI data'
    });
  }
});

// @route   GET /api/dashboard/notifications
// @desc    Get recent notifications for dashboard
// @access  Private
router.get('/notifications', auth, [
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
], async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get recent alerts as notifications
    const notifications = await Alert.find({
      createdAt: { $gte: oneDayAgo },
      $or: [
        { assignedTo: req.user.id },
        { status: 'active' } // All active alerts are visible to everyone
      ]
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('alertId title description severity status createdAt source.location')
      .lean();

    // Format notifications
    const formattedNotifications = notifications.map(alert => ({
      id: alert._id,
      type: 'alert',
      title: alert.title,
      message: alert.description,
      severity: alert.severity,
      timestamp: alert.createdAt,
      isRead: false, // In a real app, you'd track read status
      metadata: {
        alertId: alert.alertId,
        location: alert.source?.location
      }
    }));

    res.json({
      success: true,
      data: {
        notifications: formattedNotifications,
        unreadCount: formattedNotifications.length,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
});

module.exports = router;