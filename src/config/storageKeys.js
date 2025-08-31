// Storage key constants with valid SecureStore naming
// SecureStore keys must only contain alphanumeric characters, '.', '-', and '_'

export const STORAGE_KEYS = {
  PREFIX: 'MyHours',

  // Secure keys (sensitive data)
  AUTH_TOKEN: 'MyHours.AuthToken',
  REFRESH_TOKEN: 'MyHours.RefreshToken',
  ENHANCED_AUTH_DATA: 'MyHours.EnhancedAuthData',
  BIOMETRIC_SESSION: 'MyHours.BiometricSession',
  DEVICE_ID: 'MyHours.DeviceId',
  USER_CREDENTIALS: 'MyHours.UserCredentials',

  // Non-secure keys (regular AsyncStorage)
  USER_DATA: 'MyHours.UserData',
  WORK_STATUS: 'MyHours.WorkStatus',
  OFFICE_SETTINGS: 'MyHours.OfficeSettings',
  EMPLOYEES_CACHE: 'MyHours.EmployeesCache',
  CACHE_TIMESTAMP: 'MyHours.CacheTimestamp',
  APP_PREFERENCES: 'MyHours.AppPreferences',
  RECENT_BIOMETRIC_REGISTRATION: 'MyHours.RecentBiometricRegistration',
};

// Legacy keys with invalid characters (for migration only)
export const LEGACY_KEYS = {
  AUTH_TOKEN: '@MyHours:AuthToken',
  REFRESH_TOKEN: '@MyHours:RefreshToken',
  ENHANCED_AUTH_DATA: '@MyHours:EnhancedAuthData',
  BIOMETRIC_SESSION: '@MyHours:BiometricSession',
  DEVICE_ID: '@MyHours:DeviceId',
  USER_CREDENTIALS: '@MyHours:UserCredentials',
  USER_DATA: '@MyHours:UserData',
  WORK_STATUS: '@MyHours:WorkStatus',
  OFFICE_SETTINGS: '@MyHours:OfficeSettings',
  EMPLOYEES_CACHE: '@MyHours:EmployeesCache',
  CACHE_TIMESTAMP: '@MyHours:CacheTimestamp',
  APP_PREFERENCES: '@MyHours:AppPreferences',
  RECENT_BIOMETRIC_REGISTRATION: '@MyHours:RecentBiometricRegistration',
};
