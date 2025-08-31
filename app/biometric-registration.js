import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ApiService from '../src/api/apiService';
import { useToast } from '../contexts/ToastContext';
import FaceCaptureOverlay from '../components/FaceCaptureOverlay';
import { maskName } from '../src/utils/safeLogging';
import { showGlassAlert } from '../hooks/useGlobalGlassModal';
import LiquidGlassScreenLayout from '../components/LiquidGlassScreenLayout';
import LiquidGlassButton from '../components/LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import useBiometricCamera from '../hooks/useBiometricCamera';

export default function BiometricRegistrationScreen() {
  const [isProcessing, setIsProcessing] = useState(false);
  const theme = useLiquidGlassTheme();
  const { showSuccess: _showSuccess, showError } = useToast();

  const { employeeId, employeeName, selfService, returnTo } = useLocalSearchParams();

  // Determine return path with fallback logic
  const getReturnPath = useCallback(() => {
    // Priority 1: Explicit returnTo parameter
    if (returnTo && typeof returnTo === 'string') {
      console.log('Using explicit returnTo path:', returnTo);
      return returnTo;
    }

    // Priority 2: Legacy selfService logic as fallback
    if (selfService === 'true') {
      console.log(' Using legacy selfService logic: /check-in-out');
      return '/check-in-out';
    }

    // Priority 3: Default fallback
    console.log(' Using default fallback: /team-management');
    return '/team-management';
  }, [returnTo, selfService]);

  // Callback for biometric camera hook
  const handleRegister = async photo => {
    setIsProcessing(true);
    try {
      console.log(
        ' Starting face registration for:',
        employeeName ? maskName(employeeName) : `Employee #${employeeId}`
      );

      const imageData = `data:image/jpeg;base64,${photo.base64}`;
      // Ensure employeeId is a number
      const empId = parseInt(employeeId, 10);
      if (isNaN(empId)) {
        throw new Error(`Invalid employee ID: ${employeeId}`);
      }
      const result = await ApiService.biometrics.register(empId, imageData);

      if (result.success) {
        const employeeDisplayName = employeeName || `Employee #${employeeId}`;

        const returnPath = getReturnPath();

        showGlassAlert('Success!', `Face registered successfully for ${employeeDisplayName}`, [
          {
            text: 'OK',
            onPress: async () => {
              console.log(' Navigation after success: returning to', returnPath);
              // Deactivate camera before navigation
              setCameraActive(false);
              setCameraReady(false);
              // Give server time to process biometric registration
              console.log('Waiting for server to process biometric data...');
              await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds delay
              router.replace(returnPath);
            },
          },
        ]);
      } else {
        console.warn(' Registration failed with error:', result.error);
        handleRegistrationError(result.error);
      }
    } catch (_error) {
      // Log error details for debugging (only in development)
      if (__DEV__) {
        console.error(' Biometric registration failed:', {
          errorMessage: _error.response?.data?.message || _error.message,
          errorResponse: _error.response?.data,
          employeeId: employeeId,
        });
      }

      // Use enhanced error handling
      const { showBiometricError } = await import('../utils/biometricErrorHandler');
      showBiometricError(
        _error,
        'biometric registration',
        (title, message) => showGlassAlert(title, message),
        (message, duration) => showError(message, duration)
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Use simplified approach - hook for logic, local state for camera
  const [cameraReady, setCameraReady] = useState(false);
  const [_cameraActive, setCameraActive] = useState(true);
  const [hasPermission, setHasPermission] = useState(null);
  const [error, setError] = useState(null);
  const [overlayActive, _setOverlayActive] = useState(true);
  const cameraRef = useRef(null);

  // Use hook only for photo processing and countdown
  const { isCapturing, countdown, startCountdown, getButtonText } = useBiometricCamera(
    handleRegister,
    cameraRef,
    cameraReady
  );

  // Initialize camera permissions
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      console.log(' Cleaning up biometric registration camera...');
      setCameraActive(false);
      setCameraReady(false);
      if (cameraRef.current) {
        cameraRef.current = null;
      }
    };
  }, []);

  // Simple reset camera function
  const resetCamera = useCallback(() => {
    setError(null);
    setCameraReady(false);
    setCameraActive(false);
    setTimeout(() => {
      setCameraActive(true);
    }, 500);
  }, []);

  // Helper function for registration errors
  const handleRegistrationError = errorData => {
    let errorMessage = 'Registration failed. Please try again.';

    if (typeof errorData === 'string') {
      errorMessage = errorData;
    } else if (errorData?.details) {
      // Handle validation errors from backend
      const details = Object.values(errorData.details).flat();
      errorMessage = details.join('\n');
    } else if (errorData?.employee_id) {
      errorMessage = `Employee error: ${errorData.employee_id.join(', ')}`;
    } else if (errorData?.image) {
      errorMessage = `Image error: ${errorData.image.join(', ')}`;
    }

    showError(errorMessage, 4000);
  };

  if (hasPermission === null) {
    return (
      <View style={styles(theme).centered}>
        <ActivityIndicator size="large" color={theme.colors.text.primary} />
        <Text style={styles(theme).statusText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles(theme).centered}>
        <Text style={styles(theme).errorText}>Camera Access Denied</Text>
        <Text style={styles(theme).instructionText}>
          Please enable camera access in your device settings to use biometric registration
        </Text>
        <LiquidGlassButton title="Try Again" onPress={resetCamera} variant="primary" />
      </View>
    );
  }

  if (!theme) {
    return null;
  }

  return (
    <LiquidGlassScreenLayout scrollable={false} noPadding={true} safeArea={false}>
      <View style={styles(theme).container}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles(theme).backButton}
          onPress={() => {
            console.log('🚫 Cancel button pressed in biometric registration');
            const returnPath = getReturnPath();
            console.log(' Cancelling registration, returning to:', returnPath);
            router.replace(returnPath);
          }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          <Text style={styles(theme).backButtonText}>Back</Text>
        </TouchableOpacity>

        <CameraView
          ref={cameraRef}
          style={styles(theme).camera}
          facing="front"
          onCameraReady={() => {
            console.log(' Camera is ready for registration');
            setCameraReady(true);
            setError(null);
          }}
          onMountError={async error => {
            console.error(' Camera mount error:', error);

            // Use enhanced camera error handling
            const { getCameraErrorMessage } = await import('../utils/biometricErrorHandler');
            const errorInfo = getCameraErrorMessage(error);

            setError(errorInfo.message);
            setCameraReady(false);

            // Show user-friendly notification
            showGlassAlert(errorInfo.title, errorInfo.message);
          }}
        />

        {/* Face Capture Overlay - circular mask */}
        <FaceCaptureOverlay
          isActive={hasPermission && cameraReady && !isProcessing && overlayActive}
          isCapturing={isCapturing}
          onAnimationComplete={() => {
            // Overlay animation completed
          }}
        />

        {/* Left Side Panel - Instructions */}
        {!error && (
          <View style={styles(theme).leftSidePanel}>
            <View style={styles(theme).sideCard}>
              <Text style={styles(theme).sideTipsTitle}>📝</Text>
              <Text style={styles(theme).sideTipsText}>
                Look directly{'\n'}
                Remove glasses{'\n'}
                Good lighting{'\n'}
                Stay in circle
              </Text>
            </View>
          </View>
        )}

        {/* Right Side Panel - Employee Info */}
        <View style={styles(theme).rightSidePanel}>
          <View style={styles(theme).sideCard}>
            <Text style={styles(theme).sideModeText}>📋</Text>
            <Text style={styles(theme).sideUserText}>
              {employeeName ? employeeName.split(' ')[0] : 'Employee'}
            </Text>
            <Text style={styles(theme).sideStatusText}>🔧</Text>
          </View>
        </View>

        {/* Error display - Bottom Area */}
        {error && (
          <View style={styles(theme).errorContainer}>
            <View style={styles(theme).errorCard}>
              <Text style={styles(theme).errorText}>{error}</Text>
            </View>
          </View>
        )}

        {/* Camera Button & Controls */}
        <View style={styles(theme).bottomControls}>
          {/* Main Camera Button */}
          <TouchableOpacity
            style={[
              styles(theme).cameraButtonContainer,
              (isProcessing || !!countdown || isCapturing) && styles(theme).disabledButton,
            ]}
            onPress={startCountdown}
            disabled={isProcessing || !!countdown || isCapturing}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#3b82f6', '#1d4ed8']}
              style={styles(theme).cameraButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isProcessing || isCapturing ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : countdown ? (
                <Text style={styles(theme).countdownText}>{countdown}</Text>
              ) : (
                <Ionicons name="camera" size={32} color="#FFFFFF" />
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Status Text */}
          <Text style={styles(theme).buttonStatusText}>
            {isProcessing
              ? 'Processing...'
              : getButtonText(countdown, 'Take Photo for Registration')}
          </Text>

          {/* Cancel Button */}
          <LiquidGlassButton
            title="Cancel"
            onPress={() => {
              console.log('Cancel button pressed in biometric registration');
              const returnPath = getReturnPath();
              console.log(' Navigation params:', {
                selfService,
                returnTo,
                employeeId,
                employeeName,
                returnPath,
              });

              console.log(' Cancelling registration, returning to:', returnPath);
              router.replace(returnPath);
            }}
            variant="ghost"
            style={styles(theme).cancelButton}
            disabled={isProcessing || !!countdown}
          />
        </View>
      </View>
    </LiquidGlassScreenLayout>
  );
}

const styles = theme =>
  StyleSheet.create({
    container: {
      backgroundColor: 'transparent',
      flex: 1,
    },
    camera: {
      flex: 1,
      zIndex: 1,
    },
    centered: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },

    // Back Button
    backButton: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderRadius: 20,
      flexDirection: 'row',
      left: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      position: 'absolute',
      top: Platform.OS === 'ios' ? 60 : 40,
      zIndex: 10,
    },
    backButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 4,
    },

    // Left Side Panel
    leftSidePanel: {
      left: 8,
      position: 'absolute',
      top: '35%',
      width: 60,
      zIndex: 5,
    },

    // Right Side Panel
    rightSidePanel: {
      position: 'absolute',
      right: 8,
      top: '35%',
      width: 60,
      zIndex: 5,
    },

    // Side Cards - White Glass Style like first screenshot
    sideCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)', // White semi-transparent
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: 'center',
      minHeight: 80,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)', // White border
      // Add backdrop blur effect
      backdropFilter: 'blur(10px)',
    },

    // Side Panel Text Styles - Updated for white glass
    sideTipsTitle: {
      fontSize: 16,
      marginBottom: 4,
    },
    sideTipsText: {
      fontSize: 10,
      color: 'rgba(255, 255, 255, 0.9)', // Improved contrast
      textAlign: 'center',
      lineHeight: 12,
      fontWeight: '600', // Bolder for better readability
      textShadowColor: 'rgba(0, 0, 0, 0.3)', // Shadow for contrast
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    sideModeText: {
      fontSize: 18,
      marginBottom: 4,
    },
    sideUserText: {
      fontSize: 10,
      color: 'rgba(255, 255, 255, 0.9)', // Improved contrast
      textAlign: 'center',
      fontWeight: '700', // Very bold for readability
      marginBottom: 4,
      textShadowColor: 'rgba(0, 0, 0, 0.3)', // Shadow for contrast
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    sideStatusText: {
      fontSize: 14,
    },

    // Error Container - Now at bottom
    errorContainer: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 200 : 180, // Accordingly raised errors
      left: 20,
      right: 20,
      zIndex: 15,
    },
    errorCard: {
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.9)',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    errorTextSmall: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },

    // Bottom Controls
    bottomControls: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 80 : 60, // Lowered from 120/100 to 80/60
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingHorizontal: 20,
      zIndex: 10,
    },

    // Camera Button
    cameraButtonContainer: {
      marginBottom: 16,
    },
    cameraButton: {
      alignItems: 'center',
      borderRadius: 40,
      elevation: 8,
      height: 80,
      justifyContent: 'center',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      width: 80,
    },
    disabledButton: {
      opacity: 0.6,
    },
    countdownText: {
      color: '#FFFFFF',
      fontSize: 28,
      fontWeight: 'bold',
    },

    // Button Status
    buttonStatusText: {
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderRadius: 12,
      color: theme.colors.text.primary,
      fontSize: 14,
      marginBottom: 16,
      paddingHorizontal: 16,
      paddingVertical: 8,
      textAlign: 'center',
    },

    // Cancel Button
    cancelButton: {
      minWidth: 120,
    },

    // Common styles
    instructionText: {
      color: theme.colors.text.secondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    errorText: {
      color: theme.colors.status.error[0],
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
    },
  });
