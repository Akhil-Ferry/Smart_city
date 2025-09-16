// API utility functions for making HTTP requests
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Custom error class for API errors
export class APIError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('smart_city_token');
};

// Set auth token in localStorage
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('smart_city_token', token);
  } else {
    localStorage.removeItem('smart_city_token');
  }
};

// Remove auth token from localStorage
export const removeAuthToken = () => {
  localStorage.removeItem('smart_city_token');
};

// Create request headers
const createHeaders = (options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

// Main API request function
export const apiRequest = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const config = {
    method: 'GET',
    headers: createHeaders(options),
    ...options
  };

  // Add body for POST, PUT, PATCH requests
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    
    // Handle different response types
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Handle error responses
    if (!response.ok) {
      const errorMessage = data?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new APIError(errorMessage, response.status, data);
    }

    return data;
  } catch (error) {
    // Handle network errors
    if (error instanceof APIError) {
      throw error;
    }
    
    // Handle fetch errors (network issues, etc.)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new APIError('Network error: Unable to connect to server', 0);
    }
    
    // Handle JSON parsing errors
    if (error.name === 'SyntaxError') {
      throw new APIError('Invalid response format from server', 0);
    }
    
    throw new APIError(error.message || 'Unknown error occurred', 0);
  }
};

// Convenience methods for different HTTP verbs
export const get = (endpoint, options = {}) => {
  return apiRequest(endpoint, { ...options, method: 'GET' });
};

export const post = (endpoint, body, options = {}) => {
  return apiRequest(endpoint, { ...options, method: 'POST', body });
};

export const put = (endpoint, body, options = {}) => {
  return apiRequest(endpoint, { ...options, method: 'PUT', body });
};

export const patch = (endpoint, body, options = {}) => {
  return apiRequest(endpoint, { ...options, method: 'PATCH', body });
};

export const del = (endpoint, options = {}) => {
  return apiRequest(endpoint, { ...options, method: 'DELETE' });
};

// Authentication specific requests
export const login = async (credentials) => {
  try {
    const response = await post('/api/auth/login', credentials);
    
    if (response.success && response.token) {
      setAuthToken(response.token);
    }
    
    return response;
  } catch (error) {
    throw error;
  }
};

export const logout = async () => {
  try {
    await post('/api/auth/logout');
  } catch (error) {
    console.warn('Logout request failed:', error.message);
  } finally {
    removeAuthToken();
  }
};

export const register = async (userData) => {
  return post('/api/auth/register', userData);
};

export const getCurrentUser = async () => {
  return get('/api/auth/me');
};

export const refreshToken = async () => {
  try {
    const response = await post('/api/auth/refresh');
    
    if (response.success && response.token) {
      setAuthToken(response.token);
    }
    
    return response;
  } catch (error) {
    removeAuthToken();
    throw error;
  }
};

// Dashboard specific requests
export const getDashboardOverview = () => {
  return get('/api/dashboard/overview');
};

export const getRealtimeData = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return get(`/api/dashboard/realtime-data${queryString ? `?${queryString}` : ''}`);
};

export const getMapData = () => {
  return get('/api/dashboard/map-data');
};

// Alert specific requests
export const getAlerts = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return get(`/api/alerts${queryString ? `?${queryString}` : ''}`);
};

export const getAlert = (id) => {
  return get(`/api/alerts/${id}`);
};

export const createAlert = (alertData) => {
  return post('/api/alerts', alertData);
};

export const updateAlert = (id, alertData) => {
  return put(`/api/alerts/${id}`, alertData);
};

export const deleteAlert = (id) => {
  return del(`/api/alerts/${id}`);
};

export const acknowledgeAlert = (id, data = {}) => {
  return post(`/api/alerts/${id}/acknowledge`, data);
};

export const resolveAlert = (id, data = {}) => {
  return post(`/api/alerts/${id}/resolve`, data);
};

export const escalateAlert = (id, data = {}) => {
  return post(`/api/alerts/${id}/escalate`, data);
};

// City data specific requests
export const getSensorData = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return get(`/api/city-data/sensors${queryString ? `?${queryString}` : ''}`);
};

export const getSensorTrends = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return get(`/api/city-data/trends${queryString ? `?${queryString}` : ''}`);
};

export const exportSensorData = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return get(`/api/city-data/export${queryString ? `?${queryString}` : ''}`);
};

// Analytics specific requests
export const getAnalyticsOverview = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return get(`/api/analytics/overview${queryString ? `?${queryString}` : ''}`);
};

export const getPredictions = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return get(`/api/analytics/predictions${queryString ? `?${queryString}` : ''}`);
};

export const getAnomalies = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return get(`/api/analytics/anomalies${queryString ? `?${queryString}` : ''}`);
};

// User management requests
export const getUsers = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return get(`/api/users${queryString ? `?${queryString}` : ''}`);
};

export const getUser = (id) => {
  return get(`/api/users/${id}`);
};

export const createUser = (userData) => {
  return post('/api/users', userData);
};

export const updateUser = (id, userData) => {
  return put(`/api/users/${id}`, userData);
};

export const deleteUser = (id) => {
  return del(`/api/users/${id}`);
};

export const changePassword = (id, passwordData) => {
  return put(`/api/users/${id}/password`, passwordData);
};

// File upload utility
export const uploadFile = async (endpoint, file, additionalData = {}) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // Add additional form data
  Object.keys(additionalData).forEach(key => {
    formData.append(key, additionalData[key]);
  });

  const token = getAuthToken();
  const headers = {};
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new APIError(data.message || 'Upload failed', response.status, data);
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(error.message || 'Upload failed', 0);
  }
};

// Request interceptor for token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// Wrapper to handle token refresh automatically
export const apiRequestWithRefresh = async (endpoint, options = {}) => {
  try {
    return await apiRequest(endpoint, options);
  } catch (error) {
    if (error.status === 401 && !options._retry) {
      if (isRefreshing) {
        // If refresh is already in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
      }

      isRefreshing = true;
      
      try {
        await refreshToken();
        processQueue(null);
        
        // Retry the original request
        return await apiRequest(endpoint, { ...options, _retry: true });
      } catch (refreshError) {
        processQueue(refreshError);
        removeAuthToken();
        window.location.href = '/login';
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }
    
    throw error;
  }
};

export default {
  apiRequest,
  get,
  post,
  put,
  patch,
  del,
  login,
  logout,
  register,
  getCurrentUser,
  refreshToken,
  uploadFile,
  setAuthToken,
  removeAuthToken,
  APIError
};