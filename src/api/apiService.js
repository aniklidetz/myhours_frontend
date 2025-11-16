// src/api/apiService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureStorageManager from '../utils/secureStorage';
import axios from 'axios';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { API_URL, API_ENDPOINTS, APP_CONFIG, SECURITY_CONFIG } from '../config';
import { maskName, safeLog, safeLogUser } from '../utils/safeLogging';

// Create axios instance with security headers
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: APP_CONFIG.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': SECURITY_CONFIG.USER_AGENT,
  },
});

// Create heavy requests client with longer timeout
const apiClientHeavy = axios.create({
  baseURL: API_URL,
  timeout: APP_CONFIG.API_TIMEOUT_HEAVY,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': SECURITY_CONFIG.USER_AGENT,
  },
});

// Create light requests client with shorter timeout
const apiClientLight = axios.create({
  baseURL: API_URL,
  timeout: APP_CONFIG.API_TIMEOUT_LIGHT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': SECURITY_CONFIG.USER_AGENT,
  },
});

// Create biometric requests client with extended timeout for face recognition
const apiClientBiometric = axios.create({
  baseURL: API_URL,
  timeout: APP_CONFIG.API_TIMEOUT_BIOMETRIC,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': SECURITY_CONFIG.USER_AGENT,
  },
});

// Create extra heavy requests client with extended timeout for complex queries
const apiClientExtraHeavy = axios.create({
  baseURL: API_URL,
  timeout: APP_CONFIG.API_TIMEOUT_BIOMETRIC, // 45 seconds - reuse biometric timeout for complex queries
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
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
    safeLog('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
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
      safeLog('Request was aborted by user');
      throw error;
    }

    if (retries > 0 && error.response && error.response.status >= 500) {
      const attemptNumber = APP_CONFIG.RETRY_ATTEMPTS - retries + 1;
      safeLog(`Retrying request... (attempt ${attemptNumber}/${APP_CONFIG.RETRY_ATTEMPTS})`);
      safeLog('Retry reason:', {
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config?.url,
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
    os_version: isWeb ? 'web' : Platform.Version ? Platform.Version.toString() : 'unknown',
    app_version: Constants.expoConfig?.version || '1.0.0',
    device_model: isWeb ? 'Web Browser' : Device.modelName || `${Platform.OS} Device`,
    device_id: await getUniqueDeviceId(),
  };
};

// Helper function to get unique device ID
const getUniqueDeviceId = async () => {
  try {
    let deviceId = await SecureStorageManager.getItem(APP_CONFIG.STORAGE_KEYS.DEVICE_ID);
    if (!deviceId) {
      // Generate a unique device ID if not exists
      deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await SecureStorageManager.setItem(APP_CONFIG.STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    return deviceId;
  } catch (error) {
    safeLog('Error generating device ID', { error: error.message });
    return `${Platform.OS}_fallback_${Date.now()}`;
  }
};

// Helper function to add auth interceptors to all clients
const addAuthInterceptors = client => {
  // Request interceptor to add auth token
  client.interceptors.request.use(
    async config => {
      try {
        const token = await SecureStorageManager.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        if (token) {
          // Check if we have enhanced auth data
          const enhancedAuthData = await SecureStorageManager.getItem(
            APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA
          );

          if (enhancedAuthData) {
            try {
              const authData = JSON.parse(enhancedAuthData);
              // Verify the stored token matches
              if (authData.token !== token) {
                safeLog('Token mismatch detected, using stored token');
                await SecureStorageManager.setItem(
                  APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
                  authData.token
                );
              }
              // Use Token format - backend expects "Token" not "DeviceToken"
              config.headers.Authorization = `Token ${authData.token || token}`;
            } catch (parseError) {
              safeLog('Error parsing enhanced auth data', { error: parseError.message });
              // Fallback to basic token
              config.headers.Authorization = `Token ${token}`;
            }
          } else {
            // Legacy token for backward compatibility
            config.headers.Authorization = `Token ${token}`;
          }
        } else {
          // Only warn about missing token for protected endpoints
          const publicEndpoints = [
            '/api/health/',
            '/api/v1/users/auth/login/',
            '/api/v1/users/auth/enhanced-login/',
          ];
          const isPublicEndpoint = publicEndpoints.some(endpoint => config.url?.includes(endpoint));
          if (!isPublicEndpoint) {
            safeLog('No auth token found for protected endpoint', { url: config.url });
          }
        }

        // Log request in development
        if (APP_CONFIG.ENABLE_DEBUG_LOGS) {
          safeLog('📤 API Request:', {
            url: config.url,
            method: config.method,
            hasAuth: !!config.headers.Authorization,
            hasData: !!config.data,
          });

          // Debug token details
          const enhancedAuthDataForDebug = await SecureStorageManager.getItem(
            APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA
          );
          safeLog('Auth Debug:', {
            hasToken: !!token,
            hasEnhancedAuth: !!enhancedAuthDataForDebug,
            authType: config.headers.Authorization
              ? config.headers.Authorization.substring(0, 11)
              : 'NONE',
          });
        }
      } catch (error) {
        safeLog('Error adding auth token', { error: error.message });
      }
      return config;
    },
    error => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    response => {
      if (APP_CONFIG.ENABLE_DEBUG_LOGS) {
        safeLog('📥 API Response:', {
          url: response.config.url,
          status: response.status,
          hasData: !!response.data,
        });
      }
      return response;
    },
    async error => {
      if (APP_CONFIG.ENABLE_DEBUG_LOGS) {
        logUniqueError(error.config?.url, error);
      }

      // Handle 401 Unauthorized - but be smarter about token clearing
      if (error.response?.status === 401) {
        safeLog('401 Unauthorized - checking if token clearing is needed');
        safeLog('Failed request:', {
          url: error.config?.url,
          method: error.config?.method,
          hasAuth: !!error.config?.headers?.Authorization,
        });

        // Don't clear tokens for refresh-token endpoint (it's expected to fail with old token)
        if (error.config?.url?.includes('/refresh-token/')) {
          safeLog('Refresh token endpoint failed - this is expected, not clearing tokens');
          throw error;
        }

        // Check if we recently tried to clear tokens (prevent cascade clearing)
        const lastTokenClear = apiClient.lastTokenClear || 0;
        const now = Date.now();
        const timeSinceLastClear = now - lastTokenClear;

        if (timeSinceLastClear < 2000) {
          // Less than 2 seconds
          safeLog('Token was recently cleared, not clearing again to prevent cascade');
          throw error;
        }

        // Mark that we're clearing tokens now
        apiClient.lastTokenClear = now;

        safeLog('Proceeding with token clearing due to 401');

        // Remove sensitive keys using SecureStorageManager
        const sensitiveKeys = [
          APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
          APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA,
          APP_CONFIG.STORAGE_KEYS.BIOMETRIC_SESSION,
        ];

        for (const key of sensitiveKeys) {
          await SecureStorageManager.removeItem(key);
        }

        // Remove non-sensitive keys using AsyncStorage
        await AsyncStorage.multiRemove([
          APP_CONFIG.STORAGE_KEYS.USER_DATA,
          APP_CONFIG.STORAGE_KEYS.WORK_STATUS,
        ]);

        // Add a flag to help components know authentication failed
        error.isAuthenticationError = true;
      }

      return Promise.reject(error);
    }
  );
};

// Apply interceptors to all clients
addAuthInterceptors(apiClient);
addAuthInterceptors(apiClientHeavy);
addAuthInterceptors(apiClientLight);
addAuthInterceptors(apiClientBiometric);
addAuthInterceptors(apiClientExtraHeavy); // FIX: Add auth interceptors to extra heavy client!

// API Service methods
const apiService = {
  // Test connection
  testConnection: async () => {
    try {
      safeLog('Testing API connection to health endpoint');
      const response = await apiClient.get('/api/health/', {
        // Bypass authentication for health check
        headers: {
          Authorization: undefined,
        },
        timeout: 5000, // Increase timeout for health check
      });
      safeLog('API health check response:', {
        success: response.data.success,
        message: response.data.message,
      });
      return response.data;
    } catch (error) {
      safeLog('API health check failed:', {
        code: error.code,
        message: error.message,
        hasResponse: !!error.response?.data,
      });

      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        safeLog('API health check timeout');
      } else if (error.message?.includes('Network Error')) {
        safeLog('Network error during health check');
      }
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

        safeLog('Enhanced login attempt:', {
          hasEmail: !!email,
          hasDeviceId: !!deviceId,
          platform: deviceInfo.platform,
        });

        // Try enhanced login first, fallback to legacy if it fails
        let response;
        try {
          response = await apiClient.post(API_ENDPOINTS.AUTH.ENHANCED_LOGIN, {
            email,
            password,
            device_id: deviceId,
            device_info: deviceInfo,
            location,
          });
        } catch (enhancedError) {
          // If enhanced login fails with 404 or 500, try legacy login
          if (enhancedError.response?.status === 404 || enhancedError.response?.status === 500) {
            safeLog('Enhanced login failed, falling back to legacy login');
            response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
              email,
              password,
            });
            // Add default values for enhanced features
            response.data.biometric_registered = false;
            response.data.security_info = { requires_biometric_verification: false };
          } else {
            throw enhancedError;
          }
        }

        // Save enhanced auth data
        // Backend returns {token, user} without success field
        if (response.data.token) {
          const authData = {
            token: response.data.token,
            expires_at: response.data.expires_at,
            device_id: deviceId,
            biometric_registered: response.data.biometric_registered,
            requires_biometric_verification:
              response.data.security_info?.requires_biometric_verification,
          };

          // Store sensitive keys using SecureStorageManager
          await SecureStorageManager.setItem(
            APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
            response.data.token
          );
          await SecureStorageManager.setItem(
            APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA,
            JSON.stringify(authData)
          );

          // Store non-sensitive user data using AsyncStorage
          await AsyncStorage.setItem(
            APP_CONFIG.STORAGE_KEYS.USER_DATA,
            JSON.stringify(response.data.user)
          );

          safeLog('Enhanced login successful:', safeLogUser(response.data.user, 'enhanced_login'));
        }

        // Add success field for compatibility
        return {
          ...response.data,
          success: !!response.data.token
        };
      } catch (error) {
        safeLog('Enhanced login failed:', {
          hasEmail: !!email,
          errorMessage: error.message,
          hasResponse: !!error.response?.data,
        });
        throw error;
      }
    },

    // Legacy login for backward compatibility
    legacyLogin: async (email, password) => {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
        email,
        password,
      });

      // Save token and user data
      if (response.data.token) {
        await SecureStorageManager.setItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN, response.data.token);
        await AsyncStorage.setItem(
          APP_CONFIG.STORAGE_KEYS.USER_DATA,
          JSON.stringify(response.data.user)
        );
      }

      // Add success field for compatibility
      return {
        ...response.data,
        success: !!response.data.token
      };
    },

    // Biometric verification for 2FA
    biometricVerification: async (imageBase64, operationType = 'general', location = null) => {
      try {
        console.log('Starting biometric verification:', {
          operationType,
          hasImage: !!imageBase64,
          hasLocation: !!location,
        });

        const response = await apiClient.post(API_ENDPOINTS.AUTH.BIOMETRIC_VERIFICATION, {
          image: imageBase64,
          operation_type: operationType,
          location,
        });

        // Save biometric session data
        if (response.data.success && response.data.biometric_session_id) {
          const sessionData = {
            session_id: response.data.biometric_session_id,
            expires_at: response.data.session_expires_at,
            verification_level: response.data.verification_level,
            access_granted: response.data.access_granted,
            created_at: new Date().toISOString(),
          };

          await SecureStorageManager.setItem(
            APP_CONFIG.STORAGE_KEYS.BIOMETRIC_SESSION,
            JSON.stringify(sessionData)
          );

          console.log('Biometric verification successful:', {
            hasSession: !!response.data.biometric_session_id,
            verificationLevel: response.data.verification_level,
            confidenceScore: response.data.confidence_score,
          });
        }

        return response.data;
      } catch (error) {
        console.error('Biometric verification failed:', {
          operationType,
          errorMessage: error.message,
          errorResponse: error.response?.data,
        });
        throw error;
      }
    },

    // Refresh token
    refreshToken: async (ttlDays = 7) => {
      try {
        const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
          ttl_days: ttlDays,
        });

        if (response.data.success && response.data.token) {
          // Update stored token
          await SecureStorageManager.setItem(
            APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
            response.data.token
          );

          // Update enhanced auth data
          const enhancedAuthData = await SecureStorageManager.getItem(
            APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA
          );
          if (enhancedAuthData) {
            const authData = JSON.parse(enhancedAuthData);
            authData.token = response.data.token;
            authData.expires_at = response.data.expires_at;
            await SecureStorageManager.setItem(
              APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA,
              JSON.stringify(authData)
            );
          }

          console.log('Token refreshed successfully');
        }

        return response.data;
      } catch (error) {
        console.error('Token refresh failed:', error);
        throw error;
      }
    },

    logout: async () => {
      console.log('Logging out...');
      try {
        // Call enhanced logout API if using enhanced auth
        const enhancedAuthData = await SecureStorageManager.getItem(
          APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA
        );

        if (enhancedAuthData && !APP_CONFIG.ENABLE_MOCK_DATA) {
          try {
            await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT_DEVICE);
            console.log('API logout successful');
          } catch (apiError) {
            // Ignore 401 errors during logout - token is already invalid
            if (apiError.response?.status === 401) {
              console.log('Token already invalid - proceeding with local logout');
            } else {
              console.error('API logout error:', apiError.message);
            }
          }
        } else if (!APP_CONFIG.ENABLE_MOCK_DATA) {
          try {
            await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
            console.log('Legacy logout successful');
          } catch (apiError) {
            if (apiError.response?.status === 401) {
              console.log('Token already invalid - proceeding with local logout');
            } else {
              console.error('Legacy logout error:', apiError.message);
            }
          }
        } else {
          console.log('Mock logout - skipping API call');
        }
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        // Clear all local storage regardless of API response
        // Remove sensitive keys using SecureStorageManager
        const sensitiveKeys = [
          APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
          APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA,
          APP_CONFIG.STORAGE_KEYS.BIOMETRIC_SESSION,
          APP_CONFIG.STORAGE_KEYS.DEVICE_ID,
        ];

        for (const key of sensitiveKeys) {
          await SecureStorageManager.removeItem(key);
        }

        // Remove non-sensitive keys using AsyncStorage
        await AsyncStorage.multiRemove([
          APP_CONFIG.STORAGE_KEYS.USER_DATA,
          APP_CONFIG.STORAGE_KEYS.WORK_STATUS,
        ]);
        console.log('Local storage cleared');
        console.log('Logout successful');
      }
    },

    getCurrentUser: async () => {
      const userData = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    },

    // Check if biometric verification is required
    checkBiometricRequirement: async () => {
      try {
        const enhancedAuthData = await SecureStorageManager.getItem(
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
        const sessionData = await SecureStorageManager.getItem(
          APP_CONFIG.STORAGE_KEYS.BIOMETRIC_SESSION
        );

        if (sessionData) {
          const session = JSON.parse(sessionData);
          const expiresAt = new Date(session.expires_at);
          const now = new Date();

          if (now < expiresAt) {
            return {
              valid: true,
              session: session,
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
        const enhancedAuthData = await SecureStorageManager.getItem(
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
            shouldRefresh: timeUntilExpiry < 24 * 60 * 60 * 1000, // Refresh if less than 1 day
          };
        }

        return { isExpired: true, shouldRefresh: true };
      } catch (error) {
        console.error('Error checking token expiration:', error);
        return { isExpired: true, shouldRefresh: true };
      }
    },

    // Debug authentication state
    debugAuthState: async () => {
      try {
        const token = await SecureStorageManager.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        const userData = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER_DATA);
        const enhancedAuthData = await SecureStorageManager.getItem(
          APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA
        );

        const debugInfo = {
          hasToken: !!token,
          tokenPreview: token ? `${token.substring(0, 4)}***` : null,
          hasUserData: !!userData,
          hasEnhancedAuth: !!enhancedAuthData,
        };

        if (userData) {
          const user = JSON.parse(userData);
          debugInfo.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: `${user.first_name} ${user.last_name}`,
          };
        }

        if (enhancedAuthData) {
          const authData = JSON.parse(enhancedAuthData);
          debugInfo.enhancedAuth = {
            hasToken: !!authData.token,
            tokenMatches: authData.token === token,
            expiresAt: authData.expires_at,
            isExpired: new Date() >= new Date(authData.expires_at),
            hasDeviceId: !!authData.device_id,
          };
        }

        console.log('Authentication State Debug:', debugInfo);
        return debugInfo;
      } catch (error) {
        console.error('Error debugging auth state:', error);
        return { error: error.message };
      }
    },
  },

  // Employees
  employees: {
    getAll: async (params = {}, useCache = true) => {
      console.log('Fetching employees with params:', params);

      // Check cache if enabled and no specific params
      if (useCache && Object.keys(params).length === 0) {
        try {
          // Get current user token to make cache user-specific
          const token = await SecureStorageManager.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
          const userCacheKey = `${APP_CONFIG.STORAGE_KEYS.EMPLOYEES_CACHE}_${token?.substring(0, 8) || 'anonymous'}`;
          const userTimestampKey = `${APP_CONFIG.STORAGE_KEYS.CACHE_TIMESTAMP}_${token?.substring(0, 8) || 'anonymous'}`;

          const cachedData = await AsyncStorage.getItem(userCacheKey);
          const cacheTimestamp = await AsyncStorage.getItem(userTimestampKey);

          if (cachedData && cacheTimestamp) {
            const now = Date.now();
            const lastCache = parseInt(cacheTimestamp);

            if (now - lastCache < APP_CONFIG.CACHE_DURATION) {
              console.log('Using cached employees data for current user');
              return JSON.parse(cachedData);
            }
          }
        } catch (error) {
          console.warn('Cache read error:', error);
        }
      }

      // Check if there was a recent biometric registration
      let client = apiClientHeavy;
      try {
        const recentReg = await SecureStorageManager.getItem(
          APP_CONFIG.STORAGE_KEYS.RECENT_BIOMETRIC_REGISTRATION
        );
        if (recentReg) {
          const regTime = parseInt(recentReg);
          const timeSinceReg = Date.now() - regTime;
          // If registration was within last 5 minutes, use extra heavy client
          if (timeSinceReg < 5 * 60 * 1000) {
            console.log('Using extended timeout due to recent biometric registration');
            client = apiClientExtraHeavy;
          }
        }
      } catch (_e) {
        // Ignore error, use default client
      }

      const response = await client.get(API_ENDPOINTS.EMPLOYEES, { params });

      // Cache the response if no specific params
      if (Object.keys(params).length === 0) {
        try {
          // Make cache user-specific
          const token = await SecureStorageManager.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
          const userCacheKey = `${APP_CONFIG.STORAGE_KEYS.EMPLOYEES_CACHE}_${token?.substring(0, 8) || 'anonymous'}`;
          const userTimestampKey = `${APP_CONFIG.STORAGE_KEYS.CACHE_TIMESTAMP}_${token?.substring(0, 8) || 'anonymous'}`;

          await AsyncStorage.multiSet([
            [userCacheKey, JSON.stringify(response.data)],
            [userTimestampKey, Date.now().toString()],
          ]);
          console.log('Cached employees data for current user');
        } catch (error) {
          console.warn('Cache write error:', error);
        }
      }

      return response.data;
    },

    getById: async id => {
      const response = await apiClient.get(`${API_ENDPOINTS.EMPLOYEES}${id}/`);
      return response.data;
    },

    create: async employeeData => {
      const response = await apiClientHeavy.post(API_ENDPOINTS.EMPLOYEES, employeeData);
      return response.data;
    },

    update: async (id, employeeData) => {
      const response = await apiClient.patch(`${API_ENDPOINTS.EMPLOYEES}${id}/`, employeeData);
      return response.data;
    },

    activate: async id => {
      const response = await apiClient.post(`${API_ENDPOINTS.EMPLOYEES}${id}/activate/`);
      return response.data;
    },

    deactivate: async id => {
      const response = await apiClient.post(`${API_ENDPOINTS.EMPLOYEES}${id}/deactivate/`);
      return response.data;
    },

    sendInvitation: async (id, baseUrl = 'http://localhost:8100') => {
      const response = await apiClient.post(`${API_ENDPOINTS.EMPLOYEES}${id}/send_invitation/`, {
        base_url: baseUrl,
      });
      return response.data;
    },

    // Delete employee permanently
    delete: async id => {
      const response = await apiClient.delete(`${API_ENDPOINTS.EMPLOYEES}${id}/`);
      return response.data;
    },

    // Clear employees cache
    clearCache: async () => {
      try {
        await AsyncStorage.multiRemove([
          APP_CONFIG.STORAGE_KEYS.EMPLOYEES_CACHE,
          APP_CONFIG.STORAGE_KEYS.CACHE_TIMESTAMP,
        ]);
        console.log('Employees cache cleared');
      } catch (error) {
        console.warn('Cache clear error:', error);
      }
    },
  },

  // Biometrics
  biometrics: {
    checkStatus: async () => {
      try {
        console.log('Checking current work status...');

        if (APP_CONFIG.ENABLE_MOCK_DATA) {
          console.log('Using mock work status');
          return {
            success: true,
            is_checked_in: false, // Mock as not checked in
            current_session: null,
            employee_info: {
              employee_id: 1,
              employee_name: 'Test User',
              email: 'test@example.com',
            },
          };
        }

        // Check if there was a recent biometric registration
        let client = apiClientLight;
        try {
          const recentReg = await SecureStorageManager.getItem(
            APP_CONFIG.STORAGE_KEYS.RECENT_BIOMETRIC_REGISTRATION
          );
          if (recentReg) {
            const regTime = parseInt(recentReg);
            const timeSinceReg = Date.now() - regTime;
            // If registration was within last 5 minutes, use extra heavy client
            if (timeSinceReg < 5 * 60 * 1000) {
              console.log(
                'Using extended timeout for work status due to recent biometric registration'
              );
              client = apiClientExtraHeavy;
            }
          }
        } catch (_e) {
          // Ignore error, use default client
        }

        const response = await client.get(API_ENDPOINTS.BIOMETRICS.WORK_STATUS);

        console.log('Work status check successful:', {
          isCheckedIn: response.data.is_checked_in,
          employeeName: response.data.employee_info?.employee_name
            ? maskName(response.data.employee_info.employee_name)
            : 'unknown',
          hasSession: !!response.data.current_session?.worklog_id,
        });

        return {
          success: true,
          ...response.data,
        };
      } catch (error) {
        console.error('Work status check failed:', {
          errorMessage: error.message,
          errorResponse: error.response?.data,
        });

        throw {
          wasAborted: error.name === 'CanceledError',
          errorMessage: error.message,
          errorResponse: error.response?.data || null,
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

        console.log('Starting biometric registration:', {
          employeeId,
          hasImage: !!imageBase64,
          imageSize: imageBase64 ? imageBase64.length : 0,
          mockMode: APP_CONFIG.ENABLE_MOCK_DATA,
        });

        // Mock mode for development when backend is not ready
        if (APP_CONFIG.ENABLE_MOCK_DATA) {
          console.log('Using mock biometric registration');
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                success: true,
                message: 'Biometric data registered successfully',
                employee_id: employeeId,
                registered_at: new Date().toISOString(),
              });
            }, 2000); // Simulate processing time
          });
        }

        const requestData = {
          employee_id: employeeId,
          image: imageBase64,
        };

        console.log('Sending registration request:', {
          endpoint: API_ENDPOINTS.BIOMETRICS.REGISTER,
          employee_id: requestData.employee_id,
          imageLength: requestData.image.length,
        });

        const response = await apiClientBiometric.post(
          API_ENDPOINTS.BIOMETRICS.REGISTER,
          requestData
        );

        console.log('Biometric registration successful:', {
          employeeId,
          registeredAt: response.data.registered_at,
        });

        // Set a flag to indicate recent biometric registration
        // This helps other API calls to know they might need more time
        await SecureStorageManager.setItem(
          APP_CONFIG.STORAGE_KEYS.RECENT_BIOMETRIC_REGISTRATION,
          Date.now().toString()
        );

        return response.data;
      } catch (error) {
        console.error('Biometric registration failed:', {
          employeeId,
          errorMessage: error.message,
          errorResponse: error.response?.data,
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

        console.log('Starting biometric check-in:', {
          hasLocation: !!location,
          hasImage: !!imageBase64,
          imageSize: imageBase64 ? imageBase64.length : 0,
          hasSignal: !!signal,
          mockMode: APP_CONFIG.ENABLE_MOCK_DATA,
        });

        // Mock mode for development when backend is not ready
        if (APP_CONFIG.ENABLE_MOCK_DATA) {
          console.log('Using mock biometric check-in');
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
                status: 'checked_in',
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

        const result = await retryRequest(
          async () => {
            const response = await apiClientBiometric.post(
              API_ENDPOINTS.BIOMETRICS.CHECK_IN,
              {
                image: imageBase64,
                location: location,
              },
              {
                signal: signal,
              }
            );
            return response.data;
          },
          APP_CONFIG.RETRY_ATTEMPTS,
          signal
        );

        console.log('Biometric check-in successful:', {
          employeeName: result.employee_name ? maskName(result.employee_name) : 'unknown',
          checkInTime: result.check_in_time,
          location: result.location,
        });

        return result;
      } catch (error) {
        console.error('Biometric check-in failed:', {
          errorMessage: error.message,
          errorResponse: error.response?.data,
          wasAborted: error.name === 'CanceledError',
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

        console.log('Starting biometric check-out:', {
          hasLocation: !!location,
          hasImage: !!imageBase64,
          mockMode: APP_CONFIG.ENABLE_MOCK_DATA,
        });

        // Mock mode for development when backend is not ready
        if (APP_CONFIG.ENABLE_MOCK_DATA) {
          console.log('Using mock biometric check-out');
          return new Promise(resolve => {
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
                hours_worked: 8.0,
              });
            }, 1500); // Simulate processing time
          });
        }

        const response = await apiClientBiometric.post(API_ENDPOINTS.BIOMETRICS.CHECK_OUT, {
          image: imageBase64,
          location: location,
        });

        console.log('Biometric check-out successful:', {
          employeeName: response.data.employee_name
            ? maskName(response.data.employee_name)
            : 'unknown',
          checkOutTime: response.data.check_out_time,
          hoursWorked: response.data.hours_worked,
          location: response.data.location,
        });

        return response.data;
      } catch (error) {
        console.error('Biometric check-out failed:', {
          errorMessage: error.message,
          errorResponse: error.response?.data,
        });
        throw error;
      }
    },

    getStats: async () => {
      const response = await apiClient.get(API_ENDPOINTS.BIOMETRICS.STATS);
      return response.data;
    },

    // Get current user's biometric status
    getBiometricStatus: async () => {
      try {
        console.log('Checking current user biometric status...');

        // Mock mode for development
        if (APP_CONFIG.ENABLE_MOCK_DATA) {
          console.log('Using mock biometric status');
          return {
            has_biometric: false,
            registration_date: null,
            last_verification: null,
          };
        }

        const response = await apiClientLight.get(API_ENDPOINTS.BIOMETRICS.STATUS);

        console.log('Biometric status API response:', {
          status: response.status,
          data: response.data,
          hasBiometric: response.data?.has_biometric,
          registrationDate: response.data?.registration_date,
        });

        // Ensure we return proper boolean values
        const normalizedData = {
          has_biometric: Boolean(response.data?.has_biometric),
          registration_date: response.data?.registration_date || null,
          last_verification: response.data?.last_verification || null,
        };

        console.log('Normalized biometric status:', normalizedData);
        return normalizedData;
      } catch (error) {
        // Use existing error deduplication mechanism
        if (error.message?.includes('Network Error')) {
          console.warn('Biometric API unavailable, using defaults');
        } else {
          logUniqueError(API_ENDPOINTS.BIOMETRICS.STATUS, error);
        }

        // Return default status if API fails
        return {
          has_biometric: false,
          registration_date: null,
          last_verification: null,
        };
      }
    },
  },

  // Work time
  worktime: {
    getLogs: async (params = {}, options = {}) => {
      // Use extra heavy client (45s timeout) if filtering by specific employee
      // as it might trigger N+1 queries on the backend
      const client = params.employee ? apiClientExtraHeavy : apiClientHeavy;

      const response = await client.get(API_ENDPOINTS.WORKTIME.LOGS, {
        params,
        ...options, // Allow passing additional options like signal for AbortController
      });
      return response.data;
    },

    // New bulk method for fetching team hours efficiently
    getTeamHours: async (employeeIds = [], date = null) => {
      try {
        const targetDate = date || new Date().toISOString().split('T')[0];
        console.log('Fetching team hours for multiple employees:', {
          employeeCount: employeeIds.length,
          date: targetDate,
        });

        const response = await apiClientHeavy.get(API_ENDPOINTS.WORKTIME.LOGS, {
          params: {
            date: targetDate,
            employees: employeeIds.join(','),
            page_size: 100,
            bulk_fetch: true,
          },
        });

        console.log('Team hours bulk fetch successful:', {
          totalRecords: response.data.count || response.data.results?.length || 0,
          employeesRequested: employeeIds.length,
        });

        return response.data;
      } catch (error) {
        console.error('Team hours bulk fetch failed:', error);
        throw error;
      }
    },

    getCurrentSessions: async () => {
      const response = await apiClient.get(API_ENDPOINTS.WORKTIME.CURRENT);
      return response.data;
    },

    quickCheckout: async employeeId => {
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

    calculateSalary: async salaryId => {
      const response = await apiClient.post(API_ENDPOINTS.PAYROLL.CALCULATE(salaryId));
      return response.data;
    },

    getEarnings: async (params = {}) => {
      const response = await apiClient.get(API_ENDPOINTS.PAYROLL.EARNINGS, { params });
      return response.data;
    },

    getEnhancedEarnings: async (params = {}) => {
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

    syncHolidays: async year => {
      const response = await apiClient.post(API_ENDPOINTS.INTEGRATIONS.SYNC_HOLIDAYS, {
        year,
      });
      return response.data;
    },

    getShabbatTimes: async date => {
      const response = await apiClient.get(API_ENDPOINTS.INTEGRATIONS.SHABBAT_TIMES, {
        params: { date },
      });
      return response.data;
    },
  },
};

export default apiService;
