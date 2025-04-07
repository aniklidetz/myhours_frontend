import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { Camera, CameraView } from 'expo-camera';

export default function TestCamera() {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        console.log("Camera permission status:", status);
        setHasPermission(status === 'granted');
      } catch (error) {
        console.error("Error requesting camera permission:", error);
        setHasPermission(false);
      }
    })();
  }, []);

  const takePhoto = async () => {
    if (cameraRef) {
      try {
        const photo = await cameraRef.takePictureAsync();
        console.log("Photo taken:", photo);
        alert("Photo taken! Check logs for details.");
      } catch (error) {
        console.error("Error taking photo:", error);
        alert("Error taking photo: " + error.message);
      }
    } else {
      console.log("Camera ref is null");
      alert("Camera not ready");
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
        <Text>No access to camera</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera}
        facing="front"
        onCameraReady={() => console.log("Camera ready")}
        ref={ref => setCameraRef(ref)}
      >
        <View style={styles.buttonContainer}>
          <Button
            title="Take Photo"
            onPress={takePhoto}
          />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
});