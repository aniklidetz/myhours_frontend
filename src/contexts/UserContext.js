// src/contexts/UserContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../api/apiService';
import { APP_CONFIG } from '../config';
import { safeLog, safeLogUser, maskEmail } from '../utils/safeLogging';

// Define user roles
export const ROLES = {
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
  EMPLOYEE: 'employee',
  STAFF: 'staff'
};

// Create context
const UserContext = createContext();

// Provider component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Load user data from storage on app start
  useEffect(() => {
    loadUserData();
    checkConnection();
  }, []);

  // Handle user state changes (including logout)
  useEffect(() => {
    if (!user && !loading) {
      console.log('🔍 User is null and not loading - user logged out');
      setIsLoggingOut(false); // Reset logout flag when user is cleared
    }
  }, [user, loading]);

  // Check API connection
  const checkConnection = async () => {
    try {
      await apiService.testConnection();
      setIsOnline(true);
      console.log('✅ API is online');
    } catch (error) {
      console.warn('⚠️ API is offline, using cached data');
      setIsOnline(false);
    }
  };

  // Load user data from AsyncStorage
  const loadUserData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER_DATA);
      const storedToken = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      
      if (storedUser && storedToken) {
        const userData = JSON.parse(storedUser);
        
        // Only check auth state if online
        if (isOnline) {
          try {
            console.log('🔍 Checking auth state...');
            // Temporarily disable auth debug check to see if it's blocking
            // const authDebug = await apiService.auth.debugAuthState();
            // console.log('🔍 Auth debug response:', authDebug);
            
            // Check if token might be expired
            // if (authDebug.enhancedAuth?.isExpired) {
            //   console.warn('⚠️ Token is expired, clearing authentication');
            //   await logout();
            //   return;
            // }
          } catch (error) {
            console.warn('⚠️ Auth check failed, using cached user data:', error.message);
          }
        }
        
        setUser(userData);
        console.log('✅ User data loaded from storage');
      } else {
        console.log('❌ No user data found in storage');
      }
    } catch (error) {
      console.error('❌ Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login...');
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Check if we're online
      if (!isOnline) {
        console.warn('⚠️ API is offline, using mock login');
        // Mock login for offline mode
        const mockUser = {
          id: 1,
          email: email,
          username: email.split('@')[0],
          first_name: 'Test',
          last_name: 'User',
          role: email.includes('admin') ? ROLES.ADMIN : ROLES.EMPLOYEE
        };
        
        setUser(mockUser);
        await AsyncStorage.setItem(
          APP_CONFIG.STORAGE_KEYS.USER_DATA,
          JSON.stringify(mockUser)
        );
        await AsyncStorage.setItem(
          APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
          'mock-token-' + Date.now()
        );
        
        console.log('✅ Mock login successful');
        return true;
      }

      // Real API login
      const response = await apiService.auth.login(email, password);
      
      console.log('🔍 API LOGIN RESPONSE:', {
        success: response.success,
        hasUser: !!response.user,
        hasToken: !!response.token
      });
      
      if (response.success && response.user && response.token) {
        setUser(response.user);
        console.log('✅ Login successful:', maskEmail(response.user.email));
        console.log('🔍 User role from API response:', response.user.role);
        console.log('🔍 User is_superuser from API response:', response.user.is_superuser);
        console.log('🔍 User login data:', safeLogUser(response.user, 'login'));
        return true;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      throw error;
    }
  };

  // Logout function with protection against multiple calls
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logout = async () => {
    if (isLoggingOut) {
      console.log('🚪 Logout already in progress, skipping...');
      return;
    }
    
    setIsLoggingOut(true);
    
    try {
      console.log('🚪 Logging out...');
      
      // Always try to call logout API first (while we still have the token)
      if (!APP_CONFIG.ENABLE_MOCK_DATA) {
        try {
          await apiService.auth.logout();
          console.log('✅ API logout successful');
        } catch (logoutError) {
          console.warn('⚠️ API logout failed, continuing with local cleanup:', logoutError.message);
        }
      } else {
        console.log('🔄 Mock logout - skipping API call');
      }
      
      // ALWAYS clear local state regardless of API status
      console.log('🔄 Clearing user state and storage');
      setUser(null);
      
      // Force storage cleanup regardless of API response
      await AsyncStorage.multiRemove([
        APP_CONFIG.STORAGE_KEYS.USER_DATA,
        APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
        APP_CONFIG.STORAGE_KEYS.WORK_STATUS,
        APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA,
        APP_CONFIG.STORAGE_KEYS.BIOMETRIC_SESSION,
        APP_CONFIG.STORAGE_KEYS.DEVICE_ID
      ]);
      console.log('🧹 Local storage cleared');
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      
      // Fallback: ensure state and storage are cleared even if everything fails
      console.log('🔄 Setting user to null in logout error handler');
      setUser(null);
      try {
        await AsyncStorage.multiRemove([
          APP_CONFIG.STORAGE_KEYS.USER_DATA,
          APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
          APP_CONFIG.STORAGE_KEYS.WORK_STATUS,
          APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA,
          APP_CONFIG.STORAGE_KEYS.BIOMETRIC_SESSION,
          APP_CONFIG.STORAGE_KEYS.DEVICE_ID
        ]);
        console.log('🧹 Fallback storage cleanup completed');
      } catch (storageError) {
        console.error('❌ Storage cleanup failed:', storageError);
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Check if user has access to specific role
  const hasAccess = (role) => {
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
  const hasRole = (role) => {
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
    console.log('🔧 Running authentication diagnostics...');
    
    // Check current auth state
    const authState = await apiService.auth.debugAuthState();
    console.log('🔍 Current auth state:', authState);
    
    // Check API connection
    const apiOnline = await checkConnection();
    console.log('🌐 API status:', apiOnline ? 'Online' : 'Offline');
    
    // Try to refresh token if needed
    if (authState.hasToken && authState.enhancedAuth?.shouldRefresh) {
      console.log('🔄 Attempting token refresh...');
      try {
        await apiService.auth.refreshToken();
        console.log('✅ Token refreshed successfully');
        await loadUserData(); // Reload user data
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
      }
    }
    
    return authState;
  };

  const value = {
    user,
    loading,
    isOnline,
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

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
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