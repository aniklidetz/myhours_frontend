// src/api/apiService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { API_URL, API_ENDPOINTS, APP_CONFIG } from '../config';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: APP_CONFIG.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Create heavy requests client with longer timeout
const apiClientHeavy = axios.create({
  baseURL: API_URL,
  timeout: APP_CONFIG.API_TIMEOUT_HEAVY,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Create light requests client with shorter timeout
const apiClientLight = axios.create({
  baseURL: API_URL,
  timeout: APP_CONFIG.API_TIMEOUT_LIGHT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Track recent errors to avoid spam
const errorTracker = new Map();

const logUniqueError = (url, error) => {
  const errorKey = `${url}_${error.message}`;
  const now = Date.now();
  const lastLogged = errorTracker.get(errorKey);
  
  // Only log if this error wasn't logged in the last minute
  if (!lastLogged || now - lastLogged > 60000) {
    console.error('❌ API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    errorTracker.set(errorKey, now);
  }
};

// Retry logic helper with abort signal support
const retryRequest = async (fn, retries = APP_CONFIG.RETRY_ATTEMPTS, signal = null) => {
  try {
    return await fn();
  } catch (error) {
    // Don't retry if request was aborted
    if (error.name === 'CanceledError' || (signal && signal.aborted)) {
      console.log('🔄 Request was aborted by user');
      throw error;
    }
    
    if (retries > 0 && error.response && error.response.status >= 500) {
      const attemptNumber = APP_CONFIG.RETRY_ATTEMPTS - retries + 1;
      console.log(`🔄 Retrying request... (attempt ${attemptNumber}/${APP_CONFIG.RETRY_ATTEMPTS})`);
      console.log('Retry reason:', {
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config?.url
      });
      await new Promise(resolve => setTimeout(resolve, 1000 * attemptNumber)); // Exponential backoff
      return retryRequest(fn, retries - 1, signal);
    }
    throw error;
  }
};

// Helper function to get device information
const getDeviceInfo = async () => {
  // Handle web platform where some APIs are not available
  const isWeb = Platform.OS === 'web';
  
  return {
    platform: Platform.OS,
    os_version: isWeb ? 'web' : (Platform.Version ? Platform.Version.toString() : 'unknown'),
    app_version: Constants.expoConfig?.version || '1.0.0',
    device_model: isWeb ? 'Web Browser' : (Device.modelName || `${Platform.OS} Device`),
    device_id: await getUniqueDeviceId()
  };
};

// Helper function to get unique device ID
const getUniqueDeviceId = async () => {
  try {
    let deviceId = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.DEVICE_ID);
    if (!deviceId) {
      // Generate a unique device ID if not exists
      deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    return deviceId;
  } catch (error) {
    console.error('Error generating device ID:', error);
    return `${Platform.OS}_fallback_${Date.now()}`;
  }
};

// Helper function to add auth interceptors to all clients
const addAuthInterceptors = (client) => {
  // Request interceptor to add auth token
  client.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        // Check if we have enhanced auth data
        const enhancedAuthData = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA);
        
        if (enhancedAuthData) {
          // Use DeviceToken for all API calls when we have enhanced auth
          config.headers.Authorization = `DeviceToken ${token}`;
        } else {
          // Legacy token for backward compatibility
          config.headers.Authorization = `Token ${token}`;
        }
      }
      
      // Log request in development
      if (APP_CONFIG.ENABLE_DEBUG_LOGS) {
        console.log('📤 API Request:', {
          url: config.url,
          method: config.method,
          headers: { ...config.headers, Authorization: config.headers.Authorization ? '[REDACTED]' : undefined },
          data: config.data ? { ...config.data, password: config.data.password ? '[REDACTED]' : config.data.password } : undefined
        });
        
        // Debug token details
        const enhancedAuthDataForDebug = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA);
        console.log('🔍 Auth Debug:', {
          hasToken: !!token,
          hasEnhancedAuth: !!enhancedAuthDataForDebug,
          authHeader: config.headers.Authorization ? config.headers.Authorization.substring(0, 20) + '...' : 'NONE'
        });
      }
    } catch (error) {
      console.error('Error adding auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

  // Response interceptor for error handling
  client.interceptors.response.use(
  (response) => {
    if (APP_CONFIG.ENABLE_DEBUG_LOGS) {
      console.log('📥 API Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data
      });
    }
    return response;
  },
  async (error) => {
    if (APP_CONFIG.ENABLE_DEBUG_LOGS) {
      logUniqueError(error.config?.url, error);
    }

    // Handle 401 Unauthorized - clear token and redirect to login
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove([
        APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
        APP_CONFIG.STORAGE_KEYS.USER_DATA,
        APP_CONFIG.STORAGE_KEYS.BIOMETRIC_SESSION,
        APP_CONFIG.STORAGE_KEYS.WORK_STATUS
      ]);
      // Note: Navigation to login should be handled by the app
    }

    return Promise.reject(error);
  }
  );
};

// Apply interceptors to all clients
addAuthInterceptors(apiClient);
addAuthInterceptors(apiClientHeavy);
addAuthInterceptors(apiClientLight);

// API Service methods
const apiService = {
  // Test connection
  testConnection: async () => {
    try {
      const response = await apiClient.get('/api/health/', {
        // Bypass authentication for health check
        headers: {
          'Authorization': undefined
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Authentication
  auth: {
    // Enhanced login with device tracking
    login: async (email, password, location = null) => {
      try {
        const deviceInfo = await getDeviceInfo();
        const deviceId = deviceInfo.device_id;
        
        console.log('🔐 Enhanced login attempt:', {
          email,
          deviceId: deviceId.substring(0, 8) + '...',
          platform: deviceInfo.platform
        });
        
        const response = await apiClient.post(API_ENDPOINTS.AUTH.ENHANCED_LOGIN, {
          email,
          password,
          device_id: deviceId,
          device_info: deviceInfo,
          location
        });
        
        // Save enhanced auth data
        if (response.data.success && response.data.token) {
          const authData = {
            token: response.data.token,
            expires_at: response.data.expires_at,
            device_id: deviceId,
            biometric_registered: response.data.biometric_registered,
            requires_biometric_verification: response.data.security_info?.requires_biometric_verification
          };
          
          await AsyncStorage.multiSet([
            [APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN, response.data.token],
            [APP_CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(response.data.user)],
            [APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA, JSON.stringify(authData)]
          ]);
          
          console.log('✅ Enhanced login successful:', {
            userId: response.data.user.id,
            userName: response.data.user.first_name + ' ' + response.data.user.last_name,
            role: response.data.user.role,
            biometricRegistered: response.data.biometric_registered,
            requiresBiometric: response.data.security_info?.requires_biometric_verification
          });
        }
        
        return response.data;
      } catch (error) {
        console.error('❌ Enhanced login failed:', {
          email,
          errorMessage: error.message,
          errorResponse: error.response?.data
        });
        throw error;
      }
    },

    // Legacy login for backward compatibility
    legacyLogin: async (email, password) => {
      try {
        const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
          email,
          password,
        });
        
        // Save token and user data
        if (response.data.token) {
          await AsyncStorage.setItem(
            APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN, 
            response.data.token
          );
          await AsyncStorage.setItem(
            APP_CONFIG.STORAGE_KEYS.USER_DATA,
            JSON.stringify(response.data.user)
          );
        }
        
        return response.data;
      } catch (error) {
        throw error;
      }
    },

    // Biometric verification for 2FA
    biometricVerification: async (imageBase64, operationType = 'general', location = null) => {
      try {
        console.log('🔒 Starting biometric verification:', {
          operationType,
          imageDataLength: imageBase64.length,
          hasLocation: !!location
        });
        
        const response = await apiClient.post(API_ENDPOINTS.AUTH.BIOMETRIC_VERIFICATION, {
          image: imageBase64,
          operation_type: operationType,
          location
        });
        
        // Save biometric session data
        if (response.data.success && response.data.biometric_session_id) {
          const sessionData = {
            session_id: response.data.biometric_session_id,
            expires_at: response.data.session_expires_at,
            verification_level: response.data.verification_level,
            access_granted: response.data.access_granted,
            created_at: new Date().toISOString()
          };
          
          await AsyncStorage.setItem(
            APP_CONFIG.STORAGE_KEYS.BIOMETRIC_SESSION,
            JSON.stringify(sessionData)
          );
          
          console.log('✅ Biometric verification successful:', {
            sessionId: response.data.biometric_session_id,
            verificationLevel: response.data.verification_level,
            confidenceScore: response.data.confidence_score
          });
        }
        
        return response.data;
      } catch (error) {
        console.error('❌ Biometric verification failed:', {
          operationType,
          errorMessage: error.message,
          errorResponse: error.response?.data
        });
        throw error;
      }
    },

    // Refresh token
    refreshToken: async (ttlDays = 7) => {
      try {
        const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
          ttl_days: ttlDays
        });
        
        if (response.data.success && response.data.token) {
          // Update stored token
          await AsyncStorage.setItem(
            APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
            response.data.token
          );
          
          // Update enhanced auth data
          const enhancedAuthData = await AsyncStorage.getItem(
            APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA
          );
          if (enhancedAuthData) {
            const authData = JSON.parse(enhancedAuthData);
            authData.token = response.data.token;
            authData.expires_at = response.data.expires_at;
            await AsyncStorage.setItem(
              APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA,
              JSON.stringify(authData)
            );
          }
          
          console.log('✅ Token refreshed successfully');
        }
        
        return response.data;
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        throw error;
      }
    },

    logout: async () => {
      console.log('🚪 Logging out...');
      try {
        // Call enhanced logout API if using enhanced auth
        const enhancedAuthData = await AsyncStorage.getItem(
          APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA
        );
        
        if (enhancedAuthData && !APP_CONFIG.ENABLE_MOCK_DATA) {
          try {
            await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT_DEVICE);
            console.log('✅ API logout successful');
          } catch (apiError) {
            // Игнорируем ошибки 401 при logout - токен уже недействителен
            if (apiError.response?.status === 401) {
              console.log('🔄 Token already invalid - proceeding with local logout');
            } else {
              console.error('❌ API logout error:', apiError.message);
            }
          }
        } else if (!APP_CONFIG.ENABLE_MOCK_DATA) {
          try {
            await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
            console.log('✅ Legacy logout successful');
          } catch (apiError) {
            if (apiError.response?.status === 401) {
              console.log('🔄 Token already invalid - proceeding with local logout');
            } else {
              console.error('❌ Legacy logout error:', apiError.message);
            }
          }
        } else {
          console.log('🔄 Mock logout - skipping API call');
        }
      } catch (error) {
        console.error('❌ Logout error:', error);
      } finally {
        // Clear all local storage regardless of API response
        await AsyncStorage.multiRemove([
          APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
          APP_CONFIG.STORAGE_KEYS.USER_DATA,
          APP_CONFIG.STORAGE_KEYS.WORK_STATUS,
          APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA,
          APP_CONFIG.STORAGE_KEYS.BIOMETRIC_SESSION,
          APP_CONFIG.STORAGE_KEYS.DEVICE_ID
        ]);
        console.log('🧹 Local storage cleared');
        console.log('✅ Logout successful');
      }
    },

    getCurrentUser: async () => {
      const userData = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    },

    // Check if biometric verification is required
    checkBiometricRequirement: async () => {
      try {
        const enhancedAuthData = await AsyncStorage.getItem(
          APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA
        );
        
        if (enhancedAuthData) {
          const authData = JSON.parse(enhancedAuthData);
          return authData.requires_biometric_verification;
        }
        
        return false;
      } catch (error) {
        console.error('Error checking biometric requirement:', error);
        return false;
      }
    },

    // Check if biometric session is valid
    checkBiometricSession: async () => {
      try {
        const sessionData = await AsyncStorage.getItem(
          APP_CONFIG.STORAGE_KEYS.BIOMETRIC_SESSION
        );
        
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const expiresAt = new Date(session.expires_at);
          const now = new Date();
          
          if (now < expiresAt) {
            return {
              valid: true,
              session: session
            };
          }
        }
        
        return { valid: false, session: null };
      } catch (error) {
        console.error('Error checking biometric session:', error);
        return { valid: false, session: null };
      }
    },

    // Check if token is expired
    checkTokenExpiration: async () => {
      try {
        const enhancedAuthData = await AsyncStorage.getItem(
          APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA
        );
        
        if (enhancedAuthData) {
          const authData = JSON.parse(enhancedAuthData);
          const expiresAt = new Date(authData.expires_at);
          const now = new Date();
          const timeUntilExpiry = expiresAt.getTime() - now.getTime();
          
          return {
            isExpired: now >= expiresAt,
            expiresAt: authData.expires_at,
            timeUntilExpiryMs: timeUntilExpiry,
            shouldRefresh: timeUntilExpiry < (24 * 60 * 60 * 1000) // Refresh if less than 1 day
          };
        }
        
        return { isExpired: true, shouldRefresh: true };
      } catch (error) {
        console.error('Error checking token expiration:', error);
        return { isExpired: true, shouldRefresh: true };
      }
    },
  },

  // Employees
  employees: {
    getAll: async (params = {}, useCache = true) => {
      console.log('👥 Fetching employees with params:', params);
      
      // Check cache if enabled and no specific params
      if (useCache && Object.keys(params).length === 0) {
        try {
          const cachedData = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.EMPLOYEES_CACHE);
          const cacheTimestamp = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.CACHE_TIMESTAMP);
          
          if (cachedData && cacheTimestamp) {
            const now = Date.now();
            const lastCache = parseInt(cacheTimestamp);
            
            if (now - lastCache < APP_CONFIG.CACHE_DURATION) {
              console.log('📱 Using cached employees data');
              return JSON.parse(cachedData);
            }
          }
        } catch (error) {
          console.warn('❌ Cache read error:', error);
        }
      }
      
      const response = await apiClientHeavy.get(API_ENDPOINTS.EMPLOYEES, { params });
      
      // Cache the response if no specific params
      if (Object.keys(params).length === 0) {
        try {
          await AsyncStorage.multiSet([
            [APP_CONFIG.STORAGE_KEYS.EMPLOYEES_CACHE, JSON.stringify(response.data)],
            [APP_CONFIG.STORAGE_KEYS.CACHE_TIMESTAMP, Date.now().toString()]
          ]);
          console.log('💾 Cached employees data');
        } catch (error) {
          console.warn('❌ Cache write error:', error);
        }
      }
      
      return response.data;
    },

    getById: async (id) => {
      const response = await apiClient.get(`${API_ENDPOINTS.EMPLOYEES}${id}/`);
      return response.data;
    },

    create: async (employeeData) => {
      const response = await apiClient.post(API_ENDPOINTS.EMPLOYEES, employeeData);
      return response.data;
    },

    update: async (id, employeeData) => {
      const response = await apiClient.patch(
        `${API_ENDPOINTS.EMPLOYEES}${id}/`,
        employeeData
      );
      return response.data;
    },

    activate: async (id) => {
      const response = await apiClient.post(
        `${API_ENDPOINTS.EMPLOYEES}${id}/activate/`
      );
      return response.data;
    },

    deactivate: async (id) => {
      const response = await apiClient.post(
        `${API_ENDPOINTS.EMPLOYEES}${id}/deactivate/`
      );
      return response.data;
    },

    sendInvitation: async (id, baseUrl = 'http://localhost:8100') => {
      const response = await apiClient.post(
        `${API_ENDPOINTS.EMPLOYEES}${id}/send_invitation/`,
        { base_url: baseUrl }
      );
      return response.data;
    },

    // Clear employees cache
    clearCache: async () => {
      try {
        await AsyncStorage.multiRemove([
          APP_CONFIG.STORAGE_KEYS.EMPLOYEES_CACHE,
          APP_CONFIG.STORAGE_KEYS.CACHE_TIMESTAMP
        ]);
        console.log('🗑️ Employees cache cleared');
      } catch (error) {
        console.warn('❌ Cache clear error:', error);
      }
    },
  },

  // Biometrics
  biometrics: {
    checkStatus: async () => {
      try {
        console.log('🔍 Checking current work status...');
        
        if (APP_CONFIG.ENABLE_MOCK_DATA) {
          console.log('🔄 Using mock work status');
          return {
            success: true,
            is_checked_in: false, // Mock as not checked in
            current_session: null,
            employee_info: {
              employee_id: 1,
              employee_name: 'Test User',
              email: 'test@example.com'
            }
          };
        }
        
        const response = await apiClientLight.get(API_ENDPOINTS.BIOMETRICS.STATUS);
        
        console.log('✅ Work status check successful:', {
          isCheckedIn: response.data.is_checked_in,
          employeeName: response.data.employee_info?.employee_name,
          sessionId: response.data.current_session?.worklog_id
        });
        
        return {
          success: true,
          ...response.data
        };
        
      } catch (error) {
        console.error('❌ Work status check failed:', {
          errorMessage: error.message,
          errorResponse: error.response?.data
        });
        
        throw {
          wasAborted: error.name === 'CanceledError',
          errorMessage: error.message,
          errorResponse: error.response?.data || null
        };
      }
    },

    register: async (employeeId, imageBase64) => {
      try {
        // Validate inputs
        if (!employeeId) {
          throw new Error('Employee ID is required for biometric registration');
        }
        if (!imageBase64) {
          throw new Error('Image data is required for biometric registration');
        }
        
        console.log('🔧 Starting biometric registration:', {
          employeeId,
          imageDataLength: imageBase64.length,
          mockMode: APP_CONFIG.ENABLE_MOCK_DATA
        });
        
        // Mock mode for development when backend is not ready
        if (APP_CONFIG.ENABLE_MOCK_DATA) {
          console.log('🔄 Using mock biometric registration');
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                success: true,
                message: 'Biometric data registered successfully',
                employee_id: employeeId,
                registered_at: new Date().toISOString()
              });
            }, 2000); // Simulate processing time
          });
        }
        
        const response = await apiClient.post(API_ENDPOINTS.BIOMETRICS.REGISTER, {
          employee_id: employeeId,
          image: imageBase64,
        });
        
        console.log('✅ Biometric registration successful:', {
          employeeId,
          registeredAt: response.data.registered_at
        });
        
        return response.data;
      } catch (error) {
        console.error('❌ Biometric registration failed:', {
          employeeId,
          errorMessage: error.message,
          errorResponse: error.response?.data
        });
        throw error;
      }
    },

    checkIn: async (imageBase64, location, signal = null) => {
      try {
        // Validate inputs
        if (!imageBase64) {
          throw new Error('Image data is required for check-in');
        }
        
        console.log('🔐 Starting biometric check-in:', {
          location,
          imageDataLength: imageBase64.length,
          hasSignal: !!signal,
          mockMode: APP_CONFIG.ENABLE_MOCK_DATA
        });
        
        // Mock mode for development when backend is not ready
        if (APP_CONFIG.ENABLE_MOCK_DATA) {
          console.log('🔄 Using mock biometric check-in');
          return new Promise((resolve, reject) => {
            // Check if request was aborted
            if (signal?.aborted) {
              reject(new Error('Request aborted'));
              return;
            }
            
            const timeout = setTimeout(() => {
              resolve({
                success: true,
                employee_name: 'Test User',
                check_in_time: new Date().toISOString(),
                location: location,
                status: 'checked_in'
              });
            }, 1500); // Simulate processing time
            
            // Listen for abort signal
            if (signal) {
              signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                reject(new Error('Request aborted'));
              });
            }
          });
        }
        
        const result = await retryRequest(async () => {
          const response = await apiClient.post(API_ENDPOINTS.BIOMETRICS.CHECK_IN, {
            image: imageBase64,
            location: location,
          }, {
            signal: signal
          });
          return response.data;
        }, APP_CONFIG.RETRY_ATTEMPTS, signal);
        
        console.log('✅ Biometric check-in successful:', {
          employeeName: result.employee_name,
          checkInTime: result.check_in_time,
          location: result.location
        });
        
        return result;
      } catch (error) {
        console.error('❌ Biometric check-in failed:', {
          errorMessage: error.message,
          errorResponse: error.response?.data,
          wasAborted: error.name === 'CanceledError'
        });
        throw error;
      }
    },

    checkOut: async (imageBase64, location) => {
      try {
        // Validate inputs
        if (!imageBase64) {
          throw new Error('Image data is required for check-out');
        }
        
        console.log('🔓 Starting biometric check-out:', {
          location,
          imageDataLength: imageBase64.length,
          mockMode: APP_CONFIG.ENABLE_MOCK_DATA
        });
        
        // Mock mode for development when backend is not ready
        if (APP_CONFIG.ENABLE_MOCK_DATA) {
          console.log('🔄 Using mock biometric check-out');
          return new Promise((resolve) => {
            setTimeout(() => {
              const checkInTime = new Date();
              checkInTime.setHours(checkInTime.getHours() - 8); // Simulate 8 hours work
              
              resolve({
                success: true,
                employee_name: 'Test User',
                check_out_time: new Date().toISOString(),
                check_in_time: checkInTime.toISOString(),
                location: location,
                status: 'checked_out',
                hours_worked: 8.0
              });
            }, 1500); // Simulate processing time
          });
        }
        
        const response = await apiClient.post(API_ENDPOINTS.BIOMETRICS.CHECK_OUT, {
          image: imageBase64,
          location: location,
        });
        
        console.log('✅ Biometric check-out successful:', {
          employeeName: response.data.employee_name,
          checkOutTime: response.data.check_out_time,
          hoursWorked: response.data.hours_worked,
          location: response.data.location
        });
        
        return response.data;
      } catch (error) {
        console.error('❌ Biometric check-out failed:', {
          errorMessage: error.message,
          errorResponse: error.response?.data
        });
        throw error;
      }
    },

    getStats: async () => {
      const response = await apiClient.get(API_ENDPOINTS.BIOMETRICS.STATS);
      return response.data;
    },
  },

  // Work time
  worktime: {
    getLogs: async (params = {}) => {
      console.log('📊 Fetching work logs with params:', params);
      const response = await apiClientHeavy.get(API_ENDPOINTS.WORKTIME.LOGS, { params });
      return response.data;
    },

    getCurrentSessions: async () => {
      const response = await apiClient.get(API_ENDPOINTS.WORKTIME.CURRENT);
      return response.data;
    },

    quickCheckout: async (employeeId) => {
      const response = await apiClient.post(API_ENDPOINTS.WORKTIME.QUICK_CHECKOUT, {
        employee_id: employeeId,
      });
      return response.data;
    },
  },

  // Payroll
  payroll: {
    getSalaries: async (params = {}) => {
      const response = await apiClient.get(API_ENDPOINTS.PAYROLL.SALARIES, { params });
      return response.data;
    },

    calculateSalary: async (salaryId) => {
      const response = await apiClient.post(
        API_ENDPOINTS.PAYROLL.CALCULATE(salaryId)
      );
      return response.data;
    },

    getEarnings: async (params = {}) => {
      console.log('📊 Fetching earnings with params:', params);
      const response = await apiClient.get(API_ENDPOINTS.PAYROLL.EARNINGS, { params });
      return response.data;
    },

    getEnhancedEarnings: async (params = {}) => {
      console.log('📊 Fetching enhanced earnings with params:', params);
      const response = await apiClient.get(API_ENDPOINTS.PAYROLL.EARNINGS_ENHANCED, { params });
      return response.data;
    },

    getCompensatoryDays: async (params = {}) => {
      const response = await apiClient.get(API_ENDPOINTS.PAYROLL.COMPENSATORY_DAYS, { params });
      return response.data;
    },
  },

  // Integrations
  integrations: {
    getHolidays: async (params = {}) => {
      const response = await apiClient.get(API_ENDPOINTS.INTEGRATIONS.HOLIDAYS, { params });
      return response.data;
    },

    syncHolidays: async (year) => {
      const response = await apiClient.post(API_ENDPOINTS.INTEGRATIONS.SYNC_HOLIDAYS, {
        year,
      });
      return response.data;
    },

    getShabbatTimes: async (date) => {
      const response = await apiClient.get(API_ENDPOINTS.INTEGRATIONS.SHABBAT_TIMES, {
        params: { date },
      });
      return response.data;
    },
  },
};

export default apiService;