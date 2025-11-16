// Force reload Wed Aug 27 22:45:18 IDT 2025
console.log('BiometricCheckScreen file loading...');

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useLocation from '../hooks/useLocation';
import { useOffice } from '../src/contexts/OfficeContext';
import { useUser, ROLES } from '../src/contexts/UserContext';
import ApiService from '../src/api/apiService';
import { useWorkStatus } from '../src/contexts/WorkStatusContext';
import { useToast } from '../contexts/ToastContext';
import FaceCaptureOverlay from '../components/FaceCaptureOverlay';
import { maskName, maskEmail } from '../src/utils/safeLogging';
import { showGlassAlert } from '../hooks/useGlobalGlassModal';
import LiquidGlassScreenLayout from '../components/LiquidGlassScreenLayout';
import LiquidGlassButton from '../components/LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import useBiometricCamera from '../hooks/useBiometricCamera';
import OfflineQueueService from '../src/services/OfflineQueueService';

export default function BiometricCheckScreen() {
  // Get `mode` safely: string | undefined | string[]  →  string | undefined
  const params = useLocalSearchParams();
  const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  // Fallback to 'check-in' if absent
  const mode = modeParam ?? 'check-in';
  const isCheckIn = mode === 'check-in';

  // All hooks must be at the top, before any early returns
  const abortControllerRef = useRef(null);
  const cameraRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [successState, setSuccessState] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(true); // Start with camera active
  const [hasPermission, setHasPermission] = useState(null);
  const [error, setError] = useState(null);
  const [_overlayActive, _setOverlayActive] = useState(true);

  const theme = useLiquidGlassTheme();
  const { user } = useUser();
  const { handleCheckInSuccess, handleCheckOutSuccess } = useWorkStatus();
  const { location, errorMsg: locationError } = useLocation({
    watchPosition: false,
    highAccuracy: true,
  });
  const { isInsideOffice, officeSettings } = useOffice();
  const { _showSuccess, showError } = useToast();

  // Define callback for biometric camera hook before using it
  const handleBiometricCheck = useCallback(
    async photo => {
      setLoading(true);
      console.log(`Starting ${isCheckIn ? 'check-in' : 'check-out'} photo capture...`);

      // Declare variables outside try-catch so they're accessible in catch block
      let imageData;
      let locationString;

      try {
        // Create new AbortController for this request
        abortControllerRef.current = new AbortController();

        imageData = `data:image/jpeg;base64,${photo.base64}`;
        const getLocationString = () => {
          if (location && location.coords) {
            return `${location.coords.latitude}, ${location.coords.longitude}`;
          }
          return 'Location not available';
        };
        locationString = getLocationString();

        // Call the appropriate API endpoint
        console.log(
          `Current authenticated user: ${maskEmail(user?.email)} (ID: ${user?.id}, Name: ${maskName(`${user?.first_name || ''} ${user?.last_name || ''}`.trim())})`
        );

        // Debug authentication state
        await ApiService.auth.debugAuthState();

        const result = await (isCheckIn
          ? ApiService.biometrics.checkIn(imageData, locationString)
          : ApiService.biometrics.checkOut(imageData, locationString));

        console.log(
          `${isCheckIn ? 'Check-in' : 'Check-out'} successful for ${result?.employee_name ? maskName(result.employee_name) : 'employee'}`
        );

        // Call the appropriate success handler from WorkStatusContext
        if (isCheckIn) {
          await handleCheckInSuccess(result);
        } else {
          await handleCheckOutSuccess(result);
        }

        // Show success alert
        showGlassAlert({
          title: 'Success!',
          message: isCheckIn
            ? `Welcome, ${result.employee_name}! You are now checked in.`
            : `Goodbye, ${result.employee_name}! Hours worked: ${result.hours_worked || 0}h`,
          onConfirm: () => {
            router.replace('/check-in-out');
          },
        });

        setSuccessState(true);
      } catch (_error) {
        // Log error details for debugging (only in development)
        if (__DEV__) {
          console.error(`Biometric ${isCheckIn ? 'check-in' : 'check-out'} failed:`, {
            errorMessage: _error.message,
            errorResponse: _error.response?.data,
            wasAborted: _error.name === 'CanceledError',
          });
        }

        // Don't show error UI for cancelled requests
        if (_error.name === 'CanceledError' || _error.message === 'canceled') {
          return;
        }

        // Check if this is a network error - queue it for later
        const isNetworkError =
          _error.message === 'Network Error' ||
          _error.message?.includes('timeout') ||
          _error.code === 'ECONNABORTED' ||
          _error.code === 'ERR_NETWORK' ||
          !_error.response; // No response = network issue

        if (isNetworkError) {
          try {
            // Store operation in offline queue
            const queueId = await OfflineQueueService.enqueue({
              type: isCheckIn ? 'check-in' : 'check-out',
              payload: {
                image: imageData,
                location: locationString,
              }
            });

            console.log(`✅ Operation queued for offline processing: ${queueId}`);

            // Navigate back - user already got alert from OfflineQueueService
            setTimeout(() => {
              router.replace('/check-in-out');
            }, 2000);

            return;
          } catch (queueError) {
            console.error('❌ Failed to queue operation:', queueError);
            showError('Failed to save operation for later. Please try again.');
            return;
          }
        }

        // Use enhanced error handling with user-friendly messages
        const { getBiometricErrorMessage } = await import('../utils/biometricErrorHandler');
        const errorInfo = getBiometricErrorMessage(_error, isCheckIn ? 'check-in' : 'check-out');

        if (errorInfo) {
          // Check if this is a face recognition issue that could be solved by registration
          const needsRegistration =
            errorInfo.title.includes('Not Recognized') ||
            errorInfo.title.includes('No Biometric Data');

          if (needsRegistration) {
            // Show enhanced modal with registration option
            showGlassAlert(errorInfo.title, errorInfo.message, [
              {
                text: 'Register Face',
                onPress: () => {
                  router.push({
                    pathname: '/biometric-registration',
                    params: {
                      employeeId: user?.id || '1', // Current user ID
                      employeeName:
                        `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
                        'Current User',
                      returnTo: '/check-in-out',
                    },
                  });
                },
              },
              {
                text: 'Try Again',
                onPress: () => {
                  // User can try again with the camera
                },
              },
            ]);
          } else {
            // Show regular error message
            showGlassAlert(errorInfo.title, errorInfo.message);
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [isCheckIn, location, user, handleCheckInSuccess, handleCheckOutSuccess]
  );

  // Use hook only for photo processing and countdown
  const {
    isCapturing,
    countdown,
    startCountdown: startCameraCountdown,
    getButtonText: _getCameraButtonText,
  } = useBiometricCamera(handleBiometricCheck, cameraRef, cameraReady);

  // Initialize camera permissions
  useEffect(() => {
    (async () => {
      try {
        console.log('Platform check:', Platform.OS);
        console.log('Requesting camera permissions...');
        const { status } = await Camera.requestCameraPermissionsAsync();
        console.log('Permission status:', status);
        setHasPermission(status === 'granted');

        if (status === 'granted') {
          console.log('Camera permissions granted, camera is active');
          // Camera is already active by default
        }
      } catch (_error) {
        console.error('Camera permission error:', _error);
        setError(`Camera permission error: ${_error.message}`);
      }
    })();
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

  // Reset state when screen comes into focus (fixes camera initialization after check-in)
  useFocusEffect(
    useCallback(() => {
      console.log('BiometricCheckScreen focused, initializing camera...');
      // Reset all states on focus to ensure fresh start
      setLoading(false);
      setSuccessState(false);
      setCameraReady(false);
      setError(null);

      // Camera is already active by default
      setCameraActive(true);

      // Cleanup function when screen loses focus
      return () => {
        console.log('👋 BiometricCheckScreen unfocused, cleaning up...');
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        setLoading(false);
        setCameraActive(false);
        setCameraReady(false);
      };
    }, []) // No dependencies needed - only state setters used
  );

  // If theme undefined, return simple component
  if (!theme) {
    console.log('Theme is undefined, returning fallback');
    return (
      <View
        style={{ flex: 1, backgroundColor: 'red', justifyContent: 'center', alignItems: 'center' }}
      >
        <Text style={{ color: 'white' }}>THEME LOADING...</Text>
      </View>
    );
  }

  const inside = location && location.coords ? isInsideOffice(location.coords) : false;

  const _getRoleDisplayName = _role => {
    switch (_role) {
      case ROLES.ADMIN:
        return '👑 Administrator';
      case ROLES.ACCOUNTANT:
        return 'Accountant';
      case ROLES.EMPLOYEE:
        return 'Employee';
      case ROLES.STAFF:
        return '👥 Staff';
      default:
        return _role ? `${_role}` : '';
    }
  };

  const _getLocationString = () => {
    try {
      if (!location || !location.coords) {
        console.warn('Location data not available');
        return 'Location unavailable';
      }

      const coords = location.coords;
      const status = inside ? 'Office' : 'Remote';

      // Ensure coordinates are numbers before calling toFixed
      const lat =
        typeof coords.latitude === 'number' ? coords.latitude : parseFloat(coords.latitude);
      const lon =
        typeof coords.longitude === 'number' ? coords.longitude : parseFloat(coords.longitude);

      if (isNaN(lat) || isNaN(lon)) {
        console.error('Invalid coordinates:', { lat: coords.latitude, lon: coords.longitude });
        return 'Location unavailable';
      }

      const locationString = `${status} (${lat.toFixed(6)}, ${lon.toFixed(6)})`;
      return locationString;
    } catch (_error) {
      console.error('Error generating location string:', _error);
      return 'Location unavailable';
    }
  };

  const _getStatusText = () => {
    if (!location || !location.coords) {
      return 'Getting location...';
    }

    if (locationError) {
      return 'Location unavailable - will record as remote';
    }

    if (!officeSettings || !officeSettings.location || !officeSettings.location.latitude) {
      return 'Office location not configured';
    }

    return inside ? 'You are at the office' : 'You are working remotely';
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
          Please enable camera access in your device settings to use biometric check-in/out
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
          onPress={() => router.replace('/check-in-out')}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          <Text style={styles(theme).backButtonText}>Back</Text>
        </TouchableOpacity>

        {cameraActive && hasPermission ? (
          <CameraView
            ref={cameraRef}
            style={styles(theme).camera}
            facing="front"
            onCameraReady={() => {
              console.log('Camera is ready');
              setCameraReady(true);
              setError(null);
            }}
            onMountError={error => {
              console.error('Camera mount error:', error);
              const errorMessage =
                Platform.OS === 'ios'
                  ? 'Camera failed to initialize. Please try again or restart the app.'
                  : `Camera failed to initialize: ${error.message}`;
              setError(errorMessage);
              setCameraReady(false);

              // Try to reset camera after error
              setTimeout(() => {
                resetCamera();
              }, 2000);
            }}
          />
        ) : (
          // Show initialization screen when camera is inactive
          <View style={[styles(theme).camera, styles(theme).cameraInitializing]}>
            <View style={styles(theme).initializingContainer}>
              <ActivityIndicator size="large" color={theme.colors.text.primary} />
              <Text style={styles(theme).initializingText}>
                {!hasPermission ? 'Requesting camera permission...' : 'Initializing camera...'}
              </Text>
            </View>
          </View>
        )}

        {/* Face Capture Overlay - circular mask */}
        <FaceCaptureOverlay
          isActive={cameraActive && hasPermission && !successState && _overlayActive}
          isCapturing={isCapturing}
          onAnimationComplete={() => {
            // Overlay animation completed
          }}
        />

        {/* Left Side Panel - Tips */}
        {!successState && !error && (
          <View style={styles(theme).leftSidePanel}>
            <View style={styles(theme).sideCard}>
              <Text style={styles(theme).sideTipsTitle}>💡</Text>
              <Text style={styles(theme).sideTipsText}>
                Look directly{'\n'}
                Remove glasses{'\n'}
                Good lighting
              </Text>
            </View>
          </View>
        )}

        {/* Right Side Panel - User Info */}
        {!successState && (
          <View style={styles(theme).rightSidePanel}>
            <View style={styles(theme).sideCard}>
              <Text style={styles(theme).sideModeText}>{isCheckIn ? 'Check In' : 'Check Out'}</Text>
              <Text style={styles(theme).sideUserText}>{user?.first_name || 'User'}</Text>
              <Text style={styles(theme).sideStatusText}>
                {inside ? 'Inside Office' : 'Outside Office'}
              </Text>
            </View>
          </View>
        )}

        {/* Error display - Bottom Area */}
        {error && !successState && (
          <View style={styles(theme).errorContainer}>
            <View style={styles(theme).errorCard}>
              <Text style={styles(theme).errorText}>{error}</Text>
            </View>
          </View>
        )}

        {/* Camera Button & Controls */}
        {!successState && (
          <View style={styles(theme).bottomControls}>
            {/* Main Camera Button */}
            <TouchableOpacity
              style={[
                styles(theme).cameraButtonContainer,
                (loading || !!countdown || isCapturing || !cameraReady || !cameraActive) &&
                  styles(theme).disabledButton,
              ]}
              onPress={() => {
                console.log('Camera button pressed:', {
                  loading,
                  countdown,
                  isCapturing,
                  cameraReady,
                  cameraActive,
                  hasPermission,
                  cameraRef: !!cameraRef.current,
                });
                if (!cameraReady) {
                  console.warn('Camera not ready yet!');
                  showError('Camera is still initializing, please wait...');
                  return;
                }
                startCameraCountdown();
              }}
              disabled={loading || !!countdown || isCapturing || !cameraReady || !cameraActive}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isCheckIn ? ['#22c55e', '#16a34a'] : ['#ef4444', '#dc2626']}
                style={styles(theme).cameraButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loading || isCapturing ? (
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
              {!cameraActive
                ? 'Camera stopped'
                : loading
                  ? 'Processing face recognition...'
                  : countdown
                    ? `Taking photo in ${countdown}...`
                    : `${isCheckIn ? 'Check In' : 'Check Out'} ${inside ? '(Office)' : '(Remote)'}`}
            </Text>

            {/* Cancel Button */}
            <LiquidGlassButton
              title="Cancel"
              onPress={() => {
                // Cancel any ongoing capture
                if (abortControllerRef.current) {
                  abortControllerRef.current.abort();
                }
                setLoading(false);
                router.replace('/check-in-out');
              }}
              variant="ghost"
              style={styles(theme).cancelButton}
            />
          </View>
        )}
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
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.95)',
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 4,
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
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
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.8)',
      fontWeight: '500',
      textAlign: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
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
    errorText: {
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

    // Camera initialization styles
    cameraInitializing: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
    },
    initializingContainer: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderRadius: 20,
      justifyContent: 'center',
      marginHorizontal: 20,
      padding: 40,
    },
    initializingText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 22,
      marginTop: 15,
      textAlign: 'center',
    },
    statusText: {
      color: theme.colors.text.secondary,
      fontSize: 14,
      marginTop: 10,
      textAlign: 'center',
    },
    instructionText: {
      color: theme.colors.text.secondary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 20,
      textAlign: 'center',
    },
  });
