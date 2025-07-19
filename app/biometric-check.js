import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  UIAccessibility,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import useLocation from '../hooks/useLocation';
import { useOffice } from '../src/contexts/OfficeContext';
import { useUser, ROLES } from '../src/contexts/UserContext';
import ApiService from '../src/api/apiService';
import { API_URL } from '../src/config';
import { useWorkStatus } from '../src/contexts/WorkStatusContext';
import { useToast } from '../components/Toast';
import FaceCaptureOverlay from '../components/FaceCaptureOverlay';
import { maskName } from '../src/utils/safeLogging';
import { showGlassAlert } from '../hooks/useGlobalGlassModal';
import LiquidGlassLayout from '../components/LiquidGlassLayout';
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
  // Retry count is now handled by the hook
  const [successState, setSuccessState] = useState(false); // Track success state for UI cleanup
  const [_buttonsVisible, setButtonsVisible] = useState(false); // Анимация кнопок

  const theme = useLiquidGlassTheme();
  const { user } = useUser();
  const { handleCheckInSuccess, handleCheckOutSuccess } = useWorkStatus();
  const { location, errorMsg: locationError } = useLocation({ 
    watchPosition: false,
    highAccuracy: true 
  });
  const { isInsideOffice, officeSettings } = useOffice();
  const { showSuccess, showError, ToastComponent } = useToast();
  
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
      console.log(`👤 Current authenticated user: ${user?.email} (ID: ${user?.id}, Name: ${user?.first_name} ${user?.last_name})`);
      
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
          router.replace('/employees');
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
                      employeeId: userData?.id || '29',  // Current user ID
                      employeeName: userData?.name || 'Current User',
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
  const [cameraActive, setCameraActive] = useState(true);
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
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
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
      // console.log('🎥 BiometricCheckScreen focused, initializing camera...');
      // console.log('📱 Screen focus - resetting all states for fresh start');
      
      // Reset all states on focus to ensure fresh start
      setLoading(false);
      setSuccessState(false);
      setButtonsVisible(false); // Сбрасываем видимость кнопок
      // Retry count is now handled by the hook
      
      // Camera states are now managed by the hook
      
      // Cleanup function when screen loses focus
      return () => {
        // console.log('📱 BiometricCheckScreen unfocused, cleaning up...');
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        setLoading(false);
        // Camera cleanup is now handled by the hook
        // console.log('🧹 BiometricCheckScreen cleanup completed');
      };
    }, [mode]) // Re-run when mode changes (check-in vs check-out)
  );



  const takePhoto = async () => {
    // Clear previous errors
    setError(null);
    
    // Validate camera ref
    if (!cameraRef.current) {
      console.error('❌ Camera not initialized');
      setError('Camera not initialized. Please restart the app.');
      showGlassAlert({
        title: 'Camera Error', 
        message: 'Camera is not ready. Please go back and try again.',
        onConfirm: () => router.replace('/employees')
      });
      return;
    }
    
    if (loading) {
      // console.warn('⚠️ Photo capture already in progress');
      return;
    }
    
    if (!cameraReady) {
      // console.warn('⚠️ Camera not ready yet');
      setError('Camera is still initializing. Please wait.');
      return;
    }

    // Add user-specific debugging for Mishka's account
    if (user?.email === 'mikhail.plotnik@gmail.com') {
      console.log('🔍 Debug info for Mishka:', {
        userId: user?.id,
        userEmail: user?.email,
        userName: `${user?.first_name} ${user?.last_name}`,
        userRole: user?.role,
        isCheckOut: !isCheckIn,
        hasCamera: !!cameraRef.current,
        cameraReady,
        location: location ? 'available' : 'missing'
      });
    }
    
    setLoading(true);
    console.log(`📸 Starting ${isCheckIn ? 'check-in' : 'check-out'} photo capture...`);

    // Add a global timeout to prevent hanging
    let globalTimeout;
    
    try {
      globalTimeout = setTimeout(() => {
        console.error('⏰ Photo capture timeout');
        setLoading(false);
        setError('Operation timed out. Please try again.');
      }, 45000); // 45 second timeout

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();
      // Увеличиваем задержку для стабильности (особенно важно для check-out)
      const stabilityDelay = isCheckIn ? 1000 : 1500;
      await new Promise(resolve => setTimeout(resolve, stabilityDelay));
      
      // Добавляем таймаут для захвата фото
      const photoTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Photo capture timeout')), 15000);
      });
      
      const photoPromise = cameraRef.current.takePictureAsync({ 
        quality: 0.3,  // Уменьшаем качество для более быстрой обработки
        base64: true,
        exif: false,
        skipProcessing: true
      });
      
      const photo = await Promise.race([photoPromise, photoTimeoutPromise]);

      console.log('📸 Photo captured successfully');

      if (!photo || !photo.base64) {
        throw new Error('Photo capture returned invalid data - base64 is missing');
      }

      const imageData = `data:image/jpeg;base64,${photo.base64}`;
      const locationString = getLocationString();
      
      // console.log('📤 Preparing biometric data');

      // Call the appropriate API endpoint (now with extended 45s timeout)
      // console.log(`🔄 Starting ${isCheckIn ? 'check-in' : 'check-out'} with face recognition`);
      
      const result = await (isCheckIn 
        ? ApiService.biometrics.checkIn(imageData, locationString)
        : ApiService.biometrics.checkOut(imageData, locationString));

      console.log(`✅ ${isCheckIn ? 'Check-in' : 'Check-out'} successful for ${result?.employee_name ? maskName(result.employee_name) : 'employee'}`);

      // Call the appropriate success handler from WorkStatusContext
      if (isCheckIn) {
        // console.log('🔄 Calling handleCheckInSuccess with result:', result);
        await handleCheckInSuccess(result);
      } else {
        // console.log('🔄 Calling handleCheckOutSuccess with result:', result);
        await handleCheckOutSuccess(result);
      }
      
      // Скрываем оверлей с fade-out анимацией после успешного распознавания
      setOverlayActive(false);
      
      // Show success alert
      showGlassAlert({
        title: 'Success!',
        message: isCheckIn 
          ? `Welcome, ${result.employee_name}! You are now checked in.`
          : `Goodbye, ${result.employee_name}! Hours worked: ${result.hours_worked || 0}h`,
        onConfirm: () => {
          router.replace('/employees');
        }
      });
      
      setSuccessState(true);
    } catch (error) {
      console.error('❌ Biometric check error:', error.message);
      
      // Log API response details if available
      if (error.response) {
        console.error(`API Error: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
      }
      
      // Don't show error for aborted requests
      if (error.name === 'CanceledError' || error.message === 'canceled') {
        // console.log('🔄 Request was cancelled by user');
        return;
      }
      
      // Extract and format error message from various sources
      let errorMessage = 'Failed to process biometric check. ';
      
      // Timeout errors
      if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        errorMessage = 'Face recognition is taking longer than expected. This may be due to server processing time.';
        setError(errorMessage);
        showGlassAlert({
          title: 'Processing Timeout',
          message: 'Face recognition took longer than expected. This can happen when:\n\n• The server is processing multiple requests\n• Network connection is slow\n• The face recognition service is busy\n\nPlease try again in a few moments.',
          buttons: [
            { 
              label: 'Try Again', 
              type: 'primary',
              onPress: () => {
                setError(null);
                setLoading(false);
                setCameraReady(false);
              }
            },
            { 
              label: 'Go Back', 
              type: 'secondary',
              onPress: () => router.replace('/employees') 
            }
          ]
        });
        setLoading(false);
        return;
      }
      // Camera-specific errors
      else if (error.message?.includes('Image could not be captured') || error.code === 'ERR_CAMERA_IMAGE_CAPTURE') {
        errorMessage = 'Camera capture failed. Please try again or restart the app.';
        setError(errorMessage);
        showGlassAlert({
          title: 'Camera Error',
          message: 'Unable to capture image. This might be an iOS camera issue. Try:\n\n1. Go back and try again\n2. Restart the app\n3. Check camera permissions',
          buttons: [
            { 
              label: 'Try Again', 
              type: 'primary',
              onPress: () => {
                setError(null);
                setLoading(false);
                setCameraReady(false);
                // Force camera reinitialization
                setCameraActive(false);
                setTimeout(() => {
                  setCameraActive(true);
                  setCameraReady(false);
                }, 500);
              }
            },
            { 
              label: 'Go Back', 
              type: 'secondary',
              onPress: () => router.replace('/employees') 
            }
          ]
        });
        setLoading(false);
        return;
      } else if (error.message?.includes('Camera is not ready')) {
        errorMessage = 'Camera is not ready. Please wait and try again.';
      } else if (error.message?.includes('Camera is already taking a picture')) {
        errorMessage = 'Please wait for the current operation to complete.';
      } else if (error.message?.includes('Photo capture timeout')) {
        errorMessage = 'Camera capture took too long. Please try again.';
        setError(errorMessage);
        showGlassAlert({
          title: 'Camera Timeout',
          message: 'Photo capture timed out. This may be due to camera performance issues.',
          buttons: [
            { 
              label: 'Try Again', 
              type: 'primary',
              onPress: () => {
                setError(null);
                setLoading(false);
                setCameraReady(false);
                // Restart camera for timeout recovery
                setCameraActive(false);
                setTimeout(() => {
                  setCameraActive(true);
                  setCameraReady(false);
                }, 500);
              }
            },
            { 
              label: 'Go Back', 
              type: 'secondary',
              onPress: () => router.replace('/employees') 
            }
          ]
        });
        setLoading(false);
        return;
      } else if (error.message?.includes('permission')) {
        errorMessage = 'Camera permission issue. Please check settings.';
      } else if (error.message?.includes('Image could not be captured')) {
        errorMessage = 'Camera capture failed. Please try again or restart the app.';
      }
      // API errors
      else if (error.response?.status === 400) {
        errorMessage = 'Invalid request. ';
        if (error.response.data?.error) {
          errorMessage += error.response.data.error;
        } else if (error.response.data?.message) {
          errorMessage += error.response.data.message;
        } else {
          errorMessage += 'Please try again with valid data.';
        }
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You are not authorized to perform this action.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Employee not found or biometric data not registered.';
      } else if (error.response?.status === 409) {
        errorMessage = isCheckIn 
          ? 'You are already checked in. Please check out first.'
          : 'You are not checked in. Please check in first.';
      } else if (error.response?.status === 500) {
        console.error('Server error details:', error.response.data);
        
        // Check if it's MongoDB connection issue
        if (error.response.data?.error === 'Internal server error') {
          errorMessage = '⚠️ Biometric system is temporarily unavailable.\n\nPlease contact your administrator to:\n1. Start MongoDB service\n2. Check biometric system connectivity\n\nYou may need to use manual time tracking for now.';
        } else {
          errorMessage = 'Server error. Please contact administrator.';
          // Try to extract any error message from the response
          if (typeof error.response.data === 'string') {
            errorMessage = `Server error: ${error.response.data}`;
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          }
        }
        
        // Special handling for Mishka's account - suggest biometric re-registration
        if (user?.email === 'mikhail.plotnik@gmail.com' && !isCheckIn) {
          errorMessage += '\n\n🔧 For your account specifically, try:\n1. Complete biometric registration again\n2. Use manual check-out if biometric fails\n3. Contact admin about MongoDB connectivity';
        }
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.details) {
        errorMessage = Object.values(error.response.data.details).flat().join('\n');
      } else if (error.message?.includes('Network') || error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check:\n1. Backend server is running\n2. Your device is on the same network\n3. API URL is correct (currently: ' + API_URL + ')';
      } else if (error.message?.includes('timeout') || error.message?.includes('Request timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
        
        // Special timeout handling for Mishka's check-out
        if (user?.email === 'mikhail.plotnik@gmail.com' && !isCheckIn) {
          errorMessage = '⏰ Check-out request timed out.\n\nThis might be due to:\n1. MongoDB biometric service not running\n2. Missing biometric registration\n3. Network connectivity issues\n\n💡 Try using manual check-out from the dashboard instead.';
          
          // Show error toast для Mishka
          showError(errorMessage, 5000);
          return;
        }
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Unknown error occurred.';
      }
      
      setError(errorMessage);
      showError(errorMessage, 4000);
    } finally {
      // Clear the global timeout
      if (globalTimeout) {
        clearTimeout(globalTimeout);
      }
      
      // Ensure loading states are always cleared
      setLoading(false);
        // Clear countdown if still active
      // Countdown timer is managed by the hook
      // Countdown is managed by the hook
    }
  };

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
      // console.log('📍 Location string generated:', locationString);
      return locationString;
    } catch (error) {
      console.error('❌ Error generating location string:', error);
      return 'Location unavailable';
    }
  };

  const _handleSuccess = (data) => {
    const { hours_worked } = data;
    const locationStatus = inside ? 'at office' : 'remotely';
    
    let message = isCheckIn 
      ? `Successfully checked in ${locationStatus}`
      : `Successfully checked out ${locationStatus}`;
    
    if (hours_worked) {
      message += `\nTotal hours worked: ${hours_worked}h`;
    }
    
    // Update global work status
    if (isCheckIn) {
      handleCheckInSuccess(data);
    } else {
      handleCheckOutSuccess(data);
    }
    
    // Cleanup camera and states immediately after successful operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Countdown timer is managed by the hook
    
    // Completely stop camera by unmounting the component
    setCameraActive(false);
    setCameraReady(false);
    setLoading(false);
    // Countdown is managed by the hook
    setError(null);
    setSuccessState(true); // Set success state to hide UI elements
    
    // Forcefully stop camera by setting ref to null temporarily
    if (cameraRef.current) {
      try {
        // This helps release camera resources on iOS
        const currentCamera = cameraRef.current;
        if (currentCamera && currentCamera.pausePreview) {
          currentCamera.pausePreview();
        }
        cameraRef.current = null;
      } catch (e) {
        console.warn('Camera cleanup warning:', e.message);
      }
    }
    
    console.log('🧹 Camera completely stopped after successful biometric check');
    
    showGlassAlert({
      title: 'Success', 
      message: message,
      onConfirm: () => {
        // Navigate to check-in-out screen instead of back
        console.log('✅ Navigating to check-in-out screen after success');
        router.replace('/check-in-out');
      }
    });
  };

  // handleError больше не нужен, используем toast

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
      <SafeAreaView style={styles(theme).centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles(theme).statusText}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles(theme).centered}>
        <Text style={styles(theme).errorText}>Camera Access Denied</Text>
        <Text style={styles(theme).instructionText}>
          Please enable camera access in your device settings to use biometric check-in/out
        </Text>
        <TouchableOpacity 
          style={styles(theme).retryButton}
          onPress={resetCamera}
        >
          <Text style={styles(theme).retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // console.log('🎬 BiometricCheckScreen render state:', {
  //   cameraActive,
  //   cameraReady,
  //   hasPermission,
  //   loading,
  //   isCapturing,
  //   successState,
  //   mode: isCheckIn ? 'check-in' : 'check-out'
  // });

  if (!theme) {
    return null;
  }

  return (
    <LiquidGlassLayout>
      <HeaderBackButton destination="/employees" />
      <View style={styles(theme).container}>
      {cameraActive && hasPermission ? (
        <CameraView 
          ref={cameraRef} 
          style={styles(theme).camera}
          facing="front"
          onCameraReady={() => {
            console.log('✅ Camera is ready');
            setCameraReady(true);
            setError(null);
            console.log('📸 Camera ready state updated to true');
          }}
          onMountError={(error) => {
            console.error('❌ Camera mount error:', error);
            setError(`Camera failed to initialize: ${error.message}`);
            setCameraReady(false);
          }}
        />
      ) : (
        // Show initialization screen when camera is inactive
        <View style={[styles(theme).camera, styles(theme).cameraInitializing]}>
          <View style={styles(theme).initializingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            {!hasPermission ? (
              <Text style={styles(theme).initializingText}>
                Requesting camera permission...
              </Text>
            ) : !cameraActive ? (
              <Text style={styles(theme).initializingText}>
                Initializing camera...
              </Text>
            ) : (
              <Text style={styles(theme).initializingText}>
                Starting camera...
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Face Capture Overlay - круглая маска */}
      <FaceCaptureOverlay
        isActive={cameraActive && hasPermission && !successState && overlayActive}
        isCapturing={isCapturing}
        onAnimationComplete={() => {
          // console.log('🎭 Face capture overlay animation completed');
          // Показываем кнопки с задержкой 100ms после маски
          setTimeout(() => {
            setButtonsVisible(true);
          }, 100);
        }}
      />

      <View style={styles(theme).overlay}>
        {/* Header info - hide when success */}
        {!successState && (
          <View style={styles(theme).topInfo}>
            <Text style={styles(theme).modeText}>
              {isCheckIn ? '🔐 Check-In' : '🔓 Check-Out'}
            </Text>
            <Text style={styles(theme).userText}>
              {user?.name || user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email || 'User'}
              {user?.role && (
                <Text style={styles(theme).roleText}>
                  {' • '}
                  {getRoleDisplayName(user.role)}
                </Text>
              )}
            </Text>
            <Text style={styles(theme).statusText}>
              {getStatusText()}
            </Text>
          </View>
        )}

        {/* Error display */}
        {error && !successState && (
          <View style={styles(theme).errorContainer}>
            <Text style={styles(theme).errorBanner}>⚠️ {error}</Text>
          </View>
        )}

        {/* Face guide - только инструкции без дублирования таймера */}
        {!successState && (
          <View style={styles(theme).faceGuide}>
            <Text 
              style={styles(theme).instructionText}
              accessible={true}
              accessibilityLabel={countdown ? `Taking photo in ${countdown} seconds` : 'Position your face within the frame for biometric recognition'}
            >
              Position your face within the frame
            </Text>
          </View>
        )}

        {/* Controls - hide when success */}
        {!successState && (
          <View style={styles(theme).bottomControls}>
            <TouchableOpacity
              style={[
                styles(theme).actionButton,
                isCheckIn ? styles(theme).checkInButton : styles(theme).checkOutButton,
                (loading || !!countdown || isCapturing || !cameraReady || !cameraActive) && styles(theme).disabledButton
              ]}
              onPress={startCameraCountdown}
              disabled={loading || !!countdown || isCapturing || !cameraReady || !cameraActive}
              accessible={true}
              accessibilityLabel={
                loading ? 'Processing face recognition' :
                countdown ? `Taking photo in ${countdown} seconds` :
                !cameraReady ? 'Camera is initializing' :
                isCheckIn ? 'Take photo for check-in' : 'Take photo for check-out'
              }
              accessibilityRole="button"
            >
              {!!loading && (
                <ActivityIndicator 
                  size="small" 
                  color={theme.colors.text.light} 
                  style={styles(theme).buttonLoader}
                />
              )}
              <Text style={styles(theme).actionButtonText}>
                {!cameraActive ? 'Camera stopped' : 
                 loading ? 'Processing face recognition...' : 
                 getCameraButtonText(countdown, 
                   `${isCheckIn ? 'Check In' : 'Check Out'} ${inside ? '(Office)' : '(Remote)'}`)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles(theme).cancelButton}
              onPress={() => {
                // Cancel any ongoing capture
                if (abortControllerRef.current) {
                  abortControllerRef.current.abort();
                }
                // Countdown timer is managed by the hook
                // Reset states
                setLoading(false);
                // Countdown is managed by the hook
                
                // Navigate back to employees screen
                router.replace('/employees');
              }}
              disabled={false}  // Allow cancel even during capture
            >
              <Text style={styles(theme).cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Toast уведомления */}
      <ToastComponent />
      </View>
    </LiquidGlassLayout>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { 
    backgroundColor: 'transparent', 
    flex: 1 
  },
  camera: { 
    flex: 1,
    zIndex: 1, // Камера - базовый слой
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 20,
    zIndex: 3, // UI элементы поверх маски
  },
  centered: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  
  // Top info - адаптивное позиционирование
  topInfo: {
    alignItems: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
    zIndex: 10, // Ensure it's above other elements
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    maxHeight: 150, // Ограничиваем высоту для предотвращения перекрытия
  },
  modeText: {
    fontSize: 20, // Уменьшили размер для экономии места
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 8,
  },
  userText: {
    fontSize: 14, // Уменьшили размер
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 12, // Уменьшили размер
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginHorizontal: 20,
  },
  
  // Face guide - теперь только для счётчика и инструкций
  faceGuide: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 150,
    paddingTop: 220,
  },
  // Старые стили для круга больше не нужны
  faceFrame: {
    display: 'none',
  },
  faceFrameActive: {
    display: 'none',
  },
  countdownContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 180, // Соответствует размеру круга
    height: 180, // Соответствует размеру круга
  },
  countdownText: {
    fontSize: 42, // Уменьшили чтобы помещался в круг
    fontWeight: 'bold',
    color: theme.colors.success,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  instructionText: {
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20, // Уменьшили отступ
    backgroundColor: 'rgba(0,0,0,0.9)', // Более темный фон
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    fontSize: 14, // Уменьшили размер
    fontWeight: '600',
    marginHorizontal: 30,
    maxWidth: 280, // Уменьшили максимальную ширину
    alignSelf: 'center',
  },
  
  // Controls - фиксированная панель действий
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 50, // Отступ от safe area
    backgroundColor: 'rgba(0,0,0,0.85)', // Более темный фон
    paddingTop: 16,
    zIndex: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    height: 48, // Фиксированная высота
    minWidth: '100%',
  },
  checkInButton: {
    backgroundColor: theme.colors.success,
  },
  checkOutButton: {
    backgroundColor: theme.colors.danger,
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16, // Уменьшили размер
    fontWeight: 'bold',
  },
  buttonLoader: {
    marginRight: 10,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    height: 36,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10, // Фиксированная высота
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14, // Уменьшили размер
    fontWeight: '600',
  },
  
  // Error states
  errorText: {
    color: theme.colors.danger,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    marginTop: 20,
    padding: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  
  // Error display - адаптивное позиционирование
  errorContainer: {
    position: 'absolute',
    top: 160, // Ниже верхней информации
    left: 20,
    right: 20,
    zIndex: 15, // Выше других элементов
    maxHeight: 80, // Ограничиваем высоту
  },
  errorBanner: {
    backgroundColor: 'rgba(220, 53, 69, 0.95)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    borderWidth: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 10,
    textAlign: 'center',
  },
  
  // Camera initialization styles
  cameraInitializing: {
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    justifyContent: 'center',
  },
  initializingContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
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
});