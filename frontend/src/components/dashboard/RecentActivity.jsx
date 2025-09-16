import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api';
import './RecentActivity.css';

const RecentActivity = ({ userId, userRole, loading }) => {
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivity();
  }, [userId]);

  const fetchRecentActivity = async () => {
    try {
      setActivityLoading(true);

      // Fetch recent alerts as activity
      const alertsResponse = await apiRequest('/api/alerts?limit=5&status=active');
      
      // Fetch recent notifications
      const notificationsResponse = await apiRequest('/api/dashboard/notifications?limit=5');

      // Combine and format activities
      const alertActivities = alertsResponse.data?.alerts?.map(alert => ({
        id: `alert-${alert._id}`,
        type: 'alert',
        title: alert.title,
        description: alert.description,
        timestamp: alert.createdAt,
        severity: alert.severity,
        category: alert.category,
        icon: getActivityIcon('alert', alert.category),
        color: getSeverityColor(alert.severity)
      })) || [];

      const notificationActivities = notificationsResponse.data?.notifications?.map(notification => ({
        id: `notification-${notification.id}`,
        type: 'notification',
        title: notification.title,
        description: notification.message,
        timestamp: notification.timestamp,
        severity: notification.severity || 'info',
        icon: getActivityIcon('notification'),
        color: getSeverityColor(notification.severity || 'info')
      })) || [];

      // Add system activities
      const systemActivities = [
        {
          id: 'system-startup',
          type: 'system',
          title: 'System Status',
          description: 'Dashboard loaded successfully',
          timestamp: new Date(),
          severity: 'info',
          icon: '🟢',
          color: '#10b981'
        }
      ];

      const allActivities = [...alertActivities, ...notificationActivities, ...systemActivities]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);

      setActivities(allActivities);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setActivities([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const getActivityIcon = (type, category) => {
    const icons = {
      alert: {
        air_quality: '🌬️',
        traffic: '🚦',
        energy: '⚡',
        waste: '🗑️',
        system: '⚙️',
        security: '🔒'
      },
      notification: '📢',
      system: '💻',
      user: '👤'
    };

    if (type === 'alert' && category) {
      return icons.alert[category] || '⚠️';
    }

    return icons[type] || '📋';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#ca8a04',
      low: '#16a34a',
      info: '#2563eb'
    };
    return colors[severity] || '#6b7280';
  };

  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading || activityLoading) {
    return (
      <div className="recent-activity loading">
        <h3>Recent Activity</h3>
        <div className="activity-skeleton">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton-item">
              <div className="skeleton-icon"></div>
              <div className="skeleton-content">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="recent-activity">
      <div className="activity-header">
        <h3>Recent Activity</h3>
        <button 
          className="refresh-button"
          onClick={fetchRecentActivity}
          disabled={activityLoading}
        >
          🔄
        </button>
      </div>

      <div className="activity-list">
        {activities.length === 0 ? (
          <div className="no-activity">
            <p>No recent activity</p>
          </div>
        ) : (
          activities.map(activity => (
            <div 
              key={activity.id} 
              className={`activity-item ${activity.type}`}
              style={{ borderLeftColor: activity.color }}
            >
              <div className="activity-icon">
                {activity.icon}
              </div>
              <div className="activity-content">
                <div className="activity-title">
                  {activity.title}
                  <span 
                    className={`severity-badge ${activity.severity}`}
                    style={{ backgroundColor: activity.color }}
                  >
                    {activity.severity}
                  </span>
                </div>
                <div className="activity-description">
                  {activity.description}
                </div>
                <div className="activity-timestamp">
                  {getRelativeTime(activity.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="activity-footer">
        <button className="view-all-button">
          View All Activity
        </button>
      </div>
    </div>
  );
};

export default RecentActivity;