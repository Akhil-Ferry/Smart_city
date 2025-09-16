const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create write streams for different log files
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

const errorLogStream = fs.createWriteStream(
  path.join(logsDir, 'error.log'),
  { flags: 'a' }
);

// Custom token for response body size
morgan.token('res-body-size', (req, res) => {
  return res.get('content-length') || '0';
});

// Custom token for user ID
morgan.token('user-id', (req, res) => {
  return req.user ? req.user.id : 'anonymous';
});

// Custom token for user role
morgan.token('user-role', (req, res) => {
  return req.user ? req.user.role : 'none';
});

// Custom token for request body size
morgan.token('req-body-size', (req, res) => {
  return req.get('content-length') || '0';
});

// Custom token for processing time in milliseconds
morgan.token('response-time-ms', (req, res) => {
  const responseTime = morgan['response-time'](req, res);
  return responseTime ? `${parseFloat(responseTime).toFixed(2)}ms` : '0ms';
});

// Define log formats
const developmentFormat = '[:date[clf]] :method :url :status :response-time-ms - :res[content-length] bytes';

const productionFormat = '[:date[clf]] :remote-addr :user-id (:user-role) ":method :url HTTP/:http-version" :status :res-body-size ":referrer" ":user-agent" :response-time-ms';

const combinedFormat = '[:date[clf]] :remote-addr - :user-id (:user-role) ":method :url HTTP/:http-version" :status :res-body-size ":referrer" ":user-agent" :response-time-ms';

// Security-focused format (without sensitive data)
const securityFormat = '[:date[clf]] :remote-addr :method :url :status :response-time-ms :user-agent';

// API-specific format
const apiFormat = '[:date[clf]] API :method :url :status :response-time-ms - User: :user-id (:user-role) - Size: :res-body-size bytes';

// Error logging format
const errorFormat = '[:date[clf]] ERROR :remote-addr :method :url :status :response-time-ms - User: :user-id - ":user-agent"';

// Create different loggers for different environments and purposes
const createLogger = (format, stream = null) => {
  const options = {
    format,
    skip: (req, res) => {
      // Skip logging health checks and static assets in production
      if (process.env.NODE_ENV === 'production') {
        return req.url === '/health' || 
               req.url.startsWith('/static/') ||
               req.url.endsWith('.ico');
      }
      return false;
    }
  };

  if (stream) {
    options.stream = stream;
  }

  return morgan(format, options);
};

// Development logger - console output with colors
const developmentLogger = morgan(developmentFormat, {
  skip: (req, res) => req.url === '/health'
});

// Production logger - file output
const productionLogger = createLogger(productionFormat, accessLogStream);

// Error logger - only log errors
const errorLogger = createLogger(errorFormat, errorLogStream);
errorLogger.skip = (req, res) => res.statusCode < 400;

// API logger - for API endpoints specifically
const apiLogger = createLogger(apiFormat);
apiLogger.skip = (req, res) => !req.url.startsWith('/api/');

// Security logger - for security-relevant requests
const securityLogger = createLogger(securityFormat);
securityLogger.skip = (req, res) => {
  // Log only authentication, authorization, and error-related requests
  return !(
    req.url.includes('/auth/') ||
    req.url.includes('/login') ||
    req.url.includes('/logout') ||
    res.statusCode >= 400
  );
};

// Request logging middleware that combines multiple loggers
const requestLogger = (req, res, next) => {
  // Add request timestamp
  req.startTime = Date.now();
  
  // Add request ID for tracking
  req.requestId = Math.random().toString(36).substr(2, 9);
  
  // Set request ID in headers for client-side logging
  res.set('X-Request-ID', req.requestId);
  
  // Log request start (for debugging)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] Started ${req.method} ${req.url} (ID: ${req.requestId})`);
  }
  
  next();
};

// Response logging middleware
const responseLogger = (req, res, next) => {
  // Capture original end function
  const originalEnd = res.end;
  
  // Override end function to log response
  res.end = function(chunk, encoding) {
    // Calculate processing time
    const processingTime = Date.now() - req.startTime;
    
    // Log response (for debugging)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] Completed ${req.method} ${req.url} ${res.statusCode} in ${processingTime}ms (ID: ${req.requestId})`);
    }
    
    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Main logging middleware based on environment
const getLogger = () => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return [requestLogger, productionLogger, errorLogger, responseLogger];
    case 'test':
      return [requestLogger, responseLogger]; // Minimal logging for tests
    default:
      return [requestLogger, developmentLogger, responseLogger];
  }
};

// Audit logger for sensitive operations
const auditLog = (action, details = {}) => {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    action,
    details,
    environment: process.env.NODE_ENV || 'development'
  };
  
  // Write to audit log file
  const auditLogStream = fs.createWriteStream(
    path.join(logsDir, 'audit.log'),
    { flags: 'a' }
  );
  
  auditLogStream.write(JSON.stringify(auditEntry) + '\n');
  auditLogStream.end();
  
  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('AUDIT:', auditEntry);
  }
};

// Middleware to log sensitive operations
const auditLogger = (action) => {
  return (req, res, next) => {
    // Log the action with request details
    auditLog(action, {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user ? req.user.id : null,
      userRole: req.user ? req.user.role : null,
      requestId: req.requestId
    });
    
    next();
  };
};

module.exports = {
  getLogger,
  requestLogger,
  responseLogger,
  auditLog,
  auditLogger,
  developmentLogger,
  productionLogger,
  errorLogger,
  apiLogger,
  securityLogger
};