// Camera check-in / check-out screen.
// Adds location awareness: decides whether the user is inside the office
// radius and passes an `inside` flag to the server.

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
  Alert,
} from 'react-native';
import { Camera } from 'expo-camera';
// УДАЛЕН import * as MediaLibrary from 'expo-media-library';
import useLocation from '../hooks/useLocation';
import { useOffice } from '../src/contexts/OfficeContext';
import useColors from '../hooks/useColors';
// import api from '../src/api/client';            // uncomment for real backend

export default function BiometricCheckScreen({ route }) {
  // mode comes from navigation params: 'check-in' or 'check-out'
  const isCheckIn = route?.params?.mode !== 'check-out';

  const cameraRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [loading, setLoading] = useState(false);

  // Colors & palette for light/dark theme
  const { palette } = useColors();

  // Current GPS coordinates
  const { location, error: locationError } = useLocation({ watchPosition: false });

  // Office settings context
  const { isInsideOffice } = useOffice();
  const inside = location ? isInsideOffice(location.coords) : false;

  /* ─────────── Permissions ─────────── */
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      // УДАЛЕН запрос разрешений MediaLibrary
      setHasPermission(status === 'granted');
    })();
  }, []);

  if (hasPermission === null) {
    return (
      <View style={styles(palette).centered}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles(palette).centered}>
        <Text style={styles(palette).warningText}>
          Camera permission denied
        </Text>
      </View>
    );
  }

  /* ─────────── Photo capture & submit ─────────── */
  const takePhoto = async () => {
    if (!cameraRef.current) return;
    setLoading(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      // УДАЛЕНО сохранение в галерею: await MediaLibrary.saveToLibraryAsync(photo.uri);

      const coords = location?.coords || {};
      const requestData = {
        image: `data:image/jpeg;base64,${photo.base64}`,
        latitude: coords.latitude ?? null,
        longitude: coords.longitude ?? null,
        inside,                                   // true = office, false = remote
        mode: isCheckIn ? 'check-in' : 'check-out',
        timestamp: new Date().toISOString(),
      };

      // await api.post('/checkin/', requestData);
      console.log('Payload sent to server:', requestData);
      Alert.alert('Success', inside ? 'Office check recorded' : 'Remote check recorded');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to submit check');
    } finally {
      setLoading(false);
    }
  };

  /* ─────────── UI ─────────── */
  return (
    <View style={styles(palette).container}>
      <Camera ref={cameraRef} style={styles(palette).camera} />

      {locationError && (
        <Text style={styles(palette).warningText}>
          Location permission denied – your check will be marked as remote
        </Text>
      )}

      {location && !inside && (
        <Text style={styles(palette).warningText}>
          You are outside the office radius – this will be recorded as remote work
        </Text>
      )}

      <Button
        title={
          loading
            ? 'Processing...'
            : isCheckIn
            ? inside
              ? 'Check In (office)'
              : 'Check In (remote)'
            : inside
            ? 'Check Out (office)'
            : 'Check Out (remote)'
        }
        onPress={takePhoto}
        color={isCheckIn ? palette.success : palette.danger}
        disabled={loading}
      />
    </View>
  );
}

/* ─────────── Styles (color-agnostic) ─────────── */
const styles = (p) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: p.background.primary },
    camera: { flex: 1 },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: p.background.primary,
    },
    warningText: {
      color: p.warning,
      textAlign: 'center',
      padding: 10,
    },
  });