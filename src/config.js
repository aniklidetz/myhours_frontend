// src/config.js
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Determine API URL based on platform and environment
const getApiUrl = () => {
  // Try multiple sources for API URL
  const expoConstantsUrl = Constants.expoConfig?.extra?.apiUrl;
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
  
  console.log('🔍 Environment variable EXPO_PUBLIC_API_URL:', envApiUrl);
  console.log('🔍 Expo Constants API URL:', expoConstantsUrl);
  
  // Prefer environment variable, then expo constants
  const apiUrl = envApiUrl || expoConstantsUrl;
  
  if (apiUrl) {
    console.log('🌐 Using API URL from environment/constants:', apiUrl);
    return apiUrl;
  }
  
  console.log('⚠️ No environment variable found, using platform defaults');
  
  if (__DEV__) {
    // In development mode
    if (Platform.OS === 'android') {
      // For Android emulator use 10.0.2.2, for physical device use your local IP
      // Physical device needs actual IP address
      const androidUrl = 'http://192.168.1.164:8000';
      console.log('🤖 Android development API URL:', androidUrl);
      return androidUrl;
    } else if (Platform.OS === 'web') {
      // For web development
      return 'http://localhost:8000';
    } else {
      // For iOS simulator - use IP address for better compatibility
      // iOS simulator sometimes has issues with localhost
      const iosUrl = 'http://192.168.1.164:8000';
      console.log('🍎 iOS development API URL:', iosUrl);
      return iosUrl;
    }
  } else {
    // In production use environment variable
    const prodUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
    console.log('🚀 Production API URL:', prodUrl);
    return prodUrl;
  }
};

export const API_URL = getApiUrl();

// Debug information
console.log('🔧 CONFIG DEBUG:', {
  platform: Platform.OS,
  isDev: __DEV__,
  envVar: process.env.EXPO_PUBLIC_API_URL,
  expoConstants: Constants.expoConfig?.extra?.apiUrl,
  finalUrl: API_URL
});


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
    WORK_STATUS: '/api/v1/biometrics/work-status/',
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
    EARNINGS: '/api/v1/payroll/earnings/',
    EARNINGS_ENHANCED: '/api/v1/payroll/earnings/',
    EARNINGS_DEMO: '/api/v1/payroll/earnings/demo/',
    COMPENSATORY_DAYS: '/api/v1/payroll/compensatory-days/',
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
  
  // Emulator-specific settings
  IS_EMULATOR: __DEV__ && (Platform.OS === 'ios' ? false : true), // Android emulator detection
  EMULATOR_LOCATION: {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 5
  },
  
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
    
    // Cache keys
    EMPLOYEES_CACHE: '@MyHours:EmployeesCache',
    CACHE_TIMESTAMP: '@MyHours:CacheTimestamp',
  },
  
  // Cache settings
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  
  // Default office settings
  DEFAULT_OFFICE: {
    CHECK_RADIUS: 100, // meters
    REMOTE_POLICY: 'hybrid',
  },
  
  // API configuration
  API_TIMEOUT: 10000, // 10 seconds - default for simple requests
  API_TIMEOUT_HEAVY: 30000, // 30 seconds - for heavy requests like employees/worklogs
  API_TIMEOUT_LIGHT: 15000, // 15 seconds - increased for status checks to prevent timeout errors
  API_TIMEOUT_BIOMETRIC: 45000, // 45 seconds - for biometric operations (face recognition)
  RETRY_ATTEMPTS: 3,
  
  // Development flags
  ENABLE_MOCK_DATA: false, // Disabled mock for working with real backend
  ENABLE_DEBUG_LOGS: __DEV__ && false,
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