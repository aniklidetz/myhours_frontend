import React, { useState, useEffect } from 'react';
import { Camera, CameraView } from 'expo-camera';
import { View, StyleSheet, Text } from 'react-native';

export default function CustomCamera({ children, style, type, ...props }) {
  const { innerRef } = props;
  const [hasPermission, setHasPermission] = useState(null);

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

  if (hasPermission === null) {
    return (
      <View style={[styles.loading, style]}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.loading, style]}>
        <Text style={styles.text}>No access to camera</Text>
      </View>
    );
  }

  // Преобразуем числовой тип камеры (0, 1) в строковый формат ("back", "front")
  const facing = typeof type === 'number' ? (type === 1 ? 'front' : 'back') : type;

  return (
    <CameraView
      style={style}
      facing={facing}
      ref={innerRef}
      {...props}
    >
      {children}
    </CameraView>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: '#222',
    flex: 1,
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontSize: 16,
  },
});