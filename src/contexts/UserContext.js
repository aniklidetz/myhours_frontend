import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Create the context
export const UserContext = createContext();

// User roles
export const ROLES = {
  EMPLOYEE: 'employee',
  ACCOUNTANT: 'accountant',
  ADMIN: 'admin'
};

// Access levels for roles (hierarchy)
const ACCESS_LEVELS = {
  [ROLES.EMPLOYEE]: 1,
  [ROLES.ACCOUNTANT]: 2,
  [ROLES.ADMIN]: 3
};

// Storage key for saved user data
const USER_STORAGE_KEY = '@MyHours:UserData';

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user data when the component mounts
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        console.log('Attempting to load user data from storage...');
        
        const jsonValue = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (jsonValue !== null) {
          const userData = JSON.parse(jsonValue);
          console.log('Loaded user data from storage:', userData);
          setUser(userData);
        } else {
          console.log('No user data found in storage');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Function to log in a user
  const login = async (userData) => {
    try {
      console.log('Logging in user:', userData);
      setUser(userData);
      
      // Save user data to AsyncStorage
      const jsonValue = JSON.stringify(userData);
      await AsyncStorage.setItem(USER_STORAGE_KEY, jsonValue);
      console.log('User data saved to storage');
      
      return true;
    } catch (error) {
      console.error('Error during login:', error);
      Alert.alert('Login Error', 'Failed to save user session.');
      return false;
    }
  };

  // Function to log out the user
  const logout = async () => {
    try {
      console.log('Logging out user');
      setUser(null);
      
      // Remove user data from AsyncStorage
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      console.log('User data removed from storage');
      
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Logout Error', 'Failed to clear user session.');
      return false;
    }
  };

  // Function to check access level
  const hasAccess = (requiredRole) => {
    if (!user) return false;
    const userLevel = ACCESS_LEVELS[user.role] || 0;
    const requiredLevel = ACCESS_LEVELS[requiredRole] || 999;
    return userLevel >= requiredLevel;
  };

  // Context value to be provided
  const value = {
    user,
    loading,
    login,
    logout,
    hasAccess,
    isEmployee: user?.role === ROLES.EMPLOYEE,
    isAccountant: user?.role === ROLES.ACCOUNTANT,
    isAdmin: user?.role === ROLES.ADMIN,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Hook to use the context
export const useUser = () => useContext(UserContext);