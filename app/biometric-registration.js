import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  ActivityIndicator, 
  TouchableOpacity,
  SafeAreaView,
  Platform
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
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import HeaderBackButton from '../src/components/HeaderBackButton';
import useBiometricCamera from '../hooks/useBiometricCamera';

export default function BiometricRegistrationScreen() {
  const [isProcessing, setIsProcessing] = useState(false);
  const theme = useLiquidGlassTheme();
  const { showSuccess, showError } = useToast();

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
      console.log('📱 Using legacy selfService logic: /check-in-out');
      return '/check-in-out';
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
          onPress={() => {
            console.log('🚫 Cancel button pressed in biometric registration');
            const returnPath = getReturnPath();
            console.log('📱 Cancelling registration, returning to:', returnPath);
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
              <Text style={styles(theme).errorText}>⚠️ {error}</Text>
            </View>
          </View>
        )}

        {/* Camera Button & Controls */}
        <View style={styles(theme).bottomControls}>
          {/* Main Camera Button */}
          <TouchableOpacity
            style={[
              styles(theme).cameraButtonContainer,
              (isProcessing || !!countdown || isCapturing) && styles(theme).disabledButton
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
            {isProcessing ? 'Processing...' : getButtonText(countdown, 'Take Photo for Registration')}
          </Text>

          {/* Cancel Button */}
          <LiquidGlassButton
            title="Cancel"
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
            variant="ghost"
            style={styles(theme).cancelButton}
            disabled={isProcessing || !!countdown}
          />
        </View>
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
  
  // Common styles
  instructionText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    color: theme.colors.status.error[0],
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
});