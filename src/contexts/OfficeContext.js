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

  // Load saved settings on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setOfficeSettings(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load office settings', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Persist helper
  const saveSettings = async (updates) => {
    try {
      const updated = { ...officeSettings, ...updates };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setOfficeSettings(updated);
    } catch (e) {
      console.error('Failed to save office settings', e);
    }
  };

  /* ─── Public updaters ─────────────────────────────────────────────── */
  const updateOfficeLocation = (latitude, longitude) =>
    saveSettings({ location: { latitude, longitude } });

  const updateCheckRadius = (checkRadius) => saveSettings({ checkRadius });

  const updateRemotePolicy = (remotePolicy) => saveSettings({ remotePolicy });

  /* ─── Geofence check ──────────────────────────────────────────────── */
  const isInsideOffice = useCallback(
    ({ latitude, longitude }, customRadius) => {
      const { location, checkRadius } = officeSettings;
      if (location.latitude == null || location.longitude == null) return false; // not configured
      const radius = customRadius ?? checkRadius;
      const d = distanceMeters(latitude, longitude, location.latitude, location.longitude);
      return d <= radius;
    },
    [officeSettings]
  );

  return (
    <OfficeContext.Provider
      value={{
        officeSettings,
        loading,
        updateOfficeLocation,
        updateCheckRadius,
        updateRemotePolicy,
        isInsideOffice, // <<< exposed helper
      }}
    >
      {children}
    </OfficeContext.Provider>
  );
}

export function useOffice() {
  const ctx = useContext(OfficeContext);
  if (!ctx) throw new Error('useOffice must be used within OfficeProvider');
  return ctx;
}
