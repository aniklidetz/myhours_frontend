// src/config.js
import { Platform } from 'react-native';

// Определяем URL API в зависимости от платформы и окружения
const getApiUrl = () => {
  if (__DEV__) {
    // В режиме разработки
    if (Platform.OS === 'android') {
      // Для Android эмулятора используем 10.0.2.2
      return 'http://10.0.2.2:8000';
    } else {
      // Для iOS симулятора и физических устройств
      return 'http://192.168.1.164:8000';
    }
  } else {
    // В продакшене используйте ваш реальный API URL
    return 'https://your-production-api.com';
  }
};

export const API_URL = getApiUrl();


export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/users/auth/login/',
    LOGOUT: '/api/users/auth/logout/',
    REFRESH: '/api/auth/refresh/',
  },
  
  // Employee management
  EMPLOYEES: '/api/users/employees/',
  
  // Biometric endpoints
  BIOMETRICS: {
    REGISTER: '/api/biometrics/register/',
    CHECK_IN: '/api/biometrics/check-in/',
    CHECK_OUT: '/api/biometrics/check-out/',
    STATS: '/api/biometrics/management/stats/',
  },
  
  // Work time tracking
  WORKTIME: {
    LOGS: '/api/worktime/worklogs/',
    CURRENT: '/api/worktime/worklogs/current_sessions/',
    QUICK_CHECKOUT: '/api/worktime/worklogs/quick_checkout/',
  },
  
  // Payroll
  PAYROLL: {
    SALARIES: '/api/payroll/salaries/',
    CALCULATE: (id) => `/api/payroll/salaries/${id}/calculate/`,
  },
  
  // Integrations
  INTEGRATIONS: {
    HOLIDAYS: '/api/integrations/holidays/',
    SYNC_HOLIDAYS: '/api/integrations/holidays/sync/',
    SHABBAT_TIMES: '/api/integrations/holidays/shabbat_times/',
  }
};

// App configuration
export const APP_CONFIG = {
  // Biometric settings
  CAMERA_QUALITY: 0.7,
  FACE_DETECTION_TIMEOUT: 30000, // 30 seconds
  
  // Location settings
  LOCATION_TIMEOUT: 10000, // 10 seconds
  HIGH_ACCURACY_LOCATION: true,
  
  // Storage keys
  STORAGE_KEYS: {
    USER_DATA: '@MyHours:UserData',
    AUTH_TOKEN: '@MyHours:AuthToken',
    WORK_STATUS: '@MyHours:WorkStatus',
    OFFICE_SETTINGS: '@MyHours:OfficeSettings',
  },
  
  // Default office settings
  DEFAULT_OFFICE: {
    CHECK_RADIUS: 100, // meters
    REMOTE_POLICY: 'hybrid',
  },
  
  // API configuration
  API_TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  
  // Development flags
  ENABLE_MOCK_DATA: __DEV__, // Use mock data in development
  ENABLE_DEBUG_LOGS: __DEV__,
};

// Helper function to check if we're in development
export const isDevelopment = () => __DEV__;

// Helper function to check if API is available
export const checkApiAvailability = async () => {
  try {
    const response = await fetch(`${API_URL}/`, {
      method: 'GET',
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    console.warn('API not available:', error.message);
    return false;
  }
};