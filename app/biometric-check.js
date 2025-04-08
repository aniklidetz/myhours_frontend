import React, { useState, useRef } from 'react';
import { View, Button, StyleSheet, Text, Alert, ActivityIndicator } from 'react-native';
import CustomCamera from '../components/CustomCamera';
import { useLocalSearchParams, router } from 'expo-router';
import * as Location from 'expo-location';
import api from '../src/api/client';
import { API_ENDPOINTS } from '../src/config';

export default function BiometricCheckScreen() {
  const cameraRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  
  // Get parameters from the URL
  const { mode } = useLocalSearchParams();
  const isCheckIn = mode === 'check-in';

  // Request location as soon as the component mounts
  React.useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const currentLocation = await Location.getCurrentPositionAsync({});
          setLocation(currentLocation);
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    })();
  }, []);

  const takePhoto = async () => {
    if (cameraRef.current) {
      setLoading(true);
      try {
        // Take a picture
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
        });
        console.log('Photo captured (check):', photo);

        // Prepare location string if available
        let locationString = '';
        if (location) {
          locationString = `${location.coords.latitude},${location.coords.longitude}`;
        }

        // Prepare API request data
        const requestData = {
          image: `data:image/jpeg;base64,${photo.base64}`,
          location: locationString
        };
        
        console.log('Would send data to server:', requestData);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simulated server response
        const mockResponse = {
          data: {
            success: true
          }
        };

        // Use mock instead of real API response
        if (mockResponse.data.success) {
          Alert.alert(
            'Success',
            isCheckIn
              ? 'Check-in successful!'
              : 'Check-out successful!',
            [{ text: 'OK', onPress: () => router.push('/employees') }]
          );
        } else {
          Alert.alert('Error', 'Face recognition failed');
        }
        
        // Real API call, commented for future use
        /*
        const endpoint = isCheckIn
          ? API_ENDPOINTS.BIOMETRICS.CHECK_IN
          : API_ENDPOINTS.BIOMETRICS.CHECK_OUT;
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
        */
      } catch (error) {
        console.error('Error during check process:', error);
        Alert.alert(
          'Error',
          'An error occurred. Please try again.'
        );
      } finally {
        setLoading(false);
      }
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
        
        <Button 
          title={loading ? "Processing..." : isCheckIn ? "Check In" : "Check Out"} 
          onPress={takePhoto}
          disabled={loading}
          color={isCheckIn ? "#4CAF50" : "#F44336"}
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
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  instructions: {
    color: 'white',
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
  loader: {
    marginTop: 10,
  }
});