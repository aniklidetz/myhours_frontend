// Temporary authentication diagnostic component
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runAuthDiagnostics, clearAuthAndRestart } from './src/utils/authDiagnostics';
import { APP_CONFIG } from './src/config';

export default function AuthTest() {
  const [diagnostics, setDiagnostics] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      await runAuthDiagnostics();
      
      // Get storage data for display
      const token = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      const userData = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER_DATA);
      const enhancedAuth = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA);
      
      const result = `
=== AUTH DIAGNOSTICS ===

Token: ${token ? 'Present (' + token.substring(0, 20) + '...)' : 'Missing'}
User Data: ${userData ? 'Present' : 'Missing'}
Enhanced Auth: ${enhancedAuth ? 'Present' : 'Missing'}

Full Token: ${token || 'NULL'}

User Data:
${userData || 'NULL'}

Enhanced Auth:
${enhancedAuth || 'NULL'}
      `;
      
      setDiagnostics(result);
    } catch (error) {
      setDiagnostics('Error: ' + error.message);
    }
    setIsLoading(false);
  };

  const testAPICall = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      const response = await fetch('http://localhost:8000/api/v1/biometrics/status/', {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.text();
      setDiagnostics(prev => prev + `\n\n=== API TEST ===\nStatus: ${response.status}\nResponse: ${data}`);
    } catch (error) {
      setDiagnostics(prev => prev + `\n\n=== API TEST ===\nError: ${error.message}`);
    }
    setIsLoading(false);
  };

  const clearAuth = async () => {
    await clearAuthAndRestart();
    setDiagnostics('Auth cleared - please restart app');
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authentication Diagnostics</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={runDiagnostics} disabled={isLoading}>
          <Text style={styles.buttonText}>Run Diagnostics</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testAPICall} disabled={isLoading}>
          <Text style={styles.buttonText}>Test API Call</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={clearAuth}>
          <Text style={styles.buttonText}>Clear Auth</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.diagnosticsContainer}>
        <Text style={styles.diagnosticsText}>{diagnostics}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  diagnosticsContainer: {
    flex: 1,
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 5,
  },
  diagnosticsText: {
    color: '#00FF00',
    fontFamily: 'monospace',
    fontSize: 12,
  },
});