// Authentication Diagnostics Utility
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '../config';

export const runAuthDiagnostics = async () => {
  console.log('========================================');
  console.log('🔍 AUTHENTICATION DIAGNOSTICS');
  console.log('========================================');
  
  try {
    // 1. Check what's in storage
    console.log('\n📦 Storage Contents:');
    const keys = [
      APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
      APP_CONFIG.STORAGE_KEYS.USER_DATA,
      APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA,
      APP_CONFIG.STORAGE_KEYS.DEVICE_ID,
      APP_CONFIG.STORAGE_KEYS.BIOMETRIC_SESSION,
      APP_CONFIG.STORAGE_KEYS.WORK_STATUS
    ];
    
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`  ${key}: ${value ? '✅ Present' : '❌ Missing'}`);
    }
    
    // 2. Check token details
    const token = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    const enhancedAuthData = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA);
    
    if (token) {
      console.log('\n🔑 Token Details:');
      console.log(`  Token preview: ${token.substring(0, 20)}...`);
      console.log(`  Token length: ${token.length} characters`);
    }
    
    if (enhancedAuthData) {
      console.log('\n🔐 Enhanced Auth Details:');
      try {
        const authData = JSON.parse(enhancedAuthData);
        console.log(`  Device ID: ${authData.device_id?.substring(0, 8)}...`);
        console.log(`  Expires at: ${authData.expires_at}`);
        
        const expiresAt = new Date(authData.expires_at);
        const now = new Date();
        const isExpired = now >= expiresAt;
        const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60);
        
        console.log(`  Status: ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
        if (!isExpired) {
          console.log(`  Time until expiry: ${hoursUntilExpiry.toFixed(1)} hours`);
        } else {
          console.log(`  Expired: ${Math.abs(hoursUntilExpiry).toFixed(1)} hours ago`);
        }
        
        console.log(`  Token match: ${authData.token === token ? '✅ Matches' : '❌ MISMATCH'}`);
        console.log(`  Biometric required: ${authData.requires_biometric_verification ? 'Yes' : 'No'}`);
      } catch (error) {
        console.error('  ❌ Error parsing enhanced auth data:', error);
      }
    }
    
    // 3. Check user data
    const userData = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.USER_DATA);
    if (userData) {
      console.log('\n👤 User Details:');
      try {
        const user = JSON.parse(userData);
        console.log(`  ID: ${user.id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Name: ${user.first_name} ${user.last_name}`);
      } catch (error) {
        console.error('  ❌ Error parsing user data:', error);
      }
    }
    
    // 4. Recommendations
    console.log('\n💡 Recommendations:');
    
    if (!token || !userData) {
      console.log('  🔴 No authentication found - user needs to login');
    } else if (enhancedAuthData) {
      const authData = JSON.parse(enhancedAuthData);
      const isExpired = new Date() >= new Date(authData.expires_at);
      
      if (isExpired) {
        console.log('  🔴 Token is expired - clear storage and re-login');
        console.log('     Run: await AsyncStorage.clear() and restart app');
      } else if (authData.token !== token) {
        console.log('  🟡 Token mismatch detected - may cause authentication issues');
        console.log('     The stored token doesn\'t match enhanced auth token');
      } else {
        console.log('  🟢 Authentication looks good');
        console.log('     If still having issues, check backend logs for token validation');
      }
    } else {
      console.log('  🟡 Using legacy authentication - consider re-login for enhanced security');
    }
    
    console.log('\n========================================');
    
  } catch (error) {
    console.error('❌ Diagnostics error:', error);
  }
};

// Function to clear all auth data and start fresh
export const clearAuthAndRestart = async () => {
  console.log('🧹 Clearing all authentication data...');
  
  try {
    const keys = [
      APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN,
      APP_CONFIG.STORAGE_KEYS.USER_DATA,
      APP_CONFIG.STORAGE_KEYS.ENHANCED_AUTH_DATA,
      APP_CONFIG.STORAGE_KEYS.DEVICE_ID,
      APP_CONFIG.STORAGE_KEYS.BIOMETRIC_SESSION,
      APP_CONFIG.STORAGE_KEYS.WORK_STATUS,
      APP_CONFIG.STORAGE_KEYS.EMPLOYEES_CACHE,
      APP_CONFIG.STORAGE_KEYS.CACHE_TIMESTAMP
    ];
    
    await AsyncStorage.multiRemove(keys);
    console.log('✅ All authentication data cleared');
    console.log('🔄 Please restart the app and login again');
    
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
  }
};