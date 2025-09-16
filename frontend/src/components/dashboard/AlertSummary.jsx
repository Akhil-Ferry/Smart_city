import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../utils/api';
import './AlertSummary.css';

const AlertSummary = ({ data, loading }) => {
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Fetch recent alerts
  useEffect(() => {
    const fetchRecentAlerts = async () => {
      try {
        setAlertsLoading(true);
        const response = await apiRequest('/api/alerts?limit=5&status=active');
        setAlerts(response.data.alerts || []);
      } catch (error) {
        console.error('Error fetching recent alerts:', error);
      } finally {
        setAlertsLoading(false);
      }
    };

    fetchRecentAlerts();
  }, []);

  const getSeverityColor = (severity) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626'
    };
    return colors[severity] || '#6b7280';
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };
    return icons[severity] || '⚪';
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="alert-summary">
      <div className="alert-summary-header">
        <h2>Alert Summary</h2>
        <Link to="/alerts" className="view-all-link">
          View All
        </Link>
      </div>

      {/* Alert Statistics */}
      <div className="alert-stats">
        <div className="stat-item">
          <div className="stat-value">{data?.total || 0}</div>
          <div className="stat-label">Total Alerts</div>
        </div>
        <div className="stat-item">
          <div className="stat-value critical">{data?.critical || 0}</div>
          <div className="stat-label">Critical</div>
        </div>
        <div className="stat-item">
          <div className="stat-value high">{data?.high || 0}</div>
          <div className="stat-label">High</div>
        </div>
        <div className="stat-item">
          <div className="stat-value medium">{data?.medium || 0}</div>
          <div className="stat-label">Medium</div>
        </div>
      </div>

      {/* Severity Distribution Chart */}
      <div className="severity-chart">
        <div className="chart-title">Severity Distribution</div>
        <div className="severity-bars">
          {['critical', 'high', 'medium', 'low'].map(severity => {
            const count = data?.[severity] || 0;
            const total = data?.total || 1;
            const percentage = (count / total) * 100;
            
            return (
              <div key={severity} className="severity-bar">
                <div className="severity-label">
                  <span className="severity-icon">{getSeverityIcon(severity)}</span>
                  <span className="severity-name">{severity}</span>
                  <span className="severity-count">{count}</span>
                </div>
                <div className="bar-container">
                  <div 
                    className="bar-fill"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: getSeverityColor(severity)
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Alerts List */}
      <div className="recent-alerts">
        <div className="recent-alerts-header">
          <h3>Recent Alerts</h3>
        </div>
        
        {alertsLoading ? (
          <div className="alerts-loading">
            <div className="loading-spinner"></div>
            <span>Loading alerts...</span>
          </div>
        ) : alerts.length > 0 ? (
          <div className="alerts-list">
            {alerts.map(alert => (
              <Link 
                key={alert._id} 
                to={`/alerts/${alert._id}`}
                className="alert-item"
              >
                <div className="alert-severity">
                  <span 
                    className="severity-indicator"
                    style={{ backgroundColor: getSeverityColor(alert.severity) }}
                  />
                  <span className="severity-text">{alert.severity}</span>
                </div>
                
                <div className="alert-content">
                  <div className="alert-title">{alert.title}</div>
                  <div className="alert-meta">
                    <span className="alert-category">{alert.category}</span>
                    <span className="alert-time">{formatTimeAgo(alert.createdAt)}</span>
                  </div>
                </div>
                
                <div className="alert-status">
                  <span className={`status-badge status-${alert.status}`}>
                    {alert.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="no-alerts">
            <div className="no-alerts-icon">✅</div>
            <div className="no-alerts-text">No active alerts</div>
            <div className="no-alerts-subtext">All systems are running normally</div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="alert-actions">
        <Link to="/alerts/new" className="action-btn primary">
          Create Alert
        </Link>
        <Link to="/alerts?status=unacknowledged" className="action-btn secondary">
          Review Pending
        </Link>
      </div>
    </div>
  );
};

export default AlertSummary;