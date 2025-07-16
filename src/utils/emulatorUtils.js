// src/utils/emulatorUtils.js
import { Platform } from 'react-native';
import { APP_CONFIG } from '../config';

/**
 * Detect if running on emulator
 */
export const isEmulator = () => {
  return __DEV__ && (
    Platform.OS === 'ios' ? 
      // iOS Simulator detection
      Platform.isPad === false && Platform.isTV === false :
      // Android Emulator detection (more reliable)
      true // For now, assume Android dev is on emulator
  );
};

/**
 * Get mock biometric data for emulator testing
 */
export const getMockBiometricData = (userId, operation = 'check-in') => {
  return {
    success: true,
    employee_name: 'Emulator User',
    [operation === 'check-in' ? 'check_in_time' : 'check_out_time']: new Date().toISOString(),
    location: `Emulator (${APP_CONFIG.EMULATOR_LOCATION.latitude}, ${APP_CONFIG.EMULATOR_LOCATION.longitude})`,
    status: operation === 'check-in' ? 'checked_in' : 'checked_out',
    ...(operation === 'check-out' && { hours_worked: 8.0 })
  };
};

/**
 * Generate mock image data for emulator testing
 */
export const getMockImageData = () => {
  // Generate a small base64 image (1x1 transparent PNG)
  const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return `data:image/png;base64,${mockBase64}`;
};

/**
 * Check if camera is available on emulator
 */
export const isCameraAvailableOnEmulator = () => {
  // iOS simulator typically has camera support
  if (Platform.OS === 'ios') {
    return true;
  }
  
  // Android emulator may not have camera
  return false;
};

/**
 * Show emulator-specific instructions
 */
export const getEmulatorInstructions = () => {
  if (Platform.OS === 'ios') {
    return {
      camera: 'Camera should work on iOS Simulator',
      location: 'Location services available with simulator'
    };
  } else {
    return {
      camera: 'Camera may not work on Android emulator. Use physical device for biometric features.',
      location: 'Location services may be limited on emulator'
    };
  }
};

export default {
  isEmulator,
  getMockBiometricData,
  getMockImageData,
  isCameraAvailableOnEmulator,
  getEmulatorInstructions
};