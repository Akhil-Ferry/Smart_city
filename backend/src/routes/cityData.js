const express = require('express');
const { body, validationResult, query } = require('express-validator');
const SensorData = require('../models/SensorData');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/city-data/sensors
// @desc    Get sensor data with filtering and pagination
// @access  Private
router.get('/sensors', auth, [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 1000 }).toInt(),
  query('sensorType').optional().isIn(['air_quality', 'traffic', 'energy', 'waste', 'weather']),
  query('sensorId').optional().trim(),
  query('district').optional().trim(),
  query('status').optional().isIn(['active', 'inactive', 'maintenance', 'error']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('latest').optional().isBoolean()
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
      limit = 50,
      sensorType,
      sensorId,
      district,
      status,
      startDate,
      endDate,
      latest = false
    } = req.query;

    // Build query
    const query = {};

    if (sensorType) query.sensorType = sensorType;
    if (sensorId) query.sensorId = sensorId;
    if (district) query['location.district'] = district;
    if (status) query.status = status;

    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // If latest is true, get the most recent data for each sensor
    if (latest) {
      const latestData = await SensorData.aggregate([
        { $match: query },
        { $sort: { timestamp: -1 } },
        {
          $group: {
            _id: '$sensorId',
            latestReading: { $first: '$$ROOT' }
          }
        },
        { $replaceRoot: { newRoot: '$latestReading' } },
        { $sort: { timestamp: -1 } },
        { $limit: limit }
      ]);

      return res.json({
        success: true,
        data: {
          sensorData: latestData,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalRecords: latestData.length
          },
          filters: req.query
        }
      });
    }

    // Regular paginated query
    const skip = (page - 1) * limit;

    const sensorData = await SensorData.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalRecords = await SensorData.countDocuments(query);
    const totalPages = Math.ceil(totalRecords / limit);

    res.json({
      success: true,
      data: {
        sensorData,
        pagination: {
          currentPage: page,
          totalPages,
          totalRecords,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        filters: req.query
      }
    });
  } catch (error) {
    console.error('Get sensor data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sensor data'
    });
  }
});

// @route   POST /api/city-data/sensors
// @desc    Add new sensor data (IoT devices or manual entry)
// @access  Private (Admin, officers)
router.post('/sensors', auth, authorize('admin', 'environment_officer', 'utility_officer', 'traffic_control'), [
  body('sensorId').trim().notEmpty(),
  body('sensorType').isIn(['air_quality', 'traffic', 'energy', 'waste', 'weather']),
  body('location.coordinates').isArray({ min: 2, max: 2 }),
  body('location.coordinates.*').isFloat(),
  body('data').isObject(),
  body('timestamp').optional().isISO8601()
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

    const sensorDataEntry = new SensorData({
      ...req.body,
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date()
    });

    await sensorDataEntry.save();

    res.status(201).json({
      success: true,
      message: 'Sensor data added successfully',
      data: { sensorData: sensorDataEntry }
    });
  } catch (error) {
    console.error('Add sensor data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding sensor data'
    });
  }
});

// @route   POST /api/city-data/sensors/bulk
// @desc    Add multiple sensor data entries (bulk upload)
// @access  Private (Admin, officers)
router.post('/sensors/bulk', auth, authorize('admin', 'environment_officer', 'utility_officer', 'traffic_control'), [
  body('sensorData').isArray({ min: 1, max: 1000 }),
  body('sensorData.*.sensorId').trim().notEmpty(),
  body('sensorData.*.sensorType').isIn(['air_quality', 'traffic', 'energy', 'waste', 'weather']),
  body('sensorData.*.location.coordinates').isArray({ min: 2, max: 2 }),
  body('sensorData.*.data').isObject()
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

    const { sensorData } = req.body;

    // Add timestamps to entries that don't have them
    const processedData = sensorData.map(entry => ({
      ...entry,
      timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date()
    }));

    const result = await SensorData.insertMany(processedData, { ordered: false });

    res.status(201).json({
      success: true,
      message: `${result.length} sensor data entries added successfully`,
      data: {
        insertedCount: result.length,
        insertedIds: result.map(doc => doc._id)
      }
    });
  } catch (error) {
    console.error('Bulk add sensor data error:', error);
    
    // Handle bulk write errors
    if (error.writeErrors) {
      return res.status(400).json({
        success: false,
        message: 'Some entries failed to insert',
        data: {
          insertedCount: error.result.insertedCount,
          errors: error.writeErrors
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error adding bulk sensor data'
    });
  }
});

// @route   GET /api/city-data/analytics/trends
// @desc    Get data trends and analytics
// @access  Private
router.get('/analytics/trends', auth, [
  query('sensorType').optional().isIn(['air_quality', 'traffic', 'energy', 'waste', 'weather']),
  query('district').optional().trim(),
  query('period').optional().isIn(['hour', 'day', 'week', 'month']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('aggregation').optional().isIn(['avg', 'min', 'max', 'sum', 'count'])
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
      sensorType,
      district,
      period = 'day',
      startDate,
      endDate,
      aggregation = 'avg'
    } = req.query;

    // Calculate default date range if not provided
    const endDateTime = endDate ? new Date(endDate) : new Date();
    let startDateTime;
    
    if (startDate) {
      startDateTime = new Date(startDate);
    } else {
      // Default to last 30 days
      startDateTime = new Date(endDateTime.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build match query
    const matchQuery = {
      timestamp: { $gte: startDateTime, $lte: endDateTime },
      status: 'active'
    };

    if (sensorType) matchQuery.sensorType = sensorType;
    if (district) matchQuery['location.district'] = district;

    // Determine grouping format based on period
    let dateFormat;
    switch (period) {
      case 'hour':
        dateFormat = '%Y-%m-%d %H:00';
        break;
      case 'week':
        dateFormat = '%Y-W%U'; // Year-Week
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default: // day
        dateFormat = '%Y-%m-%d';
    }

    // Build aggregation pipeline
    const pipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: {
            period: {
              $dateToString: {
                format: dateFormat,
                date: '$timestamp'
              }
            },
            sensorType: '$sensorType',
            district: '$location.district'
          },
          count: { $sum: 1 },
          avgValue: { $avg: '$data.value' },
          minValue: { $min: '$data.value' },
          maxValue: { $max: '$data.value' },
          sumValue: { $sum: '$data.value' },
          firstTimestamp: { $min: '$timestamp' },
          lastTimestamp: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          period: '$_id.period',
          sensorType: '$_id.sensorType',
          district: '$_id.district',
          count: 1,
          value: `$${aggregation}Value`,
          firstTimestamp: 1,
          lastTimestamp: 1
        }
      },
      { $sort: { period: 1 } }
    ];

    const trends = await SensorData.aggregate(pipeline);

    // Calculate summary statistics
    const summaryStats = await SensorData.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$sensorType',
          totalReadings: { $sum: 1 },
          avgValue: { $avg: '$data.value' },
          minValue: { $min: '$data.value' },
          maxValue: { $max: '$data.value' },
          uniqueSensors: { $addToSet: '$sensorId' },
          latestReading: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          sensorType: '$_id',
          totalReadings: 1,
          avgValue: 1,
          minValue: 1,
          maxValue: 1,
          uniqueSensorsCount: { $size: '$uniqueSensors' },
          latestReading: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        trends,
        summary: summaryStats,
        filters: {
          sensorType,
          district,
          period,
          aggregation,
          startDate: startDateTime,
          endDate: endDateTime
        },
        metadata: {
          totalDataPoints: trends.reduce((sum, trend) => sum + trend.count, 0),
          dateRange: { start: startDateTime, end: endDateTime }
        }
      }
    });
  } catch (error) {
    console.error('Analytics trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics trends'
    });
  }
});

// @route   GET /api/city-data/export
// @desc    Export sensor data to CSV/JSON
// @access  Private
router.get('/export', auth, [
  query('format').optional().isIn(['csv', 'json']),
  query('sensorType').optional().isIn(['air_quality', 'traffic', 'energy', 'waste', 'weather']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 10000 }).toInt()
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
      format = 'json',
      sensorType,
      startDate,
      endDate,
      limit = 1000
    } = req.query;

    // Build query
    const query = {};
    if (sensorType) query.sensorType = sensorType;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Get data
    const data = await SensorData.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = 'sensorId,sensorType,timestamp,location_lat,location_lng,district,value,status\n';
      const csvRows = data.map(row => {
        const coords = row.location?.coordinates || [0, 0];
        return [
          row.sensorId,
          row.sensorType,
          row.timestamp.toISOString(),
          coords[1], // latitude
          coords[0], // longitude
          row.location?.district || '',
          JSON.stringify(row.data),
          row.status
        ].join(',');
      }).join('\n');

      const csvContent = csvHeader + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="sensor_data_${Date.now()}.csv"`);
      res.send(csvContent);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="sensor_data_${Date.now()}.json"`);
      res.json({
        success: true,
        data: {
          sensorData: data,
          exportInfo: {
            format,
            recordCount: data.length,
            exportedAt: new Date(),
            filters: { sensorType, startDate, endDate, limit }
          }
        }
      });
    }
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting data'
    });
  }
});

// @route   GET /api/city-data/summary
// @desc    Get summary statistics for all sensor types
// @access  Private
router.get('/summary', auth, [
  query('district').optional().trim(),
  query('timeRange').optional().isIn(['1h', '24h', '7d', '30d'])
], async (req, res) => {
  try {
    const { district, timeRange = '24h' } = req.query;

    // Calculate time range
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // 24h
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Build match query
    const matchQuery = {
      timestamp: { $gte: startTime },
      status: 'active'
    };

    if (district) {
      matchQuery['location.district'] = district;
    }

    // Get summary by sensor type
    const summary = await SensorData.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$sensorType',
          totalReadings: { $sum: 1 },
          uniqueSensors: { $addToSet: '$sensorId' },
          avgValue: { $avg: '$data.value' },
          minValue: { $min: '$data.value' },
          maxValue: { $max: '$data.value' },
          latestReading: { $max: '$timestamp' },
          districts: { $addToSet: '$location.district' }
        }
      },
      {
        $project: {
          sensorType: '$_id',
          totalReadings: 1,
          uniqueSensorsCount: { $size: '$uniqueSensors' },
          avgValue: 1,
          minValue: 1,
          maxValue: 1,
          latestReading: 1,
          districtsCount: { $size: '$districts' }
        }
      }
    ]);

    // Get overall system health
    const systemHealth = await SensorData.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalSensors: { $addToSet: '$sensorId' },
          activeSensors: {
            $addToSet: {
              $cond: [{ $eq: ['$status', 'active'] }, '$sensorId', null]
            }
          },
          totalReadings: { $sum: 1 },
          lastActivity: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          totalSensorsCount: { $size: '$totalSensors' },
          activeSensorsCount: {
            $size: {
              $filter: {
                input: '$activeSensors',
                cond: { $ne: ['$$this', null] }
              }
            }
          },
          totalReadings: 1,
          lastActivity: 1
        }
      }
    ]);

    const healthData = systemHealth[0] || {
      totalSensorsCount: 0,
      activeSensorsCount: 0,
      totalReadings: 0,
      lastActivity: null
    };

    // Calculate health percentage
    const healthPercentage = healthData.totalSensorsCount > 0 
      ? Math.round((healthData.activeSensorsCount / healthData.totalSensorsCount) * 100)
      : 100;

    res.json({
      success: true,
      data: {
        timeRange,
        district,
        sensorTypeSummary: summary,
        systemHealth: {
          ...healthData,
          healthPercentage
        },
        lastUpdated: now
      }
    });
  } catch (error) {
    console.error('Summary data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching summary data'
    });
  }
});

module.exports = router;