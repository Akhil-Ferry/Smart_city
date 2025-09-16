// utils/seedData.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const SensorData = require('../models/SensorData');
const Alert = require('../models/Alert');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_city');
    console.log('MongoDB Connected for seeding');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const seedUsers = async () => {
  try {
    await User.deleteMany({});

    const users = [
      {
        name: 'System Administrator',
        email: 'admin@smartcity.com',
        password: await bcrypt.hash('admin123', 12),
        role: 'admin',
        phone: '+1234567890',
        status: 'active'
      },
      {
        name: 'Environmental Officer',
        email: 'env@smartcity.com',
        password: await bcrypt.hash('env123', 12),
        role: 'environment_officer',
        phone: '+1234567891',
        status: 'active'
      },
      {
        name: 'Utility Manager',
        email: 'utility@smartcity.com',
        password: await bcrypt.hash('utility123', 12),
        role: 'utility_officer',
        phone: '+1234567892',
        status: 'active'
      },
      {
        name: 'Traffic Controller',
        email: 'traffic@smartcity.com',
        password: await bcrypt.hash('traffic123', 12),
        role: 'traffic_control',
        phone: '+1234567893',
        status: 'active'
      },
      {
        name: 'Data Analyst',
        email: 'viewer@smartcity.com',
        password: await bcrypt.hash('viewer123', 12),
        role: 'viewer',
        status: 'active'
      }
    ];

    await User.insertMany(users);
    console.log('Users seeded successfully');
  } catch (error) {
    console.error('Error seeding users:', error);
  }
};

const seedSensorData = async () => {
  try {
    await SensorData.deleteMany({});

    const sensorTypes = ['air_quality', 'traffic', 'energy', 'waste', 'weather'];
    const districts = ['Downtown', 'Residential_A', 'Residential_B', 'Industrial', 'Commercial'];
    const sensorData = [];

    for (let i = 0; i < 100; i++) {
      const sensorType = sensorTypes[Math.floor(Math.random() * sensorTypes.length)];
      const district = districts[Math.floor(Math.random() * districts.length)];
      
      let data = {};
      switch (sensorType) {
        case 'air_quality':
          data = {
            value: Math.round(Math.random() * 100 + 20),
            unit: 'AQI',
            pm25: Math.round(Math.random() * 50 + 10),
            pm10: Math.round(Math.random() * 80 + 20)
          };
          break;
        case 'traffic':
          data = {
            value: Math.round(Math.random() * 100),
            unit: '%',
            vehicleCount: Math.round(Math.random() * 200 + 50),
            avgSpeed: Math.round(Math.random() * 60 + 20)
          };
          break;
        case 'energy':
          data = {
            value: Math.round(Math.random() * 500 + 100),
            unit: 'MW',
            voltage: Math.round(Math.random() * 50 + 220),
            frequency: Math.round((Math.random() * 2 + 49) * 100) / 100
          };
          break;
        case 'waste':
          data = {
            value: Math.round(Math.random() * 100),
            unit: '%',
            weight: Math.round(Math.random() * 1000 + 200),
            temperature: Math.round(Math.random() * 30 + 15)
          };
          break;
        case 'weather':
          data = {
            value: Math.round(Math.random() * 30 + 10),
            unit: '°C',
            humidity: Math.round(Math.random() * 40 + 30),
            pressure: Math.round(Math.random() * 50 + 980)
          };
          break;
      }

      sensorData.push({
        sensorId: `${sensorType}_${district}_${String(i % 10).padStart(3, '0')}`,
        sensorType,
        location: {
          district,
          address: `${Math.floor(Math.random() * 999) + 1} Main St, ${district}`,
          coordinates: [
            40.7128 + (Math.random() - 0.5) * 0.1, // NYC latitude ± random
            -74.0060 + (Math.random() - 0.5) * 0.1  // NYC longitude ± random
          ]
        },
        data,
        status: Math.random() > 0.1 ? 'active' : 'inactive',
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) // Random time in last 24h
      });
    }

    await SensorData.insertMany(sensorData);
    console.log('Sensor data seeded successfully');
  } catch (error) {
    console.error('Error seeding sensor data:', error);
  }
};

const seedAlerts = async () => {
  try {
    await Alert.deleteMany({});

    const categories = ['air_quality', 'traffic', 'energy', 'waste', 'system'];
    const severities = ['low', 'medium', 'high', 'critical'];
    const statuses = ['active', 'acknowledged', 'resolved'];

    const alerts = [];

    for (let i = 0; i < 20; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      alerts.push({
        alertId: `ALT-${Date.now()}-${String(i).padStart(3, '0')}`,
        type: 'threshold',
        category,
        severity,
        status,
        title: `${category.replace('_', ' ').toUpperCase()} Alert`,
        description: `Threshold exceeded for ${category}. Immediate attention required.`,
        source: {
          type: 'sensor',
          id: `${category}_sensor_${String(i % 5).padStart(3, '0')}`,
          location: {
            coordinates: [
              40.7128 + (Math.random() - 0.5) * 0.1,
              -74.0060 + (Math.random() - 0.5) * 0.1
            ]
          }
        },
        threshold: {
          parameter: 'value',
          operator: '>',
          value: Math.random() * 100,
          unit: 'units'
        },
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        priority: Math.floor(Math.random() * 10) + 1
      });
    }

    await Alert.insertMany(alerts);
    console.log('Alerts seeded successfully');
  } catch (error) {
    console.error('Error seeding alerts:', error);
  }
};

const main = async () => {
  await connectDB();
  
  console.log('Starting database seeding...');
  await seedUsers();
  await seedSensorData();
  await seedAlerts();
  
  console.log('Database seeding completed!');
  console.log('\nDefault user accounts:');
  console.log('Admin: admin@smartcity.com / admin123');
  console.log('Env Officer: env@smartcity.com / env123');
  console.log('Utility Officer: utility@smartcity.com / utility123');
  console.log('Traffic Control: traffic@smartcity.com / traffic123');
  console.log('Viewer: viewer@smartcity.com / viewer123');
  
  process.exit(0);
};

main().catch(error => {
  console.error('Seeding failed:', error);
  process.exit(1);
});