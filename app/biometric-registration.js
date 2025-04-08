import React, { useState, useRef } from 'react';
import { View, Button, StyleSheet, Text, Alert, ActivityIndicator } from 'react-native';
import CustomCamera from '../components/CustomCamera';
import { useLocalSearchParams, router } from 'expo-router';
import api from '../src/api/client';
import { API_ENDPOINTS } from '../src/config';

export default function BiometricRegistrationScreen() {
  const cameraRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  // Get parameters from the URL
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
        
        // Automatically send photo to the server
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
      
      // Prepare data for the API (useful for future implementation)
      const requestData = {
        employee_id: employeeId,
        image: imageData
      };
      
      console.log('Would send registration data for employee:', employeeId);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulated server response
      const mockResponse = {
        data: {
          success: true
        }
      };

      if (mockResponse.data.success) {
        Alert.alert(
          'Success', 
          `Face registered for ${employeeName || `employee #${employeeId}`}`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', 'Registration failed');
      }
      
      // Real API call (commented for future use)
      /*
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
      */
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert(
        'Error',
        'Failed to register. Please try again.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <CustomCamera
        style={styles.camera}
        type="front"
        innerRef={cameraRef}
      >
        <View style={styles.overlay}>
          <View style={styles.faceGuide} />
        </View>
      </CustomCamera>
      
      <View style={styles.controlPanel}>
        {employeeName && (
          <Text style={styles.employeeName}>Employee: {employeeName}</Text>
        )}
        
        <Button 
          title={loading ? "Processing..." : "Take Photo for Registration"} 
          onPress={takePhoto}
          disabled={loading}
        />
        
        {loading && <ActivityIndicator style={styles.loader} size="large" color="#fff" />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  faceGuide: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 125,
  },
  controlPanel: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  employeeName: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  loader: {
    marginTop: 10,
  }
});