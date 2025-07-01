// src/contexts/UserContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../api/apiService';
import { APP_CONFIG } from '../config';

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

  // Check API connection
  const checkConnection = async () => {
    try {
      console.log('🔍 Checking API connection...');
      await apiService.testConnection();
      setIsOnline(true);
      console.log('✅ API is online');
    } catch (error) {
      console.error('❌ API is offline:', error.message);
      setIsOnline(false);
    }
  };

  // Load user data from AsyncStorage
  const loadUserData = async () => {
    try {
      console.log('🔍 Loading user data from storage...');
      const storedUser = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER_DATA);
      const storedToken = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      
      if (storedUser && storedToken) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log('✅ User data loaded:', userData.email);
        console.log('🔍 User role from storage:', userData.role);
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
        hasToken: !!response.token,
        user: response.user
      });
      
      if (response.success && response.user && response.token) {
        setUser(response.user);
        console.log('✅ Login successful:', response.user.email);
        console.log('🔍 User role from API response:', response.user.role);
        console.log('🔍 User is_superuser from API response:', response.user.is_superuser);
        console.log('🔍 Full user object:', response.user);
        return true;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      
      // Call logout API FIRST (while we still have the token)
      if (isOnline && !APP_CONFIG.ENABLE_MOCK_DATA) {
        try {
          await apiService.auth.logout();
          console.log('✅ API logout successful');
        } catch (logoutError) {
          console.warn('⚠️ API logout failed, continuing with local cleanup:', logoutError.message);
        }
      } else if (APP_CONFIG.ENABLE_MOCK_DATA) {
        console.log('🔄 Mock logout - skipping API call');
      }
      
      // THEN clear local state
      setUser(null);
      
      // Note: Storage cleanup is handled by apiService.auth.logout() above
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      
      // Fallback: ensure state and storage are cleared even if API fails
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
    }
  };

  // Check if user has access to specific role
  const hasAccess = (role) => {
    if (!user) {
      console.log('🔒 hasAccess: No user found');
      return false;
    }
    
    console.log(`🔒 hasAccess check: user.role='${user.role}', required='${role}', is_superuser=${user.is_superuser}`);
    
    // Superuser has access to everything
    if (user.is_superuser) {
      console.log('✅ hasAccess: Superuser access granted');
      return true;
    }
    
    // Admin has access to everything
    if (user.role === ROLES.ADMIN) {
      console.log('✅ hasAccess: Admin access granted');
      return true;
    }
    
    // Check specific role access
    if (role === ROLES.ACCOUNTANT) {
      const hasAccess = user.role === ROLES.ACCOUNTANT || user.role === ROLES.ADMIN;
      console.log(`✅ hasAccess: Accountant check result=${hasAccess}`);
      return hasAccess;
    }
    
    const hasAccess = user.role === role;
    console.log(`✅ hasAccess: Direct role check result=${hasAccess}`);
    return hasAccess;
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