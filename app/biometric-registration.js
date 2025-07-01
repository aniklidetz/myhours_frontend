import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  Alert, 
  ActivityIndicator, 
  TouchableOpacity,
  SafeAreaView 
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useLocalSearchParams, router } from 'expo-router';
import ApiService from '../src/api/apiService';
import { APP_CONFIG } from '../src/config';
import useColors from '../hooks/useColors';

export default function BiometricRegistrationScreen() {
  const cameraRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const { palette } = useColors();

  const { employeeId, employeeName } = useLocalSearchParams();

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    try {
      console.log('📷 Requesting camera permission...');
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
    // Clear any previous errors
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

    try {
      setLoading(true);
      console.log('📸 Starting photo capture for biometric registration...');
      console.log('Camera ref exists:', !!cameraRef.current);
      console.log('Camera ready state:', cameraReady);
      
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

      await registerFace(photo);
    } catch (error) {
      console.error('❌ Error capturing photo:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name
      });
      
      let errorMessage = 'Failed to capture photo. ';
      
      if (error.message?.includes('Camera is not ready')) {
        errorMessage += 'The camera is not ready. Please wait and try again.';
      } else if (error.message?.includes('Camera is already taking a picture')) {
        errorMessage += 'Please wait for the current operation to complete.';
      } else if (error.message?.includes('permission')) {
        errorMessage += 'Camera permission issue. Please check settings.';
      } else {
        errorMessage += error.message || 'Unknown camera error occurred.';
      }
      
      setError(errorMessage);
      Alert.alert('Camera Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const registerFace = async (photo) => {
    // Validate inputs
    if (!photo?.base64) {
      console.error('❌ No photo data available for registration');
      setError('No photo data available. Please try again.');
      Alert.alert('Error', 'Photo data is missing. Please capture again.');
      return;
    }
    
    if (!employeeId) {
      console.error('❌ No employee ID provided for registration');
      setError('Employee ID is missing.');
      Alert.alert('Error', 'Employee information is missing. Please go back and select an employee.');
      return;
    }

    try {
      console.log('🔧 Starting face registration for employee:', {
        employeeId,
        employeeName,
        imageDataLength: photo.base64.length
      });
      
      const imageData = `data:image/jpeg;base64,${photo.base64}`;
      const result = await ApiService.biometrics.register(employeeId, imageData);
      
      console.log('✅ Registration API response:', {
        success: result.success,
        hasError: !!result.error,
        message: result.message
      });
      
      if (result.success) {
        const employeeDisplayName = employeeName || `Employee #${employeeId}`;
        Alert.alert(
          'Registration Successful',
          `Face registered successfully for ${employeeDisplayName}`,
          [{ 
            text: 'OK', 
            onPress: () => {
              console.log('✅ Registration complete, navigating back');
              router.back(); // Просто возвращаемся назад вместо замены на /employees
            }
          }]
        );
      } else {
        console.warn('⚠️ Registration failed with error:', result.error);
        handleRegistrationError(result.error);
      }
    } catch (error) {
      console.error('❌ Registration API error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      });
      
      let errorMessage = 'Failed to register face. ';
      
      if (error.response?.status === 400) {
        errorMessage += 'Invalid data sent to server.';
      } else if (error.response?.status === 404) {
        errorMessage += 'Employee not found.';
      } else if (error.response?.status === 409) {
        errorMessage += 'Face already registered for this employee.';
      } else if (error.response?.status >= 500) {
        errorMessage += 'Server error. Please try again later.';
      } else if (error.message?.includes('Network')) {
        errorMessage += 'Network error. Please check your connection.';
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }
      
      setError(errorMessage);
      Alert.alert('Registration Error', errorMessage);
    }
  };

  const handleRegistrationError = (error) => {
    let errorMessage = 'Registration failed. Please try again.';
    
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.details) {
      // Handle validation errors from backend
      const details = Object.values(error.details).flat();
      errorMessage = details.join('\n');
    } else if (error?.employee_id) {
      errorMessage = `Employee error: ${error.employee_id.join(', ')}`;
    } else if (error?.image) {
      errorMessage = `Image error: ${error.image.join(', ')}`;
    }
    
    Alert.alert('Registration Failed', errorMessage);
  };

  const getButtonText = () => {
    if (loading) return 'Processing...';
    if (countdown !== null && countdown > 0) return `Taking photo in ${countdown}...`;
    return 'Take Photo for Registration';
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
          Please enable camera access in your device settings to use biometric registration
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
          console.log('✅ Camera is ready');
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
            📋 Biometric Registration
          </Text>
          {employeeName && (
            <Text style={styles(palette).userText}>
              Employee: {employeeName}
            </Text>
          )}
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
            Position your face within the frame for registration
          </Text>
        </View>

        {/* Controls */}
        <View style={styles(palette).bottomControls}>
          <TouchableOpacity
            style={[
              styles(palette).actionButton,
              styles(palette).registerButton,
              (loading || !!countdown || isCapturing) && styles(palette).disabledButton
            ]}
            onPress={startCountdown}
            disabled={loading || !!countdown || isCapturing}
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
            onPress={() => router.back()}
            disabled={loading || !!countdown}
          >
            <Text style={styles(palette).cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          {/* Instructions */}
          <View style={styles(palette).instructionsContainer}>
            <Text style={styles(palette).instructionsTitle}>Instructions:</Text>
            <Text style={styles(palette).instructionsText}>
              • Look directly at the camera{'\n'}
              • Remove glasses or masks if possible{'\n'}
              • Ensure good lighting on your face{'\n'}
              • Keep your face within the circle
            </Text>
          </View>
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
    marginBottom: 30,
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
  registerButton: {
    backgroundColor: palette.primary,
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
  instructionsContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.text.light,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: palette.text.light,
    lineHeight: 20,
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