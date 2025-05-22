import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { useUser, ROLES } from '../src/contexts/UserContext';
import useColors from '../hooks/useColors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, loading: userLoading } = useUser();
  const { palette, isDark } = useColors(); // используем хук для получения текущей цветовой палитры

  useEffect(() => {
    if (user && !userLoading) {
      console.log('User already logged in, redirecting to employees screen');
      router.replace('/employees');
    }
  }, [user, userLoading]);

  if (userLoading) {
    return (
      <View style={styles(palette).loadingContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles(palette).loadingText}>Loading...</Text>
      </View>
    );
  }

  const authenticateUser = async (email, password) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (email.includes('admin')) {
          resolve({ success: true, user: { id: 1, name: 'Admin User', email, role: ROLES.ADMIN } });
        } else if (email.includes('accountant')) {
          resolve({ success: true, user: { id: 2, name: 'Accountant User', email, role: ROLES.ACCOUNTANT } });
        } else if (email && password) {
          resolve({ success: true, user: { id: 3, name: 'Employee User', email, role: ROLES.EMPLOYEE } });
        } else {
          resolve({ success: false, message: 'Invalid credentials' });
        }
      }, 1000);
    });
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await authenticateUser(email, password);
      if (response.success) {
        const success = await login(response.user);
        if (success) {
          router.replace('/employees');
        }
      } else {
        Alert.alert('Error', response.message || 'Authentication failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles(palette).container}>
      <View style={styles(palette).content}>
        <Text style={styles(palette).title}>MyHours</Text>
        <Text style={styles(palette).subtitle}>Time Tracking System</Text>

        <View style={styles(palette).form}>
          <TextInput
            style={styles(palette).input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={palette.text.secondary}
          />

          <TextInput
            style={styles(palette).input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
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

          <Text style={styles(palette).hint}>
            Hint: Use email with 'admin' or 'accountant' to test different roles
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Преобразуем стили в функцию, которая принимает цветовую палитру
const styles = (palette) => StyleSheet.create({
  container: {
    backgroundColor: palette.background.secondary,
    flex: 1,
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
  hint: {
    color: palette.text.secondary,
    fontSize: 12,
    marginTop: 20,
    textAlign: 'center',
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
    width: '100%',
  },
  loginButtonText: {
    color: palette.text.light,
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    color: palette.text.secondary,
    fontSize: 18,
    marginBottom: 40,
  },
  title: {
    color: palette.primary,
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 10,
  }
});