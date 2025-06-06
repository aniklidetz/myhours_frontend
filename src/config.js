// src/config.js
import { Platform } from 'react-native';

// Определяем URL API в зависимости от платформы и окружения
const getApiUrl = () => {
  // Check for environment variable first
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envApiUrl) {
    return envApiUrl;
  }
  
  if (__DEV__) {
    // В режиме разработки
    if (Platform.OS === 'android') {
      // Для Android эмулятора используем 10.0.2.2
      return 'http://10.0.2.2:8000';
    } else {
      // Для iOS симулятора и физических устройств
      // ВАЖНО: Замените на ваш локальный IP адрес!
      // Узнать IP: ifconfig | grep "inet " | grep -v 127.0.0.1
      return 'http://192.168.1.164:8000';  // <-- ОБНОВИТЕ ЭТО НА ВАШ IP!
    }
  } else {
    // В продакшене используйте переменную окружения
    return process.env.EXPO_PUBLIC_API_URL || 'https://api.myhours.com';
  }
};

export const API_URL = getApiUrl();


export const API_ENDPOINTS = {
  // API versioned endpoints (v1)
  API_ROOT: '/api/v1/',
  
  // Authentication
  AUTH: {
    // Legacy authentication endpoints
    LOGIN: '/api/v1/users/auth/login/',
    LOGOUT: '/api/v1/users/auth/logout/',
    
    // Enhanced authentication endpoints
    ENHANCED_LOGIN: '/api/v1/users/auth/enhanced-login/',
    BIOMETRIC_VERIFICATION: '/api/v1/users/auth/biometric-verification/',
    REFRESH_TOKEN: '/api/v1/users/auth/refresh-token/',
    LOGOUT_DEVICE: '/api/v1/users/auth/logout-device/',
  },
  
  // Employee management
  EMPLOYEES: '/api/v1/users/employees/',
  
  // Biometric endpoints
  BIOMETRICS: {
    REGISTER: '/api/v1/biometrics/register/',
    CHECK_IN: '/api/v1/biometrics/check-in/',
    CHECK_OUT: '/api/v1/biometrics/check-out/',
    STATUS: '/api/v1/biometrics/status/',
    STATS: '/api/v1/biometrics/management/stats/',
  },
  
  // Work time tracking
  WORKTIME: {
    LOGS: '/api/v1/worktime/worklogs/',
    CURRENT: '/api/v1/worktime/worklogs/current_sessions/',
    QUICK_CHECKOUT: '/api/v1/worktime/worklogs/quick_checkout/',
  },
  
  // Payroll
  PAYROLL: {
    SALARIES: '/api/v1/payroll/salaries/',
    CALCULATE: (id) => `/api/v1/payroll/salaries/${id}/calculate/`,
  },
  
  // Integrations
  INTEGRATIONS: {
    HOLIDAYS: '/api/v1/integrations/holidays/',
    SYNC_HOLIDAYS: '/api/v1/integrations/holidays/sync/',
    SHABBAT_TIMES: '/api/v1/integrations/holidays/shabbat_times/',
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
    
    // Enhanced authentication storage keys
    ENHANCED_AUTH_DATA: '@MyHours:EnhancedAuthData',
    BIOMETRIC_SESSION: '@MyHours:BiometricSession',
    DEVICE_ID: '@MyHours:DeviceId',
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
  ENABLE_MOCK_DATA: false, // Отключаем mock для работы с реальным backend
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