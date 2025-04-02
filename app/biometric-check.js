// app/biometric-check.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { useLocalSearchParams, router } from 'expo-router';
import api from '../src/api/client';
import { API_ENDPOINTS } from '../src/config';

export default function BiometricCheckScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);
  
  // Get parameters from URL
  const { mode } = useLocalSearchParams();
  const isCheckIn = mode === 'check-in';
  
  useEffect(() => {
    (async () => {
      // Request camera permissions
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      setHasPermission(cameraStatus.status === 'granted');
      
      // Request location permissions
      const locationStatus = await Location.requestForegroundPermissionsAsync();
      if (locationStatus.status === 'granted') {
        try {
          const currentLocation = await Location.getCurrentPositionAsync({});
          setLocation(currentLocation);
        } catch (error) {
          console.error('Error getting location:', error);
        }
      }
    })();
  }, []);
  
  const handleCheckAction = async () => {
    if (!cameraRef.current) return;
    
    setLoading(true);
    try {
      // Take a picture
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });
      
      // Prepare location string if available
      let locationString = '';
      if (location) {
        locationString = `${location.coords.latitude},${location.coords.longitude}`;
      }
      
      // Prepare API request
      const endpoint = isCheckIn 
        ? API_ENDPOINTS.BIOMETRICS.CHECK_IN 
        : API_ENDPOINTS.BIOMETRICS.CHECK_OUT;
      
      const requestData = {
        image: `data:image/jpeg;base64,${photo.base64}`,
        location: locationString
      };
      
      // Send to backend
      const response = await api.post(endpoint, requestData);
      
      if (response.data.success) {
        Alert.alert(
          'Success', 
          isCheckIn 
            ? 'Check-in successful!' 
            : 'Check-out successful!',
          [{ text: 'OK', onPress: () => router.push('/employees') }]
        );
      } else {
        Alert.alert('Error', response.data.error || 'Face recognition failed');
      }
    } catch (error) {
      console.error('Error during check process:', error);
      Alert.alert(
        'Error', 
        error.response?.data?.error || 'An error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };
  
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }
  
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera access denied</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Camera 
        style={styles.camera} 
        type={Camera.Constants.Type.front}
        ref={cameraRef}
      >
        <View style={styles.cameraContent}>
          <View style={styles.faceOverlay}>
            <View style={styles.faceBox} />
          </View>
        </View>
      </Camera>
      
      <View style={styles.controlPanel}>
        <Text style={styles.title}>
          {isCheckIn ? 'Check-In Process' : 'Check-Out Process'}
        </Text>
        
        <Text style={styles.instructions}>
          Position your face in the frame and press the button
        </Text>
        
        {!location && (
          <Text style={styles.warningText}>
            Location services are disabled. Your location won't be recorded.
          </Text>
        )}
        
        <TouchableOpacity
          style={[
            styles.actionButton,
            isCheckIn ? styles.checkInButton : styles.checkOutButton
          ]}
          onPress={handleCheckAction}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.actionButtonText}>
              {isCheckIn ? 'Check-In' : 'Check-Out'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  camera: {
    flex: 1,
  },
  cameraContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  faceOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 125,
  },
  controlPanel: {
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  warningText: {
    color: '#ff9800',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  actionButton: {
    width: '100%',
    height: 50,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  checkInButton: {
    backgroundColor: '#4CAF50',
  },
  checkOutButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#f44336',
    fontSize: 18,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});