import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera } from 'expo-camera';
import { showGlassAlert } from './useGlobalGlassModal';

export function useBiometricCamera(onPhotoTaken, externalCameraRef = null, externalCameraReady = true) {
  const internalCameraRef = useRef(null);
  const cameraRef = externalCameraRef || internalCameraRef;
  const timerRef = useRef(null);

  const [hasPermission, setHasPermission] = useState(null);
  const cameraReady = externalCameraReady;
  const [cameraActive, setCameraActive] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [error, setError] = useState(null);
  const [overlayActive, setOverlayActive] = useState(true);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (cameraRef.current) {
        cameraRef.current = null;
      }
    };
  }, []);

  // Request camera permissions
  const requestCameraPermission = useCallback(async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        if (__DEV__) {
          console.warn('⚠️ Camera permission denied by user');
        }
        const errorMessage = 'Camera access is required for biometric features. Please enable it in your device settings and restart the app.';
        setError(errorMessage);
        
        // Show user-friendly alert
        showGlassAlert(
          'Camera Permission Required',
          'To use biometric check-in/out, please:\n\n1. Go to your device Settings\n2. Find this app\n3. Enable Camera permission\n4. Restart the app'
        );
      }
    } catch (error) {
      if (__DEV__) {
        console.error('❌ Camera permission error:', error.message);
      }
      setHasPermission(false);
      const errorMessage = 'Unable to access camera. Please check your device settings.';
      setError(errorMessage);
      
      showGlassAlert(
        'Camera Error', 
        'There was a problem accessing your camera. Please try restarting the app or check your device settings.'
      );
    }
  }, []);

  // Initialize camera permissions on mount
  useEffect(() => {
    requestCameraPermission();
  }, [requestCameraPermission]);

  // Start countdown for photo capture
  const startCountdown = useCallback(() => {
    console.log('🎬 StartCountdown called, cameraReady:', cameraReady, 'isCapturing:', isCapturing);
    if (isCapturing) return;
    
    // Clear any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setCountdown(3);
    setIsCapturing(true);
    
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          takePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isCapturing, cameraReady]);

  // Take photo
  const takePhoto = useCallback(async () => {
    // Clear any previous errors
    setError(null);
    
    // Validate camera ref
    if (!cameraRef.current) {
      if (__DEV__) {
        console.error('❌ Camera ref is null or undefined');
      }
      const errorMsg = 'Camera not initialized. Please restart the app.';
      setError(errorMsg);
      showGlassAlert(
        'Camera Error', 
        'Camera is not ready. Please go back and try again.',
        [{ text: 'OK' }]
      );
      setIsCapturing(false);
      return;
    }
    
    if (!cameraReady) {
      if (__DEV__) {
        console.warn('⚠️ Camera not ready yet, cameraReady:', cameraReady);
      }
      setError('Camera is still initializing. Please wait.');
      setIsCapturing(false);
      return;
    }

    try {
      if (__DEV__) {
        console.log('📸 Starting photo capture...');
      }
      
      // Small delay before capture for stability
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
        exif: false
      });

      if (!photo || !photo.base64) {
        throw new Error('Photo capture returned invalid data - base64 is missing');
      }

      if (__DEV__) {
        console.log('📸 Photo captured successfully');
      }
      
      // Call the callback function with the photo
      if (onPhotoTaken) {
        await onPhotoTaken(photo);
      }
      
    } catch (error) {
      if (__DEV__) {
        console.error('❌ Error capturing photo:', error.message);
      }
      
      // Use enhanced camera error handling
      let title = '📷 Photo Capture Failed';
      let message = 'Unable to take photo. ';
      
      if (error.message?.includes('Camera is not ready')) {
        title = '⏳ Camera Not Ready';
        message = 'The camera is still initializing. Please wait a moment and try again.';
      } else if (error.message?.includes('Camera is already taking a picture')) {
        title = '⏱️ Please Wait';
        message = 'A photo is already being taken. Please wait for it to complete.';
      } else if (error.message?.includes('permission')) {
        title = '🔒 Permission Error';
        message = 'Camera permission was revoked. Please enable camera access in your device settings.';
      } else if (error.message?.includes('base64 is missing')) {
        title = '📸 Capture Error';
        message = 'Photo could not be processed. Please try again with better lighting.';
      } else {
        title = '❌ Camera Error';
        message = `Something went wrong with the camera: ${error.message || 'Unknown error'}`;
      }
      
      setError(message);
      showGlassAlert(title, message);
    } finally {
      setIsCapturing(false);
    }
  }, [cameraReady, onPhotoTaken]);

  // Handle camera ready
  const handleCameraReady = useCallback(() => {
    console.log('✅ Camera is ready');
    setCameraReady(true);
  }, []);

  // Handle camera mount error
  const handleCameraMountError = useCallback((error) => {
    console.error('❌ Camera mount error:', error);
    setError(`Camera failed to initialize: ${error.message}`);
    setCameraReady(false);
  }, []);

  // Reset camera state (useful for error recovery)
  const resetCamera = useCallback(() => {
    setError(null);
    setIsCapturing(false);
    setCameraReady(false);
    setCountdown(null);
    
    // Clear timer if running
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Force camera reinitialization
    setCameraActive(false);
    setTimeout(() => {
      setCameraActive(true);
    }, 500);
  }, []);

  // Get button text based on current state
  const getButtonText = useCallback((loadingText = 'Processing...', defaultText = 'Take Photo') => {
    if (countdown !== null && countdown > 0) return `Taking photo in ${countdown}...`;
    return defaultText;
  }, [countdown]);

  return {
    // Core functionality only
    isCapturing,
    countdown,
    
    // Actions
    startCountdown,
    
    // UI helpers
    getButtonText
  };
}

export default useBiometricCamera;