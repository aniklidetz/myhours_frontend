// app/index.js
import React, { useState, useEffect, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../src/contexts/UserContext';
import useColors from '../hooks/useColors';
import apiService from '../src/api/apiService';

// Dev mode flag - set to false for production
const __DEV_MODE__ = false; // Always false for production

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef(null);
  const { login, user, loading: userLoading, isOnline, checkConnection } = useUser();
  const { palette } = useColors();

  useEffect(() => {
    if (user && !userLoading) {
      console.log('User already logged in, redirecting to check-in-out screen');
      router.replace('/check-in-out'); 
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
        `Unable to connect to backend server.\n\nPlease check your network connection and try again.\n\nError: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    // Improved validation
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address');
      return;
    }
    
    if (!password.trim()) {
      Alert.alert('Validation Error', 'Please enter your password');
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
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
            
            {/* Connection status indicator - show only if offline or in dev mode */}
            {(!isOnline || __DEV_MODE__) && (
              <View style={styles(palette).statusContainer}>
                <View style={[
                  styles(palette).statusDot,
                  isOnline ? styles(palette).statusDotOnline : styles(palette).statusDotOffline
                ]} />
                <Text style={styles(palette).statusText}>
                  {isOnline ? 'Connected to backend' : 'Connection lost - check network'}
                </Text>
              </View>
            )}

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
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
              />

              <View style={styles(palette).passwordContainer}>
                <TextInput
                  ref={passwordInputRef}
                  style={styles(palette).passwordInput}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={palette.text.secondary}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  style={styles(palette).passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color={palette.text.secondary}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles(palette).loginButton,
                  (!email.trim() || !password.trim() || loading) && styles(palette).loginButtonDisabled
                ]}
                onPress={handleLogin}
                disabled={!email.trim() || !password.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color={palette.text.light} />
                ) : (
                  <Text style={[
                    styles(palette).loginButtonText,
                    (!email.trim() || !password.trim()) && styles(palette).loginButtonTextDisabled
                  ]}>
                    Login
                  </Text>
                )}
              </TouchableOpacity>

              {/* Clear Auth Data button (for debugging) - only in dev mode */}
              {__DEV_MODE__ && (
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
              )}

              {/* Test connection button - only in dev mode */}
              {__DEV_MODE__ && (
                <TouchableOpacity
                  style={styles(palette).testButton}
                  onPress={handleTestConnection}
                  disabled={loading}
                >
                  <Text style={styles(palette).testButtonText}>
                    Test Backend Connection
                  </Text>
                </TouchableOpacity>
              )}


              {/* Dev testing info - only in dev mode */}
              {__DEV_MODE__ && (
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
              )}

              {/* Quick test login removed for demo security */}
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
  loginButtonDisabled: {
    backgroundColor: palette.text.secondary,
    opacity: 0.6,
  },
  loginButtonTextDisabled: {
    opacity: 0.7,
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
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  passwordInput: {
    backgroundColor: palette.background.primary,
    borderColor: palette.border,
    borderRadius: 5,
    borderWidth: 1,
    color: palette.text.primary,
    height: 50,
    paddingHorizontal: 15,
    paddingRight: 50, // Space for the eye icon
  },
  passwordToggle: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
  }
});