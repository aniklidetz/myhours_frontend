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
      
      if (response.user && response.token) {
        setUser(response.user);
        console.log('✅ Login successful:', response.user.email);
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
      
      // Clear local state immediately to prevent UI flicker
      setUser(null);
      
      // Clear storage
      await AsyncStorage.multiRemove([
        APP_CONFIG.STORAGE_KEYS.USER_DATA,
        APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
        APP_CONFIG.STORAGE_KEYS.WORK_STATUS,
      ]);
      
      // Call logout API only if online AND not in mock mode
      if (isOnline && !APP_CONFIG.ENABLE_MOCK_DATA) {
        await apiService.auth.logout();
      } else if (APP_CONFIG.ENABLE_MOCK_DATA) {
        console.log('🔄 Mock logout - skipping API call');
      }
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // State already cleared above
    }
  };

  // Check if user has access to specific role
  const hasAccess = (role) => {
    if (!user) return false;
    
    // Superuser has access to everything
    if (user.is_superuser) return true;
    
    // Admin has access to everything
    if (user.role === ROLES.ADMIN) return true;
    
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