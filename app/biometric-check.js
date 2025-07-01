import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import useLocation from '../hooks/useLocation';
import { useOffice } from '../src/contexts/OfficeContext';
import { useUser, ROLES } from '../src/contexts/UserContext';
import useColors from '../hooks/useColors';
import ApiService from '../src/api/apiService';
import { APP_CONFIG, API_URL } from '../src/config';
import { useWorkStatus } from '../src/contexts/WorkStatusContext';

export default function BiometricCheckScreen() {
  // Get `mode` safely: string | undefined | string[]  →  string | undefined
  const params = useLocalSearchParams();
  console.log('BiometricCheckScreen params:', params);
  const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;

  // Fallback to 'check-in' if absent
  const mode = modeParam ?? 'check-in';
  const isCheckIn = mode === 'check-in';
  
  const cameraRef = useRef(null);
  const abortControllerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [successState, setSuccessState] = useState(false); // Track success state for UI cleanup

  const { palette } = useColors();
  const { user } = useUser();
  const { handleCheckInSuccess, handleCheckOutSuccess } = useWorkStatus();
  const { location, errorMsg: locationError } = useLocation({ 
    watchPosition: false,
    highAccuracy: true 
  });
  const { isInsideOffice, officeSettings } = useOffice();
  
  const inside = location && location.coords ? isInsideOffice(location.coords) : false;

  const getRoleDisplayName = (role) => {
    switch (role) {
      case ROLES.ADMIN: return '👑 Administrator';
      case ROLES.ACCOUNTANT: return '💼 Accountant';
      case ROLES.EMPLOYEE: return '👤 Employee';
      case ROLES.STAFF: return '👥 Staff';
      default: return role ? `🔍 ${role}` : '';
    }
  };

  useEffect(() => {
    console.log('🎥 BiometricCheckScreen mounting, initializing camera...');
    // Reset all states on mount to ensure fresh start
    setCameraActive(true);
    setCameraReady(false);
    setIsCapturing(false);
    setLoading(false);
    setCountdown(null);
    setSuccessState(false);
    setError(null);
    
    requestCameraPermission();
    
    // Cleanup function to abort any pending requests and timers
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      // Reset camera state on unmount
      setCameraActive(false);
      setCameraReady(false);
      setIsCapturing(false);
      setLoading(false);
      setCountdown(null);
      console.log('🧹 BiometricCheckScreen cleanup: Camera completely stopped');
    };
  }, []);

  const requestCameraPermission = async () => {
    try {
      console.log('📷 Requesting camera permission for biometric check...');
      const { status } = await Camera.requestCameraPermissionsAsync();
      console.log(`📷 Camera permission status: ${status}`);
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        console.warn('⚠️ Camera permission denied by user');
        setError('Camera permission denied. Please enable it in settings.');
      }
    } catch (error) {
      console.error('❌ Camera permission error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code
      });
      setHasPermission(false);
      setError(`Failed to request camera permission: ${error.message}`);
    }
  };

  const startCountdown = () => {
    if (isCapturing) {
      console.warn('⚠️ Photo capture already in progress');
      return;
    }
    
    setCountdown(3);
    setIsCapturing(true);
    
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          takePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const takePhoto = async () => {
    // Clear previous errors
    setError(null);
    
    // Validate camera ref
    if (!cameraRef.current) {
      console.error('❌ Camera ref is null or undefined');
      setError('Camera not initialized. Please restart the app.');
      Alert.alert(
        'Camera Error', 
        'Camera is not ready. Please go back and try again.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }
    
    if (loading) {
      console.warn('⚠️ Photo capture already in progress');
      return;
    }
    
    if (!cameraReady) {
      console.warn('⚠️ Camera not ready yet');
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
    console.log(`📸 Starting photo capture for ${isCheckIn ? 'check-in' : 'check-out'}...`);
    console.log('Camera state:', {
      refExists: !!cameraRef.current,
      cameraReady,
      hasPermission
    });

    // Add a global timeout to prevent hanging
    const globalTimeout = setTimeout(() => {
      console.error('⏰ Global timeout: Photo capture took too long');
      setLoading(false);
      setIsCapturing(false);
      setError('Operation timed out. Please try again.');
    }, 45000); // 45 second timeout

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
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

      console.log('📸 Photo captured successfully:', {
        hasBase64: !!photo?.base64,
        base64Length: photo?.base64?.length || 0,
        uri: photo?.uri ? 'present' : 'missing'
      });

      if (!photo || !photo.base64) {
        throw new Error('Photo capture returned invalid data - base64 is missing');
      }

      const imageData = `data:image/jpeg;base64,${photo.base64}`;
      const locationString = getLocationString();
      
      console.log('📤 Preparing biometric data:', {
        action: isCheckIn ? 'check-in' : 'check-out',
        locationString: locationString,
        imageDataLength: imageData.length,
        hasImage: !!photo.base64,
        hasLocation: !!location
      });

      // Call the appropriate API endpoint with timeout
      // Use shorter timeout for check-out operations, especially for Mishka's account
      const timeoutDuration = (!isCheckIn && user?.email === 'mikhail.plotnik@gmail.com') ? 20000 : 30000;
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeoutDuration);
      });
      
      const apiPromise = isCheckIn 
        ? ApiService.biometrics.checkIn(imageData, locationString)
        : ApiService.biometrics.checkOut(imageData, locationString);
      
      console.log(`⏱️ API call timeout set to ${timeoutDuration/1000}s for ${isCheckIn ? 'check-in' : 'check-out'}`);
      const result = await Promise.race([apiPromise, timeoutPromise]);

      console.log('✅ Biometric check API response received:', {
        hasResult: !!result,
        employeeName: result?.employee_name,
        hoursWorked: result?.hours_worked
      });

      // API returns data directly, not wrapped in success/error
      handleSuccess(result);
    } catch (error) {
      console.error('❌ Biometric check error:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        code: error.code
      });
      
      // Log API response details if available
      if (error.response) {
        console.error('API Response details:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
      }
      
      // Don't show error for aborted requests
      if (error.name === 'CanceledError' || error.message === 'canceled') {
        console.log('🔄 Request was cancelled by user');
        setIsCapturing(false);
        return;
      }
      
      // Extract and format error message from various sources
      let errorMessage = 'Failed to process biometric check. ';
      
      // Camera-specific errors
      if (error.message?.includes('Image could not be captured') || error.code === 'ERR_CAMERA_IMAGE_CAPTURE') {
        errorMessage = 'Camera capture failed. Please try again or restart the app.';
        setError(errorMessage);
        Alert.alert(
          'Camera Error',
          'Unable to capture image. This might be an iOS camera issue. Try:\n\n1. Go back and try again\n2. Restart the app\n3. Check camera permissions',
          [
            { text: 'Try Again', onPress: () => {
              setError(null);
              setLoading(false);
              setIsCapturing(false);
              setCameraReady(false);
              // Force camera reinitialization
              setCameraActive(false);
              setTimeout(() => {
                setCameraActive(true);
                setCameraReady(false);
              }, 500);
            }},
            { text: 'Go Back', onPress: () => router.back() }
          ]
        );
        setLoading(false);
        setIsCapturing(false);
        return;
      } else if (error.message?.includes('Camera is not ready')) {
        errorMessage = 'Camera is not ready. Please wait and try again.';
      } else if (error.message?.includes('Camera is already taking a picture')) {
        errorMessage = 'Please wait for the current operation to complete.';
      } else if (error.message?.includes('Photo capture timeout')) {
        errorMessage = 'Camera capture took too long. Please try again.';
        setError(errorMessage);
        Alert.alert(
          'Camera Timeout',
          'Photo capture timed out. This may be due to camera performance issues.',
          [
            { text: 'Try Again', onPress: () => {
              setError(null);
              setLoading(false);
              setIsCapturing(false);
              setCameraReady(false);
              // Restart camera for timeout recovery
              setCameraActive(false);
              setTimeout(() => {
                setCameraActive(true);
                setCameraReady(false);
              }, 500);
            }},
            { text: 'Go Back', onPress: () => router.back() }
          ]
        );
        setLoading(false);
        setIsCapturing(false);
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
          
          // Show special alert for Mishka with manual check-out option
          Alert.alert(
            'Check-out Timeout',
            errorMessage,
            [
              { 
                text: 'Try Manual Check-out', 
                onPress: () => {
                  console.log('🔄 Redirecting to manual check-out for Mishka');
                  router.replace('/check-in-out?manual=true');
                }
              },
              { text: 'Cancel', onPress: () => router.back() }
            ]
          );
          return;
        }
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Unknown error occurred.';
      }
      
      setError(errorMessage);
      handleError(errorMessage);
    } finally {
      // Clear the global timeout
      clearTimeout(globalTimeout);
      
      // Ensure loading states are always cleared
      setLoading(false);
      setIsCapturing(false);
      // Clear countdown if still active
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setCountdown(null);
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
      console.log('📍 Location string generated:', locationString);
      return locationString;
    } catch (error) {
      console.error('❌ Error generating location string:', error);
      return 'Location unavailable';
    }
  };

  const handleSuccess = (data) => {
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
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    
    // Completely stop camera by unmounting the component
    setCameraActive(false);
    setCameraReady(false);
    setIsCapturing(false);
    setLoading(false);
    setCountdown(null);
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
    
    Alert.alert(
      'Success', 
      message,
      [{ 
        text: 'OK', 
        onPress: () => {
          // Navigate to check-in-out screen instead of back
          console.log('✅ Navigating to check-in-out screen after success');
          router.replace('/check-in-out');
        }
      }]
    );
  };

  const handleError = (errorMessage) => {
    // errorMessage is already a string, just display it
    Alert.alert('Error', errorMessage || 'An error occurred. Please try again.');
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

  const getButtonText = () => {
    if (!cameraActive) return 'Camera stopped';
    if (loading) return 'Processing...';
    if (countdown !== null && countdown > 0) return `Taking photo in ${countdown}...`;
    if (!cameraReady) return 'Initializing camera...';
    
    const action = isCheckIn ? 'Check In' : 'Check Out';
    const location = inside ? '(Office)' : '(Remote)';
    return `${action} ${location}`;
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles(palette).centered}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles(palette).statusText}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles(palette).centered}>
        <Text style={styles(palette).errorText}>Camera Access Denied</Text>
        <Text style={styles(palette).instructionText}>
          Please enable camera access in your device settings to use biometric check-in/out
        </Text>
        <TouchableOpacity 
          style={styles(palette).retryButton}
          onPress={requestCameraPermission}
        >
          <Text style={styles(palette).retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  console.log('🎬 BiometricCheckScreen render state:', {
    cameraActive,
    cameraReady,
    hasPermission,
    loading,
    isCapturing,
    successState,
    mode: isCheckIn ? 'check-in' : 'check-out'
  });

  return (
    <View style={styles(palette).container}>
      {cameraActive && hasPermission ? (
        <CameraView 
          ref={cameraRef} 
          style={styles(palette).camera}
          facing="front"
          onCameraReady={() => {
            console.log('✅ Camera is ready for biometric check');
            setCameraReady(true);
            setRetryCount(0);
            setError(null); // Clear any initialization errors
          }}
          onMountError={(error) => {
            console.error('❌ Camera mount error:', error);
            const newRetryCount = retryCount + 1;
            setRetryCount(newRetryCount);
            
            if (newRetryCount < 3) {
              setError(`Camera initialization failed (attempt ${newRetryCount}/3). Retrying...`);
              setTimeout(() => {
                setCameraReady(false);
                setError(null);
                // Force complete camera restart
                setCameraActive(false);
                setTimeout(() => {
                  setCameraActive(true);
                }, 500);
              }, 2000);
            } else {
              setError(`Camera failed to initialize after 3 attempts: ${error.message}`);
              setCameraReady(false);
            }
          }}
        />
      ) : (
        // Show initialization screen when camera is inactive
        <View style={[styles(palette).camera, styles(palette).cameraInitializing]}>
          <View style={styles(palette).initializingContainer}>
            <ActivityIndicator size="large" color={palette.primary} />
            {!hasPermission ? (
              <Text style={styles(palette).initializingText}>
                Requesting camera permission...
              </Text>
            ) : !cameraActive ? (
              <Text style={styles(palette).initializingText}>
                Initializing camera...
              </Text>
            ) : (
              <Text style={styles(palette).initializingText}>
                Starting camera...
              </Text>
            )}
          </View>
        </View>
      )}

      <View style={styles(palette).overlay}>
        {/* Header info - hide when success */}
        {!successState && (
          <View style={styles(palette).topInfo}>
            <Text style={styles(palette).modeText}>
              {isCheckIn ? '🔐 Check-In' : '🔓 Check-Out'}
            </Text>
            <Text style={styles(palette).userText}>
              {user?.name || user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email || 'User'}
              {user?.role && (
                <Text style={styles(palette).roleText}>
                  {' • '}
                  {getRoleDisplayName(user.role)}
                </Text>
              )}
            </Text>
            <Text style={styles(palette).statusText}>
              {getStatusText()}
            </Text>
          </View>
        )}

        {/* Error display */}
        {error && !successState && (
          <View style={styles(palette).errorContainer}>
            <Text style={styles(palette).errorBanner}>⚠️ {error}</Text>
          </View>
        )}

        {/* Face guide - hide when success */}
        {!successState && (
          <View style={styles(palette).faceGuide}>
            <View style={[
              styles(palette).faceFrame,
              !!countdown && styles(palette).faceFrameActive
            ]} />
            {!!countdown && (
              <View style={styles(palette).countdownContainer}>
                <Text style={styles(palette).countdownText}>{countdown}</Text>
              </View>
            )}
            <Text style={styles(palette).instructionText}>
              {countdown ? `Taking photo in ${countdown}...` : 'Position your face within the frame'}
            </Text>
          </View>
        )}

        {/* Controls - hide when success */}
        {!successState && (
          <View style={styles(palette).bottomControls}>
            <TouchableOpacity
              style={[
                styles(palette).actionButton,
                isCheckIn ? styles(palette).checkInButton : styles(palette).checkOutButton,
                (loading || !!countdown || isCapturing || !cameraReady || !cameraActive) && styles(palette).disabledButton
              ]}
              onPress={startCountdown}
              disabled={loading || !!countdown || isCapturing || !cameraReady || !cameraActive}
            >
              {!!loading && (
                <ActivityIndicator 
                  size="small" 
                  color={palette.text.light} 
                  style={styles(palette).buttonLoader}
                />
              )}
              <Text style={styles(palette).actionButtonText}>
                {getButtonText()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles(palette).cancelButton}
              onPress={() => {
                // Cancel any ongoing capture
                if (abortControllerRef.current) {
                  abortControllerRef.current.abort();
                }
                if (countdownTimerRef.current) {
                  clearInterval(countdownTimerRef.current);
                }
                // Reset states
                setIsCapturing(false);
                setLoading(false);
                setCountdown(null);
                
                // Navigate back
                if (user) {
                  router.back();
                } else {
                  router.replace('/');
                }
              }}
              disabled={false}  // Allow cancel even during capture
            >
              <Text style={styles(palette).cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = (palette) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: palette.background.primary 
  },
  camera: { 
    flex: 1 
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.background.primary,
    padding: 20,
  },
  
  // Top info
  topInfo: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
    zIndex: 10, // Ensure it's above other elements
  },
  modeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.text.light,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 10,
  },
  userText: {
    fontSize: 16,
    color: palette.text.light,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 10,
  },
  roleText: {
    fontSize: 14,
    color: palette.text.light,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 14,
    color: palette.text.light,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 40, // Increased space before the circle to prevent overlap
    marginHorizontal: 10, // Add horizontal margin for better positioning
  },
  
  // Face guide
  faceGuide: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingTop: 20, // Reduced padding
    paddingBottom: 140, // More space for bottom controls
  },
  faceFrame: {
    width: 250,  // Reduced size to prevent overlap
    height: 250,  // Reduced size to prevent overlap
    borderRadius: 125,  // Adjusted for new size
    borderWidth: 3,
    borderColor: palette.primary,
    backgroundColor: 'transparent',
  },
  faceFrameActive: {
    borderColor: palette.success,
    shadowColor: palette.success,
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  countdownContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: palette.success,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  instructionText: {
    color: palette.text.light,
    textAlign: 'center',
    marginTop: 30, // Reduced margin to fit better
    backgroundColor: 'rgba(0,0,0,0.8)', // Darker background
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 20,
    maxWidth: 300, // Limit width to prevent overflow
    alignSelf: 'center',
  },
  
  // Controls
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 60, // Increased bottom padding for SafeArea
    backgroundColor: 'rgba(0,0,0,0.3)', // Semi-transparent background
    paddingTop: 20, // Add top padding
    zIndex: 10, // Ensure controls are above other elements
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  checkInButton: {
    backgroundColor: palette.success,
  },
  checkOutButton: {
    backgroundColor: palette.danger,
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: palette.text.light,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonLoader: {
    marginRight: 10,
  },
  cancelButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15, // Increased space above cancel button
  },
  cancelButtonText: {
    color: palette.text.light,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Error states
  errorText: {
    color: palette.danger,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: palette.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: palette.text.light,
    fontWeight: 'bold',
  },
  
  // Error display
  errorContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  errorBanner: {
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
    color: palette.text.light,
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  
  // Camera initialization styles
  cameraInitializing: {
    backgroundColor: palette.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initializingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 20,
    marginHorizontal: 20,
  },
  initializingText: {
    color: palette.text.light,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 15,
    lineHeight: 22,
  },
});