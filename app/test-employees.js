// app/test-employees.js
// Тестовый маршрут для обхода авторизации и прямого перехода на employees

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useUser } from '../src/contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '../src/config';

export default function TestEmployeesScreen() {
  const { login } = useUser();

  useEffect(() => {
    autoLogin();
  }, []);

  const autoLogin = async () => {
    try {
      // Automatic login with test data
      console.log('🔐 Auto-login for testing...');
      
      // Create test user
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        role: 'employee',
        is_superuser: false
      };
      
      // Сохраняем в storage
      await AsyncStorage.setItem(
        APP_CONFIG.STORAGE_KEYS.USER_DATA,
        JSON.stringify(mockUser)
      );
      await AsyncStorage.setItem(
        APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
        'mock-token-test'
      );
      
      // Небольшая задержка для инициализации
      setTimeout(() => {
        console.log('✅ Auto-login complete, navigating to employees');
        router.replace('/employees');
      }, 500);
      
    } catch (error) {
      console.error('Auto-login failed:', error);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={{ marginTop: 20 }}>Auto-login for testing...</Text>
    </View>
  );
}