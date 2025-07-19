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
      if (errorString.includes('biometric') || 
          errorString.includes('face recognition') ||
          errorString.includes('camera') ||
          errorString.includes('request failed with status code')) {
        // Log to device logs but don't show red screen
        return;
      }
    }
    
    // For all other errors, use original console.error
    originalConsoleError.apply(console, args);
  };
};

// Helper function to log errors only in development
export const devLog = (level, ...args) => {
  if (__DEV__) {
    console[level](...args);
  }
};

// Helper function to log errors for debugging but not show to user
export const silentLog = (...args) => {
  if (__DEV__) {
    originalConsoleError.apply(console, args);
  }
  // In production, these errors are silently handled
};