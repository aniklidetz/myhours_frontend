// Silent logger for production - suppresses specific error types from showing to users

let originalConsoleError = console.error;
let isSetup = false;

export const setupSilentLogging = () => {
  if (isSetup) return;
  isSetup = true;

  // Override console.error to suppress biometric errors in production
  console.error = (...args) => {
    const errorString = args.join(' ').toLowerCase();

    // In production, silently handle biometric-related errors
    if (!__DEV__) {
      if (
        errorString.includes('biometric') ||
        errorString.includes('face recognition') ||
        errorString.includes('camera') ||
        errorString.includes('request failed with status code')
      ) {
        // Log to device logs but don't show red screen
        return;
      }
    }

    // FIX: Remove problematic apply
    // For all other errors, use original console.error
    try {
      originalConsoleError(...args);
    } catch (_error) {
      // Fallback to basic logging if apply fails
      console.warn('Fallback logging:', ...args);
    }
  };
};

// Helper function to log errors only in development
export const devLog = (level, ...args) => {
  if (__DEV__) {
    try {
      console[level](...args);
    } catch (_error) {
      console.warn('Dev log error:', ...args);
    }
  }
};

// Helper function to log errors for debugging but not show to user
export const silentLog = (...args) => {
  if (__DEV__) {
    try {
      originalConsoleError(...args);
    } catch (_error) {
      console.warn('Silent log fallback:', ...args);
    }
  }
  // In production, these errors are silently handled
};
