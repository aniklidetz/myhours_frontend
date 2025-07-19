import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  ActivityIndicator, 
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useLocalSearchParams, router } from 'expo-router';
import ApiService from '../src/api/apiService';
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

export default function BiometricRegistrationScreen() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [_buttonsVisible, setButtonsVisible] = useState(false); // Анимация кнопок
  const theme = useLiquidGlassTheme();
  const { showSuccess, showError, ToastComponent } = useToast();

  const { employeeId, employeeName, selfService, returnTo } = useLocalSearchParams();
  
  // Determine return path with fallback logic
  const getReturnPath = useCallback(() => {
    // Priority 1: Explicit returnTo parameter
    if (returnTo && typeof returnTo === 'string') {
      console.log('📱 Using explicit returnTo path:', returnTo);
      return returnTo;
    }
    
    // Priority 2: Legacy selfService logic as fallback
    if (selfService === 'true') {
      console.log('📱 Using legacy selfService logic: /employees');
      return '/employees';
    }
    
    // Priority 3: Default fallback
    console.log('📱 Using default fallback: /team-management');
    return '/team-management';
  }, [returnTo, selfService]);
  
  // Callback for biometric camera hook
  const handleRegister = async (photo) => {
    setIsProcessing(true);
    try {
      console.log('🔧 Starting face registration for:', employeeName ? maskName(employeeName) : `Employee #${employeeId}`);
      
      const imageData = `data:image/jpeg;base64,${photo.base64}`;
      const result = await ApiService.biometrics.register(employeeId, imageData);
      
      if (result.success) {
        const employeeDisplayName = employeeName || `Employee #${employeeId}`;
        
        const returnPath = getReturnPath();
        
        showGlassAlert(
          'Success!',
          `Face registered successfully for ${employeeDisplayName}`,
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('📱 Navigation after success: returning to', returnPath);
                router.replace(returnPath);
              }
            }
          ]
        );
      } else {
        console.warn('⚠️ Registration failed with error:', result.error);
        handleRegistrationError(result.error);
      }
    } catch (error) {
      // Log error details for debugging (only in development)
      if (__DEV__) {
        console.error('❌ Biometric registration failed:', {
          errorMessage: error.response?.data?.message || error.message,
          errorResponse: error.response?.data,
          employeeId: employeeId
        });
      }
      
      // Use enhanced error handling
      const { showBiometricError } = await import('../utils/biometricErrorHandler');
      showBiometricError(
        error, 
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
  const [cameraActive, setCameraActive] = useState(true);
  const [hasPermission, setHasPermission] = useState(null);
  const [error, setError] = useState(null);
  const [overlayActive, setOverlayActive] = useState(true);
  const cameraRef = useRef(null);
  
  // Use hook only for photo processing and countdown
  const {
    isCapturing,
    countdown,
    startCountdown,
    getButtonText
  } = useBiometricCamera(handleRegister, cameraRef, cameraReady);

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

  // Helper function for registration errors
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
          Please enable camera access in your device settings to use biometric registration
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

  if (!theme) {
    return null;
  }

  return (
    <LiquidGlassLayout>
      <HeaderBackButton destination="/employees" />
      <View style={styles(theme).container}>
      <CameraView 
        ref={cameraRef} 
        style={styles(theme).camera}
        facing="front"
        onCameraReady={() => {
          console.log('✅ Camera is ready for registration');
          setCameraReady(true);
          setError(null);
        }}
        onMountError={async (error) => {
          console.error('❌ Camera mount error:', error);
          
          // Use enhanced camera error handling
          const { getCameraErrorMessage } = await import('../utils/biometricErrorHandler');
          const errorInfo = getCameraErrorMessage(error);
          
          setError(errorInfo.message);
          setCameraReady(false);
          
          // Show user-friendly notification
          showGlassAlert(errorInfo.title, errorInfo.message);
        }}
      />
      
      {/* Face Capture Overlay - круглая маска */}
      <FaceCaptureOverlay
        isActive={hasPermission && cameraReady && !isProcessing && overlayActive}
        isCapturing={isCapturing}
        onAnimationComplete={() => {
          // console.log('🎭 Face capture overlay animation completed for registration');
          // Показываем кнопки с задержкой 100ms после маски
          setTimeout(() => {
            setButtonsVisible(true);
          }, 100);
        }}
      />

      <View style={styles(theme).overlay}>
        {/* Header info */}
        <View style={styles(theme).topInfo}>
          <Text style={styles(theme).modeText}>
            📋 Biometric Registration
          </Text>
          {employeeName && (
            <Text style={styles(theme).userText}>
              Employee: {employeeName}
            </Text>
          )}
        </View>

        {/* Error display */}
        {error && (
          <View style={styles(theme).errorContainer}>
            <Text style={styles(theme).errorBanner}>⚠️ {error}</Text>
          </View>
        )}

        {/* Face guide - только инструкции без дублирования таймера */}
        <View style={styles(theme).faceGuide}>
          <Text 
            style={styles(theme).instructionText}
            accessible={true}
            accessibilityLabel={countdown ? `Taking registration photo in ${countdown} seconds` : 'Position your face within the frame for biometric registration'}
          >
            Position your face within the frame for registration
          </Text>
        </View>

        {/* Controls */}
        <View style={styles(theme).bottomControls}>
          <TouchableOpacity
            style={[
              styles(theme).actionButton,
              styles(theme).registerButton,
              (isProcessing || !!countdown || isCapturing) && styles(theme).disabledButton
            ]}
            onPress={startCountdown}
            disabled={isProcessing || !!countdown || isCapturing}
            accessible={true}
            accessibilityLabel={
              isProcessing ? 'Processing biometric registration' :
              countdown ? `Taking registration photo in ${countdown} seconds` :
              'Take photo for registration'
            }
            accessibilityRole="button"
          >
            {!!(isProcessing || isCapturing) && (
              <ActivityIndicator 
                size="small" 
                color="#FFFFFF" 
                style={styles(theme).buttonLoader}
              />
            )}
            <Text style={styles(theme).actionButtonText}>
              {isProcessing ? 'Processing...' : getButtonText(countdown, 'Take Photo for Registration')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles(theme).cancelButton}
            onPress={() => {
              console.log('🚫 Cancel button pressed in biometric registration');
              const returnPath = getReturnPath();
              console.log('📱 Navigation params:', { 
                selfService, 
                returnTo,
                employeeId,
                employeeName,
                returnPath
              });
              
              console.log('📱 Cancelling registration, returning to:', returnPath);
              router.replace(returnPath);
            }}
            disabled={isProcessing || !!countdown}
          >
            <Text style={styles(theme).cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          {/* Instructions */}
          <View style={styles(theme).instructionsContainer}>
            <Text style={styles(theme).instructionsTitle}>Instructions:</Text>
            <Text style={styles(theme).instructionsText}>
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
    </LiquidGlassLayout>
  );
}

const styles = (theme) => StyleSheet.create({
  container: { 
    backgroundColor: 'transparent', 
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
    backgroundColor: theme.colors.background.primary,
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
  statusText: {
    fontSize: 12, // Уменьшили размер
    color: theme.colors.text.light,
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
    paddingBottom: 180,
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
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    height: 48, // Фиксированная высота
    minWidth: '100%',
  },
  registerButton: {
    backgroundColor: theme.colors.primary,
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
    color: '#FFFFFF',
    marginBottom: 6,
  },
  instructionsText: {
    fontSize: 12, // Уменьшили размер
    color: '#FFFFFF',
    lineHeight: 16,
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
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 10,
    textAlign: 'center',
  },
});