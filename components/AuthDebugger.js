// Temporary Auth Debugger Component
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useUser } from '../src/contexts/UserContext';
import { runAuthDiagnostics, clearAuthAndRestart } from '../src/utils/authDiagnostics';
import apiService from '../src/api/apiService';

export const AuthDebugger = () => {
  const { user, debugAuth } = useUser();
  const [diagnosticOutput, setDiagnosticOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    setDiagnosticOutput('Running diagnostics...\n');
    
    // Capture console output
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    let output = '';
    
    console.log = (...args) => {
      output += args.join(' ') + '\n';
      originalLog(...args);
    };
    console.error = (...args) => {
      output += '❌ ' + args.join(' ') + '\n';
      originalError(...args);
    };
    console.warn = (...args) => {
      output += '⚠️ ' + args.join(' ') + '\n';
      originalWarn(...args);
    };
    
    try {
      await runAuthDiagnostics();
      setDiagnosticOutput(output);
    } catch (error) {
      setDiagnosticOutput(output + '\n\nError: ' + error.message);
    } finally {
      // Restore console
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      setLoading(false);
    }
  };

  const testWorkStatusAPI = async () => {
    setLoading(true);
    try {
      console.log('Testing work status API...');
      const result = await apiService.biometrics.checkStatus();
      setDiagnosticOutput(JSON.stringify(result, null, 2));
    } catch (error) {
      setDiagnosticOutput(`API Error: ${error.message}\n\nResponse: ${JSON.stringify(error.response?.data, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    setLoading(true);
    try {
      console.log('Attempting token refresh...');
      const result = await apiService.auth.refreshToken();
      setDiagnosticOutput('Token refresh result:\n' + JSON.stringify(result, null, 2));
    } catch (error) {
      setDiagnosticOutput(`Refresh Error: ${error.message}\n\nResponse: ${JSON.stringify(error.response?.data, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  const clearAndRestart = async () => {
    if (confirm('This will clear all auth data. Are you sure?')) {
      await clearAuthAndRestart();
      setDiagnosticOutput('Auth data cleared. Please restart the app.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Auth Debugger</Text>
      
      <View style={styles.info}>
        <Text>Current User: {user ? `${user.email} (${user.role})` : 'Not logged in'}</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={runDiagnostics}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Run Diagnostics</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={testWorkStatusAPI}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Work Status API</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={refreshToken}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Refresh Token</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.buttonDanger, loading && styles.buttonDisabled]} 
          onPress={clearAndRestart}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Clear Auth & Restart</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.output}>
        <Text style={styles.outputText}>{diagnosticOutput}</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  info: {
    backgroundColor: '#e0e0e0',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    marginRight: 5,
    marginBottom: 5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonDanger: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
  },
  output: {
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 5,
    maxHeight: 300,
  },
  outputText: {
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: 10,
  },
});