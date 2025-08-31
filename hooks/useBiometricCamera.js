import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { Camera } from 'expo-camera';
import { showGlassAlert } from './useGlobalGlassModal';

const isIOS = Platform.OS === 'ios';

export function useBiometricCamera(
  onPhotoTaken,
  externalCameraRef = null,
  externalCameraReady = true
) {
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
          console.warn('Camera permission denied by user');
        }
        const errorMessage =
          'Camera access is required for biometric features. Please enable it in your device settings and restart the app.';
        setError(errorMessage);

        // Show user-friendly alert
        showGlassAlert(
          'Camera Permission Required',
          'To use biometric check-in/out, please:\n\n1. Go to your device Settings\n2. Find this app\n3. Enable Camera permission\n4. Restart the app'
        );
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Camera permission error:', error.message);
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
    console.log('StartCountdown called, cameraReady:', cameraReady, 'isCapturing:', isCapturing);
    if (isCapturing) return;

    // Clear any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setCountdown(3);
    setIsCapturing(true);

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          takePhoto(0); // Start with retry count 0
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isCapturing, cameraReady]);

  // Take photo with retry mechanism
  const takePhoto = useCallback(
    async (retryCount = 0) => {
      const maxRetries = 2;

      // Clear any previous errors
      setError(null);

      // Validate camera ref
      if (!cameraRef.current) {
        if (__DEV__) {
          console.error('Camera ref is null or undefined');
        }
        const errorMsg = 'Camera not initialized. Please restart the app.';
        setError(errorMsg);
        showGlassAlert('Camera Error', 'Camera is not ready. Please go back and try again.', [
          { text: 'OK' },
        ]);
        setIsCapturing(false);
        return;
      }

      if (!cameraReady) {
        if (__DEV__) {
          console.warn('Camera not ready yet, cameraReady:', cameraReady);
        }
        setError('Camera is still initializing. Please wait.');
        setIsCapturing(false);
        return;
      }

      try {
        if (__DEV__) {
          console.log('Starting photo capture...');
        }

        // Small delay before capture for stability
        await new Promise(resolve => setTimeout(resolve, 200));

        // Add timeout to prevent hanging
        const photoPromise = cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
          exif: false,
          skipProcessing: true, // Changed to true for iOS compatibility
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Photo capture timed out after 10 seconds')), 10000)
        );

        // Add platform-specific error handling
        const isIOS = Platform.OS === 'ios';

        const photo = await Promise.race([photoPromise, timeoutPromise]);

        if (!photo) {
          throw new Error('Image could not be captured - photo is null');
        }

        if (!photo.base64) {
          throw new Error('Image could not be captured - base64 data missing');
        }

        if (photo.base64.length < 1000) {
          throw new Error('Image could not be captured - image too small or corrupted');
        }

        if (__DEV__) {
          console.log('Photo captured successfully');
        }

        // Call the callback function with the photo
        if (onPhotoTaken) {
          await onPhotoTaken(photo);
        }
      } catch (error) {
        if (__DEV__) {
          console.error('Error capturing photo:', error.message);
        }

        // Use enhanced camera error handling
        let title = 'Photo Capture Failed';
        let message = 'Unable to take photo. ';

        if (error.message?.includes('Camera is not ready')) {
          title = 'Camera Not Ready';
          message = 'The camera is still initializing. Please wait a moment and try again.';
        } else if (error.message?.includes('Camera is already taking a picture')) {
          title = 'Please Wait';
          message = 'A photo is already being taken. Please wait for it to complete.';
        } else if (error.message?.includes('permission')) {
          title = 'Permission Error';
          message =
            'Camera permission was revoked. Please enable camera access in your device settings.';
        } else if (error.message?.includes('timed out')) {
          title = 'Camera Timeout';
          message = 'Camera took too long to respond. Please try again.';
        } else if (
          error.message?.includes('base64') ||
          error.message?.includes('Image could not be captured')
        ) {
          title = 'Capture Error';
          message =
            'Photo could not be processed. Please ensure good lighting and try again. If the problem persists, restart the app.';
        } else if (
          isIOS &&
          (error.message?.includes('AVCaptureSession') || error.name === 'CameraError')
        ) {
          title = 'iOS Camera Error';
          message =
            'Camera session interrupted. Please go back and try again, or restart the app if the problem persists.';
        } else {
          title = 'Camera Error';
          message = `Something went wrong with the camera: ${error.message || 'Unknown error'}`;
        }

        // Retry logic for certain errors
        if (
          retryCount < maxRetries &&
          (error.message?.includes('Image could not be captured') ||
            error.message?.includes('base64') ||
            error.message?.includes('too small'))
        ) {
          console.log(`Retrying photo capture (attempt ${retryCount + 1}/${maxRetries})`);

          // Wait a bit before retry
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Reset states for retry
          setIsCapturing(false);
          setCountdown(null);

          // Retry
          return takePhoto(retryCount + 1);
        }

        setError(message);
        showGlassAlert(title, message);

        // Reset countdown state
        setCountdown(null);
      } finally {
        setIsCapturing(false);

        // Clear any remaining timers
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    },
    [cameraReady, onPhotoTaken]
  );

  // Reset camera state - emergency cleanup
  const resetCameraState = useCallback(() => {
    console.log('Resetting camera state...');

    // Clear any timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Reset all states
    setIsCapturing(false);
    setCountdown(null);
    setError(null);

    console.log('Camera state reset complete');
  }, []);

  // Handle camera ready
  const handleCameraReady = useCallback(() => {
    console.log('Camera is ready');
    resetCameraState(); // Reset state when camera becomes ready
    // setCameraReady is not defined in this hook - camera ready state is managed externally
  }, []);

  // Handle camera mount error
  const handleCameraMountError = useCallback(error => {
    console.error('Camera mount error:', error);
    setError(`Camera failed to initialize: ${error.message}`);
    // setCameraReady is not defined in this hook - camera ready state is managed externally
  }, []);

  // Reset camera state (useful for error recovery)
  const resetCamera = useCallback(() => {
    setError(null);
    setIsCapturing(false);
    // setCameraReady is managed externally
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
  const getButtonText = useCallback(
    (loadingText = 'Processing...', defaultText = 'Take Photo') => {
      if (countdown !== null && countdown > 0) return `Taking photo in ${countdown}...`;
      return defaultText;
    },
    [countdown]
  );

  return {
    // Core functionality only
    isCapturing,
    countdown,
    error,

    // Actions
    startCountdown,
    resetCameraState,

    // UI helpers
    getButtonText,
  };
}

export default useBiometricCamera;
