import React, { useState, useEffect } from 'react';
import { Camera, CameraView } from 'expo-camera';
import { View, StyleSheet, Text } from 'react-native';
import PropTypes from 'prop-types';

export default function CustomCamera({ children, style, type, onError, ...props }) {
  const { innerRef } = props;
  const [hasPermission, setHasPermission] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        console.log('📷 CustomCamera: Requesting camera permission...');
        const { status } = await Camera.requestCameraPermissionsAsync();
        console.log(`📷 CustomCamera: Permission status: ${status}`);
        setHasPermission(status === 'granted');
        
        if (status !== 'granted') {
          const errorMsg = 'Camera permission denied';
          console.warn(`⚠️ CustomCamera: ${errorMsg}`);
          setError(errorMsg);
          if (onError) onError(new Error(errorMsg));
        }
      } catch (error) {
        console.error("❌ CustomCamera: Error requesting permission:", error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          code: error.code
        });
        setHasPermission(false);
        setError(error.message);
        if (onError) onError(error);
      }
    })();
  }, [onError]);

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
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  // Convert numeric camera type (0, 1) to string format ("back", "front")
  const facing = typeof type === 'number' ? (type === 1 ? 'front' : 'back') : type;

  const handleCameraReady = () => {
    console.log('✅ CustomCamera: Camera ready');
    if (props.onCameraReady) props.onCameraReady();
  };

  const handleMountError = (error) => {
    console.error('❌ CustomCamera: Mount error:', error);
    setError(`Camera mount error: ${error.message}`);
    if (onError) onError(error);
    if (props.onMountError) props.onMountError(error);
  };

  return (
    <CameraView
      style={style}
      facing={facing}
      ref={innerRef}
      onCameraReady={handleCameraReady}
      onMountError={handleMountError}
      {...props}
    >
      {children}
    </CameraView>
  );
}

CustomCamera.propTypes = {
  children: PropTypes.node,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  type: PropTypes.number,
  innerRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any })
  ]),
  onError: PropTypes.func,
  onCameraReady: PropTypes.func,
  onMountError: PropTypes.func
};

CustomCamera.defaultProps = {
  children: null,
  style: null,
  type: 0,
  innerRef: null,
  onError: null,
  onCameraReady: null,
  onMountError: null
};

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
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});