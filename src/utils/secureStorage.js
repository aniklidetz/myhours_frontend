// src/utils/secureStorage.js
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { STORAGE_KEYS, LEGACY_KEYS } from '../config/storageKeys';

/**
 * Secure Storage Wrapper with proper key validation
 * Provides a unified interface for storing sensitive data using expo-secure-store
 * Falls back to AsyncStorage for non-sensitive data or when SecureStore is unavailable
 */

// Define which keys require secure storage (sensitive data)
const SECURE_KEYS = [
  STORAGE_KEYS.AUTH_TOKEN,
  STORAGE_KEYS.REFRESH_TOKEN,
  STORAGE_KEYS.ENHANCED_AUTH_DATA,
  STORAGE_KEYS.BIOMETRIC_SESSION,
  STORAGE_KEYS.DEVICE_ID,
  STORAGE_KEYS.USER_CREDENTIALS,
];

// Define keys that can use regular AsyncStorage (non-sensitive data)
const ASYNC_KEYS = [
  STORAGE_KEYS.USER_DATA,
  STORAGE_KEYS.WORK_STATUS,
  STORAGE_KEYS.OFFICE_SETTINGS,
  STORAGE_KEYS.EMPLOYEES_CACHE,
  STORAGE_KEYS.CACHE_TIMESTAMP,
  STORAGE_KEYS.APP_PREFERENCES,
  STORAGE_KEYS.RECENT_BIOMETRIC_REGISTRATION,
];

/**
 * Determines if a key should use secure storage
 */
const shouldUseSecureStorage = key => {
  return SECURE_KEYS.includes(key);
};

/**
 * Validates SecureStore key format
 * SecureStore keys must only contain alphanumeric characters, '.', '-', and '_'
 */
const isValidSecureStoreKey = key => {
  const validPattern = /^[A-Za-z0-9._-]+$/;
  return validPattern.test(key);
};

/**
 * Enhanced secure storage with error handling and fallback
 */
class SecureStorageManager {
  // Track ongoing migrations to prevent duplicates
  static ongoingMigrations = new Set();
  /**
   * Store data securely
   * @param {string} key - Storage key (must be from STORAGE_KEYS constants)
   * @param {string} value - Value to store
   * @param {Object} options - Storage options
   */
  static async setItem(key, value, options = {}) {
    try {
      if (!isValidSecureStoreKey(key)) {
        throw new Error(
          `Invalid SecureStore key format: ${key}. Use keys from STORAGE_KEYS constants.`
        );
      }

      const useSecure = shouldUseSecureStorage(key);

      if (useSecure) {
        // Use SecureStore for sensitive data
        await SecureStore.setItemAsync(key, value, {
          requireAuthentication: false,
          keychainService: 'MyHoursApp',
          ...options,
        });

        console.log(`Stored securely: ${key}`);
        return true;
      } else {
        // Use AsyncStorage for non-sensitive data
        await AsyncStorage.setItem(key, value);
        console.log(`Stored in AsyncStorage: ${key}`);
        return true;
      }
    } catch (error) {
      console.error(`Failed to store ${key}:`, error.message);

      // Fallback to AsyncStorage if SecureStore fails
      if (shouldUseSecureStorage(key)) {
        console.warn(`Falling back to AsyncStorage for ${key}`);
        try {
          await AsyncStorage.setItem(key, value);
          return true;
        } catch (fallbackError) {
          console.error(`Fallback storage failed for ${key}:`, fallbackError.message);
          throw fallbackError;
        }
      }
      throw error;
    }
  }

  /**
   * Retrieve data securely
   * @param {string} key - Storage key (must be from STORAGE_KEYS constants)
   * @param {Object} options - Retrieval options
   */
  static async getItem(key, options = {}) {
    try {
      if (!isValidSecureStoreKey(key)) {
        console.warn(`Invalid SecureStore key format: ${key}. Trying AsyncStorage fallback.`);
        // For invalid keys, only check AsyncStorage (legacy data)
        return await AsyncStorage.getItem(key);
      }

      const useSecure = shouldUseSecureStorage(key);

      if (useSecure) {
        // Try SecureStore first
        try {
          const value = await SecureStore.getItemAsync(key, {
            requireAuthentication: false,
            keychainService: 'MyHoursApp',
            ...options,
          });

          if (value !== null) {
            console.log(`Retrieved securely: ${key} (length: ${value.length})`);
            return value;
          } else {
            console.log(`SecureStore returned null for ${key} - may not exist yet`);
          }
        } catch (secureStoreError) {
          console.warn(
            `SecureStore retrieval failed for ${key}, trying migration:`,
            secureStoreError.message
          );
        }

        // Only attempt migration if we have a legacy key that actually exists
        const legacyKey = this.findLegacyKeyForNewKey(key);
        if (legacyKey && !this.ongoingMigrations.has(legacyKey)) {
          try {
            this.ongoingMigrations.add(legacyKey);
            const legacyValue = await AsyncStorage.getItem(legacyKey);
            if (legacyValue !== null) {
              console.log(`Attempting legacy migration for ${key} from ${legacyKey}`);
              // Migrate the data
              await this.setItem(key, legacyValue);
              await this.removeLegacyKey(legacyKey);
              console.log(`Auto-migrated: ${legacyKey} → ${key}`);
              return legacyValue;
            }
          } catch (migrationError) {
            console.warn(`Migration attempt failed for ${key}:`, migrationError.message);
          } finally {
            this.ongoingMigrations.delete(legacyKey);
          }
        }

        return null;
      } else {
        // Use AsyncStorage for non-sensitive data
        const value = await AsyncStorage.getItem(key);
        if (value !== null) {
          console.log(`Retrieved from AsyncStorage: ${key}`);
          return value;
        }

        // Only attempt migration if we have a legacy key that actually exists
        const legacyKey = this.findLegacyKeyForNewKey(key);
        if (legacyKey && !this.ongoingMigrations.has(legacyKey)) {
          try {
            this.ongoingMigrations.add(legacyKey);
            const legacyValue = await AsyncStorage.getItem(legacyKey);
            if (legacyValue !== null) {
              console.log(`Attempting legacy migration for ${key} from ${legacyKey}`);
              // Migrate the data
              await AsyncStorage.setItem(key, legacyValue);
              await this.removeLegacyKey(legacyKey);
              console.log(`Auto-migrated: ${legacyKey} → ${key}`);
              return legacyValue;
            }
          } catch (migrationError) {
            console.warn(`Migration attempt failed for ${key}:`, migrationError.message);
          } finally {
            this.ongoingMigrations.delete(legacyKey);
          }
        }

        return null;
      }
    } catch (error) {
      console.error(`Failed to retrieve ${key}:`, error.message);

      // Fallback to AsyncStorage if SecureStore fails
      if (shouldUseSecureStorage(key) && isValidSecureStoreKey(key)) {
        console.warn(`Falling back to AsyncStorage for ${key}`);
        try {
          return await AsyncStorage.getItem(key);
        } catch (fallbackError) {
          console.error(`Fallback retrieval failed for ${key}:`, fallbackError.message);
          return null;
        }
      }
      return null;
    }
  }

  /**
   * Remove data securely
   * @param {string} key - Storage key (must be from STORAGE_KEYS constants)
   */
  static async removeItem(key) {
    try {
      if (!isValidSecureStoreKey(key)) {
        console.warn(`Invalid SecureStore key format: ${key}. This is likely a legacy key.`);
        // For invalid/legacy keys, only remove from AsyncStorage
        await AsyncStorage.removeItem(key);
        console.log(`Removed legacy key from AsyncStorage: ${key}`);
        return true;
      }

      const useSecure = shouldUseSecureStorage(key);

      if (useSecure) {
        // Remove from SecureStore
        await SecureStore.deleteItemAsync(key, {
          keychainService: 'MyHoursApp',
        });
        console.log(`Removed securely: ${key}`);

        // Also remove from AsyncStorage (cleanup fallback)
        await AsyncStorage.removeItem(key);

        // Also cleanup any corresponding legacy key
        const legacyKey = this.findLegacyKeyForNewKey(key);
        if (legacyKey) {
          await AsyncStorage.removeItem(legacyKey);
          console.log(`Cleaned up legacy key: ${legacyKey}`);
        }
      } else {
        // Remove from AsyncStorage
        await AsyncStorage.removeItem(key);
        console.log(`Removed from AsyncStorage: ${key}`);

        // Also cleanup any corresponding legacy key
        const legacyKey = this.findLegacyKeyForNewKey(key);
        if (legacyKey) {
          await AsyncStorage.removeItem(legacyKey);
          console.log(`Cleaned up legacy key: ${legacyKey}`);
        }
      }

      return true;
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error.message);

      // Try removing from AsyncStorage at least
      try {
        await AsyncStorage.removeItem(key);
        console.log(`Removed from AsyncStorage fallback: ${key}`);
      } catch (asyncError) {
        console.error(`AsyncStorage removal failed for ${key}:`, asyncError.message);
      }

      return false;
    }
  }

  /**
   * Safely remove legacy key from AsyncStorage only
   * This won't try SecureStore operations on invalid keys
   */
  static async removeLegacyKey(legacyKey) {
    try {
      await AsyncStorage.removeItem(legacyKey);
      console.log(`Removed legacy key from AsyncStorage: ${legacyKey}`);
      return true;
    } catch (error) {
      console.warn(`Failed to remove legacy key ${legacyKey}:`, error.message);
      return false;
    }
  }

  /**
   * Clear all stored data (both new and legacy)
   */
  static async clear() {
    try {
      console.log('Clearing all stored data...');

      // Remove new format keys
      const allNewKeys = [...SECURE_KEYS, ...ASYNC_KEYS];
      let removedCount = 0;

      for (const key of allNewKeys) {
        try {
          const removed = await this.removeItem(key);
          if (removed) removedCount++;
        } catch (error) {
          console.warn(`Failed to remove ${key}:`, error.message);
        }
      }

      // Remove legacy keys from AsyncStorage only
      const legacyKeys = Object.values(LEGACY_KEYS);
      let legacyRemovedCount = 0;

      for (const legacyKey of legacyKeys) {
        const removed = await this.removeLegacyKey(legacyKey);
        if (removed) legacyRemovedCount++;
      }

      console.log(`Storage cleared: ${removedCount} new keys, ${legacyRemovedCount} legacy keys`);
      return true;
    } catch (error) {
      console.error('Failed to clear storage:', error.message);
      return false;
    }
  }

  /**
   * Find the corresponding legacy key for a new key
   * @param {string} newKey - New key format
   * @returns {string|null} - Legacy key or null if not found
   */
  static findLegacyKeyForNewKey(newKey) {
    const keyMappings = {
      [STORAGE_KEYS.AUTH_TOKEN]: LEGACY_KEYS.AUTH_TOKEN,
      [STORAGE_KEYS.REFRESH_TOKEN]: LEGACY_KEYS.REFRESH_TOKEN,
      [STORAGE_KEYS.ENHANCED_AUTH_DATA]: LEGACY_KEYS.ENHANCED_AUTH_DATA,
      [STORAGE_KEYS.BIOMETRIC_SESSION]: LEGACY_KEYS.BIOMETRIC_SESSION,
      [STORAGE_KEYS.DEVICE_ID]: LEGACY_KEYS.DEVICE_ID,
      [STORAGE_KEYS.USER_CREDENTIALS]: LEGACY_KEYS.USER_CREDENTIALS,
      [STORAGE_KEYS.USER_DATA]: LEGACY_KEYS.USER_DATA,
      [STORAGE_KEYS.WORK_STATUS]: LEGACY_KEYS.WORK_STATUS,
      [STORAGE_KEYS.OFFICE_SETTINGS]: LEGACY_KEYS.OFFICE_SETTINGS,
      [STORAGE_KEYS.EMPLOYEES_CACHE]: LEGACY_KEYS.EMPLOYEES_CACHE,
      [STORAGE_KEYS.CACHE_TIMESTAMP]: LEGACY_KEYS.CACHE_TIMESTAMP,
      [STORAGE_KEYS.APP_PREFERENCES]: LEGACY_KEYS.APP_PREFERENCES,
      [STORAGE_KEYS.RECENT_BIOMETRIC_REGISTRATION]: LEGACY_KEYS.RECENT_BIOMETRIC_REGISTRATION,
    };

    return keyMappings[newKey] || null;
  }

  /**
   * Migrate old keys with colons to new underscore format
   * This handles the transition from '@MyHours:' to 'MyHours.' format
   */
  static async migrateOldKeys() {
    console.log('Starting key migration from legacy format...');

    const migrations = [
      [LEGACY_KEYS.AUTH_TOKEN, STORAGE_KEYS.AUTH_TOKEN],
      [LEGACY_KEYS.REFRESH_TOKEN, STORAGE_KEYS.REFRESH_TOKEN],
      [LEGACY_KEYS.ENHANCED_AUTH_DATA, STORAGE_KEYS.ENHANCED_AUTH_DATA],
      [LEGACY_KEYS.BIOMETRIC_SESSION, STORAGE_KEYS.BIOMETRIC_SESSION],
      [LEGACY_KEYS.DEVICE_ID, STORAGE_KEYS.DEVICE_ID],
      [LEGACY_KEYS.USER_CREDENTIALS, STORAGE_KEYS.USER_CREDENTIALS],
      [LEGACY_KEYS.USER_DATA, STORAGE_KEYS.USER_DATA],
      [LEGACY_KEYS.WORK_STATUS, STORAGE_KEYS.WORK_STATUS],
      [LEGACY_KEYS.OFFICE_SETTINGS, STORAGE_KEYS.OFFICE_SETTINGS],
      [LEGACY_KEYS.EMPLOYEES_CACHE, STORAGE_KEYS.EMPLOYEES_CACHE],
      [LEGACY_KEYS.CACHE_TIMESTAMP, STORAGE_KEYS.CACHE_TIMESTAMP],
      [LEGACY_KEYS.APP_PREFERENCES, STORAGE_KEYS.APP_PREFERENCES],
      [LEGACY_KEYS.RECENT_BIOMETRIC_REGISTRATION, STORAGE_KEYS.RECENT_BIOMETRIC_REGISTRATION],
    ];

    let migrated = 0;

    for (const [oldKey, newKey] of migrations) {
      try {
        // Check AsyncStorage for old key (legacy keys were stored there)
        const oldValue = await AsyncStorage.getItem(oldKey);
        if (oldValue !== null) {
          // Store using new key format with appropriate storage type
          await this.setItem(newKey, oldValue);
          // Remove old key from AsyncStorage
          await this.removeLegacyKey(oldKey);
          console.log(`Migrated: ${oldKey} → ${newKey}`);
          migrated++;
        }
      } catch (error) {
        console.error(`Failed to migrate ${oldKey}:`, error.message);
      }
    }

    console.log(`Migration completed: ${migrated} keys migrated`);
    return migrated;
  }

  /**
   * Check if SecureStore is available on this platform
   */
  static async isSecureStoreAvailable() {
    try {
      // Test SecureStore availability with valid key
      const testKey = 'MyHours.SecureStoreTest';
      const testValue = 'test';

      await SecureStore.setItemAsync(testKey, testValue, { keychainService: 'MyHoursApp' });
      const retrieved = await SecureStore.getItemAsync(testKey, { keychainService: 'MyHoursApp' });
      await SecureStore.deleteItemAsync(testKey, { keychainService: 'MyHoursApp' });

      const isAvailable = retrieved === testValue;
      console.log(`SecureStore availability: ${isAvailable ? 'Available' : 'Not Available'}`);
      return isAvailable;
    } catch (error) {
      console.warn('SecureStore not available:', error.message);
      return false;
    }
  }

  /**
   * Get storage info for debugging
   */
  static async getStorageInfo() {
    try {
      const asyncKeys = await AsyncStorage.getAllKeys();
      const myHoursAsyncKeys = asyncKeys.filter(key => key.includes('MyHours'));

      // Check SecureStore keys (we can't list them, so we check if they exist)
      const secureKeyStatus = {};
      for (const secureKey of SECURE_KEYS) {
        try {
          const value = await SecureStore.getItemAsync(secureKey, {
            keychainService: 'MyHoursApp',
          });
          secureKeyStatus[secureKey] = value !== null;
        } catch (_error) {
          secureKeyStatus[secureKey] = false;
        }
      }

      return {
        platform: Platform.OS,
        secureStoreAvailable: await this.isSecureStoreAvailable(),
        asyncStorageKeys: myHoursAsyncKeys.length,
        secureStoreKeys: Object.values(secureKeyStatus).filter(Boolean).length,
        keyStatus: {
          asyncStorage: myHoursAsyncKeys,
          secureStore: secureKeyStatus,
        },
      };
    } catch (error) {
      console.error('Failed to get storage info:', error.message);
      return { error: error.message };
    }
  }
}

export default SecureStorageManager;
export { STORAGE_KEYS, LEGACY_KEYS };
