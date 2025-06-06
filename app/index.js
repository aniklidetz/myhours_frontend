// app/index.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../src/contexts/UserContext';
import useColors from '../hooks/useColors';
import apiService from '../src/api/apiService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, loading: userLoading, isOnline, checkConnection } = useUser();
  const { palette } = useColors();

  useEffect(() => {
    if (user && !userLoading) {
      console.log('User already logged in, redirecting to employees screen');
      router.replace('/employees'); 
    }
  }, [user, userLoading]);

  // Test connection button handler
  const handleTestConnection = async () => {
    try {
      setLoading(true);
      console.log('Testing connection...');
      const result = await apiService.testConnection();
      console.log('Connection test result:', result);
      Alert.alert(
        'Success', 
        `Connected to backend!\n${result.message}`,
        [{ text: 'OK' }]
      );
      await checkConnection(); // Update online status
    } catch (error) {
      console.error('Connection test failed:', error);
      Alert.alert(
        'Connection Failed', 
        `Unable to connect to backend.\n\nMake sure:\n1. Django server is running on port 8000\n2. Using command: python manage.py runserver 0.0.0.0:8000\n3. Your phone/simulator is on same network\n\nError: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // Navigation is handled by useEffect when user state changes
    } catch (error) {
      console.error('Login error:', error);
      
      let errorMessage = 'An error occurred during login';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <View style={styles(palette).loadingContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles(palette).loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles(palette).container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles(palette).keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles(palette).scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles(palette).content}>
            <Text style={styles(palette).title}>MyHours</Text>
            <Text style={styles(palette).subtitle}>Time Tracking System</Text>
            
            {/* Connection status indicator */}
            <View style={styles(palette).statusContainer}>
              <View style={[
                styles(palette).statusDot,
                isOnline ? styles(palette).statusDotOnline : styles(palette).statusDotOffline
              ]} />
              <Text style={styles(palette).statusText}>
                {isOnline ? 'Connected to backend' : 'Offline mode'}
              </Text>
            </View>

            <View style={styles(palette).form}>
              <TextInput
                style={styles(palette).input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={palette.text.secondary}
              />

              <TextInput
                style={styles(palette).input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={palette.text.secondary}
              />

              <TouchableOpacity
                style={styles(palette).loginButton}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={palette.text.light} />
                ) : (
                  <Text style={styles(palette).loginButtonText}>Login</Text>
                )}
              </TouchableOpacity>

              {/* Clear Auth Data button (for debugging) */}
              <TouchableOpacity
                style={styles(palette).clearDataButton}
                onPress={async () => {
                  try {
                    await AsyncStorage.multiRemove([
                      '@MyHours:AuthToken',
                      '@MyHours:UserData', 
                      '@MyHours:WorkStatus',
                      '@MyHours:EnhancedAuthData',
                      '@MyHours:BiometricSession',
                      '@MyHours:DeviceId'
                    ]);
                    Alert.alert('Success', 'Authentication data cleared! Please login again.');
                  } catch (error) {
                    Alert.alert('Error', 'Failed to clear data');
                  }
                }}
              >
                <Text style={styles(palette).clearDataButtonText}>
                  🧹 Clear Auth Data
                </Text>
              </TouchableOpacity>

              {/* Test connection button */}
              <TouchableOpacity
                style={styles(palette).testButton}
                onPress={handleTestConnection}
                disabled={loading}
              >
                <Text style={styles(palette).testButtonText}>
                  Test Backend Connection
                </Text>
              </TouchableOpacity>

              {/* Biometric test button */}
              <TouchableOpacity
                style={styles(palette).biometricTestButton}
                onPress={() => router.push('/test-biometric-flow')}
                disabled={loading}
              >
                <Text style={styles(palette).biometricTestButtonText}>
                  🧪 Test Biometric Flow
                </Text>
              </TouchableOpacity>

              <View style={styles(palette).infoContainer}>
                <Text style={styles(palette).infoTitle}>For Testing:</Text>
                <Text style={styles(palette).infoText}>
                  1. First, click "Test Backend Connection"
                </Text>
                <Text style={styles(palette).infoText}>
                  2. Use your Django superuser credentials
                </Text>
                <Text style={styles(palette).infoText}>
                  3. Or create a user in Django admin panel
                </Text>
              </View>

              {/* Quick test login */}
              <TouchableOpacity
                style={styles(palette).quickLoginButton}
                onPress={() => {
                  setEmail('test@example.com');
                  setPassword('test123');
                  handleLogin();
                }}
                disabled={loading}
              >
                <Text style={styles(palette).quickLoginText}>
                  🚀 Quick Test Login (Mock User)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Styles function that accepts color palette
const styles = (palette) => StyleSheet.create({
  container: {
    backgroundColor: palette.background.secondary,
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  form: {
    maxWidth: 400,
    width: '100%',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: palette.background.primary,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusDotOnline: {
    backgroundColor: palette.success,
  },
  statusDotOffline: {
    backgroundColor: palette.danger,
  },
  statusText: {
    color: palette.text.secondary,
    fontSize: 14,
  },
  input: {
    backgroundColor: palette.background.primary,
    borderColor: palette.border,
    borderRadius: 5,
    borderWidth: 1,
    color: palette.text.primary,
    height: 50,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: palette.background.secondary,
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: palette.text.secondary,
    fontSize: 16,
    marginTop: 10,
  },
  loginButton: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: 5,
    height: 50,
    justifyContent: 'center',
    marginBottom: 10,
    width: '100%',
  },
  loginButtonText: {
    color: palette.text.light,
    fontSize: 18,
    fontWeight: 'bold',
  },
  testButton: {
    alignItems: 'center',
    backgroundColor: palette.background.transparent,
    borderColor: palette.primary,
    borderWidth: 1,
    borderRadius: 5,
    height: 50,
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  testButtonText: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  biometricTestButton: {
    alignItems: 'center',
    backgroundColor: palette.success,
    borderRadius: 5,
    height: 50,
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  biometricTestButtonText: {
    color: palette.text.light,
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: palette.background.primary,
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  infoTitle: {
    color: palette.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    color: palette.text.secondary,
    fontSize: 14,
    marginBottom: 5,
  },
  subtitle: {
    color: palette.text.secondary,
    fontSize: 18,
    marginBottom: 20,
  },
  title: {
    color: palette.primary,
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  quickLoginButton: {
    backgroundColor: palette.warning,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  quickLoginText: {
    color: palette.text.dark,
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearDataButton: {
    backgroundColor: palette.warning || '#ff9500',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  clearDataButtonText: {
    color: palette.text.light,
    fontSize: 14,
    fontWeight: 'bold',
  }
});