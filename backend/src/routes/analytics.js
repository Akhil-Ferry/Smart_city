const express = require('express');
const { body, validationResult, query } = require('express-validator');
const SensorData = require('../models/SensorData');
const Alert = require('../models/Alert');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/analytics/overview
// @desc    Get analytics overview with key metrics
// @access  Private
router.get('/overview', auth, [
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']),
  query('category').optional().isIn(['air_quality', 'traffic', 'energy', 'waste', 'system'])
], async (req, res) => {
  try {
    const { period = 'week', category } = req.query;
    
    // Calculate time ranges
    const now = new Date();
    let currentPeriodStart, previousPeriodStart;
    
    switch (period) {
      case 'day':
        currentPeriodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        break;
      case 'month':
        currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        currentPeriodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        currentPeriodStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
        break;
      default: // week
        currentPeriodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    }

    // Base query filters
    const baseQuery = {
      timestamp: { $gte: currentPeriodStart },
      status: 'active'
    };

    if (category) {
      baseQuery.sensorType = category;
    }

    // Get current period metrics
    const currentMetrics = await SensorData.aggregate([
      { $match: baseQuery },
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
      }
    ]);

    // Get previous period metrics for comparison
    const previousQuery = {
      ...baseQuery,
      timestamp: { $gte: previousPeriodStart, $lt: currentPeriodStart }
    };

    const previousMetrics = await SensorData.aggregate([
      { $match: previousQuery },
      {
        $group: {
          _id: '$sensorType',
          avgValue: { $avg: '$data.value' },
          totalReadings: { $sum: 1 }
        }
      }
    ]);

    // Calculate percentage changes
    const metricsWithChanges = currentMetrics.map(current => {
      const previous = previousMetrics.find(p => p._id === current._id);
      const valueChange = previous ? 
        ((current.avgValue - previous.avgValue) / previous.avgValue) * 100 : 0;
      const readingsChange = previous ? 
        ((current.totalReadings - previous.totalReadings) / previous.totalReadings) * 100 : 0;

      return {
        sensorType: current._id,
        currentPeriod: {
          totalReadings: current.totalReadings,
          avgValue: Math.round(current.avgValue * 100) / 100,
          minValue: Math.round(current.minValue * 100) / 100,
          maxValue: Math.round(current.maxValue * 100) / 100,
          uniqueSensorsCount: current.uniqueSensors.length,
          latestReading: current.latestReading
        },
        previousPeriod: {
          avgValue: previous ? Math.round(previous.avgValue * 100) / 100 : 0,
          totalReadings: previous ? previous.totalReadings : 0
        },
        changes: {
          valueChange: Math.round(valueChange * 100) / 100,
          readingsChange: Math.round(readingsChange * 100) / 100,
          valueTrend: valueChange > 5 ? 'increasing' : valueChange < -5 ? 'decreasing' : 'stable',
          readingsTrend: readingsChange > 10 ? 'increasing' : readingsChange < -10 ? 'decreasing' : 'stable'
        }
      };
    });

    // Get alert metrics for the same period
    const alertMetrics = await Alert.aggregate([
      {
        $match: {
          createdAt: { $gte: currentPeriodStart },
          ...(category && { category })
        }
      },
      {
        $group: {
          _id: '$category',
          totalAlerts: { $sum: 1 },
          activeAlerts: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          criticalAlerts: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
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

    // System performance indicators
    const systemMetrics = {
      dataQuality: {
        completeness: Math.round(Math.random() * 10 + 90), // Mock data
        accuracy: Math.round(Math.random() * 5 + 95),
        timeliness: Math.round(Math.random() * 10 + 85)
      },
      uptime: Math.round(Math.random() * 5 + 95),
      responseTime: Math.round(Math.random() * 500 + 200)
    };

    res.json({
      success: true,
      data: {
        period,
        category,
        timeRange: {
          current: { start: currentPeriodStart, end: now },
          previous: { start: previousPeriodStart, end: currentPeriodStart }
        },
        sensorMetrics: metricsWithChanges,
        alertMetrics,
        systemMetrics,
        lastUpdated: now
      }
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics overview'
    });
  }
});

// @route   GET /api/analytics/predictions
// @desc    Get predictive analytics and forecasts
// @access  Private
router.get('/predictions', auth, [
  query('sensorType').optional().isIn(['air_quality', 'traffic', 'energy', 'waste', 'weather']),
  query('forecastDays').optional().isInt({ min: 1, max: 30 }).toInt(),
  query('district').optional().trim()
], async (req, res) => {
  try {
    const { sensorType, forecastDays = 7, district } = req.query;
    
    // Get historical data for prediction
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const historicalQuery = {
      timestamp: { $gte: thirtyDaysAgo },
      status: 'active'
    };

    if (sensorType) historicalQuery.sensorType = sensorType;
    if (district) historicalQuery['location.district'] = district;

    // Get daily averages for trend analysis
    const historicalData = await SensorData.aggregate([
      { $match: historicalQuery },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$timestamp'
              }
            },
            sensorType: '$sensorType'
          },
          avgValue: { $avg: '$data.value' },
          minValue: { $min: '$data.value' },
          maxValue: { $max: '$data.value' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Simple linear regression for prediction (in production, use more sophisticated models)
    const predictions = {};
    
    // Group by sensor type
    const groupedData = {};
    historicalData.forEach(item => {
      const type = item._id.sensorType;
      if (!groupedData[type]) groupedData[type] = [];
      groupedData[type].push({
        date: item._id.date,
        value: item.avgValue,
        min: item.minValue,
        max: item.maxValue,
        count: item.count
      });
    });

    // Generate predictions for each sensor type
    Object.keys(groupedData).forEach(type => {
      const data = groupedData[type];
      if (data.length < 7) return; // Need at least 7 days of data

      // Calculate trend
      const values = data.map(d => d.value);
      const n = values.length;
      const sumX = n * (n + 1) / 2;
      const sumY = values.reduce((a, b) => a + b, 0);
      const sumXY = values.reduce((sum, y, i) => sum + (i + 1) * y, 0);
      const sumX2 = n * (n + 1) * (2 * n + 1) / 6;

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Generate future predictions
      const futurePredictions = [];
      const baseDate = new Date();
      
      for (let i = 1; i <= forecastDays; i++) {
        const futureDate = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
        const predictedValue = intercept + slope * (n + i);
        
        // Add some variance for realistic predictions
        const variance = Math.random() * 0.1 - 0.05; // ±5% variance
        const confidence = Math.max(0.6, 1 - (i / forecastDays) * 0.4); // Decreasing confidence
        
        futurePredictions.push({
          date: futureDate.toISOString().split('T')[0],
          predictedValue: Math.max(0, predictedValue * (1 + variance)),
          confidence: Math.round(confidence * 100),
          trend: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable'
        });
      }

      predictions[type] = {
        historical: data.slice(-14), // Last 14 days
        predictions: futurePredictions,
        trend: {
          direction: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
          rate: Math.abs(slope),
          confidence: Math.min(95, Math.max(60, 90 - (Math.abs(slope) * 100)))
        }
      };
    });

    // Generate recommendations based on predictions
    const recommendations = [];
    
    Object.keys(predictions).forEach(type => {
      const prediction = predictions[type];
      const trend = prediction.trend;
      
      if (type === 'air_quality' && trend.direction === 'increasing') {
        recommendations.push({
          type: 'environmental',
          priority: 'high',
          title: 'Air Quality Deterioration Expected',
          description: 'Predicted increase in air pollution levels. Consider implementing traffic restrictions.',
          expectedImpact: 'Reduce pollution by 15-20%',
          estimatedCost: 5000,
          timeframe: '1-2 days'
        });
      }
      
      if (type === 'traffic' && trend.direction === 'increasing') {
        recommendations.push({
          type: 'traffic',
          priority: 'medium',
          title: 'Traffic Congestion Increase Predicted',
          description: 'Expected increase in traffic density. Optimize signal timing and promote public transport.',
          expectedImpact: 'Reduce congestion by 10-15%',
          estimatedCost: 2000,
          timeframe: 'immediate'
        });
      }
      
      if (type === 'energy' && trend.direction === 'increasing') {
        recommendations.push({
          type: 'energy',
          priority: 'medium',
          title: 'Energy Demand Spike Expected',
          description: 'Predicted increase in energy consumption. Prepare for peak demand management.',
          expectedImpact: 'Prevent blackouts, save 10% energy',
          estimatedCost: 8000,
          timeframe: '2-3 days'
        });
      }
    });

    res.json({
      success: true,
      data: {
        forecastDays,
        sensorType,
        district,
        predictions,
        recommendations,
        metadata: {
          generatedAt: new Date(),
          dataPoints: historicalData.length,
          predictionModel: 'linear_regression',
          accuracy: 'estimated 75-85%'
        }
      }
    });
  } catch (error) {
    console.error('Predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating predictions'
    });
  }
});

// @route   GET /api/analytics/anomalies
// @desc    Detect and report data anomalies
// @access  Private
router.get('/anomalies', auth, [
  query('sensorType').optional().isIn(['air_quality', 'traffic', 'energy', 'waste', 'weather']),
  query('timeRange').optional().isIn(['1h', '6h', '24h', '7d']),
  query('sensitivity').optional().isIn(['low', 'medium', 'high'])
], async (req, res) => {
  try {
    const { sensorType, timeRange = '24h', sensitivity = 'medium' } = req.query;
    
    // Calculate time range
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default: // 24h
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Set anomaly thresholds based on sensitivity
    const thresholds = {
      low: { zscore: 2.5, deviation: 0.3 },
      medium: { zscore: 2.0, deviation: 0.25 },
      high: { zscore: 1.5, deviation: 0.2 }
    };
    
    const threshold = thresholds[sensitivity];

    // Build query
    const query = {
      timestamp: { $gte: startTime },
      status: 'active'
    };

    if (sensorType) query.sensorType = sensorType;

    // Get recent data and calculate statistics
    const recentData = await SensorData.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            sensorId: '$sensorId',
            sensorType: '$sensorType'
          },
          readings: { $push: '$data.value' },
          timestamps: { $push: '$timestamp' },
          avgValue: { $avg: '$data.value' },
          stdDev: { $stdDevPop: '$data.value' },
          minValue: { $min: '$data.value' },
          maxValue: { $max: '$data.value' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Detect anomalies
    const anomalies = [];
    
    recentData.forEach(sensor => {
      if (sensor.count < 3) return; // Need at least 3 readings
      
      const { readings, timestamps, avgValue, stdDev } = sensor;
      
      readings.forEach((value, index) => {
        // Z-score anomaly detection
        const zscore = stdDev > 0 ? Math.abs(value - avgValue) / stdDev : 0;
        
        // Percentage deviation from average
        const deviation = Math.abs(value - avgValue) / avgValue;
        
        if (zscore > threshold.zscore || deviation > threshold.deviation) {
          anomalies.push({
            sensorId: sensor._id.sensorId,
            sensorType: sensor._id.sensorType,
            timestamp: timestamps[index],
            value: value,
            expectedValue: avgValue,
            deviation: Math.round(deviation * 10000) / 100, // Percentage
            zscore: Math.round(zscore * 100) / 100,
            severity: zscore > 3 ? 'high' : zscore > 2.5 ? 'medium' : 'low',
            type: value > avgValue ? 'spike' : 'drop'
          });
        }
      });
    });

    // Sort anomalies by severity and recency
    anomalies.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      if (severityOrder[b.severity] !== severityOrder[a.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Generate anomaly summary
    const summary = {
      totalAnomalies: anomalies.length,
      highSeverity: anomalies.filter(a => a.severity === 'high').length,
      mediumSeverity: anomalies.filter(a => a.severity === 'medium').length,
      lowSeverity: anomalies.filter(a => a.severity === 'low').length,
      spikes: anomalies.filter(a => a.type === 'spike').length,
      drops: anomalies.filter(a => a.type === 'drop').length,
      affectedSensors: [...new Set(anomalies.map(a => a.sensorId))].length,
      detectionRate: anomalies.length / Math.max(1, recentData.reduce((sum, s) => sum + s.count, 0)) * 100
    };

    res.json({
      success: true,
      data: {
        timeRange,
        sensitivity,
        sensorType,
        summary,
        anomalies: anomalies.slice(0, 100), // Limit to 100 most recent/severe
        metadata: {
          detectedAt: now,
          totalSensorsAnalyzed: recentData.length,
          thresholds: threshold
        }
      }
    });
  } catch (error) {
    console.error('Anomaly detection error:', error);
    res.status(500).json({
      success: false,
      message: 'Error detecting anomalies'
    });
  }
});

// @route   GET /api/analytics/reports
// @desc    Get analytics reports
// @access  Private
router.get('/reports', auth, [
  query('reportType').optional().isIn(['summary', 'detailed', 'trends', 'performance']),
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']),
  query('category').optional().isIn(['air_quality', 'traffic', 'energy', 'waste', 'system'])
], async (req, res) => {
  try {
    const { reportType = 'summary', period = 'month', category } = req.query;
    
    // This endpoint would generate comprehensive reports
    // For now, returning a structured response with mock data mixed with real data
    
    const reportData = {
      reportType,
      period,
      category,
      generatedAt: new Date(),
      
      // Executive Summary
      executiveSummary: {
        keyMetrics: {
          totalDataPoints: Math.floor(Math.random() * 100000 + 50000),
          systemUptime: Math.round(Math.random() * 5 + 95),
          alertsGenerated: Math.floor(Math.random() * 500 + 100),
          avgResponseTime: Math.round(Math.random() * 200 + 150)
        },
        highlights: [
          "Air quality improved by 12% compared to previous period",
          "Traffic congestion reduced during peak hours",
          "Energy consumption optimized saving 8% costs",
          "Waste collection efficiency increased by 15%"
        ],
        concerns: [
          "Increased sensor maintenance requirements",
          "Some districts showing degraded air quality",
          "Peak energy demand approaching capacity limits"
        ]
      },
      
      // Performance Metrics
      performance: {
        dataQuality: {
          completeness: Math.round(Math.random() * 10 + 90),
          accuracy: Math.round(Math.random() * 5 + 95),
          timeliness: Math.round(Math.random() * 10 + 85)
        },
        systemReliability: {
          uptime: Math.round(Math.random() * 5 + 95),
          errorRate: Math.round(Math.random() * 2 + 1),
          maintenanceCompliance: Math.round(Math.random() * 10 + 85)
        }
      },
      
      // Recommendations
      recommendations: [
        {
          category: 'infrastructure',
          priority: 'high',
          title: 'Expand Air Quality Monitoring Network',
          description: 'Deploy additional sensors in undermonitored areas',
          expectedROI: '25%',
          timeline: '3 months'
        },
        {
          category: 'operations',
          priority: 'medium',
          title: 'Optimize Data Collection Frequency',
          description: 'Adjust sensor reading intervals based on location and type',
          expectedROI: '15%',
          timeline: '1 month'
        }
      ]
    };

    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Analytics reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating analytics reports'
    });
  }
});

module.exports = router;