// app/biometric-registration.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  Image
} from 'react-native';
import { Camera } from 'expo-camera';
import { useLocalSearchParams, router } from 'expo-router';
import api from '../src/api/client';
import { API_ENDPOINTS } from '../src/config';

export default function BiometricRegistrationScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [type, setType] = useState(Camera.Constants.Type.front);
  const [capturedImage, setCapturedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);
  
  // Get parameters from URL
  const { employeeId, employeeName } = useLocalSearchParams();
  
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
        });
        setCapturedImage(photo);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture. Please try again.');
      }
    }
  };

  const registerFace = async () => {
    if (!capturedImage || !employeeId) {
      Alert.alert('Error', 'Image or employee ID is missing');
      return;
    }

    setLoading(true);
    try {
      const imageData = `data:image/jpeg;base64,${capturedImage.base64}`;
      
      const response = await api.post(API_ENDPOINTS.BIOMETRICS.REGISTER, {
        employee_id: employeeId,
        image: imageData
      });
      
      if (response.data.success) {
        Alert.alert(
          'Success', 
          `Face registered for ${employeeName || `employee #${employeeId}`}`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', response.data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to register. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const retakePicture = () => {
    setCapturedImage(null);
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

  if (capturedImage) {
    // Preview and confirmation screen
    return (
      <View style={styles.container}>
        <View style={styles.previewContainer}>
          <Image 
            source={{ uri: capturedImage.uri }} 
            style={styles.previewImage} 
          />
          
          <Text style={styles.previewTitle}>Confirm Image</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.buttonSecondary]} 
              onPress={retakePicture}
            >
              <Text style={styles.buttonTextSecondary}>Retake</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.buttonPrimary]} 
              onPress={registerFace}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Register</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Camera capture screen
  return (
    <View style={styles.container}>
      <Camera 
        style={styles.camera} 
        type={type} 
        ref={cameraRef}
      >
        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={() => {
              setType(
                type === Camera.Constants.Type.back
                  ? Camera.Constants.Type.front
                  : Camera.Constants.Type.back
              );
            }}
          >
            <Text style={styles.flipText}>Flip</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.faceOverlay}>
          <View style={styles.faceBox} />
        </View>
      </Camera>
      
      <View style={styles.controlPanel}>
        <Text style={styles.instructions}>
          Position the face in the frame and take a picture
        </Text>
        {employeeName && (
          <Text style={styles.employeeName}>
            Employee: {employeeName}
          </Text>
        )}
        <TouchableOpacity
          style={styles.captureButton}
          onPress={takePicture}
        >
          <View style={styles.captureButtonInner} />
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
  cameraControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  flipButton: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 50,
    padding: 10,
  },
  flipText: {
    color: 'white',
    fontSize: 14,
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
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 5,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  captureButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f44336',
  },
  previewContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: 400,
    borderRadius: 10,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#4CAF50',
    flex: 1,
    marginLeft: 10,
  },
  buttonSecondary: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ccc',
    flex: 1,
    marginRight: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  buttonTextSecondary: {
    color: '#333',
  },
  errorText: {
    color: '#f44336',
    fontSize: 18,
    marginBottom: 20,
  },
});