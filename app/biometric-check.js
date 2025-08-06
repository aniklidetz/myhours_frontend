console.log('🔧 BiometricCheckScreen file loading...');

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
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
import { API_URL } from '../src/config';
import { useWorkStatus } from '../src/contexts/WorkStatusContext';
import { useToast } from '../contexts/ToastContext';
import FaceCaptureOverlay from '../components/FaceCaptureOverlay';
import { maskName, maskEmail } from '../src/utils/safeLogging';
import { showGlassAlert } from '../hooks/useGlobalGlassModal';
import LiquidGlassScreenLayout from '../components/LiquidGlassScreenLayout';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import HeaderBackButton from '../src/components/HeaderBackButton';
import useBiometricCamera from '../hooks/useBiometricCamera';


export default function BiometricCheckScreen() {
  // Get `mode` safely: string | undefined | string[]  →  string | undefined
  const params = useLocalSearchParams();
  const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  // Fallback to 'check-in' if absent
  const mode = modeParam ?? 'check-in';
  const isCheckIn = mode === 'check-in';

  const abortControllerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [successState, setSuccessState] = useState(false);

  const theme = useLiquidGlassTheme();
  // Theme loaded successfully

  // Если theme undefined, возвращаем простой компонент
  if (!theme) {
    console.log('❌ Theme is undefined, returning fallback');
    return (
      <View style={{ flex: 1, backgroundColor: 'red', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white' }}>THEME LOADING...</Text>
      </View>
    );
  }
  const { user } = useUser();
  const { handleCheckInSuccess, handleCheckOutSuccess } = useWorkStatus();
  const { location, errorMsg: locationError } = useLocation({
    watchPosition: false,
    highAccuracy: true
  });
  const { isInsideOffice, officeSettings } = useOffice();
  const { showSuccess, showError } = useToast();

  const inside = location && location.coords ? isInsideOffice(location.coords) : false;

  // Callback for biometric camera hook
  const handleBiometricCheck = async (photo) => {
    setLoading(true);
    console.log(`📸 Starting ${isCheckIn ? 'check-in' : 'check-out'} photo capture...`);

    try {
      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      const imageData = `data:image/jpeg;base64,${photo.base64}`;
      const locationString = getLocationString();

      // Call the appropriate API endpoint
      console.log(`👤 Current authenticated user: ${maskEmail(user?.email)} (ID: ${user?.id}, Name: ${maskName(`${user?.first_name || ''} ${user?.last_name || ''}`.trim())})`);

      // Debug authentication state
      await ApiService.auth.debugAuthState();

      const result = await (isCheckIn
        ? ApiService.biometrics.checkIn(imageData, locationString)
        : ApiService.biometrics.checkOut(imageData, locationString));

      console.log(`✅ ${isCheckIn ? 'Check-in' : 'Check-out'} successful for ${result?.employee_name ? maskName(result.employee_name) : 'employee'}`);

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
        }
      });

      setSuccessState(true);
    } catch (error) {
      // Log error details for debugging (only in development)
      if (__DEV__) {
        console.error(`❌ Biometric ${isCheckIn ? 'check-in' : 'check-out'} failed:`, {
          errorMessage: error.message,
          errorResponse: error.response?.data,
          wasAborted: error.name === 'CanceledError'
        });
      }

      // Don't show error UI for cancelled requests
      if (error.name === 'CanceledError' || error.message === 'canceled') {
        return;
      }

      // Use enhanced error handling with user-friendly messages
      const { getBiometricErrorMessage } = await import('../utils/biometricErrorHandler');
      const errorInfo = getBiometricErrorMessage(error, isCheckIn ? 'check-in' : 'check-out');

      if (errorInfo) {
        // Check if this is a face recognition issue that could be solved by registration
        const needsRegistration = errorInfo.title.includes('Not Recognized') ||
          errorInfo.title.includes('No Biometric Data');

        if (needsRegistration) {
          // Show enhanced modal with registration option
          showGlassAlert(
            errorInfo.title,
            errorInfo.message,
            [
              {
                text: 'Register Face',
                onPress: () => {
                  router.push({
                    pathname: '/biometric-registration',
                    params: {
                      employeeId: user?.id || '1',  // Current user ID
                      employeeName: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Current User',
                      returnTo: '/check-in-out'
                    }
                  });
                }
              },
              {
                text: 'Try Again',
                onPress: () => {
                  // User can try again with the camera
                }
              }
            ]
          );
        } else {
          // Show regular error message
          showGlassAlert(errorInfo.title, errorInfo.message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Use simplified approach - hook for logic, local state for camera
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(true); // Start with camera active
  const [hasPermission, setHasPermission] = useState(null);
  const [error, setError] = useState(null);
  const [overlayActive, setOverlayActive] = useState(true);
  const cameraRef = useRef(null);

  // Use hook only for photo processing and countdown
  const {
    isCapturing,
    countdown,
    startCountdown: startCameraCountdown,
    getButtonText: getCameraButtonText
  } = useBiometricCamera(handleBiometricCheck, cameraRef, cameraReady);

  // Initialize camera permissions
  useEffect(() => {
    (async () => {
      try {
        console.log('🔧 Platform check:', Platform.OS);
        console.log('📷 Requesting camera permissions...');
        const { status } = await Camera.requestCameraPermissionsAsync();
        console.log('📷 Permission status:', status);
        setHasPermission(status === 'granted');
        
        if (status === 'granted') {
          console.log('📷 Camera permissions granted, camera is active');
          // Camera is already active by default
        }
      } catch (error) {
        console.error('❌ Camera permission error:', error);
        setError(`Camera permission error: ${error.message}`);
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

  const getRoleDisplayName = (role) => {
    switch (role) {
      case ROLES.ADMIN: return '👑 Administrator';
      case ROLES.ACCOUNTANT: return '💼 Accountant';
      case ROLES.EMPLOYEE: return '👤 Employee';
      case ROLES.STAFF: return '👥 Staff';
      default: return role ? `🔍 ${role}` : '';
    }
  };

  // Reset state when screen comes into focus (fixes camera initialization after check-in)
  useFocusEffect(
    useCallback(() => {
      console.log('🎯 BiometricCheckScreen focused, initializing camera...');
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
    }, [mode]) // Re-run when mode changes (check-in vs check-out)
  );

  const getLocationString = () => {
    try {
      if (!location || !location.coords) {
        console.warn('⚠️ Location data not available');
        return 'Location unavailable';
      }

      const coords = location.coords;
      const status = inside ? 'Office' : 'Remote';

      // Ensure coordinates are numbers before calling toFixed
      const lat = typeof coords.latitude === 'number' ? coords.latitude : parseFloat(coords.latitude);
      const lon = typeof coords.longitude === 'number' ? coords.longitude : parseFloat(coords.longitude);

      if (isNaN(lat) || isNaN(lon)) {
        console.error('❌ Invalid coordinates:', { lat: coords.latitude, lon: coords.longitude });
        return 'Location unavailable';
      }

      const locationString = `${status} (${lat.toFixed(6)}, ${lon.toFixed(6)})`;
      return locationString;
    } catch (error) {
      console.error('❌ Error generating location string:', error);
      return 'Location unavailable';
    }
  };

  const getStatusText = () => {
    if (!location || !location.coords) {
      return '📍 Getting location...';
    }

    if (locationError) {
      return '⚠️ Location unavailable - will record as remote';
    }

    if (!officeSettings || !officeSettings.location || !officeSettings.location.latitude) {
      return '⚙️ Office location not configured';
    }

    return inside
      ? '🏢 You are at the office'
      : '🏠 You are working remotely';
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
        <LiquidGlassButton
          title="Try Again"
          onPress={resetCamera}
          variant="primary"
        />
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
              console.log('✅ Camera is ready');
              setCameraReady(true);
              setError(null);
            }}
            onMountError={(error) => {
              console.error('❌ Camera mount error:', error);
              const errorMessage = Platform.OS === 'ios' 
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

        {/* Face Capture Overlay - круглая маска */}
        <FaceCaptureOverlay
          isActive={cameraActive && hasPermission && !successState && overlayActive}
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
              <Text style={styles(theme).sideModeText}>
                {isCheckIn ? '🔐' : '🔓'}
              </Text>
              <Text style={styles(theme).sideUserText}>
                {user?.first_name || 'User'}
              </Text>
              <Text style={styles(theme).sideStatusText}>
                {inside ? '🏢' : '🏠'}
              </Text>
            </View>
          </View>
        )}

        {/* Error display - Bottom Area */}
        {error && !successState && (
          <View style={styles(theme).errorContainer}>
            <View style={styles(theme).errorCard}>
              <Text style={styles(theme).errorText}>⚠️ {error}</Text>
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
                (loading || !!countdown || isCapturing || !cameraReady || !cameraActive) && styles(theme).disabledButton
              ]}
              onPress={() => {
                console.log('📸 Camera button pressed:', {
                  loading,
                  countdown,
                  isCapturing,
                  cameraReady,
                  cameraActive,
                  hasPermission,
                  cameraRef: !!cameraRef.current
                });
                if (!cameraReady) {
                  console.warn('⚠️ Camera not ready yet!');
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
                  <Ionicons
                    name="camera"
                    size={32}
                    color="#FFFFFF"
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Status Text */}
            <Text style={styles(theme).buttonStatusText}>
              {!cameraActive ? 'Camera stopped' :
                loading ? 'Processing face recognition...' :
                  countdown ? `Taking photo in ${countdown}...` :
                    `${isCheckIn ? 'Check In' : 'Check Out'} ${inside ? '(Office)' : '(Remote)'}`}
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

const styles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  camera: {
    flex: 1,
    zIndex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // Back Button
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
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
    position: 'absolute',
    left: 8,
    top: '35%',
    zIndex: 5,
    width: 60,
  },

  // Right Side Panel
  rightSidePanel: {
    position: 'absolute',
    right: 8,
    top: '35%',
    zIndex: 5,
    width: 60,
  },

  // Side Cards - White Glass Style like first screenshot
  sideCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Белый полупрозрачный
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)', // Белая обводка
    // Добавляем backdrop blur эффект
    backdropFilter: 'blur(10px)',
  },

  // Side Panel Text Styles - Updated for white glass
  sideTipsTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  sideTipsText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)', // Улучшенная контрастность
    textAlign: 'center',
    lineHeight: 12,
    fontWeight: '600', // Жирнее для лучшей читаемости
    textShadowColor: 'rgba(0, 0, 0, 0.3)', // Тень для контраста
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sideModeText: {
    fontSize: 18,
    marginBottom: 4,
  },
  sideUserText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)', // Улучшенная контрастность
    textAlign: 'center',
    fontWeight: '700', // Очень жирный для читаемости
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)', // Тень для контраста
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sideStatusText: {
    fontSize: 14,
  },

  // Error Container - Now at bottom
  errorContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 200 : 180, // Соответственно поднял ошибки
    left: 20,
    right: 20,
    zIndex: 15,
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Bottom Controls
  bottomControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 60, // Опустил с 120/100 до 80/60
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
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  countdownText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Button Status
  buttonStatusText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
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
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 10,
  },
  instructionText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
});