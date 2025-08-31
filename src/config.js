// src/config.js
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { STORAGE_KEYS } from './config/storageKeys';

// Security: Validate and enforce HTTPS in production
const validateApiUrl = url => {
  if (!url) return null;

  // In production, enforce HTTPS
  if (!__DEV__ && !url.startsWith('https://')) {
    console.error('🛑 SECURITY ERROR: Production API URL must use HTTPS:', url);
    throw new Error(
      'Production API URL must use HTTPS. Please check EXPO_PUBLIC_API_URL environment variable.'
    );
  }

  // Validate URL format
  try {
    new URL(url);
    return url;
  } catch (_error) {
    console.error('Invalid API URL format:', url);
    return null;
  }
};

// Determine API URL based on platform and environment
const getApiUrl = () => {
  // Try multiple sources for API URL
  const expoConstantsUrl = Constants.expoConfig?.extra?.apiUrl;
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;

  console.log('Environment variable EXPO_PUBLIC_API_URL:', envApiUrl);
  console.log('Expo Constants API URL:', expoConstantsUrl);

  // Prefer environment variable, then expo constants
  const configuredUrl = envApiUrl || expoConstantsUrl;

  // Validate configured URL
  const validatedUrl = validateApiUrl(configuredUrl);
  if (validatedUrl) {
    console.log('Using validated API URL from environment/constants:', validatedUrl);
    return validatedUrl;
  }

  console.log('No valid environment variable found, using platform defaults');

  if (__DEV__) {
    // Development mode - allow HTTP for local development
    console.log('Development mode: Using local API URLs');

    if (Platform.OS === 'android') {
      // For Android emulator use 10.0.2.2, for physical device detect IP
      const developmentUrl = process.env.EXPO_PUBLIC_DEV_API_URL || 'http://10.0.2.2:8000';
      console.log('🤖 Android development API URL:', developmentUrl);
      return developmentUrl;
    } else if (Platform.OS === 'web') {
      // For web development
      const webDevUrl = process.env.EXPO_PUBLIC_DEV_API_URL || 'http://localhost:8000';
      console.log('Web development API URL:', webDevUrl);
      return webDevUrl;
    } else {
      // For iOS simulator
      const iosDevUrl = process.env.EXPO_PUBLIC_DEV_API_URL || 'http://localhost:8000';
      console.log('🍎 iOS development API URL:', iosDevUrl);
      return iosDevUrl;
    }
  } else {
    // PRODUCTION MODE - HTTPS is mandatory
    console.error('🛑 PRODUCTION SECURITY ERROR: No valid HTTPS API URL provided!');
    console.error('🔧 Please set EXPO_PUBLIC_API_URL environment variable to a valid HTTPS URL');
    console.error('Example: EXPO_PUBLIC_API_URL=https://your-api-domain.com');

    throw new Error(
      'PRODUCTION SECURITY ERROR: API URL is required and must use HTTPS in production. ' +
        'Please set the EXPO_PUBLIC_API_URL environment variable to your production HTTPS API endpoint.'
    );
  }
};

export const API_URL = getApiUrl();

// Security configuration
export const SECURITY_CONFIG = {
  // Enforce HTTPS in production
  REQUIRE_HTTPS_IN_PRODUCTION: true,
  // API request timeout for security (prevent long-running requests)
  MAX_API_TIMEOUT: 60000, // 60 seconds
  // User agent for API requests
  USER_AGENT: 'MyHours-App/1.0',
  // Allowed API domains in production (whitelist)
  PRODUCTION_API_DOMAINS: [
    // Add your production API domains here
    // 'api.yourdomain.com',
    // 'secure-api.yourdomain.com'
  ],
};

// Debug information
console.log('🔧 CONFIG DEBUG:', {
  platform: Platform.OS,
  isDev: __DEV__,
  envVar: process.env.EXPO_PUBLIC_API_URL,
  expoConstants: Constants.expoConfig?.extra?.apiUrl,
  finalUrl: API_URL,
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
    CALCULATE: id => `/api/v1/payroll/salaries/${id}/calculate/`,
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
  },
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
    accuracy: 5,
  },

  // Storage keys - using imported constants with valid SecureStore format
  STORAGE_KEYS,

  // Cache settings
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

  // Default office settings
  DEFAULT_OFFICE: {
    CHECK_RADIUS: 100, // meters
    REMOTE_POLICY: 'hybrid',
  },

  // API configuration
  API_TIMEOUT: 10000, // 10 seconds - default for simple requests
  API_TIMEOUT_HEAVY: 45000, // 45 seconds - increased for heavy requests after biometric registration
  API_TIMEOUT_LIGHT: 25000, // 25 seconds - increased for status checks after biometric operations
  API_TIMEOUT_BIOMETRIC: 60000, // 60 seconds - for biometric operations (face recognition)
  API_TIMEOUT_EXTRA_HEAVY: 60000, // 60 seconds - for extra heavy operations
  RETRY_ATTEMPTS: 3,

  // Development flags
  ENABLE_MOCK_DATA: false, // Disabled mock for working with real backend
  ENABLE_DEBUG_LOGS: __DEV__ && false,
};

// Helper function to check if we're in development
export const isDevelopment = () => __DEV__;

// Helper function to check if API is available with security validation
export const checkApiAvailability = async () => {
  try {
    // Security check: Ensure we're not making insecure requests in production
    if (!__DEV__ && !API_URL.startsWith('https://')) {
      console.error('SECURITY: Refusing to make insecure HTTP request in production');
      return false;
    }

    console.log('Checking API availability at:', API_URL);
    const response = await fetch(`${API_URL}/`, {
      method: 'GET',
      timeout: 5000,
      // Add security headers
      headers: {
        Accept: 'application/json',
        'User-Agent': 'MyHours-App/1.0',
      },
    });

    const isAvailable = response.ok;
    console.log(isAvailable ? 'API is available' : 'API is not available');
    return isAvailable;
  } catch (error) {
    console.warn('API availability check failed:', error.message);
    return false;
  }
};
