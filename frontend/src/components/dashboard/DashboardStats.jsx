import React from 'react';
import { Link } from 'react-router-dom';
import './DashboardStats.css';

const DashboardStats = ({ data, userRole, loading }) => {
  if (!data) {
    return (
      <div className="dashboard-stats">
        <div className="stats-loading">Loading statistics...</div>
      </div>
    );
  }

  const getStatsForRole = (role) => {
    const allStats = [
      {
        id: 'totalSensors',
        title: 'Total Sensors',
        value: data.sensors?.total || 0,
        change: data.sensors?.change || 0,
        icon: 'sensor',
        color: 'blue',
        link: '/city-data'
      },
      {
        id: 'activeAlerts',
        title: 'Active Alerts',
        value: data.alerts?.active || 0,
        change: data.alerts?.change || 0,
        icon: 'alert',
        color: data.alerts?.active > 10 ? 'red' : data.alerts?.active > 5 ? 'orange' : 'green',
        link: '/alerts'
      },
      {
        id: 'systemUptime',
        title: 'System Uptime',
        value: `${data.systemStatus?.uptime || 0}%`,
        change: data.systemStatus?.uptimeChange || 0,
        icon: 'uptime',
        color: data.systemStatus?.uptime >= 99 ? 'green' : data.systemStatus?.uptime >= 95 ? 'orange' : 'red',
        link: '/analytics'
      },
      {
        id: 'dataQuality',
        title: 'Data Quality',
        value: `${data.dataQuality?.score || 0}%`,
        change: data.dataQuality?.change || 0,
        icon: 'quality',
        color: data.dataQuality?.score >= 95 ? 'green' : data.dataQuality?.score >= 85 ? 'orange' : 'red',
        link: '/analytics'
      },
      {
        id: 'energyConsumption',
        title: 'Energy Usage',
        value: `${data.energy?.current || 0} MW`,
        change: data.energy?.change || 0,
        icon: 'energy',
        color: 'purple',
        link: '/city-data?category=energy',
        roles: ['admin', 'utility_officer']
      },
      {
        id: 'airQuality',
        title: 'Air Quality Index',
        value: data.airQuality?.aqi || 0,
        change: data.airQuality?.change || 0,
        icon: 'air',
        color: getAirQualityColor(data.airQuality?.aqi || 0),
        link: '/city-data?category=air_quality',
        roles: ['admin', 'environment_officer']
      },
      {
        id: 'trafficFlow',
        title: 'Traffic Flow',
        value: `${data.traffic?.flow || 0}%`,
        change: data.traffic?.change || 0,
        icon: 'traffic',
        color: data.traffic?.flow >= 80 ? 'green' : data.traffic?.flow >= 60 ? 'orange' : 'red',
        link: '/city-data?category=traffic',
        roles: ['admin', 'traffic_control']
      },
      {
        id: 'wasteCollection',
        title: 'Waste Collection',
        value: `${data.waste?.efficiency || 0}%`,
        change: data.waste?.change || 0,
        icon: 'waste',
        color: 'brown',
        link: '/city-data?category=waste',
        roles: ['admin', 'utility_officer']
      }
    ];

    // Filter stats based on user role
    if (role === 'admin') {
      return allStats;
    }

    return allStats.filter(stat => 
      !stat.roles || stat.roles.includes(role)
    );
  };

  function getAirQualityColor(aqi) {
    if (aqi <= 50) return 'green';
    if (aqi <= 100) return 'yellow';
    if (aqi <= 150) return 'orange';
    if (aqi <= 200) return 'red';
    return 'purple';
  }

  const stats = getStatsForRole(userRole);

  const formatChange = (change) => {
    if (change === 0) return null;
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const getChangeClass = (change) => {
    if (change > 0) return 'positive';
    if (change < 0) return 'negative';
    return 'neutral';
  };

  return (
    <div className="dashboard-stats">
      <div className="stats-grid">
        {stats.map((stat) => (
          <Link 
            key={stat.id}
            to={stat.link}
            className={`stat-card stat-card-${stat.color} ${loading ? 'loading' : ''}`}
          >
            <div className="stat-icon">
              <i className={`icon-${stat.icon}`}></i>
            </div>
            
            <div className="stat-content">
              <div className="stat-title">{stat.title}</div>
              <div className="stat-value">{stat.value}</div>
              
              {stat.change !== 0 && (
                <div className={`stat-change ${getChangeClass(stat.change)}`}>
                  <i className={`icon-${stat.change > 0 ? 'up' : 'down'}`}></i>
                  {formatChange(stat.change)}
                </div>
              )}
            </div>
            
            <div className="stat-trend">
              <div className={`trend-indicator trend-${getChangeClass(stat.change)}`}>
                {/* Mini trend chart would go here */}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Additional metrics section */}
      {data.additionalMetrics && (
        <div className="additional-metrics">
          <h3>Quick Insights</h3>
          <div className="metrics-list">
            {data.additionalMetrics.map((metric, index) => (
              <div key={index} className="metric-item">
                <span className="metric-label">{metric.label}</span>
                <span className="metric-value">{metric.value}</span>
                {metric.trend && (
                  <span className={`metric-trend ${getChangeClass(metric.trend)}`}>
                    <i className={`icon-${metric.trend > 0 ? 'up' : 'down'}`}></i>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System status indicators */}
      <div className="system-indicators">
        <div className="indicator-group">
          <div className={`indicator ${data.systemStatus?.database ? 'online' : 'offline'}`}>
            <i className="icon-database"></i>
            <span>Database</span>
          </div>
          <div className={`indicator ${data.systemStatus?.api ? 'online' : 'offline'}`}>
            <i className="icon-api"></i>
            <span>API</span>
          </div>
          <div className={`indicator ${data.systemStatus?.sensors ? 'online' : 'offline'}`}>
            <i className="icon-sensors"></i>
            <span>Sensors</span>
          </div>
          <div className={`indicator ${data.systemStatus?.notifications ? 'online' : 'offline'}`}>
            <i className="icon-notifications"></i>
            <span>Notifications</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;