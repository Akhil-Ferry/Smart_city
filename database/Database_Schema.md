# Database Schema Design
## Smart City Management Platform

**Version:** 1.0  
**Date:** September 15, 2025  
**Database Type:** MongoDB (NoSQL) with PostgreSQL alternative  

---

## Table of Contents

1. [Overview](#overview)
2. [Database Design Principles](#database-design-principles)
3. [Collections/Tables Structure](#collections-structure)
4. [Data Relationships](#data-relationships)
5. [Indexing Strategy](#indexing-strategy)
6. [Data Validation Rules](#data-validation-rules)
7. [Security Considerations](#security-considerations)

---

## 1. Overview

### 1.1 Purpose
This document defines the database schema for the Smart City Management Platform, designed to efficiently store and manage:
- User accounts and authentication data
- Real-time sensor and IoT device data
- Alert and notification logs
- System analytics and reports
- Maintenance and operational records

### 1.2 Database Technology Choice
**Primary Choice: MongoDB**
- Flexible schema for diverse IoT data
- Excellent performance for real-time data
- Built-in support for geospatial queries
- Horizontal scaling capabilities

**Alternative: PostgreSQL**
- ACID compliance for critical transactions
- Strong consistency guarantees
- Advanced JSON support
- Mature ecosystem

---

## 2. Database Design Principles

### 2.1 Design Guidelines
- **Scalability**: Support for horizontal scaling
- **Performance**: Optimized for read-heavy workloads
- **Flexibility**: Schema evolution without downtime
- **Security**: Data encryption and access control
- **Backup**: Regular automated backups
- **Monitoring**: Built-in performance monitoring

### 2.2 Naming Conventions
- Collection/Table names: PascalCase (e.g., `UserAccounts`)
- Field names: camelCase (e.g., `firstName`)
- Index names: Descriptive with prefix (e.g., `idx_user_email`)

---

## 3. Collections Structure

### 3.1 User Management

#### 3.1.1 UserAccounts Collection
```javascript
{
  _id: ObjectId,
  userId: String, // Unique identifier
  email: String, // Unique, indexed
  password: String, // Hashed using bcrypt
  firstName: String,
  lastName: String,
  role: String, // enum: ['admin', 'environment_officer', 'utility_officer', 'traffic_control', 'viewer']
  department: String,
  phoneNumber: String,
  profileImage: String, // URL to profile image
  isActive: Boolean,
  lastLogin: Date,
  loginAttempts: Number,
  accountLocked: Boolean,
  lockUntil: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  preferences: {
    theme: String, // 'light' | 'dark'
    language: String, // 'en' | 'es' | 'fr'
    timezone: String,
    notificationSettings: {
      email: Boolean,
      sms: Boolean,
      inApp: Boolean,
      alertTypes: [String] // Array of alert types to receive
    },
    dashboardLayout: [Object] // Custom dashboard configuration
  },
  permissions: [String], // Array of specific permissions
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId, // Reference to admin who created account
  metadata: Object // Additional user metadata
}
```

#### 3.1.2 UserSessions Collection
```javascript
{
  _id: ObjectId,
  sessionId: String, // Unique session identifier
  userId: ObjectId, // Reference to UserAccounts
  token: String, // JWT token hash
  ipAddress: String,
  userAgent: String,
  isActive: Boolean,
  expiresAt: Date,
  createdAt: Date,
  lastActivity: Date,
  deviceInfo: {
    type: String, // 'desktop' | 'mobile' | 'tablet'
    os: String,
    browser: String
  }
}
```

### 3.2 City Data Management

#### 3.2.1 SensorData Collection
```javascript
{
  _id: ObjectId,
  sensorId: String, // Unique sensor identifier
  sensorType: String, // 'air_quality', 'traffic', 'energy', 'waste', 'weather'
  location: {
    type: "Point",
    coordinates: [Number, Number], // [longitude, latitude]
    address: String,
    district: String,
    zone: String
  },
  timestamp: Date,
  data: {
    // Dynamic structure based on sensor type
    // Air Quality Sensor
    pm25: Number,
    pm10: Number,
    co2: Number,
    no2: Number,
    o3: Number,
    temperature: Number,
    humidity: Number,
    
    // Traffic Sensor
    vehicleCount: Number,
    avgSpeed: Number,
    congestionLevel: Number,
    vehicleTypes: {
      cars: Number,
      trucks: Number,
      buses: Number,
      motorcycles: Number
    },
    
    // Energy Sensor
    powerConsumption: Number,
    voltage: Number,
    current: Number,
    frequency: Number,
    powerFactor: Number,
    
    // Waste Sensor
    fillLevel: Number,
    weight: Number,
    temperature: Number,
    lastCollection: Date
  },
  status: String, // 'active', 'inactive', 'maintenance', 'error'
  batteryLevel: Number,
  signalStrength: Number,
  metadata: Object,
  processed: Boolean, // Whether data has been processed by analytics
  createdAt: Date
}
```

#### 3.2.2 DeviceRegistry Collection
```javascript
{
  _id: ObjectId,
  deviceId: String, // Unique device identifier
  deviceName: String,
  deviceType: String,
  manufacturer: String,
  model: String,
  firmwareVersion: String,
  installationDate: Date,
  lastMaintenanceDate: Date,
  nextMaintenanceDate: Date,
  location: {
    type: "Point",
    coordinates: [Number, Number],
    address: String,
    district: String,
    zone: String,
    installationNotes: String
  },
  configuration: Object, // Device-specific configuration
  status: String, // 'active', 'inactive', 'maintenance', 'retired'
  healthMetrics: {
    uptime: Number, // Percentage
    dataAccuracy: Number, // Percentage
    lastHeartbeat: Date,
    errorCount: Number,
    warningCount: Number
  },
  maintenance: [{
    date: Date,
    type: String, // 'preventive', 'corrective', 'upgrade'
    description: String,
    performedBy: ObjectId, // Reference to UserAccounts
    cost: Number,
    nextMaintenanceDate: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### 3.3 Alert and Notification System

#### 3.3.1 Alerts Collection
```javascript
{
  _id: ObjectId,
  alertId: String, // Unique alert identifier
  type: String, // 'threshold', 'anomaly', 'system', 'maintenance'
  category: String, // 'air_quality', 'traffic', 'energy', 'waste', 'system'
  severity: String, // 'low', 'medium', 'high', 'critical'
  title: String,
  description: String,
  source: {
    type: String, // 'sensor', 'system', 'user', 'analytics'
    id: String, // Source identifier
    location: {
      type: "Point",
      coordinates: [Number, Number],
      address: String,
      district: String
    }
  },
  threshold: {
    parameter: String,
    thresholdValue: Number,
    actualValue: Number,
    operator: String // '>', '<', '>=', '<=', '=='
  },
  status: String, // 'active', 'acknowledged', 'resolved', 'false_positive'
  priority: Number, // 1-10 scale
  assignedTo: [ObjectId], // Array of user references
  acknowledgedBy: ObjectId, // Reference to user who acknowledged
  acknowledgedAt: Date,
  resolvedBy: ObjectId, // Reference to user who resolved
  resolvedAt: Date,
  resolutionNotes: String,
  escalationLevel: Number,
  autoResolve: Boolean,
  expiresAt: Date,
  relatedAlerts: [ObjectId], // References to related alerts
  notifications: [{
    type: String, // 'email', 'sms', 'push', 'in_app'
    recipient: String,
    sentAt: Date,
    deliveryStatus: String, // 'pending', 'sent', 'delivered', 'failed'
    errorMessage: String
  }],
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
```

#### 3.3.2 NotificationTemplates Collection
```javascript
{
  _id: ObjectId,
  templateId: String,
  name: String,
  type: String, // 'email', 'sms', 'push'
  category: String, // Alert category
  severity: String,
  subject: String, // For email templates
  body: String, // Template with placeholders
  placeholders: [String], // Available placeholder variables
  isActive: Boolean,
  language: String,
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId
}
```

### 3.4 Analytics and Reporting

#### 3.4.1 Analytics Collection
```javascript
{
  _id: ObjectId,
  analysisId: String,
  type: String, // 'trend', 'anomaly', 'prediction', 'optimization'
  category: String, // Data category being analyzed
  timeRange: {
    start: Date,
    end: Date,
    granularity: String // 'minute', 'hour', 'day', 'week', 'month'
  },
  location: {
    type: String, // 'point', 'area', 'citywide'
    coordinates: [Number, Number],
    radius: Number, // For area analysis
    districts: [String] // For multi-district analysis
  },
  parameters: Object, // Analysis parameters
  results: {
    summary: String,
    metrics: Object,
    trends: [{
      parameter: String,
      direction: String, // 'increasing', 'decreasing', 'stable'
      rate: Number,
      confidence: Number // 0-1 scale
    }],
    anomalies: [{
      timestamp: Date,
      parameter: String,
      expectedValue: Number,
      actualValue: Number,
      severity: String
    }],
    predictions: [{
      parameter: String,
      forecastPeriod: Number, // Hours/days ahead
      predictedValue: Number,
      confidence: Number,
      methodology: String
    }],
    recommendations: [{
      type: String,
      description: String,
      expectedImpact: String,
      priority: Number,
      estimatedCost: Number
    }]
  },
  status: String, // 'running', 'completed', 'failed'
  processingTime: Number, // Milliseconds
  dataQuality: {
    completeness: Number, // Percentage
    accuracy: Number, // Percentage
    timeliness: Number // Percentage
  },
  scheduledRun: Boolean,
  nextRun: Date,
  createdAt: Date,
  completedAt: Date,
  createdBy: ObjectId
}
```

#### 3.4.2 Reports Collection
```javascript
{
  _id: ObjectId,
  reportId: String,
  title: String,
  type: String, // 'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'custom'
  category: String,
  format: String, // 'pdf', 'excel', 'json', 'csv'
  parameters: {
    timeRange: {
      start: Date,
      end: Date
    },
    locations: [String],
    metrics: [String],
    includeCharts: Boolean,
    includeRawData: Boolean
  },
  content: {
    summary: String,
    keyMetrics: Object,
    charts: [Object],
    tables: [Object],
    insights: [String],
    recommendations: [String]
  },
  fileUrl: String, // URL to generated report file
  fileSize: Number,
  generationTime: Number, // Milliseconds
  status: String, // 'generating', 'completed', 'failed', 'scheduled'
  scheduledGeneration: {
    frequency: String, // 'daily', 'weekly', 'monthly'
    nextGeneration: Date,
    recipients: [String] // Email addresses
  },
  downloadCount: Number,
  lastDownloaded: Date,
  expiresAt: Date,
  createdAt: Date,
  generatedBy: ObjectId
}
```

### 3.5 System Configuration

#### 3.5.1 SystemSettings Collection
```javascript
{
  _id: ObjectId,
  category: String, // 'alerts', 'analytics', 'notifications', 'security'
  key: String,
  value: Object, // Can be string, number, boolean, object, array
  description: String,
  dataType: String, // 'string', 'number', 'boolean', 'object', 'array'
  isEditable: Boolean,
  requiresRestart: Boolean,
  validationRules: Object,
  lastModified: Date,
  modifiedBy: ObjectId
}
```

#### 3.5.2 AuditLogs Collection
```javascript
{
  _id: ObjectId,
  timestamp: Date,
  userId: ObjectId,
  userEmail: String,
  action: String, // 'create', 'read', 'update', 'delete', 'login', 'logout'
  resource: String, // Resource type affected
  resourceId: String, // Specific resource identifier
  details: Object, // Action-specific details
  ipAddress: String,
  userAgent: String,
  status: String, // 'success', 'failure', 'error'
  errorMessage: String,
  metadata: Object
}
```

---

## 4. Data Relationships

### 4.1 Primary Relationships
```
UserAccounts (1) → (M) UserSessions
UserAccounts (1) → (M) Alerts (assignedTo)
UserAccounts (1) → (M) Analytics (createdBy)
UserAccounts (1) → (M) Reports (generatedBy)
DeviceRegistry (1) → (M) SensorData
Alerts (1) → (M) Notifications (embedded)
```

### 4.2 Reference Patterns
- **User References**: Store ObjectId for strong consistency
- **Geospatial Data**: Use GeoJSON format for location data
- **Time Series**: Partition by date for optimal performance
- **Embedded vs Referenced**: Embed small, frequently accessed data; reference large or shared data

---

## 5. Indexing Strategy

### 5.1 Primary Indexes
```javascript
// UserAccounts
db.UserAccounts.createIndex({ email: 1 }, { unique: true })
db.UserAccounts.createIndex({ userId: 1 }, { unique: true })
db.UserAccounts.createIndex({ role: 1 })

// SensorData
db.SensorData.createIndex({ sensorId: 1, timestamp: -1 })
db.SensorData.createIndex({ location: "2dsphere" })
db.SensorData.createIndex({ sensorType: 1, timestamp: -1 })
db.SensorData.createIndex({ timestamp: -1 })

// Alerts
db.Alerts.createIndex({ status: 1, severity: 1 })
db.Alerts.createIndex({ createdAt: -1 })
db.Alerts.createIndex({ "source.location": "2dsphere" })
db.Alerts.createIndex({ assignedTo: 1, status: 1 })

// Analytics
db.Analytics.createIndex({ type: 1, category: 1 })
db.Analytics.createIndex({ "timeRange.start": 1, "timeRange.end": 1 })
db.Analytics.createIndex({ createdAt: -1 })

// DeviceRegistry
db.DeviceRegistry.createIndex({ deviceId: 1 }, { unique: true })
db.DeviceRegistry.createIndex({ location: "2dsphere" })
db.DeviceRegistry.createIndex({ status: 1 })
```

### 5.2 Compound Indexes
```javascript
// For dashboard queries
db.SensorData.createIndex({ 
  sensorType: 1, 
  "location.district": 1, 
  timestamp: -1 
})

// For alert queries
db.Alerts.createIndex({ 
  status: 1, 
  severity: 1, 
  createdAt: -1 
})

// For analytics queries
db.Analytics.createIndex({ 
  category: 1, 
  type: 1, 
  status: 1 
})
```

---

## 6. Data Validation Rules

### 6.1 Schema Validation (MongoDB)
```javascript
// UserAccounts validation
db.createCollection("UserAccounts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "password", "firstName", "lastName", "role"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        },
        role: {
          enum: ["admin", "environment_officer", "utility_officer", "traffic_control", "viewer"]
        },
        phoneNumber: {
          bsonType: "string",
          pattern: "^[+]?[1-9]?[0-9]{7,15}$"
        }
      }
    }
  }
})

// SensorData validation
db.createCollection("SensorData", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["sensorId", "sensorType", "timestamp", "data"],
      properties: {
        sensorType: {
          enum: ["air_quality", "traffic", "energy", "waste", "weather"]
        },
        location: {
          bsonType: "object",
          required: ["type", "coordinates"],
          properties: {
            type: { enum: ["Point"] },
            coordinates: {
              bsonType: "array",
              minItems: 2,
              maxItems: 2,
              items: { bsonType: "number" }
            }
          }
        }
      }
    }
  }
})
```

### 6.2 Application-Level Validation
- Email format validation
- Password strength requirements (minimum 8 characters, mix of letters, numbers, symbols)
- Geospatial coordinate validation
- Data range validation for sensor readings
- File size and type validation for uploads

---

## 7. Security Considerations

### 7.1 Data Encryption
- **At Rest**: MongoDB encryption at rest using AES-256
- **In Transit**: TLS 1.3 for all connections
- **Application Level**: Sensitive fields encrypted using AES-256

### 7.2 Access Control
- **Authentication**: Username/password with JWT tokens
- **Authorization**: Role-based access control (RBAC)
- **Database Access**: Dedicated service accounts with minimal privileges
- **Audit Trail**: Comprehensive logging of all data access and modifications

### 7.3 Data Privacy
- **Personal Data**: Minimal collection, encrypted storage
- **Data Retention**: Automated purging of old data based on retention policies
- **Anonymization**: Option to anonymize user data for analytics

---

## 8. Performance Optimization

### 8.1 Partitioning Strategy
- **Time-based Partitioning**: SensorData partitioned by month
- **Location-based Partitioning**: Data partitioned by city districts
- **Type-based Partitioning**: Different collections for different sensor types

### 8.2 Caching Strategy
- **Redis Cache**: Frequently accessed dashboard data
- **Application Cache**: User sessions and configuration data
- **CDN**: Static assets and report files

### 8.3 Data Archival
- **Hot Data**: Last 3 months in primary collection
- **Warm Data**: 3-12 months in secondary collection
- **Cold Data**: > 12 months in archive storage

---

## 9. Backup and Recovery

### 9.1 Backup Strategy
- **Daily Backups**: Full database backup at midnight
- **Incremental Backups**: Every 6 hours during business hours
- **Point-in-Time Recovery**: Binary log replay capability
- **Geographic Distribution**: Backups stored in multiple regions

### 9.2 Recovery Procedures
- **RTO**: Recovery Time Objective < 4 hours
- **RPO**: Recovery Point Objective < 1 hour
- **Testing**: Monthly backup restoration tests
- **Documentation**: Detailed recovery procedures

---

## Document Control
- **Last Updated**: September 15, 2025
- **Next Review**: September 22, 2025
- **Approved By**: Database Architect
- **Status**: Draft v1.0