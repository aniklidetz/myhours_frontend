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
import { useUser } from '../src/contexts/UserContext';
import useColors from '../hooks/useColors';
import ApiService from '../src/api/apiService';
import { APP_CONFIG } from '../src/config';

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
  const [hasPermission, setHasPermission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  const { palette } = useColors();
  const { user } = useUser();
  const { location, errorMsg: locationError } = useLocation({ 
    watchPosition: false,
    highAccuracy: true 
  });
  const { isInsideOffice, officeSettings } = useOffice();
  
  const inside = location && location.coords ? isInsideOffice(location.coords) : false;

  useEffect(() => {
    requestCameraPermission();
    
    // Cleanup function to abort any pending requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
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
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
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
    
    setLoading(true);
    console.log(`📸 Starting photo capture for ${isCheckIn ? 'check-in' : 'check-out'}...`);
    console.log('Camera state:', {
      refExists: !!cameraRef.current,
      cameraReady,
      hasPermission
    });

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      // Добавляем небольшую задержку перед съемкой
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const photo = await cameraRef.current.takePictureAsync({ 
        quality: 0.5, // Уменьшаем качество для стабильности
        base64: true,
        exif: false
        // Убираем skipProcessing - может вызывать проблемы
      });

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

      // Call the appropriate API endpoint with abort signal
      const result = isCheckIn 
        ? await ApiService.biometrics.checkIn(imageData, locationString, abortControllerRef.current.signal)
        : await ApiService.biometrics.checkOut(imageData, locationString);

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
        return;
      }
      
      // Extract and format error message from various sources
      let errorMessage = 'Failed to process biometric check. ';
      
      // Camera-specific errors
      if (error.message?.includes('Camera is not ready')) {
        errorMessage = 'Camera is not ready. Please wait and try again.';
      } else if (error.message?.includes('Camera is already taking a picture')) {
        errorMessage = 'Please wait for the current operation to complete.';
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
        errorMessage = 'Server error. Please contact administrator.';
        if (error.response.data) {
          console.error('Server error details:', error.response.data);
          // Try to extract any error message from the response
          if (typeof error.response.data === 'string') {
            errorMessage = `Server error: ${error.response.data}`;
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          }
        }
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.details) {
        errorMessage = Object.values(error.response.data.details).flat().join('\n');
      } else if (error.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Unknown error occurred.';
      }
      
      setError(errorMessage);
      handleError(errorMessage);
    } finally {
      setLoading(false);
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
    
    Alert.alert(
      'Success', 
      message,
      [{ 
        text: 'OK', 
        onPress: () => {
          // Проверяем, авторизован ли пользователь
          if (user) {
            router.replace('/employees');
          } else {
            // Если нет пользователя, возвращаемся на главный экран
            router.replace('/');
          }
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
    if (loading) return 'Processing...';
    if (countdown !== null && countdown > 0) return `Taking photo in ${countdown}...`;
    
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

  return (
    <View style={styles(palette).container}>
      <CameraView 
        ref={cameraRef} 
        style={styles(palette).camera}
        facing="front"
        onCameraReady={() => {
          console.log('✅ Camera is ready for biometric check');
          setCameraReady(true);
        }}
        onMountError={(error) => {
          console.error('❌ Camera mount error:', error);
          setError(`Camera failed to initialize: ${error.message}`);
          setCameraReady(false);
        }}
      />

      <View style={styles(palette).overlay}>
        {/* Header info */}
        <View style={styles(palette).topInfo}>
          <Text style={styles(palette).modeText}>
            {isCheckIn ? '🔐 Check-In' : '🔓 Check-Out'}
          </Text>
          <Text style={styles(palette).userText}>
            {user?.name || 'Employee'}
          </Text>
          <Text style={styles(palette).statusText}>
            {getStatusText()}
          </Text>
        </View>

        {/* Error display */}
        {error && (
          <View style={styles(palette).errorContainer}>
            <Text style={styles(palette).errorBanner}>⚠️ {error}</Text>
          </View>
        )}

        {/* Face guide */}
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
            Position your face within the frame
          </Text>
        </View>

        {/* Controls */}
        <View style={styles(palette).bottomControls}>
          <TouchableOpacity
            style={[
              styles(palette).actionButton,
              isCheckIn ? styles(palette).checkInButton : styles(palette).checkOutButton,
              (loading || !!countdown) && styles(palette).disabledButton
            ]}
            onPress={startCountdown}
            disabled={loading || !!countdown}
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
              // Возвращаемся назад или на главную
              if (user) {
                router.back();
              } else {
                router.replace('/');
              }
            }}
            disabled={loading || !!countdown}
          >
            <Text style={styles(palette).cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
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
    marginTop: 50,
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
  statusText: {
    fontSize: 14,
    color: palette.text.light,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 10,
  },
  
  // Face guide
  faceGuide: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  faceFrame: {
    width: 250,
    height: 250,
    borderRadius: 125,
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
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 8,
    fontSize: 16,
  },
  
  // Controls
  bottomControls: {
    marginBottom: 50,
    gap: 15,
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
});