// test-biometric-flow.js
// Simple end-to-end biometric flow test

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useUser } from './src/contexts/UserContext';
import { useOffice } from './src/contexts/OfficeContext';
import ApiService from './src/api/apiService';
import useColors from './hooks/useColors';
import { APP_CONFIG } from './src/config';

export default function BiometricFlowTest() {
  const { palette } = useColors();
  const { user, isOnline, login } = useUser();
  const { officeSettings } = useOffice();

  const [testResults, setTestResults] = React.useState([]);
  const [testing, setTesting] = React.useState(false);

  const addResult = (test, status, details = '') => {
    const result = {
      test,
      status, // 'pass', 'fail', 'warning'
      details,
      timestamp: new Date().toLocaleTimeString()
    };
    setTestResults(prev => [...prev, result]);
    return result;
  };

  const runFullTest = async () => {
    setTesting(true);
    setTestResults([]);
    
    try {
      // Test 1: Authentication
      await testAuthentication();
      
      // Test 2: API Connection
      await testApiConnection();
      
      // Test 3: Mock Biometric Registration
      await testBiometricRegistration();
      
      // Test 4: Mock Biometric Check-in
      await testBiometricCheckIn();
      
      // Test 5: Mock Biometric Check-out
      await testBiometricCheckOut();
      
      // Test 6: Office Location Setup
      await testOfficeLocation();
      
      addResult('Full Test Suite', 'pass', 'All biometric workflow tests completed');
      
    } catch (error) {
      addResult('Full Test Suite', 'fail', `Test suite failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const testAuthentication = async () => {
    try {
      if (!user) {
        // Try mock login
        await login('test@example.com', 'testpassword');
        addResult('Authentication', 'pass', 'Mock user login successful');
      } else {
        addResult('Authentication', 'pass', `User logged in: ${user.email}`);
      }
    } catch (error) {
      addResult('Authentication', 'fail', `Login failed: ${error.message}`);
      throw error;
    }
  };

  const testApiConnection = async () => {
    try {
      if (APP_CONFIG.ENABLE_MOCK_DATA) {
        addResult('API Connection', 'warning', 'Using mock data mode');
        return;
      }
      
      await ApiService.testConnection();
      addResult('API Connection', 'pass', 'API server is reachable');
    } catch (error) {
      addResult('API Connection', 'warning', `API offline, using mock mode: ${error.message}`);
    }
  };

  const testBiometricRegistration = async () => {
    try {
      // Create mock image data
      const mockImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
      
      const result = await ApiService.biometrics.register(1, mockImageData);
      
      if (result && result.success) {
        addResult('Biometric Registration', 'pass', 'Face registration successful');
      } else {
        addResult('Biometric Registration', 'fail', 'Registration failed');
      }
    } catch (error) {
      addResult('Biometric Registration', 'fail', `Registration error: ${error.message}`);
    }
  };

  const testBiometricCheckIn = async () => {
    try {
      // Create mock image data
      const mockImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
      const mockLocation = 'Test Location (32.0853, 34.7818)';
      
      const result = await ApiService.biometrics.checkIn(mockImageData, mockLocation);
      
      if (result && result.success !== false) {
        addResult('Biometric Check-In', 'pass', `Check-in successful: ${result.employee_name || 'Test User'}`);
      } else {
        addResult('Biometric Check-In', 'fail', 'Check-in failed');
      }
    } catch (error) {
      addResult('Biometric Check-In', 'fail', `Check-in error: ${error.message}`);
    }
  };

  const testBiometricCheckOut = async () => {
    try {
      // Create mock image data
      const mockImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
      const mockLocation = 'Test Location (32.0853, 34.7818)';
      
      const result = await ApiService.biometrics.checkOut(mockImageData, mockLocation);
      
      if (result && result.success !== false) {
        addResult('Biometric Check-Out', 'pass', `Check-out successful: ${result.hours_worked || 8}h worked`);
      } else {
        addResult('Biometric Check-Out', 'fail', 'Check-out failed');
      }
    } catch (error) {
      addResult('Biometric Check-Out', 'fail', `Check-out error: ${error.message}`);
    }
  };

  const testOfficeLocation = async () => {
    try {
      if (officeSettings && officeSettings.location && officeSettings.location.latitude) {
        addResult('Office Location', 'pass', `Office configured at: ${officeSettings.location.latitude}, ${officeSettings.location.longitude}`);
      } else {
        addResult('Office Location', 'warning', 'Office location not configured - will use remote mode');
      }
    } catch (error) {
      addResult('Office Location', 'fail', `Office location error: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pass': return palette.success;
      case 'fail': return palette.danger;
      case 'warning': return palette.warning;
      default: return palette.text.secondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'warning': return '⚠️';
      default: return '⏳';
    }
  };

  const passedTests = testResults.filter(r => r.status === 'pass').length;
  const failedTests = testResults.filter(r => r.status === 'fail').length;
  const warningTests = testResults.filter(r => r.status === 'warning').length;

  return (
    <SafeAreaView style={styles(palette).container}>
      <ScrollView style={styles(palette).scrollView}>
        {/* Header */}
        <View style={styles(palette).header}>
          <Text style={styles(palette).title}>🧪 Biometric Flow Test</Text>
          <Text style={styles(palette).subtitle}>
            End-to-end testing of biometric authentication workflow
          </Text>
        </View>

        {/* Test Status */}
        {testResults.length > 0 && (
          <View style={styles(palette).statusContainer}>
            <Text style={styles(palette).statusTitle}>Test Results:</Text>
            <View style={styles(palette).statusRow}>
              <Text style={[styles(palette).statusText, { color: palette.success }]}>
                ✅ Passed: {passedTests}
              </Text>
              <Text style={[styles(palette).statusText, { color: palette.danger }]}>
                ❌ Failed: {failedTests}
              </Text>
              <Text style={[styles(palette).statusText, { color: palette.warning }]}>
                ⚠️ Warnings: {warningTests}
              </Text>
            </View>
          </View>
        )}

        {/* Test Results */}
        {testResults.map((result, index) => (
          <View key={index} style={styles(palette).resultItem}>
            <View style={styles(palette).resultHeader}>
              <Text style={styles(palette).resultTitle}>
                {getStatusIcon(result.status)} {result.test}
              </Text>
              <Text style={styles(palette).resultTime}>{result.timestamp}</Text>
            </View>
            {result.details && (
              <Text style={[styles(palette).resultDetails, { color: getStatusColor(result.status) }]}>
                {result.details}
              </Text>
            )}
          </View>
        ))}

        {/* Control Buttons */}
        <View style={styles(palette).buttonContainer}>
          <TouchableOpacity
            style={[styles(palette).button, styles(palette).testButton]}
            onPress={runFullTest}
            disabled={testing}
          >
            <Text style={styles(palette).buttonText}>
              {testing ? '🔄 Running Tests...' : '🧪 Run Full Test Suite'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles(palette).button, styles(palette).navigateButton]}
            onPress={() => router.push('/biometric-registration?employeeId=1&employeeName=Test%20User')}
          >
            <Text style={styles(palette).buttonText}>
              📋 Test Registration UI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles(palette).button, styles(palette).navigateButton]}
            onPress={() => router.push('/biometric-check?mode=check-in')}
          >
            <Text style={styles(palette).buttonText}>
              🔐 Test Check-In UI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles(palette).button, styles(palette).navigateButton]}
            onPress={() => router.push('/biometric-check?mode=check-out')}
          >
            <Text style={styles(palette).buttonText}>
              🔓 Test Check-Out UI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles(palette).button, styles(palette).backButton]}
            onPress={() => router.push('/')}
          >
            <Text style={styles(palette).buttonText}>⬅️ Back to Home</Text>
          </TouchableOpacity>
        </View>

        {/* Configuration Info */}
        <View style={styles(palette).configContainer}>
          <Text style={styles(palette).configTitle}>📋 Current Configuration:</Text>
          <Text style={styles(palette).configText}>
            • Mock Data: {APP_CONFIG.ENABLE_MOCK_DATA ? 'Enabled' : 'Disabled'}
          </Text>
          <Text style={styles(palette).configText}>
            • API Online: {isOnline ? 'Yes' : 'No'}
          </Text>
          <Text style={styles(palette).configText}>
            • User Logged In: {user ? `${user.email}` : 'No'}
          </Text>
          <Text style={styles(palette).configText}>
            • Office Location: {officeSettings?.location ? 'Configured' : 'Not set'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (palette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background.primary,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: palette.text.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: palette.text.secondary,
    textAlign: 'center',
  },
  
  // Status
  statusContainer: {
    backgroundColor: palette.background.secondary,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.text.primary,
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Results
  resultItem: {
    backgroundColor: palette.background.secondary,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: palette.primary,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.text.primary,
    flex: 1,
  },
  resultTime: {
    fontSize: 12,
    color: palette.text.secondary,
  },
  resultDetails: {
    fontSize: 14,
    marginTop: 5,
  },
  
  // Buttons
  buttonContainer: {
    marginTop: 20,
    gap: 15,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: palette.primary,
  },
  navigateButton: {
    backgroundColor: palette.success,
  },
  backButton: {
    backgroundColor: palette.text.secondary,
  },
  buttonText: {
    color: palette.text.light,
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Configuration
  configContainer: {
    backgroundColor: palette.background.secondary,
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 20,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.text.primary,
    marginBottom: 10,
  },
  configText: {
    fontSize: 14,
    color: palette.text.secondary,
    marginBottom: 5,
  },
});