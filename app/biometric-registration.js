import React, { useState, useRef } from 'react';
import { View, Button, StyleSheet, Text, Alert, ActivityIndicator } from 'react-native';
import CustomCamera from '../components/CustomCamera';
import { useLocalSearchParams, router } from 'expo-router';
import api from '../src/api/client';
import { API_ENDPOINTS } from '../src/config';
import useColors from '../hooks/useColors';
import Colors from '../constants/Colors';  // Добавляем импорт Colors

export default function BiometricRegistrationScreen() {
  const cameraRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [_, setCapturedImage] = useState(null);
  const { palette, isDark } = useColors(); // используем хук для получения текущей цветовой палитры

  const { employeeId, employeeName } = useLocalSearchParams();

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        setLoading(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
        });
        console.log('Photo captured (registration):', photo);
        setCapturedImage(photo);
        await registerFace(photo);
      } catch (error) {
        console.error('Error capturing photo (registration):', error);
        Alert.alert('Error', 'Failed to capture photo. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const registerFace = async (photo) => {
    if (!photo || !employeeId) {
      Alert.alert('Error', 'Image or employee ID is missing');
      return;
    }

    try {
      const imageData = `data:image/jpeg;base64,${photo.base64}`;
      const requestData = {
        employee_id: employeeId,
        image: imageData
      };

      // real API-request
      try {
        console.log('Attempting API call to register face for employee:', employeeId);
        const response = await api.post(API_ENDPOINTS.BIOMETRICS.REGISTER, requestData);
        
        if (response.data.success) {
          Alert.alert(
            'Success',
            `Face registered for ${employeeName || `employee #${employeeId}`}`,
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } else {
          Alert.alert('Error', response.data.error || 'Registration failed');
        }
      } catch (apiError) {
        console.error('API call failed:', apiError);
        
        //  fallback to mock if API is not available
        console.log('Using fallback mock data since API is not available');
        
        // await
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // alert in dev mode
        Alert.alert(
          'Development Mode',
          `Using mock data. Face would be registered for ${employeeName || `employee #${employeeId}`}`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to register. Please try again.');
    }
  };

  return (
    <View style={styles(palette).container}>
      <CustomCamera
        style={styles(palette).camera}
        type="front"
        innerRef={cameraRef}
      >
        <View style={styles(palette).overlay}>
          <View style={styles(palette).faceGuide} />
        </View>
      </CustomCamera>

      <View style={styles(palette).controlPanel}>
        {employeeName && (
          <Text style={styles(palette).employeeName}>Employee: {employeeName}</Text>
        )}

        <Button
          title={loading ? "Processing..." : "Take Photo for Registration"}
          onPress={takePhoto}
          disabled={loading}
          color={palette.primary}
        />

        {loading && (
          <ActivityIndicator style={styles(palette).loader} size="large" color={palette.text.light} />
        )}
      </View>
    </View>
  );
}

// Преобразуем стили в функцию, которая принимает цветовую палитру
const styles = (palette) => StyleSheet.create({
  camera: {
    flex: 1,
  },
  container: {
    backgroundColor: palette.background.dark,
    flex: 1,
  },
  controlPanel: {
    backgroundColor: palette.overlay.dark,
    padding: 20,
  },
  employeeName: {
    color: palette.text.light,
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  faceGuide: {
    borderColor: Colors.createBorderWithOpacity(palette.text.light, 0.7),
    borderRadius: 125,
    borderWidth: 2,
    height: 250,
    width: 250,
  },
  loader: {
    marginTop: 10,
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: palette.background.transparent,
    flex: 1,
    justifyContent: 'center',
  },
});