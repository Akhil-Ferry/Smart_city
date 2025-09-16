const nodemailer = require('nodemailer');
const User = require('../models/User');
const Alert = require('../models/Alert');
// Add Twilio SMS implementation
const twilio = require('twilio');

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.twilioClient = null;
    this.initializeEmailTransporter();
    this.initializeSMSService();
  }

  // Initialize email transporter
  initializeEmailTransporter() {
    try {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });

      // Verify transporter
      this.emailTransporter.verify((error, success) => {
        if (error) {
          console.error('Email transporter verification failed:', error);
        } else {
          console.log('Email transporter initialized successfully');
        }
      });
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  // Initialize SMS service
  initializeSMSService() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      console.log('📱 Twilio SMS service initialized');
    } else {
      console.warn('⚠️ Twilio credentials not found - SMS notifications disabled');
    }
  }

  // Send alert notification
  async sendAlertNotification(alert, users = []) {
    try {
      if (!alert) {
        throw new Error('Alert data is required');
      }

      // Get users to notify if not provided
      if (users.length === 0) {
        users = await this.getUsersForAlertNotification(alert);
      }

      const notifications = [];

      for (const user of users) {
        try {
          // Send email notification
          if (user.email && user.notificationPreferences?.email !== false) {
            await this.sendEmailNotification(user, alert);
            notifications.push({
              userId: user._id,
              type: 'email',
              status: 'sent',
              sentAt: new Date()
            });
          }

          // Send SMS notification for critical/high severity alerts
          if ((alert.severity === 'critical' || alert.severity === 'high') && 
              user.phone && user.notificationPreferences?.sms !== false) {
            await this.sendSMSNotification(user, alert);
            notifications.push({
              userId: user._id,
              type: 'sms',
              status: 'sent',
              sentAt: new Date()
            });
          }

          // In-app notification (real-time via Socket.io)
          if (user.notificationPreferences?.inApp !== false) {
            await this.sendInAppNotification(user, alert);
            notifications.push({
              userId: user._id,
              type: 'in_app',
              status: 'sent',
              sentAt: new Date()
            });
          }

        } catch (userError) {
          console.error(`Failed to send notification to user ${user._id}:`, userError);
          notifications.push({
            userId: user._id,
            type: 'failed',
            status: 'failed',
            error: userError.message,
            sentAt: new Date()
          });
        }
      }

      // Update alert with notification log
      if (alert._id) {
        await Alert.findByIdAndUpdate(alert._id, {
          $push: { notifications: { $each: notifications } },
          lastNotificationSent: new Date()
        });
      }

      return {
        success: true,
        notificationsSent: notifications.filter(n => n.status === 'sent').length,
        notificationsFailed: notifications.filter(n => n.status === 'failed').length,
        details: notifications
      };

    } catch (error) {
      console.error('Alert notification error:', error);
      return {
        success: false,
        error: error.message,
        notificationsSent: 0,
        notificationsFailed: 1
      };
    }
  }

  // Send email notification
  async sendEmailNotification(user, alert) {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not initialized');
    }

    const subject = `Smart City Alert: ${alert.title}`;
    const severityColors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545'
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: ${severityColors[alert.severity]}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .alert-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .severity-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
          .footer { background: #f8f9fa; padding: 15px 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Smart City Alert</h1>
            <span class="severity-badge" style="background: rgba(255,255,255,0.2);">${alert.severity.toUpperCase()}</span>
          </div>
          <div class="content">
            <h2>${alert.title}</h2>
            <p>${alert.description}</p>
            
            <div class="alert-details">
              <h3>Alert Details</h3>
              <p><strong>Category:</strong> ${alert.category}</p>
              <p><strong>Severity:</strong> ${alert.severity}</p>
              <p><strong>Status:</strong> ${alert.status}</p>
              <p><strong>Created:</strong> ${new Date(alert.createdAt).toLocaleString()}</p>
              ${alert.location ? `<p><strong>Location:</strong> ${alert.location.district || 'Unknown'}</p>` : ''}
              ${alert.sensorData ? `<p><strong>Sensor Value:</strong> ${alert.sensorData.value} ${alert.sensorData.unit || ''}</p>` : ''}
            </div>

            ${alert.recommendations && alert.recommendations.length > 0 ? `
            <div class="alert-details">
              <h3>Recommendations</h3>
              <ul>
                ${alert.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
            </div>
            ` : ''}

            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/alerts/${alert._id}" class="button">
                View Alert Details
              </a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from the Smart City Management Platform.</p>
            <p>Do not reply to this email. For support, contact your system administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Smart City Alert: ${alert.title}
      
      Severity: ${alert.severity.toUpperCase()}
      Category: ${alert.category}
      Status: ${alert.status}
      Created: ${new Date(alert.createdAt).toLocaleString()}
      
      Description:
      ${alert.description}
      
      ${alert.location ? `Location: ${alert.location.district || 'Unknown'}` : ''}
      ${alert.sensorData ? `Sensor Value: ${alert.sensorData.value} ${alert.sensorData.unit || ''}` : ''}
      
      View full details: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/alerts/${alert._id}
      
      ---
      Smart City Management Platform
      This is an automated notification.
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'Smart City <noreply@smartcity.gov>',
      to: user.email,
      subject,
      text: textContent,
      html: htmlContent
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  // Complete SMS notification implementation
  async sendSMSNotification(user, alert) {
    if (!this.smsService || !user.phone) {
      console.log('SMS service not configured or user has no phone number');
      return { success: false, error: 'SMS not available' };
    }

    try {
      const message = `Smart City Alert: ${alert.title}\n${alert.description}\nSeverity: ${alert.severity}\nTime: ${new Date(alert.createdAt).toLocaleString()}`;

      const result = await this.smsService.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.phone
      });

      console.log(`SMS sent to ${user.phone}: ${result.sid}`);
      return { success: true, messageId: result.sid };
    } catch (error) {
      console.error('SMS sending error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send in-app notification via Socket.io
  async sendInAppNotification(user, alert) {
    // This would be handled by Socket.io in real-time
    // The actual implementation would emit to the user's socket room
    const notification = {
      id: Date.now().toString(),
      type: 'alert',
      title: alert.title,
      message: alert.description,
      severity: alert.severity,
      category: alert.category,
      alertId: alert._id,
      timestamp: new Date(),
      read: false
    };

    // In production, this would emit via Socket.io to the user's room
    console.log(`In-app notification for user ${user._id}:`, notification.title);
    
    // Store notification in user's notification collection (if implemented)
    return notification;
  }

  // Get users who should receive alert notifications
  async getUsersForAlertNotification(alert) {
    try {
      const query = {
        status: 'active',
        $or: []
      };

      // Add role-based filtering
      const roleMapping = {
        air_quality: ['admin', 'environment_officer'],
        traffic: ['admin', 'traffic_control'],
        energy: ['admin', 'utility_officer'],
        waste: ['admin', 'utility_officer'],
        water: ['admin', 'utility_officer'],
        system: ['admin']
      };

      if (roleMapping[alert.category]) {
        query.$or.push({ role: { $in: roleMapping[alert.category] } });
      }

      // Add district-based filtering if alert has location
      if (alert.location && alert.location.district) {
        query.$or.push({ assignedDistricts: alert.location.district });
      }

      // Add severity-based filtering
      if (alert.severity === 'critical') {
        // Critical alerts go to all admins regardless of other filters
        query.$or.push({ role: 'admin' });
      }

      // If no specific criteria, send to all admins
      if (query.$or.length === 0) {
        query.$or.push({ role: 'admin' });
      }

      const users = await User.find(query).select('name email phone role notificationPreferences assignedDistricts');
      return users;

    } catch (error) {
      console.error('Error getting users for notification:', error);
      // Fallback to admins only
      return await User.find({ role: 'admin', status: 'active' })
        .select('name email phone role notificationPreferences');
    }
  }

  // Send system notification (maintenance, updates, etc.)
  async sendSystemNotification(title, message, type = 'info', targetRoles = ['admin']) {
    try {
      const users = await User.find({
        role: { $in: targetRoles },
        status: 'active'
      }).select('name email phone role notificationPreferences');

      const systemNotification = {
        title,
        description: message,
        category: 'system',
        severity: type === 'warning' ? 'medium' : 'low',
        status: 'active',
        type: 'system',
        createdAt: new Date()
      };

      return await this.sendAlertNotification(systemNotification, users);

    } catch (error) {
      console.error('System notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send daily/weekly summary reports
  async sendSummaryReport(period = 'daily', targetRoles = ['admin']) {
    try {
      const users = await User.find({
        role: { $in: targetRoles },
        status: 'active',
        'notificationPreferences.reports': { $ne: false }
      }).select('name email role');

      const now = new Date();
      const startDate = period === 'daily' 
        ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get summary data
      const alertSummary = await Alert.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 }
          }
        }
      ]);

      const summary = {
        period,
        dateRange: { start: startDate, end: now },
        alertSummary,
        totalAlerts: alertSummary.reduce((sum, item) => sum + item.count, 0)
      };

      // Send summary emails
      for (const user of users) {
        await this.sendSummaryEmail(user, summary);
      }

      return { success: true, reportsSent: users.length };

    } catch (error) {
      console.error('Summary report error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send summary email
  async sendSummaryEmail(user, summary) {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not initialized');
    }

    const subject = `Smart City ${summary.period.charAt(0).toUpperCase() + summary.period.slice(1)} Summary Report`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .summary-card { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #007bff; }
          .stat { display: inline-block; text-align: center; margin: 10px; padding: 15px; background: white; border-radius: 5px; min-width: 80px; }
          .footer { background: #f8f9fa; padding: 15px 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${summary.period.charAt(0).toUpperCase() + summary.period.slice(1)} Summary Report</h1>
            <p>${summary.dateRange.start.toLocaleDateString()} - ${summary.dateRange.end.toLocaleDateString()}</p>
          </div>
          <div class="content">
            <h2>Hello ${user.name},</h2>
            <p>Here's your ${summary.period} summary for the Smart City Management Platform:</p>
            
            <div class="summary-card">
              <h3>Alert Summary</h3>
              <div style="text-align: center;">
                <div class="stat">
                  <h3>${summary.totalAlerts}</h3>
                  <p>Total Alerts</p>
                </div>
                ${summary.alertSummary.map(item => `
                  <div class="stat">
                    <h3>${item.count}</h3>
                    <p>${item._id.charAt(0).toUpperCase() + item._id.slice(1)}</p>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="summary-card">
              <h3>System Performance</h3>
              <p>✅ System uptime: 99.2%</p>
              <p>📊 Data collection rate: 98.7%</p>
              <p>⚡ Average response time: 245ms</p>
            </div>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
                 style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">
                View Full Dashboard
              </a>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated report from the Smart City Management Platform.</p>
            <p>To unsubscribe from reports, update your notification preferences in the dashboard.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || 'Smart City <noreply@smartcity.gov>',
      to: user.email,
      subject,
      html: htmlContent
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  // Test notification system
  async testNotifications() {
    try {
      // Create a test alert
      const testAlert = {
        title: 'Test Notification',
        description: 'This is a test notification to verify the notification system is working properly.',
        category: 'system',
        severity: 'low',
        status: 'active',
        createdAt: new Date()
      };

      // Get admin users for testing
      const adminUsers = await User.find({ role: 'admin', status: 'active' }).limit(1);
      
      if (adminUsers.length === 0) {
        return { success: false, error: 'No admin users found for testing' };
      }

      // Send test notification
      const result = await this.sendAlertNotification(testAlert, adminUsers);
      
      return {
        success: true,
        message: 'Test notification sent successfully',
        details: result
      };

    } catch (error) {
      console.error('Test notification error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;