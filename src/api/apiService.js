// src/api/apiService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
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

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Token ${token}`;
      }
      
      // Log request in development
      if (APP_CONFIG.ENABLE_DEBUG_LOGS) {
        console.log('📤 API Request:', {
          url: config.url,
          method: config.method,
          headers: config.headers,
          data: config.data
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
apiClient.interceptors.response.use(
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
      console.error('❌ API Error:', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }

    // Handle 401 Unauthorized - clear token and redirect to login
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER_DATA);
      // Note: Navigation to login should be handled by the app
    }

    return Promise.reject(error);
  }
);

// API Service methods
const apiService = {
  // Test connection
  testConnection: async () => {
    try {
      const response = await apiClient.post('/api/users/test/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Authentication
  auth: {
    login: async (email, password) => {
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

    logout: async () => {
      try {
        // Only call logout API if not in mock mode
        if (!APP_CONFIG.ENABLE_MOCK_DATA) {
          await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
        } else {
          console.log('🔄 Mock logout - skipping API call');
        }
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        // Clear local storage regardless of API response
        await AsyncStorage.multiRemove([
          APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
          APP_CONFIG.STORAGE_KEYS.USER_DATA,
          APP_CONFIG.STORAGE_KEYS.WORK_STATUS,
        ]);
      }
    },

    getCurrentUser: async () => {
      const userData = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    },
  },

  // Employees
  employees: {
    getAll: async (params = {}) => {
      const response = await apiClient.get(API_ENDPOINTS.EMPLOYEES, { params });
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
  },

  // Biometrics
  biometrics: {
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
      const response = await apiClient.get(API_ENDPOINTS.WORKTIME.LOGS, { params });
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