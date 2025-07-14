import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  Alert, 
  ActivityIndicator, 
  TouchableOpacity,
  SafeAreaView,
  UIAccessibility
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useLocalSearchParams, router } from 'expo-router';
import ApiService from '../src/api/apiService';
// import { APP_CONFIG } from '../src/config';
import useColors from '../hooks/useColors';
import { useToast } from '../components/Toast';
import FaceCaptureOverlay from '../components/FaceCaptureOverlay';

export default function BiometricRegistrationScreen() {
  const cameraRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [overlayActive, setOverlayActive] = useState(true); // Управление оверлеем
  const [_buttonsVisible, setButtonsVisible] = useState(false); // Анимация кнопок
  const { palette } = useColors();
  const { showSuccess, showError, ToastComponent } = useToast();

  const { employeeId, employeeName } = useLocalSearchParams();

  useEffect(() => {
    requestCameraPermission();
    // Сбрасываем состояние оверлея при монтировании
    setOverlayActive(true);
    setButtonsVisible(false);
  }, []);

  const requestCameraPermission = async () => {
    try {
      // console.log('📷 Requesting camera permission...');
      const { status } = await Camera.requestCameraPermissionsAsync();
      // console.log(`📷 Camera permission status: ${status}`);
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        console.warn('⚠️ Camera permission denied by user');
        setError('Camera permission denied. Please enable it in settings.');
      }
    } catch (error) {
      console.error('❌ Camera permission error:', error.message);
      setHasPermission(false);
      setError(`Failed to request camera permission: ${error.message}`);
    }
  };

  const startCountdown = () => {
    setCountdown(3);
    
    // Объявляем начало обратного отсчета для VoiceOver
    if (UIAccessibility && UIAccessibility.post) {
      UIAccessibility.post(UIAccessibility.Announcement, 'Starting countdown for biometric registration');
    }
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          takePhoto();
          return null;
        }
        
        // Объявляем каждую секунду для VoiceOver
        if (UIAccessibility && UIAccessibility.post) {
          UIAccessibility.post(UIAccessibility.Announcement, `Registration photo in ${prev - 1} seconds`);
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
      setIsCapturing(true);
      console.log('📸 Starting photo capture for registration...');
      
      // Добавляем небольшую задержку перед съемкой
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5, // Уменьшаем качество для стабильности
        base64: true,
        exif: false
        // Убираем skipProcessing - может вызывать проблемы
      });

      // console.log('📸 Photo captured successfully');

      if (!photo || !photo.base64) {
        throw new Error('Photo capture returned invalid data - base64 is missing');
      }

      await registerFace(photo);
    } catch (error) {
      console.error('❌ Error capturing photo:', error.message);
      
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
      setIsCapturing(false);
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
      console.log('🔧 Starting face registration for:', employeeName || `Employee #${employeeId}`);
      
      const imageData = `data:image/jpeg;base64,${photo.base64}`;
      const result = await ApiService.biometrics.register(employeeId, imageData);
      
      // console.log('✅ Registration successful');
      
      if (result.success) {
        const employeeDisplayName = employeeName || `Employee #${employeeId}`;
        
        // Скрываем оверлей с fade-out анимацией после успешной регистрации
        setOverlayActive(false);
        
        showSuccess(
          `Face registered successfully for ${employeeDisplayName}`,
          2000
        );
        
        // Навигация назад с задержкой
        setTimeout(() => {
          router.back();
        }, 2000);
      } else {
        console.warn('⚠️ Registration failed with error:', result.error);
        handleRegistrationError(result.error);
      }
    } catch (error) {
      console.error('❌ Registration API error:', error.response?.data?.message || error.message);
      
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
      showError(errorMessage, 4000);
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
    
    showError(errorMessage, 4000);
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
      
      {/* Face Capture Overlay - круглая маска */}
      <FaceCaptureOverlay
        isActive={hasPermission && cameraReady && !loading && overlayActive}
        isCapturing={isCapturing}
        onAnimationComplete={() => {
          // console.log('🎭 Face capture overlay animation completed for registration');
          // Показываем кнопки с задержкой 100ms после маски
          setTimeout(() => {
            setButtonsVisible(true);
          }, 100);
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

        {/* Face guide - теперь только счётчик и инструкции */}
        <View style={styles(palette).faceGuide}>
          {/* Счётчик обратного отсчёта */}
          {!!countdown && (
            <View style={styles(palette).countdownContainer}>
              <Text style={styles(palette).countdownText}>{countdown}</Text>
            </View>
          )}
          <Text 
            style={styles(palette).instructionText}
            accessible={true}
            accessibilityLabel={countdown ? `Taking registration photo in ${countdown} seconds` : 'Position your face within the frame for biometric registration'}
          >
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
            accessible={true}
            accessibilityLabel={
              loading ? 'Processing biometric registration' :
              countdown ? `Taking registration photo in ${countdown} seconds` :
              'Take photo for registration'
            }
            accessibilityRole="button"
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
      
      {/* Toast уведомления */}
      <ToastComponent />
    </View>
  );
}

const styles = (palette) => StyleSheet.create({
  container: { 
    backgroundColor: palette.background.primary, 
    flex: 1 
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
    alignItems: 'center',
    backgroundColor: palette.background.primary,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  
  // Top info - адаптивное позиционирование
  topInfo: {
    alignItems: 'center',
    marginTop: 50,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    maxHeight: 140, // Ограничиваем высоту для предотвращения перекрытия
    paddingHorizontal: 20,
  },
  modeText: {
    fontSize: 20, // Уменьшили размер для экономии места
    fontWeight: 'bold',
    color: palette.text.light,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 8,
  },
  userText: {
    fontSize: 14, // Уменьшили размер
    color: palette.text.light,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 12, // Уменьшили размер
    color: palette.text.light,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  
  // Face guide - теперь только для счётчика и инструкций
  faceGuide: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 220,
    paddingTop: 160,
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
    color: palette.success,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  instructionText: {
    color: palette.text.light,
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 10,
    maxHeight: 200, // Ограничиваем высоту панели
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    height: 48, // Фиксированная высота
    minWidth: '100%',
  },
  registerButton: {
    backgroundColor: palette.primary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: palette.text.light,
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
    color: palette.text.light,
    fontSize: 14, // Уменьшили размер
    fontWeight: '600',
  },
  instructionsContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  instructionsTitle: {
    fontSize: 14, // Уменьшили размер
    fontWeight: 'bold',
    color: palette.text.light,
    marginBottom: 6,
  },
  instructionsText: {
    fontSize: 12, // Уменьшили размер
    color: palette.text.light,
    lineHeight: 16,
  },
  
  // Error states
  errorText: {
    color: palette.danger,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: palette.primary,
    borderRadius: 8,
    marginTop: 20,
    padding: 12,
  },
  retryButtonText: {
    color: palette.text.light,
    fontWeight: 'bold',
  },
  
  // Error display - адаптивное позиционирование
  errorContainer: {
    position: 'absolute',
    top: 150, // Ниже верхней информации
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
    color: palette.text.light,
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 10,
    textAlign: 'center',
  },
});