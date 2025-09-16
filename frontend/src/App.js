import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

// Import pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Alerts from './pages/Alerts';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';

// Import components
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Import styles
import './styles/App.css';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <AppRoutes />
      </div>
    </AuthProvider>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!user ? <Login /> : <Navigate to="/dashboard" replace />} 
      />
      <Route 
        path="/" 
        element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} 
      />
      
      {user && (
        <Route path="/" element={
          <SocketProvider>
            <Layout />
          </SocketProvider>
        }>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="alerts" element={<Alerts />} />
          {(user.role === 'admin' || user.role === 'super_admin') && (
            <Route path="users" element={<UserManagement />} />
          )}
          <Route path="settings" element={<Settings />} />
        </Route>
      )}
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;