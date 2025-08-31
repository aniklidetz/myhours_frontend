// Authentication Diagnostics Utility
import AsyncStorage from '@react-native-async-storage/async-storage';
import SecureStorageManager from './secureStorage';
import { APP_CONFIG } from '../config';
import { maskEmail, maskName, hashUserId } from './safeLogging';

export const runAuthDiagnostics = async () => {
  console.log('========================================');
  console.log('AUTHENTICATION DIAGNOSTICS');
  console.log('========================================');

  try {
    // 1. Check what's in storage
    console.log('\nStorage Contents:');
    const keys = [
      APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
      APP_CONFIG.STORAGE_KEYS.USER_DATA,
      APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA,
      APP_CONFIG.STORAGE_KEYS.DEVICE_ID,
      APP_CONFIG.STORAGE_KEYS.BIOMETRIC_SESSION,
      APP_CONFIG.STORAGE_KEYS.WORK_STATUS,
    ];

    for (const key of keys) {
      // Use SecureStorageManager for sensitive keys
      const isSensitiveKey = [
        APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
        APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA,
        APP_CONFIG.STORAGE_KEYS.DEVICE_ID,
        APP_CONFIG.STORAGE_KEYS.BIOMETRIC_SESSION,
      ].includes(key);

      const value = isSensitiveKey
        ? await SecureStorageManager.getItem(key)
        : await AsyncStorage.getItem(key);
      console.log(`  ${key}: ${value ? 'Present' : 'Missing'}`);
    }

    // 2. Check token details
    const token = await SecureStorageManager.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    const enhancedAuthData = await SecureStorageManager.getItem(
      APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA
    );

    if (token) {
      console.log('\nToken Details:');
      console.log(`  Token preview: ${token.substring(0, 6)}...***`);
      console.log(`  Token length: ${token.length} characters`);
    }

    if (enhancedAuthData) {
      console.log('\nEnhanced Auth Details:');
      try {
        const authData = JSON.parse(enhancedAuthData);
        console.log(`  Device ID: ${authData.device_id?.substring(0, 4)}...***`);
        console.log(`  Expires at: ${authData.expires_at}`);

        const expiresAt = new Date(authData.expires_at);
        const now = new Date();
        const isExpired = now >= expiresAt;
        const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60);

        console.log(`  Status: ${isExpired ? 'EXPIRED' : 'Valid'}`);
        if (!isExpired) {
          console.log(`  Time until expiry: ${hoursUntilExpiry.toFixed(1)} hours`);
        } else {
          console.log(`  Expired: ${Math.abs(hoursUntilExpiry).toFixed(1)} hours ago`);
        }

        console.log(`  Token match: ${authData.token === token ? 'Matches' : 'MISMATCH'}`);
        console.log(
          `  Biometric required: ${authData.requires_biometric_verification ? 'Yes' : 'No'}`
        );
      } catch (error) {
        console.error('  Error parsing enhanced auth data:', error);
      }
    }

    // 3. Check user data
    const userData = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER_DATA);
    if (userData) {
      console.log('\nUser Details:');
      try {
        const user = JSON.parse(userData);
        console.log(`  ID Hash: ${hashUserId(user.id)}`);
        console.log(`  Email: ${maskEmail(user.email)}`);
        console.log(`  Role: ${user.role}`);
        console.log(
          `  Name: ${maskName(`${user.first_name || ''} ${user.last_name || ''}`.trim())}`
        );
      } catch (error) {
        console.error('  Error parsing user data:', error);
      }
    }

    // 4. Recommendations
    console.log('\nRecommendations:');

    if (!token || !userData) {
      console.log('  No authentication found - user needs to login');
    } else if (enhancedAuthData) {
      const authData = JSON.parse(enhancedAuthData);
      const isExpired = new Date() >= new Date(authData.expires_at);

      if (isExpired) {
        console.log('  Token is expired - clear storage and re-login');
        console.log('     Run: await SecureStorageManager.clear() and restart app');
      } else if (authData.token !== token) {
        console.log('  Token mismatch detected - may cause authentication issues');
        console.log("     The stored token doesn't match enhanced auth token");
      } else {
        console.log('  Authentication looks good');
        console.log('     If still having issues, check backend logs for token validation');
      }
    } else {
      console.log('  Using legacy authentication - consider re-login for enhanced security');
    }

    console.log('\n========================================');
  } catch (error) {
    console.error('Diagnostics error:', error);
  }
};

// Function to clear all auth data and start fresh
export const clearAuthAndRestart = async () => {
  console.log('Clearing all authentication data...');

  try {
    const _keys = [
      APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
      APP_CONFIG.STORAGE_KEYS.USER_DATA,
      APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA,
      APP_CONFIG.STORAGE_KEYS.DEVICE_ID,
      APP_CONFIG.STORAGE_KEYS.BIOMETRIC_SESSION,
      APP_CONFIG.STORAGE_KEYS.WORK_STATUS,
      APP_CONFIG.STORAGE_KEYS.EMPLOYEES_CACHE,
      APP_CONFIG.STORAGE_KEYS.CACHE_TIMESTAMP,
    ];

    // Remove sensitive keys using SecureStorageManager
    const sensitiveKeys = [
      APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
      APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA,
      APP_CONFIG.STORAGE_KEYS.DEVICE_ID,
      APP_CONFIG.STORAGE_KEYS.BIOMETRIC_SESSION,
    ];

    for (const key of sensitiveKeys) {
      await SecureStorageManager.removeItem(key);
    }

    // Remove non-sensitive keys using AsyncStorage
    const nonSensitiveKeys = [
      APP_CONFIG.STORAGE_KEYS.USER_DATA,
      APP_CONFIG.STORAGE_KEYS.WORK_STATUS,
      APP_CONFIG.STORAGE_KEYS.EMPLOYEES_CACHE,
      APP_CONFIG.STORAGE_KEYS.CACHE_TIMESTAMP,
    ];

    await AsyncStorage.multiRemove(nonSensitiveKeys);
    console.log('All authentication data cleared');
    console.log('Please restart the app and login again');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};
