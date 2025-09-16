const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  alertId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
  },
  type: {
    type: String,
    required: true,
    enum: ['threshold', 'anomaly', 'system', 'maintenance', 'security'],
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['air_quality', 'traffic', 'energy', 'waste', 'system', 'security'],
    index: true
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  source: {
    type: {
      type: String,
      required: true,
      enum: ['sensor', 'system', 'user', 'analytics', 'external']
    },
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      trim: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: function(coords) {
            return !coords || coords.length === 2;
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
        trim: true
      }
    }
  },
  threshold: {
    parameter: {
      type: String
    },
    thresholdValue: {
      type: Number
    },
    actualValue: {
      type: Number
    },
    operator: {
      type: String,
      enum: ['>', '<', '>=', '<=', '==', '!=']
    },
    unit: {
      type: String
    }
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'acknowledged', 'resolved', 'false_positive', 'expired'],
    default: 'active',
    index: true
  },
  priority: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
    default: 5
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  acknowledgedAt: {
    type: Date,
    default: null
  },
  acknowledgedNotes: {
    type: String,
    trim: true
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolutionNotes: {
    type: String,
    trim: true
  },
  resolutionActions: [{
    action: {
      type: String,
      required: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String
    }
  }],
  escalationLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  escalationHistory: [{
    level: {
      type: Number,
      required: true
    },
    escalatedAt: {
      type: Date,
      default: Date.now
    },
    escalatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String
    }
  }],
  autoResolve: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: null
  },
  relatedAlerts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert'
  }],
  notifications: [{
    type: {
      type: String,
      required: true,
      enum: ['email', 'sms', 'push', 'in_app', 'webhook']
    },
    recipient: {
      type: String,
      required: true
    },
    recipientType: {
      type: String,
      enum: ['user', 'email', 'phone', 'endpoint'],
      default: 'user'
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
      default: 'pending'
    },
    deliveredAt: {
      type: Date
    },
    errorMessage: {
      type: String
    },
    retryCount: {
      type: Number,
      default: 0
    },
    maxRetries: {
      type: Number,
      default: 3
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  customFields: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    dataSnapshot: {
      type: mongoose.Schema.Types.Mixed
    },
    systemInfo: {
      type: mongoose.Schema.Types.Mixed
    },
    correlationId: {
      type: String
    }
  }
}, {
  timestamps: true
});

// Indexes
alertSchema.index({ alertId: 1 }, { unique: true });
alertSchema.index({ status: 1, severity: 1 });
alertSchema.index({ status: 1, createdAt: -1 });
alertSchema.index({ category: 1, severity: 1 });
alertSchema.index({ assignedTo: 1, status: 1 });
alertSchema.index({ 'source.location': '2dsphere' });
alertSchema.index({ createdAt: -1 });
alertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for common queries
alertSchema.index({ category: 1, status: 1, createdAt: -1 });
alertSchema.index({ severity: 1, status: 1, createdAt: -1 });

// Virtual for duration (time since creation)
alertSchema.virtual('duration').get(function() {
  const endTime = this.resolvedAt || new Date();
  return Math.floor((endTime - this.createdAt) / (1000 * 60)); // Duration in minutes
});

// Virtual for response time (time to acknowledge)
alertSchema.virtual('responseTime').get(function() {
  if (!this.acknowledgedAt) return null;
  return Math.floor((this.acknowledgedAt - this.createdAt) / (1000 * 60)); // Response time in minutes
});

// Virtual for resolution time (time to resolve)
alertSchema.virtual('resolutionTime').get(function() {
  if (!this.resolvedAt) return null;
  return Math.floor((this.resolvedAt - this.createdAt) / (1000 * 60)); // Resolution time in minutes
});

// Pre-save middleware to auto-set priority based on severity
alertSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('severity')) {
    switch (this.severity) {
      case 'critical':
        this.priority = 10;
        break;
      case 'high':
        this.priority = 8;
        break;
      case 'medium':
        this.priority = 5;
        break;
      case 'low':
        this.priority = 2;
        break;
    }
  }
  next();
});

// Method to acknowledge alert
alertSchema.methods.acknowledge = function(userId, notes = '') {
  this.status = 'acknowledged';
  this.acknowledgedBy = userId;
  this.acknowledgedAt = new Date();
  this.acknowledgedNotes = notes;
  return this.save();
};

// Method to resolve alert
alertSchema.methods.resolve = function(userId, notes = '', actions = []) {
  this.status = 'resolved';
  this.resolvedBy = userId;
  this.resolvedAt = new Date();
  this.resolutionNotes = notes;
  if (actions.length > 0) {
    this.resolutionActions = actions;
  }
  return this.save();
};

// Method to escalate alert
alertSchema.methods.escalate = function(userId, reason = '') {
  this.escalationLevel += 1;
  this.escalationHistory.push({
    level: this.escalationLevel,
    escalatedBy: userId,
    reason: reason
  });
  
  // Increase priority when escalated
  this.priority = Math.min(this.priority + 2, 10);
  
  return this.save();
};

// Method to add notification
alertSchema.methods.addNotification = function(type, recipient, recipientType = 'user') {
  this.notifications.push({
    type: type,
    recipient: recipient,
    recipientType: recipientType
  });
  return this.save();
};

// Static method to get active alerts count by category
alertSchema.statics.getActiveCountByCategory = function() {
  return this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        criticalCount: {
          $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
        },
        highCount: {
          $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Static method to get alerts statistics
alertSchema.statics.getStatistics = function(timeRange = 24) {
  const startTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);
  
  return this.aggregate([
    { $match: { createdAt: { $gte: startTime } } },
    {
      $group: {
        _id: null,
        totalAlerts: { $sum: 1 },
        activeAlerts: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        resolvedAlerts: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        },
        criticalAlerts: {
          $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
        },
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
};

// Static method to find nearby alerts
alertSchema.statics.findNearby = function(longitude, latitude, maxDistance = 1000) {
  return this.find({
    'source.location': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    }
  });
};

module.exports = mongoose.model('Alert', alertSchema);