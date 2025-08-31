// Enhanced error handling for biometric operations
// Converts technical errors into user-friendly messages

export const getBiometricErrorMessage = (error, operation = 'biometric operation') => {
  // Don't process aborted/cancelled requests
  if (error.name === 'CanceledError' || error.message === 'canceled') {
    return null;
  }

  const status = error.response?.status;
  const responseData = error.response?.data;

  // Specific error messages based on status codes
  switch (status) {
    case 400:
      // Bad Request - various validation errors
      if (responseData?.error?.includes('Already checked in')) {
        return {
          title: 'Already Checked In',
          message: 'You are already checked in. Please check out first before checking in again.',
          icon: 'TIME',
        };
      }
      if (responseData?.error?.includes('No active check-in found')) {
        return {
          title: 'Not Checked In',
          message: 'You need to check in first before you can check out.',
          icon: 'CHECKLIST',
        };
      }
      if (responseData?.error?.includes('No registered faces')) {
        return {
          title: 'No Biometric Data',
          message:
            'No employees have registered biometric data yet. Please register your face first.',
          icon: 'PERSON',
        };
      }
      if (responseData?.error?.includes('Face recognition failed - no matching employee found')) {
        return {
          title: 'Face Not Recognized',
          message:
            "Your face was not found in our system. This could mean:\n\n• You haven't registered your biometric data yet\n• The lighting is too poor\n• Your face has changed significantly\n\nWould you like to register or update your biometric data?",
          icon: 'SEARCH',
        };
      }
      if (responseData?.error?.includes('Face recognition failed')) {
        return {
          title: 'Face Recognition Failed',
          message:
            'Unable to recognize your face. Please ensure good lighting and try again. If this continues, you may need to re-register your biometric data.',
          icon: 'PERSON',
        };
      }
      return {
        title: 'Request Error',
        message:
          'There was an issue processing your request. Please try again or contact support if the problem persists.',
        icon: 'WARNING',
      };

    case 403:
      // Forbidden - authentication/permission issues
      if (responseData?.error?.includes('Face does not match')) {
        return {
          title: 'Face Mismatch',
          message:
            "The face doesn't match your account. Please ensure you're logged in with the correct account.",
          icon: 'BLOCKED',
        };
      }
      if (responseData?.error?.includes('Permission denied')) {
        return {
          title: 'Permission Denied',
          message: "You don't have permission to perform this action.",
          icon: 'LOCKED',
        };
      }
      return {
        title: 'Access Denied',
        message: "You don't have permission to access this feature.",
        icon: 'LOCKED',
      };

    case 404:
      // Not Found
      if (responseData?.error?.includes('Employee not found')) {
        return {
          title: 'Employee Not Found',
          message: 'Employee record not found. Please contact your administrator.',
          icon: 'PERSON',
        };
      }
      return {
        title: 'Face Not Recognized',
        message:
          'Your face is not registered in the system. Please register your biometric data first.',
        icon: 'SEARCH',
      };

    case 409:
      // Conflict
      return {
        title: 'Already Registered',
        message:
          'Biometric data is already registered for this employee. You can update it if needed.',
        icon: 'REFRESH',
      };

    case 429:
      // Too Many Requests
      return {
        title: 'Too Many Attempts',
        message: 'Too many failed attempts. Please wait a few minutes before trying again.',
        icon: 'TIMER',
      };

    case 500:
    case 502:
    case 503:
    case 504:
      // Server Errors
      return {
        title: 'System Unavailable',
        message:
          'The biometric system is temporarily unavailable. Please try again in a few minutes or contact support.',
        icon: 'TOOLS',
      };

    default:
      // Network and unknown errors
      if (error.message?.includes('Network')) {
        return {
          title: 'Connection Error',
          message: 'Please check your internet connection and try again.',
          icon: 'SIGNAL',
        };
      }

      if (error.message?.includes('timeout')) {
        return {
          title: 'Request Timeout',
          message: 'The operation took too long. Please try again.',
          icon: 'TIME',
        };
      }

      return {
        title: 'Unexpected Error',
        message: `Something went wrong with the ${operation}. Please try again or contact support.`,
        icon: 'ERROR',
      };
  }
};

// For camera-related errors
export const getCameraErrorMessage = error => {
  if (error.message?.includes('Permission')) {
    return {
      title: 'Camera Permission Required',
      message: 'Please allow camera access in your device settings to use biometric features.',
      icon: 'CAMERA',
    };
  }

  if (error.message?.includes('not ready')) {
    return {
      title: 'Camera Not Ready',
      message: 'Please wait for the camera to initialize and try again.',
      icon: 'HOURGLASS',
    };
  }

  return {
    title: 'Camera Error',
    message: 'There was an issue with the camera. Please try again.',
    icon: '📷',
  };
};

// For displaying errors with appropriate UI components
export const showBiometricError = (error, operation, showAlert, showToast) => {
  const errorInfo = getBiometricErrorMessage(error, operation);

  if (!errorInfo) return; // Skip cancelled requests

  // Show all face recognition errors as critical (Glass Modal)
  const isFaceRecognitionError =
    errorInfo.title.includes('Face') ||
    errorInfo.title.includes('Biometric') ||
    errorInfo.title.includes('Not Recognized');

  // Use glass alert for critical errors and face recognition failures
  const isCritical =
    [403, 404, 500, 502, 503, 504].includes(error.response?.status) || isFaceRecognitionError;

  if (isCritical && showAlert) {
    showAlert(errorInfo.title, errorInfo.message);
  } else if (showToast) {
    showToast(`${errorInfo.icon} ${errorInfo.message}`, 4000);
  } else if (showAlert) {
    // Fallback to glass alert if no toast available
    showAlert(errorInfo.title, errorInfo.message);
  } else {
    // Last resort fallback to console
    console.error(`[${errorInfo.icon}] ${errorInfo.title}: ${errorInfo.message}`);
  }
};
