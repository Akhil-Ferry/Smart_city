import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useNotifications } from '../../contexts/NotificationContext';
import DashboardStats from './DashboardStats';
import RealtimeChart from './RealtimeChart';
import AlertSummary from './AlertSummary';
import MapView from './MapView';
import QuickActions from './QuickActions';
import RecentActivity from './RecentActivity';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import { apiRequest } from '../../utils/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const { showError, showSuccess } = useNotifications();
  
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Fetch dashboard data
  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [overviewResponse, realtimeResponse, mapResponse] = await Promise.all([
        apiRequest('/api/dashboard/overview'),
        apiRequest('/api/dashboard/realtime-data'),
        apiRequest('/api/dashboard/map-data')
      ]);

      setDashboardData({
        overview: overviewResponse.data,
        realtimeData: realtimeResponse.data,
        mapData: mapResponse.data
      });

      setLastUpdate(new Date());
      
      if (isRefresh) {
        showSuccess('Dashboard data refreshed successfully');
      }
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(err.message || 'Failed to load dashboard data');
      showError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle manual refresh
  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  // Initial data load
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Socket connection for real-time updates
  useEffect(() => {
    if (!socket || !user) return;

    // Join user-specific room
    socket.emit('join-user-room', user.id);
    
    // Join role-specific room for relevant updates
    socket.emit('join-role-room', user.role);

    // Subscribe to real-time sensor data based on user role
    const sensorTypes = getSensorTypesForRole(user.role);
    if (sensorTypes.length > 0) {
      socket.emit('subscribe-sensor-data', sensorTypes);
    }

    // Handle real-time data updates
    const handleDataUpdate = (update) => {
      setDashboardData(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          realtimeData: {
            ...prev.realtimeData,
            sensors: prev.realtimeData.sensors.map(sensor => 
              sensor.id === update.sensorId 
                ? { ...sensor, ...update.data, lastUpdate: new Date() }
                : sensor
            )
          }
        };
      });
    };

    // Handle alert updates
    const handleAlertUpdate = (alert) => {
      setDashboardData(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          overview: {
            ...prev.overview,
            alerts: {
              ...prev.overview.alerts,
              total: prev.overview.alerts.total + 1,
              [alert.severity]: prev.overview.alerts[alert.severity] + 1
            }
          }
        };
      });
    };

    // Handle system status updates
    const handleSystemUpdate = (status) => {
      setDashboardData(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          overview: {
            ...prev.overview,
            systemStatus: {
              ...prev.overview.systemStatus,
              ...status
            }
          }
        };
      });
    };

    socket.on('data-update', handleDataUpdate);
    socket.on('new-alert', handleAlertUpdate);
    socket.on('system-status', handleSystemUpdate);

    return () => {
      socket.off('data-update', handleDataUpdate);
      socket.off('new-alert', handleAlertUpdate);
      socket.off('system-status', handleSystemUpdate);
    };
  }, [socket, user]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!refreshing && !loading) {
        fetchDashboardData(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshing, loading]);

  // Get sensor types based on user role
  const getSensorTypesForRole = (role) => {
    const roleSensorMap = {
      admin: ['air_quality', 'traffic', 'energy', 'waste', 'water'],
      environment_officer: ['air_quality', 'water'],
      utility_officer: ['energy', 'waste', 'water'],
      traffic_control: ['traffic'],
      viewer: ['air_quality', 'traffic', 'energy', 'waste', 'water']
    };
    
    return roleSensorMap[role] || [];
  };

  if (loading && !dashboardData) {
    return <LoadingSpinner />;
  }

  if (error && !dashboardData) {
    return (
      <ErrorMessage 
        message={error} 
        onRetry={() => fetchDashboardData()} 
      />
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Smart City Dashboard</h1>
          <p className="welcome-message">
            Welcome back, {user?.name}! Here's what's happening in the city.
          </p>
        </div>
        
        <div className="dashboard-controls">
          <div className="last-update">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <button 
            className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh dashboard data"
          >
            <i className="icon-refresh"></i>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="dashboard-error">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="dashboard-content">
        {/* Top Row - Stats */}
        <div className="dashboard-row">
          <div className="dashboard-section">
            <DashboardStats 
              data={dashboardData?.overview} 
              userRole={user?.role}
              loading={refreshing}
            />
          </div>
        </div>

        {/* Second Row - Charts and Alerts */}
        <div className="dashboard-row">
          <div className="dashboard-section dashboard-section-large">
            <RealtimeChart 
              data={dashboardData?.realtimeData}
              userRole={user?.role}
              loading={refreshing}
            />
          </div>
          <div className="dashboard-section dashboard-section-medium">
            <AlertSummary 
              data={dashboardData?.overview?.alerts}
              loading={refreshing}
            />
          </div>
        </div>

        
        {/* Third Row - Map and Quick Actions */}
        <div className="dashboard-row">
          <div className="dashboard-section dashboard-section-large">
            <MapView 
              data={dashboardData?.mapData}
              userRole={user?.role}
              loading={refreshing}
            />
          </div>
          <div className="dashboard-section dashboard-section-medium">
            <QuickActions 
              userRole={user?.role}
              onAction={(action) => {
                console.log('Quick action:', action);
                // Handle quick actions
              }}
            />
          </div>
        </div>

        {/* Fourth Row - Recent Activity */}
        <div className="dashboard-row">
          <div className="dashboard-section">
            <RecentActivity 
              userId={user?.id}
              
              userRole={user?.role}
              loading={refreshing}
            />
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default Dashboard;

// @route   GET /api/dashboard/map-data
// @desc    Get geospatial data for map visualization
// @access  Private
router.get('/map-data', auth, async (req, res) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Get latest sensor data with location
    const sensors = await SensorData.find({
      timestamp: { $gte: oneHourAgo },
      status: 'active',
      'location.coordinates': { $exists: true }
    })
    .sort({ timestamp: -1 })
    .limit(50)
    .lean();

    // Get active alerts with location
    const alerts = await Alert.find({
      status: 'active',
      'source.location.coordinates': { $exists: true }
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

    res.json({
      success: true,
      data: {
        sensors,
        alerts,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Map data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching map data'
    });
  }
});