/* eslint-disable react/prop-types */
// src/contexts/UserContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../api/apiService';
import { APP_CONFIG } from '../config';
import { safeLog, safeLogUser } from '../utils/safeLogging';
import SecureStorageManager from '../utils/secureStorage';

// Define user roles
export const ROLES = {
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
  EMPLOYEE: 'employee',
  STAFF: 'staff',
};

// Create context
const UserContext = createContext();

// Provider component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Check API connection - wrapped in useCallback
  const checkConnection = useCallback(async () => {
    try {
      await apiService.testConnection();
      setIsOnline(true);
      safeLog('API is online');
    } catch (_error) {
      safeLog('API is offline, using cached data');
      setIsOnline(false);
    }
  }, []);

  // Load user data from secure storage - wrapped in useCallback
  const loadUserData = useCallback(async () => {
    try {
      const storedUser = await SecureStorageManager.getItem(APP_CONFIG.STORAGE_KEYS.USER_DATA);
      const storedToken = await SecureStorageManager.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);

      if (storedUser && storedToken) {
        const userData = JSON.parse(storedUser);

        // Only check auth state if online
        if (isOnline) {
          try {
            safeLog('Checking auth state...');
            // Temporarily disable auth debug check to see if it's blocking
            // const authDebug = await apiService.auth.debugAuthState();
            // safeLog('Auth debug response:', authDebug);

            // Check if token might be expired
            // if (authDebug.enhancedAuth?.isExpired) {
            //   safeLog('Token is expired, clearing authentication');
            //   await logout();
            //   return;
            // }
          } catch (error) {
            safeLog('Auth check failed, using cached user data', { error: error.message });
          }
        }

        setUser(userData);
        safeLog('User data loaded from storage');
      } else {
        safeLog('No user data found in storage');
      }
    } catch (error) {
      safeLog('Error loading user data', { error: error.message });
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  // Login function
  const login = async (email, password) => {
    try {
      safeLog('Attempting login...');

      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Check if we're online
      if (!isOnline) {
        safeLog('API is offline, using mock login');
        // Mock login for offline mode
        const mockUser = {
          id: 1,
          email: email,
          username: email.split('@')[0],
          first_name: 'Test',
          last_name: 'User',
          role: email.includes('admin') ? ROLES.ADMIN : ROLES.EMPLOYEE,
        };

        setUser(mockUser);
        await SecureStorageManager.setItem(
          APP_CONFIG.STORAGE_KEYS.USER_DATA,
          JSON.stringify(mockUser)
        );
        await SecureStorageManager.setItem(
          APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
          'mock-token-' + Date.now()
        );

        safeLog('Mock login successful');
        return true;
      }

      // Real API login
      const response = await apiService.auth.login(email, password);

      safeLog('API LOGIN RESPONSE:', {
        success: response.success,
        hasUser: !!response.user,
        hasToken: !!response.token,
      });

      if (response.success && response.user && response.token) {
        setUser(response.user);
        safeLog('Login successful:', safeLogUser(response.user, 'login'));
        return true;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      safeLog('Login failed', { error: error.message });
      throw error;
    }
  };

  // Logout function with protection against multiple calls
  const logout = async () => {
    if (isLoggingOut) {
      safeLog('Logout already in progress, skipping...');
      return;
    }

    setIsLoggingOut(true);

    try {
      safeLog('Logging out...');

      // Always try to call logout API first (while we still have the token)
      if (!APP_CONFIG.ENABLE_MOCK_DATA) {
        try {
          await apiService.auth.logout();
          safeLog('API logout successful');
        } catch (logoutError) {
          safeLog('API logout failed, continuing with local cleanup', {
            error: logoutError.message,
          });
        }
      } else {
        safeLog('Mock logout - skipping API call');
      }

      // ALWAYS clear local state regardless of API status
      safeLog('Clearing user state and storage');
      setUser(null);

      // Force storage cleanup regardless of API response
      // Get current token to clean user-specific caches
      const currentToken = await SecureStorageManager.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);

      const keysToRemove = [
        APP_CONFIG.STORAGE_KEYS.USER_DATA,
        APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
        APP_CONFIG.STORAGE_KEYS.WORK_STATUS,
        APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA,
        APP_CONFIG.STORAGE_KEYS.BIOMETRIC_SESSION,
        APP_CONFIG.STORAGE_KEYS.DEVICE_ID,
      ];

      // Add user-specific cache keys if we have a token
      if (currentToken) {
        const tokenPrefix = currentToken.substring(0, 8);
        keysToRemove.push(
          `${APP_CONFIG.STORAGE_KEYS.EMPLOYEES_CACHE}_${tokenPrefix}`,
          `${APP_CONFIG.STORAGE_KEYS.CACHE_TIMESTAMP}_${tokenPrefix}`
        );
      }

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
      const nonSensitiveKeys = [
        APP_CONFIG.STORAGE_KEYS.USER_DATA,
        APP_CONFIG.STORAGE_KEYS.WORK_STATUS,
      ];

      // Add user-specific cache keys if we have a token
      if (currentToken) {
        const tokenPrefix = currentToken.substring(0, 8);
        nonSensitiveKeys.push(
          `${APP_CONFIG.STORAGE_KEYS.EMPLOYEES_CACHE}_${tokenPrefix}`,
          `${APP_CONFIG.STORAGE_KEYS.CACHE_TIMESTAMP}_${tokenPrefix}`
        );
      }

      await AsyncStorage.multiRemove(nonSensitiveKeys);
      safeLog('Local storage cleared');

      safeLog('Logout successful');
    } catch (error) {
      safeLog('Logout error', { error: error.message });

      // Fallback: ensure state and storage are cleared even if everything fails
      safeLog('Setting user to null in logout error handler');
      setUser(null);
      try {
        // Get current token to clean user-specific caches in fallback
        const currentToken = await SecureStorageManager.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);

        const keysToRemove = [
          APP_CONFIG.STORAGE_KEYS.USER_DATA,
          APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
          APP_CONFIG.STORAGE_KEYS.WORK_STATUS,
          APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA,
          APP_CONFIG.STORAGE_KEYS.BIOMETRIC_SESSION,
          APP_CONFIG.STORAGE_KEYS.DEVICE_ID,
        ];

        // Add user-specific cache keys if we have a token
        if (currentToken) {
          const tokenPrefix = currentToken.substring(0, 8);
          keysToRemove.push(
            `${APP_CONFIG.STORAGE_KEYS.EMPLOYEES_CACHE}_${tokenPrefix}`,
            `${APP_CONFIG.STORAGE_KEYS.CACHE_TIMESTAMP}_${tokenPrefix}`
          );
        }

        // Fallback cleanup using SecureStorageManager for sensitive data
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
        const nonSensitiveKeys = [
          APP_CONFIG.STORAGE_KEYS.USER_DATA,
          APP_CONFIG.STORAGE_KEYS.WORK_STATUS,
        ];

        // Add user-specific cache keys if we have a token
        if (currentToken) {
          const tokenPrefix = currentToken.substring(0, 8);
          nonSensitiveKeys.push(
            `${APP_CONFIG.STORAGE_KEYS.EMPLOYEES_CACHE}_${tokenPrefix}`,
            `${APP_CONFIG.STORAGE_KEYS.CACHE_TIMESTAMP}_${tokenPrefix}`
          );
        }

        await AsyncStorage.multiRemove(nonSensitiveKeys);
        safeLog('Fallback storage cleanup completed');
      } catch (storageError) {
        safeLog('Storage cleanup failed', { error: storageError.message });
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Check if user has access to specific role
  const hasAccess = role => {
    if (!user) {
      return false;
    }

    // Superuser has access to everything
    if (user.is_superuser) {
      return true;
    }

    // Admin has access to everything
    if (user.role === ROLES.ADMIN) {
      return true;
    }

    // Check specific role access
    if (role === ROLES.ACCOUNTANT) {
      return user.role === ROLES.ACCOUNTANT || user.role === ROLES.ADMIN;
    }

    return user.role === role;
  };

  // Check if user has specific role
  const hasRole = role => {
    if (!user) return false;
    return user.role === role || user.is_superuser;
  };

  // Check if user is admin
  const isAdmin = () => {
    return hasRole(ROLES.ADMIN) || user?.is_superuser;
  };

  // Check if user is accountant
  const isAccountant = () => {
    return hasRole(ROLES.ACCOUNTANT) || hasRole(ROLES.ADMIN);
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return 'Guest';

    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }

    return user.username || user.email || 'User';
  };

  // Debug and fix authentication issues
  const debugAuth = async () => {
    safeLog('🔧 Running authentication diagnostics...');

    // Check current auth state
    const authState = await apiService.auth.debugAuthState();
    safeLog('Current auth state', {
      hasToken: authState.hasToken,
      hasUserData: authState.hasUserData,
    });

    // Check API connection
    const apiOnline = await checkConnection();
    safeLog('🌐 API status', { online: apiOnline });

    // Try to refresh token if needed
    if (authState.hasToken && authState.enhancedAuth?.shouldRefresh) {
      safeLog('Attempting token refresh...');
      try {
        await apiService.auth.refreshToken();
        safeLog('Token refreshed successfully');
        await loadUserData(); // Reload user data
      } catch (error) {
        safeLog('Token refresh failed', { error: error.message });
      }
    }

    return authState;
  };

  // Load user data from storage on app start
  useEffect(() => {
    loadUserData();
    checkConnection();
  }, [loadUserData, checkConnection]);

  // Handle user state changes (including logout)
  useEffect(() => {
    if (!user && !loading) {
      safeLog('User is null and not loading - user logged out');
      setIsLoggingOut(false); // Reset logout flag when user is cleared

      // Try to navigate to login screen after logout
      try {
        if (typeof window !== 'undefined' && window.location) {
          // Web platform
          const currentPath = window.location.pathname;
          if (currentPath !== '/' && currentPath !== '/index') {
            safeLog('Redirecting to login screen after logout (web)');
            window.location.href = '/';
          }
        } else {
          // Mobile platform - import router dynamically to avoid circular dependencies
          import('expo-router')
            .then(({ router }) => {
              const timeout = setTimeout(() => {
                try {
                  safeLog('Redirecting to login screen after logout (mobile)');
                  router.replace('/');
                } catch (error) {
                  safeLog('Could not redirect after logout:', error);
                }
              }, 200);

              return () => clearTimeout(timeout);
            })
            .catch(error => {
              safeLog('Could not import expo-router:', error);
            });
        }
      } catch (error) {
        safeLog('Navigation after logout failed:', error);
      }
    }
  }, [user, loading]);

  const value = {
    user,
    loading,
    isOnline,
    isLoggingOut,
    login,
    logout,
    hasRole,
    hasAccess,
    isAdmin,
    isAccountant,
    getUserDisplayName,
    refreshUser: loadUserData,
    checkConnection,
    debugAuth,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Custom hook to use the UserContext
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;
