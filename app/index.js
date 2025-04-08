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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, loading: userLoading } = useUser();

  // If the user is already authenticated, redirect to the employee screen
  useEffect(() => {
    if (user && !userLoading) {
      console.log('User already logged in, redirecting to employees screen');
      router.replace('/employees');
    }
  }, [user, userLoading]);

  // While user data is being loaded, show loading indicator
  if (userLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Mock authentication function (will be replaced with a real one in the future)
  const authenticateUser = async (email, password) => {
    // Simulate network request
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simple check for demonstration purposes
        if (email.includes('admin')) {
          resolve({
            success: true,
            user: {
              id: 1,
              name: 'Admin User',
              email,
              role: ROLES.ADMIN
            }
          });
        } else if (email.includes('accountant')) {
          resolve({
            success: true,
            user: {
              id: 2,
              name: 'Accountant User',
              email,
              role: ROLES.ACCOUNTANT
            }
          });
        } else if (email && password) {
          resolve({
            success: true,
            user: {
              id: 3,
              name: 'Employee User',
              email,
              role: ROLES.EMPLOYEE
            }
          });
        } else {
          resolve({
            success: false,
            message: 'Invalid credentials'
          });
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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>MyHours</Text>
        <Text style={styles.subtitle}>Time Tracking System</Text>
        
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>
          
          <Text style={styles.hint}>
            Hint: Use email with 'admin' or 'accountant' to test different roles
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#757575',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#757575',
    marginBottom: 40,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 5,
    height: 50,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  loginButton: {
    backgroundColor: '#2196F3',
    width: '100%',
    height: 50,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  hint: {
    marginTop: 20,
    textAlign: 'center',
    color: '#757575',
    fontSize: 12,
  }
});