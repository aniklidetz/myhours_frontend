import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Persistent storage key ────────────────────────────────────────────────
const STORAGE_KEY = 'office_settings';

// ─── Default values ────────────────────────────────────────────────────────
export const DEFAULT_OFFICE_SETTINGS = {
  // Office coordinates (null → not configured yet)
  location: { latitude: null, longitude: null },
  // Geofence radius in **meters**
  checkRadius: 100,
  // Work policy flags: 'office-only' | 'remote-only' | 'hybrid'
  remotePolicy: 'hybrid',
};

// ─── Helpers ───────────────────────────────────────────────────────────────
const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Haversine distance between two lat/lng points (meters)
 */
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ─── Context ───────────────────────────────────────────────────────────────
const OfficeContext = createContext();

export function OfficeProvider({ children }) {
  const [officeSettings, setOfficeSettings] = useState(DEFAULT_OFFICE_SETTINGS);
  const [loading, setLoading] = useState(true);

  // ─── Load Settings Function ────────────────────────────────────────────
  const loadSettings = async () => {
    try {
      console.log('Loading office settings from storage...');
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        console.log('Loaded office settings:', parsedSettings);
        setOfficeSettings(parsedSettings);
      } else {
        console.log('No office settings found, using defaults');
        setOfficeSettings(DEFAULT_OFFICE_SETTINGS);
      }
    } catch (e) {
      console.error('Failed to load office settings', e);
      setOfficeSettings(DEFAULT_OFFICE_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  // Load saved settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // ─── Save Settings Helper ─────────────────────────────────────────────
  const saveSettings = async (updates) => {
    try {
      const updated = { ...officeSettings, ...updates };
      console.log('Saving office settings:', updated);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      
      // Update local state
      setOfficeSettings(updated);
      
      console.log('Office settings saved successfully');
      return true;
    } catch (e) {
      console.error('Failed to save office settings', e);
      return false;
    }
  };

  // ─── Public Updater Functions ─────────────────────────────────────────
/**
 * Update office GPS coordinates.
 *
 * Accepts two calling styles:
 *   1) updateOfficeLocation({ latitude, longitude })    // ← preferred
 *   2) updateOfficeLocation(lat, lon)                  // ← legacy
 */
const updateOfficeLocation = async (locationOrLat, maybeLon) => {
  let latitude, longitude;

  // Preferred: single object argument
  if (typeof locationOrLat === 'object' && locationOrLat !== null) {
    ({ latitude, longitude } = locationOrLat);
  } else {
    // Legacy: two numeric arguments
    console.warn(
      '⚠️  Deprecated: call updateOfficeLocation({ latitude, longitude }) instead.'
    );
    latitude  = locationOrLat;
    longitude = maybeLon;
  }

  console.log(`Updating office location to: ${latitude}, ${longitude}`);
  return await saveSettings({ location: { latitude, longitude } });
};

  const updateCheckRadius = async (checkRadius) => {
    const radiusNum = typeof checkRadius === 'number' ? checkRadius : parseFloat(checkRadius);
    console.log(`Updating check radius to: ${radiusNum} meters`);
    return await saveSettings({ checkRadius: radiusNum });
  };

  const updateRemotePolicy = async (remotePolicy) => {
    console.log(`Updating remote policy to: ${remotePolicy}`);
    return await saveSettings({ remotePolicy });
  };

  // ⚠️ ВАЖНО: Эта функция должна быть объявлена ДО contextValue
  const updateAllSettings = async (newSettings) => {
    console.log('Updating all office settings:', newSettings);
    return await saveSettings(newSettings);
  };

  const resetSettings = async () => {
    console.log('Resetting office settings to defaults');
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setOfficeSettings(DEFAULT_OFFICE_SETTINGS);
      return true;
    } catch (e) {
      console.error('Failed to reset office settings', e);
      return false;
    }
  };

  // ─── Geofence Functions ────────────────────────────────────────────────
  const isInsideOffice = useCallback(
    ({ latitude, longitude }, customRadius) => {
      const { location, checkRadius } = officeSettings;
      if (location.latitude == null || location.longitude == null) {
        // Only log once per session to avoid spam
        if (!isInsideOffice._hasLoggedOfficeNotConfigured) {
          console.log('Office location not configured, cannot check if inside office');
          isInsideOffice._hasLoggedOfficeNotConfigured = true;
        }
        return false; // not configured
      }
      
      // Ensure checkRadius is a number
      const defaultRadius = typeof checkRadius === 'number' ? checkRadius : 100;
      const radius = typeof customRadius === 'number' ? customRadius : defaultRadius;
      
      // Ensure coordinates are numbers
      const lat = typeof latitude === 'number' ? latitude : parseFloat(latitude);
      const lon = typeof longitude === 'number' ? longitude : parseFloat(longitude);
      const officeLat = typeof location.latitude === 'number' ? location.latitude : parseFloat(location.latitude);
      const officeLon = typeof location.longitude === 'number' ? location.longitude : parseFloat(location.longitude);
      
      const d = distanceMeters(lat, lon, officeLat, officeLon);
      // console.log(`Distance from office: ${d.toFixed(2)}m, radius: ${radius}m, inside: ${d <= radius}`);
      return d <= radius;
    },
    [officeSettings]
  );

  const getDistanceFromOffice = useCallback(
    ({ latitude, longitude }) => {
      const { location } = officeSettings;
      if (location.latitude == null || location.longitude == null) {
        return null; // not configured
      }
      return distanceMeters(latitude, longitude, location.latitude, location.longitude);
    },
    [officeSettings]
  );

  const isOfficeConfigured = useCallback(() => {
    return officeSettings.location.latitude != null && officeSettings.location.longitude != null;
  }, [officeSettings]);

  // ─── Context Value ─────────────────────────────────────────────────────
  // ✅ ВСЕ ФУНКЦИИ УЖЕ ОБЪЯВЛЕНЫ ВЫШЕ - ТЕПЕРЬ МОЖНО ИХ ЭКСПОРТИРОВАТЬ
  const contextValue = {
    officeSettings,
    loading,
    updateOfficeLocation,
    updateCheckRadius,
    updateRemotePolicy,
    updateAllSettings, // ✅ Функция уже существует
    resetSettings,
    isInsideOffice,
    getDistanceFromOffice,
    isOfficeConfigured,
    reloadSettings: loadSettings,
  };

  return (
    <OfficeContext.Provider value={contextValue}>
      {children}
    </OfficeContext.Provider>
  );
}

export function useOffice() {
  const ctx = useContext(OfficeContext);
  if (!ctx) throw new Error('useOffice must be used within OfficeProvider');
  return ctx;
}