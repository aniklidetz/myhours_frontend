import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useUser, ROLES } from '../src/contexts/UserContext';
import { useOffice } from '../src/contexts/OfficeContext';
import useColors from '../hooks/useColors';

/**
 * Office settings screen, accessible only by administrators
 */
export default function OfficeSettingsScreen() {
  const { user, hasAccess } = useUser();
  const {
    officeSettings,
    loading: officeLoading,
    updateOfficeLocation,
    updateCheckRadius,
    updateRemotePolicy
  } = useOffice();
  const { palette } = useColors();

  const [locationStr, setLocationStr] = useState('');
  const [radiusStr, setRadiusStr] = useState('');
  const [policy, setPolicy] = useState('hybrid');
  const [gettingLocation, setGettingLocation] = useState(false);

  // Populate form with existing settings
  useEffect(() => {
    if (!officeLoading && officeSettings) {
      const { latitude, longitude } = officeSettings.location;
      setLocationStr(
        latitude != null && longitude != null
          ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          : ''
      );
      setRadiusStr(officeSettings.checkRadius.toString());
      setPolicy(officeSettings.remotePolicy);
    }
  }, [officeLoading, officeSettings]);

  // Redirect non-admin users
  useEffect(() => {
    if (!user || !hasAccess(ROLES.ADMIN)) {
      Alert.alert('Access Denied', 'You do not have permission to access office settings');
      router.replace('/employees');
    }
  }, [user]);

  // Get current device location
  const handleGetLocation = async () => {
    setGettingLocation(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow location access in your device settings');
      setGettingLocation(false);
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setLocationStr(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      Alert.alert(
        'Location Retrieved',
        `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set as Office Location', onPress: () => updateOfficeLocation(latitude, longitude) }
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to retrieve current location');
    } finally {
      setGettingLocation(false);
    }
  };

  // Save updated settings
  const handleSave = async () => {
    const parts = locationStr.split(',').map(s => s.trim());
    if (parts.length !== 2) {
      Alert.alert('Error', 'Enter coordinates as latitude, longitude');
      return;
    }
    const [lat, lon] = parts.map(Number);
    if (isNaN(lat) || isNaN(lon)) {
      Alert.alert('Error', 'Coordinates must be valid numbers');
      return;
    }
    const rad = parseInt(radiusStr, 10);
    if (isNaN(rad) || rad <= 0) {
      Alert.alert('Error', 'Radius must be a positive number');
      return;
    }
    await updateOfficeLocation(lat, lon);
    await updateCheckRadius(rad);
    updateRemotePolicy(policy);
    Alert.alert('Success', 'Office settings have been saved');
  };

  if (officeLoading) {
    return (
      <SafeAreaView style={styles(palette).centered}>
        <ActivityIndicator size="large" color={palette.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(palette).container}>
      <ScrollView contentContainerStyle={styles(palette).scrollContent}>
        <Text style={styles(palette).sectionTitle}>Office Location</Text>
        <TextInput
          style={styles(palette).input}
          placeholder="latitude, longitude"
          value={locationStr}
          onChangeText={setLocationStr}
          keyboardType="decimal-pad"
          placeholderTextColor={palette.text.secondary}
        />
        <TouchableOpacity
          style={styles(palette).button}
          onPress={handleGetLocation}
          disabled={gettingLocation}
        >
          <Text style={styles(palette).buttonText}>
            {gettingLocation ? 'Loading...' : 'Get Current Coordinates'}
          </Text>
        </TouchableOpacity>

        <Text style={styles(palette).sectionTitle}>Check Radius (meters)</Text>
        <TextInput
          style={styles(palette).input}
          placeholder="100"
          value={radiusStr}
          onChangeText={setRadiusStr}
          keyboardType="numeric"
          placeholderTextColor={palette.text.secondary}
        />

        <Text style={styles(palette).sectionTitle}>Work Policy</Text>
        <Picker selectedValue={policy} onValueChange={setPolicy}>
          <Picker.Item label="Office Only" value="office-only" />
          <Picker.Item label="Remote Only" value="remote-only" />
          <Picker.Item label="Hybrid" value="hybrid" />
        </Picker>

        <TouchableOpacity style={styles(palette).saveButton} onPress={handleSave}>
          <Text style={styles(palette).saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (p) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: p.background.secondary },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: p.text.primary, marginTop: 16 },
    input: {
      backgroundColor: p.background.primary,
      borderColor: p.border,
      borderWidth: 1,
      borderRadius: 5,
      padding: 10,
      marginTop: 8,
      color: p.text.primary
    },
    button: {
      marginTop: 10,
      padding: 12,
      borderRadius: 5,
      backgroundColor: p.primary,
      alignItems: 'center'
    },
    buttonText: { color: p.text.light, fontWeight: 'bold' },
    saveButton: {
      marginTop: 24,
      padding: 14,
      borderRadius: 5,
      backgroundColor: p.success,
      alignItems: 'center'
    },
    saveButtonText: { color: p.text.light, fontWeight: 'bold' }
  });