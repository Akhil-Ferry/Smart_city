import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socket = useSocket();

  // Add notification
  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      read: false,
      ...notification
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Auto-remove after certain time for non-critical notifications
    if (notification.type !== 'critical' && notification.autoRemove !== false) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, notification.duration || 5000);
    }

    return newNotification.id;
  };

  // Remove notification
  const removeNotification = (id) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== id);
    });
  };

  // Mark notification as read
  const markAsRead = (id) => {
    setNotifications(prev => prev.map(notification => {
      if (notification.id === id && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
        return { ...notification, read: true };
      }
      return notification;
    }));
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notification => ({
      ...notification,
      read: true
    })));
    setUnreadCount(0);
  };

  // Clear all notifications
  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // Clear read notifications
  const clearRead = () => {
    setNotifications(prev => prev.filter(n => !n.read));
  };

  // Show toast notification
  const showToast = (message, type = 'info', options = {}) => {
    return addNotification({
      type: 'toast',
      severity: type,
      title: options.title || type.charAt(0).toUpperCase() + type.slice(1),
      message,
      duration: options.duration || 4000,
      autoRemove: true,
      ...options
    });
  };

  // Show success toast
  const showSuccess = (message, options = {}) => {
    return showToast(message, 'success', options);
  };

  // Show error toast
  const showError = (message, options = {}) => {
    return showToast(message, 'error', { duration: 6000, ...options });
  };

  // Show warning toast
  const showWarning = (message, options = {}) => {
    return showToast(message, 'warning', { duration: 5000, ...options });
  };

  // Show info toast
  const showInfo = (message, options = {}) => {
    return showToast(message, 'info', options);
  };

  // Handle socket notifications
  useEffect(() => {
    if (!socket) return;

    const handleNewAlert = (alert) => {
      addNotification({
        type: 'alert',
        severity: alert.severity,
        title: `New ${alert.severity.toUpperCase()} Alert`,
        message: alert.title,
        alertId: alert._id,
        category: alert.category,
        autoRemove: false,
        actions: [
          {
            label: 'View',
            action: () => window.location.href = `/alerts/${alert._id}`
          },
          {
            label: 'Acknowledge',
            action: () => {
              // Handle acknowledge
              console.log('Acknowledging alert:', alert._id);
            }
          }
        ]
      });
    };

    const handleSystemNotification = (notification) => {
      addNotification({
        type: 'system',
        severity: notification.severity || 'info',
        title: notification.title,
        message: notification.message,
        autoRemove: notification.autoRemove !== false
      });
    };

    const handleDataUpdate = (data) => {
      if (data.anomalyDetected) {
        addNotification({
          type: 'anomaly',
          severity: 'warning',
          title: 'Anomaly Detected',
          message: `Unusual ${data.sensorType} reading detected`,
          autoRemove: true,
          duration: 8000
        });
      }
    };

    // Socket event listeners
    socket.on('new-alert', handleNewAlert);
    socket.on('system-notification', handleSystemNotification);
    socket.on('data-update', handleDataUpdate);

    return () => {
      socket.off('new-alert', handleNewAlert);
      socket.off('system-notification', handleSystemNotification);
      socket.off('data-update', handleDataUpdate);
    };
  }, [socket]);

  // Load persisted notifications from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('smart_city_notifications');
      if (stored) {
        const parsedNotifications = JSON.parse(stored);
        // Only load non-toast notifications
        const persistentNotifications = parsedNotifications.filter(n => n.type !== 'toast');
        setNotifications(persistentNotifications);
        setUnreadCount(persistentNotifications.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error loading notifications from localStorage:', error);
    }
  }, []);

  // Persist notifications to localStorage
  useEffect(() => {
    try {
      // Only persist non-toast notifications
      const persistentNotifications = notifications.filter(n => n.type !== 'toast');
      localStorage.setItem('smart_city_notifications', JSON.stringify(persistentNotifications));
    } catch (error) {
      console.error('Error saving notifications to localStorage:', error);
    }
  }, [notifications]);

  const value = {
    notifications,
    unreadCount,
    addNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    clearRead,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};