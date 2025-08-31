// app/biometric-verification.js
import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useUser } from '../src/contexts/UserContext';
import useColors from '../hooks/useColors';
import HeaderBackButton from '../src/components/HeaderBackButton';
import useLocation from '../hooks/useLocation';
import ApiService from '../src/api/apiService';
import { APP_CONFIG } from '../src/config';

export default function BiometricVerificationScreen() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef(null);

  const { user } = useUser();
  const { palette } = useColors();
  const { location } = useLocation({ watchPosition: false });

  // Get navigation parameters
  const params = useLocalSearchParams();
  const operationType = params.operation_type || 'general';
  const nextAction = params.next_action;
  const returnTo = params.return_to || '/employees';

  const getVerificationTitle = () => {
    switch (operationType) {
      case 'payroll':
        return 'Payroll Verification';
      case 'admin_actions':
        return 'Admin Verification';
      case 'time_tracking':
        return 'Time Tracking Verification';
      default:
        return 'Biometric Verification';
    }
  };

  const getVerificationDescription = () => {
    switch (operationType) {
      case 'payroll':
        return 'Payroll operations require biometric verification for security. Please capture your face to continue.';
      case 'admin_actions':
        return 'Administrative actions require biometric verification. Please capture your face to continue.';
      case 'time_tracking':
        return 'Time tracking operations require biometric verification. Please capture your face to continue.';
      default:
        return 'This operation requires biometric verification for security. Please capture your face to continue.';
    }
  };

  const handleStartCapture = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please grant camera permission to use biometric verification.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    setShowCamera(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [permission, requestPermission]);

  const handleVerificationSuccess = useCallback(
    _result => {
      // If we have a next action, execute it
      if (nextAction) {
        switch (nextAction) {
          case 'check-in':
            router.replace('/biometric-check?mode=check-in');
            break;
          case 'check-out':
            router.replace('/biometric-check?mode=check-out');
            break;
          default:
            router.replace(returnTo);
            break;
        }
      } else {
        // Just go back to the return destination
        router.replace(returnTo);
      }
    },
    [nextAction, returnTo]
  );

  const processBiometricVerification = useCallback(
    async imageBase64 => {
      try {
        // console.log('Processing biometric verification...');

        // Create location data
        const locationData = location
          ? {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy,
            }
          : null;

        // Call biometric verification API
        const result = await ApiService.auth.biometricVerification(
          `data:image/jpeg;base64,${imageBase64}`,
          operationType,
          locationData
        );

        if (result.success) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          console.log('Biometric verification successful');

          Alert.alert(
            'Verification Successful',
            `Biometric verification completed with ${Math.round(result.confidence_score * 100)}% confidence.`,
            [
              {
                text: 'Continue',
                onPress: () => handleVerificationSuccess(result),
              },
            ]
          );
        } else {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

          Alert.alert(
            'Verification Failed',
            result.message || 'Biometric verification failed. Please try again.',
            [
              { text: 'Retry', onPress: () => setShowCamera(true) },
              { text: 'Cancel', onPress: () => router.back() },
            ]
          );
        }
      } catch (error) {
        console.error('Biometric verification failed:', error.message);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        const errorMessage =
          error.response?.data?.message || error.message || 'Verification failed';

        Alert.alert('Verification Error', errorMessage, [
          { text: 'Retry', onPress: () => setShowCamera(true) },
          { text: 'Cancel', onPress: () => router.back() },
        ]);
      } finally {
        setIsProcessing(false);
      }
    },
    [location, operationType, handleVerificationSuccess]
  );

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing || isProcessing) return;

    try {
      setIsCapturing(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // console.log('Capturing biometric verification image...');

      const photo = await cameraRef.current.takePictureAsync({
        quality: APP_CONFIG.CAMERA_QUALITY,
        base64: true,
        skipProcessing: false,
      });

      if (!photo?.base64) {
        throw new Error('Failed to capture image');
      }

      setIsCapturing(false);
      setShowCamera(false);
      setIsProcessing(true);

      await processBiometricVerification(photo.base64);
    } catch (error) {
      console.error('Capture error:', error);
      setIsCapturing(false);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    }
  }, [isCapturing, isProcessing, processBiometricVerification]);

  const handleCancel = () => {
    if (showCamera) {
      setShowCamera(false);
    } else {
      router.back();
    }
  };

  if (!user) {
    return (
      <View style={styles(palette).container}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  if (showCamera) {
    return (
      <View style={styles(palette).cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles(palette).camera}
          facing="front"
          enableTorch={false}
        >
          {/* Camera overlay */}
          <View style={styles(palette).cameraOverlay}>
            {/* Top section */}
            <View style={styles(palette).cameraTop}>
              <TouchableOpacity style={styles(palette).cancelButton} onPress={handleCancel}>
                <Text style={styles(palette).cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Face guide */}
            <View style={styles(palette).faceGuideContainer}>
              <View style={styles(palette).faceGuide}>
                <Text style={styles(palette).guideText}>Position your face within the circle</Text>
              </View>
            </View>

            {/* Bottom section with capture button */}
            <View style={styles(palette).cameraBottom}>
              <TouchableOpacity
                style={[
                  styles(palette).captureButton,
                  isCapturing && styles(palette).captureButtonDisabled,
                ]}
                onPress={handleCapture}
                disabled={isCapturing}
              >
                {isCapturing ? (
                  <ActivityIndicator size="large" color={palette.text.light} />
                ) : (
                  <View style={styles(palette).captureInner} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles(palette).container}>
      <HeaderBackButton />

      <ScrollView contentContainerStyle={styles(palette).scrollContent}>
        {/* Header */}
        <View style={styles(palette).header}>
          <Text style={styles(palette).title}>{getVerificationTitle()}</Text>
          <Text style={styles(palette).subtitle}>
            {user.first_name} {user.last_name}
          </Text>
        </View>

        {/* Description */}
        <View style={styles(palette).descriptionCard}>
          <Text style={styles(palette).description}>{getVerificationDescription()}</Text>
        </View>

        {/* Security Info */}
        <View style={styles(palette).securityCard}>
          <Text style={styles(palette).securityTitle}>Security Information</Text>
          <Text style={styles(palette).securityText}>
            • Your biometric data is processed securely{'\n'}• Images are not stored permanently
            {'\n'}• Verification is required for{' '}
            {operationType === 'general' ? 'sensitive operations' : operationType}
          </Text>
        </View>

        {/* Instructions */}
        <View style={styles(palette).instructionsCard}>
          <Text style={styles(palette).instructionsTitle}>📋 Instructions</Text>
          <Text style={styles(palette).instructionsText}>
            1. Tap &quot;Start Verification&quot; below{'\n'}
            2. Position your face within the circle{'\n'}
            3. Keep still and look at the camera{'\n'}
            4. Tap the capture button
          </Text>
        </View>

        {/* Actions */}
        <View style={styles(palette).actions}>
          {isProcessing ? (
            <View style={styles(palette).processingContainer}>
              <ActivityIndicator size="large" color={palette.primary} />
              <Text style={styles(palette).processingText}>
                Processing biometric verification...
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={styles(palette).startButton} onPress={handleStartCapture}>
              <Text style={styles(palette).startButtonText}>Start Verification</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles(palette).cancelMainButton} onPress={handleCancel}>
            <Text style={styles(palette).cancelMainText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = palette =>
  StyleSheet.create({
    container: {
      backgroundColor: palette.background.secondary,
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      color: palette.text.primary,
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      color: palette.text.secondary,
      fontSize: 16,
      textAlign: 'center',
    },
    descriptionCard: {
      backgroundColor: palette.background.primary,
      borderRadius: 12,
      marginBottom: 16,
      padding: 20,
    },
    description: {
      color: palette.text.primary,
      fontSize: 16,
      lineHeight: 24,
      textAlign: 'center',
    },
    securityCard: {
      backgroundColor: palette.primaryBackground,
      borderColor: palette.primary,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 16,
      padding: 16,
    },
    securityTitle: {
      color: palette.primary,
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    securityText: {
      color: palette.primaryDark,
      fontSize: 14,
      lineHeight: 20,
    },
    instructionsCard: {
      backgroundColor: palette.background.primary,
      borderRadius: 12,
      marginBottom: 24,
      padding: 16,
    },
    instructionsTitle: {
      color: palette.text.primary,
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    instructionsText: {
      color: palette.text.secondary,
      fontSize: 14,
      lineHeight: 20,
    },
    actions: {
      gap: 12,
    },
    startButton: {
      alignItems: 'center',
      backgroundColor: palette.primary,
      borderRadius: 12,
      padding: 16,
    },
    startButtonText: {
      color: palette.text.light,
      fontSize: 18,
      fontWeight: 'bold',
    },
    cancelMainButton: {
      alignItems: 'center',
      backgroundColor: palette.text.secondary,
      borderRadius: 12,
      padding: 16,
    },
    cancelMainText: {
      color: palette.text.light,
      fontSize: 16,
      fontWeight: 'bold',
    },
    processingContainer: {
      alignItems: 'center',
      padding: 20,
    },
    processingText: {
      color: palette.text.primary,
      fontSize: 16,
      marginTop: 12,
      textAlign: 'center',
    },

    // Camera styles
    cameraContainer: {
      flex: 1,
    },
    camera: {
      flex: 1,
    },
    cameraOverlay: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      flex: 1,
    },
    cameraTop: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      padding: 20,
      paddingTop: 60, // Account for status bar
    },
    cancelButton: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    cancelText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    faceGuideContainer: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
    faceGuide: {
      alignItems: 'center',
      borderColor: 'white',
      borderRadius: 125,
      borderStyle: 'dashed',
      borderWidth: 3,
      height: 250,
      justifyContent: 'center',
      width: 250,
    },
    guideText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
      marginTop: 20,
      textAlign: 'center',
    },
    cameraBottom: {
      alignItems: 'center',
      paddingBottom: 50,
    },
    captureButton: {
      alignItems: 'center',
      backgroundColor: 'white',
      borderColor: palette.primary,
      borderRadius: 40,
      borderWidth: 4,
      height: 80,
      justifyContent: 'center',
      width: 80,
    },
    captureButtonDisabled: {
      opacity: 0.6,
    },
    captureInner: {
      backgroundColor: palette.primary,
      borderRadius: 30,
      height: 60,
      width: 60,
    },
  });
