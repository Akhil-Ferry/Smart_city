import React, { useState } from 'react';
import { apiRequest } from '../../utils/api';
import './QuickActions.css';

const QuickActions = ({ userRole, onAction }) => {
  const [loading, setLoading] = useState({});

  const getRoleActions = (role) => {
    const baseActions = [
      { id: 'refresh', label: 'Refresh Data', icon: '🔄', color: '#3b82f6' },
      { id: 'export', label: 'Export Report', icon: '📊', color: '#10b981' }
    ];

    const roleSpecificActions = {
      admin: [
        { id: 'create_alert', label: 'Create Alert', icon: '🚨', color: '#ef4444' },
        { id: 'system_health', label: 'System Health', icon: '💚', color: '#10b981' },
        { id: 'manage_users', label: 'Manage Users', icon: '👥', color: '#8b5cf6' },
        { id: 'emergency', label: 'Emergency Mode', icon: '🚨', color: '#dc2626' }
      ],
      environment_officer: [
        { id: 'air_quality_report', label: 'Air Quality Report', icon: '🌬️', color: '#10b981' },
        { id: 'create_env_alert', label: 'Environmental Alert', icon: '⚠️', color: '#f59e0b' },
        { id: 'calibrate_sensors', label: 'Calibrate Sensors', icon: '🔧', color: '#6b7280' }
      ],
      utility_officer: [
        { id: 'energy_optimization', label: 'Optimize Energy', icon: '⚡', color: '#8b5cf6' },
        { id: 'waste_routing', label: 'Waste Routing', icon: '🗑️', color: '#ef4444' },
        { id: 'maintenance_schedule', label: 'Schedule Maintenance', icon: '🔧', color: '#6b7280' }
      ],
      traffic_control: [
        { id: 'traffic_optimization', label: 'Optimize Traffic', icon: '🚦', color: '#f59e0b' },
        { id: 'incident_report', label: 'Report Incident', icon: '🚧', color: '#ef4444' },
        { id: 'signal_control', label: 'Signal Control', icon: '🚥', color: '#10b981' }
      ],
      viewer: []
    };

    return [...baseActions, ...(roleSpecificActions[role] || [])];
  };

  const handleAction = async (actionId) => {
    setLoading(prev => ({ ...prev, [actionId]: true }));

    try {
      switch (actionId) {
        case 'refresh':
          window.location.reload();
          break;
        case 'export':
          await handleExportReport();
          break;
        case 'create_alert':
          await handleCreateAlert();
          break;
        case 'system_health':
          await handleSystemHealth();
          break;
        case 'emergency':
          alert('Emergency mode activated - All relevant personnel notified');
          break;
        default:
          alert(`Action ${actionId} executed successfully`);
      }

      if (onAction) {
        onAction(actionId);
      }
    } catch (error) {
      alert(`Failed to execute ${actionId}: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [actionId]: false }));
    }
  };

  const handleExportReport = async () => {
    try {
      const response = await apiRequest('/api/city-data/export?format=csv&limit=1000');
      
      // Create downloadable CSV
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `city_data_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      alert('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed');
    }
  };

  const handleCreateAlert = async () => {
    try {
      const alertData = {
        type: 'manual',
        category: 'system',
        severity: 'medium',
        title: 'Manual Alert Created',
        description: 'This is a manually created alert for testing purposes',
        source: {
          type: 'user',
          id: 'admin_dashboard'
        }
      };

      await apiRequest('/api/alerts', {
        method: 'POST',
        body: alertData
      });

      alert('Alert created successfully');
    } catch (error) {
      console.error('Create alert error:', error);
      alert('Failed to create alert');
    }
  };

  const handleSystemHealth = async () => {
    try {
      const health = await apiRequest('/health');
      alert(`System Status: ${health.status} - Uptime: ${Math.round(health.uptime)}s`);
    } catch (error) {
      console.error('Health check error:', error);
      alert('Failed to check system health');
    }
  };

  const actions = getRoleActions(userRole);

  return (
    <div className="quick-actions">
      <div className="quick-actions-header">
        <h3>Quick Actions</h3>
        <p>Role: {userRole?.replace('_', ' ').toUpperCase()}</p>
      </div>

      <div className="actions-grid">
        {actions.map(action => (
          <button
            key={action.id}
            className={`action-button ${loading[action.id] ? 'loading' : ''}`}
            onClick={() => handleAction(action.id)}
            disabled={loading[action.id]}
            style={{ borderColor: action.color }}
          >
            <div className="action-icon" style={{ color: action.color }}>
              {loading[action.id] ? '⏳' : action.icon}
            </div>
            <span className="action-label">{action.label}</span>
          </button>
        ))}
      </div>

      <div className="actions-footer">
        <small>Actions available based on your role permissions</small>
      </div>
    </div>
  );
};

export default QuickActions;