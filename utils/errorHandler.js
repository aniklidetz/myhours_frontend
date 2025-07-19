// Global error handler to prevent red screen in production
import { showGlassAlert } from '../hooks/useGlobalGlassModal';

let originalErrorHandler = null;
let isSetup = false;

export const setupGlobalErrorHandler = () => {
  if (isSetup) return; // Already set up
  isSetup = true;

  // Handle global errors in React Native
  const handleGlobalError = (error, isFatal) => {
    if (__DEV__) {
      console.error('❌ Global Error:', error, 'Fatal:', isFatal);
      // In development, let the default handler show the red screen
      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
      return;
    }
    
    // In production, show user-friendly messages
    if (isFatal) {
      setTimeout(() => {
        showGlassAlert(
          'Application Error',
          'The app encountered an unexpected error. Please restart the app.'
        );
      }, 100);
    }
    
    // Don't call original handler in production to prevent red screen
  };

  // React Native error handler
  if (global?.ErrorUtils?.setGlobalHandler) {
    originalErrorHandler = global.ErrorUtils.getGlobalHandler?.() || null;
    global.ErrorUtils.setGlobalHandler(handleGlobalError);
    
    if (__DEV__) {
      console.log('✅ Global error handler set up for React Native');
    }
  }

  // Handle promise rejections for React Native
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // In production, suppress biometric-related errors from showing to user
    if (!__DEV__) {
      const errorString = args.join(' ');
      if (errorString.includes('biometric') || 
          errorString.includes('camera') ||
          errorString.includes('Face recognition failed')) {
        // Log silently but don't show to user
        return;
      }
    }
    
    // Call original console.error
    originalConsoleError.apply(console, args);
  };
};

export const removeGlobalErrorHandler = () => {
  if (originalErrorHandler && global?.ErrorUtils?.setGlobalHandler) {
    global.ErrorUtils.setGlobalHandler(originalErrorHandler);
    originalErrorHandler = null;
  }
  isSetup = false;
};