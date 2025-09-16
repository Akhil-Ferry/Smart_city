const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const alertRoutes = require('./routes/alerts');
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/users');
const cityDataRoutes = require('./routes/cityData');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { auth } = require('./middleware/auth');
const { getLogger } = require('./middleware/logger');
const { 
  authRateLimit, 
  apiRateLimit, 
  speedLimiter,
  uploadRateLimit,
  searchRateLimit 
} = require('./middleware/rateLimiter');

// Import services
const notificationService = require('./services/notificationService');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Request logging middleware
app.use(getLogger());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://localhost:3001"
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(compression());
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Speed limiting (slows down requests when approaching rate limit)
app.use(speedLimiter);

// General API rate limiting
app.use('/api/', apiRateLimit);

// Database connection with retry logic
const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;
  
  const connect = async () => {
    try {
      const conn = await mongoose.connect(
        process.env.MONGODB_URI || 'mongodb://localhost:27017/smartcity',
        {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        }
      );
      
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
      });
      
      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
      });
      
    } catch (error) {
      console.error(`Database connection attempt ${retries + 1} failed:`, error.message);
      
      if (retries < maxRetries) {
        retries++;
        console.log(`Retrying database connection in 5 seconds... (${retries}/${maxRetries})`);
        setTimeout(connect, 5000);
      } else {
        console.error('Max database connection retries reached. Exiting...');
        process.exit(1);
      }
    }
  };
  
  await connect();
};

// Socket.io connection handling with authentication
io.use((socket, next) => {
  // Add authentication middleware for Socket.io if needed
  const token = socket.handshake.auth.token;
  // Verify token here if needed
  next();
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Join user-specific room for targeted notifications
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`Client ${socket.id} joined user room: user-${userId}`);
  });
  
  // Join role-specific room for broadcast notifications
  socket.on('join-role-room', (role) => {
    socket.join(`role-${role}`);
    console.log(`Client ${socket.id} joined role room: role-${role}`);
  });
  
  // Join district-specific room for location-based notifications
  socket.on('join-district-room', (district) => {
    socket.join(`district-${district}`);
    console.log(`Client ${socket.id} joined district room: district-${district}`);
  });
  
  // Handle real-time data subscription
  socket.on('subscribe-sensor-data', (sensorTypes) => {
    sensorTypes.forEach(type => {
      socket.join(`sensor-${type}`);
    });
    console.log(`Client ${socket.id} subscribed to sensor data:`, sensorTypes);
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Make io and notification service accessible in routes
app.set('io', io);
app.set('notificationService', notificationService);

// API Routes with specific rate limiting
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/dashboard', auth, dashboardRoutes);
app.use('/api/alerts', auth, alertRoutes);
app.use('/api/city-data', auth, cityDataRoutes);
app.use('/api/analytics', auth, searchRateLimit, analyticsRoutes);
app.use('/api/users', auth, userRoutes);

// File upload endpoint with specific rate limiting
app.use('/api/upload', auth, uploadRateLimit, (req, res) => {
  res.json({ success: false, message: 'File upload endpoint not implemented yet' });
});

// Health check endpoint with detailed information
app.get('/health', (req, res) => {
  const healthInfo = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: {
      used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
      external: Math.round((process.memoryUsage().external / 1024 / 1024) * 100) / 100
    }
  };
  
  res.status(200).json(healthInfo);
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Smart City Management Platform API',
    version: '1.0.0',
    endpoints: {
      authentication: '/api/auth',
      dashboard: '/api/dashboard',
      alerts: '/api/alerts',
      cityData: '/api/city-data',
      analytics: '/api/analytics',
      users: '/api/users',
      health: '/health'
    },
    documentation: 'For detailed API documentation, visit /api/docs/swagger (not implemented yet)'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `API route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      'GET /api/docs',
      'POST /api/auth/login',
      'GET /api/dashboard/overview',
      'GET /api/alerts',
      'GET /api/city-data/sensors',
      'GET /api/analytics/overview',
      'GET /api/users'
    ]
  });
});

// Error handling middleware (must be before general 404 handler)
app.use(errorHandler);

// General 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
🚀 Smart City Management Platform Server Started
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
📊 Health Check: http://localhost:${PORT}/health
📚 API Docs: http://localhost:${PORT}/api/docs
🕐 Started at: ${new Date().toISOString()}
  `);
});

module.exports = app;