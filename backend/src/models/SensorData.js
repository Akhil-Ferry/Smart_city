const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  sensorId: {
    type: String,
    required: true,
    index: true
  },
  sensorType: {
    type: String,
    required: true,
    enum: ['air_quality', 'traffic', 'energy', 'waste', 'weather'],
    index: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2;
        },
        message: 'Coordinates must contain exactly 2 numbers [longitude, latitude]'
      }
    },
    address: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true,
      index: true
    },
    zone: {
      type: String,
      trim: true
    }
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function(data) {
        // Validate based on sensor type
        switch (this.sensorType) {
          case 'air_quality':
            return this.validateAirQualityData(data);
          case 'traffic':
            return this.validateTrafficData(data);
          case 'energy':
            return this.validateEnergyData(data);
          case 'waste':
            return this.validateWasteData(data);
          case 'weather':
            return this.validateWeatherData(data);
          default:
            return false;
        }
      },
      message: 'Invalid data structure for sensor type'
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'error'],
    default: 'active',
    index: true
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100
  },
  signalStrength: {
    type: Number,
    min: -120,
    max: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  processed: {
    type: Boolean,
    default: false,
    index: true
  },
  quality: {
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    issues: [{
      type: String,
      enum: ['outlier', 'missing_data', 'sensor_error', 'calibration_needed']
    }]
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Geospatial index for location queries
sensorDataSchema.index({ location: '2dsphere' });

// Compound indexes for common queries
sensorDataSchema.index({ sensorId: 1, timestamp: -1 });
sensorDataSchema.index({ sensorType: 1, timestamp: -1 });
sensorDataSchema.index({ sensorType: 1, 'location.district': 1, timestamp: -1 });
sensorDataSchema.index({ timestamp: -1 });
sensorDataSchema.index({ processed: 1, timestamp: -1 });

// Validation methods for different sensor types
sensorDataSchema.methods.validateAirQualityData = function(data) {
  const requiredFields = ['pm25', 'pm10', 'temperature', 'humidity'];
  return requiredFields.every(field => data.hasOwnProperty(field) && typeof data[field] === 'number');
};

sensorDataSchema.methods.validateTrafficData = function(data) {
  const requiredFields = ['vehicleCount', 'avgSpeed', 'congestionLevel'];
  return requiredFields.every(field => data.hasOwnProperty(field) && typeof data[field] === 'number');
};

sensorDataSchema.methods.validateEnergyData = function(data) {
  const requiredFields = ['powerConsumption', 'voltage', 'current'];
  return requiredFields.every(field => data.hasOwnProperty(field) && typeof data[field] === 'number');
};

sensorDataSchema.methods.validateWasteData = function(data) {
  const requiredFields = ['fillLevel'];
  return requiredFields.every(field => data.hasOwnProperty(field) && typeof data[field] === 'number');
};

sensorDataSchema.methods.validateWeatherData = function(data) {
  const requiredFields = ['temperature', 'humidity'];
  return requiredFields.every(field => data.hasOwnProperty(field) && typeof data[field] === 'number');
};

// Static method to get latest data for a sensor
sensorDataSchema.statics.getLatestBySensor = function(sensorId) {
  return this.findOne({ sensorId })
    .sort({ timestamp: -1 })
    .exec();
};

// Static method to get data within time range
sensorDataSchema.statics.getDataInRange = function(startDate, endDate, filters = {}) {
  const query = {
    timestamp: {
      $gte: startDate,
      $lte: endDate
    },
    ...filters
  };
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .exec();
};

// Static method to get aggregated data
sensorDataSchema.statics.getAggregatedData = function(groupBy, filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: groupBy,
        count: { $sum: 1 },
        avgValue: { $avg: '$data.value' },
        minValue: { $min: '$data.value' },
        maxValue: { $max: '$data.value' },
        lastUpdated: { $max: '$timestamp' }
      }
    },
    { $sort: { '_id': 1 } }
  ];
  
  return this.aggregate(pipeline);
};

// TTL index for automatic data cleanup (optional - remove if you want to keep all data)
// sensorDataSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // 1 year

module.exports = mongoose.model('SensorData', sensorDataSchema);