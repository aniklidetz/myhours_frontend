import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

/**
 * Hook for working with geolocation
 * @param {Object} options - Options for location requests
 * @param {boolean} options.requestPermission - Automatically request permission
 * @param {boolean} options.watchPosition - Watch for position changes
 * @param {number} options.distanceInterval - Minimum distance (meters) to trigger updates (only if watchPosition=true)
 * @param {number} options.timeInterval - Minimum time interval (ms) for updates (only if watchPosition=true)
 * @returns {Object} - Location info and status
 */
export default function useLocation({
  requestPermission = true,
  watchPosition = false,
  distanceInterval = 10,
  timeInterval = 5000,
} = {}) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [watchId, setWatchId] = useState(null);

  useEffect(() => {
    let isActive = true;

    const getPermissions = async () => {
      try {
        setIsLoading(true);
        // Request foreground location permission
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (isActive) {
          setPermissionStatus(status);

          if (status !== 'granted') {
            setErrorMsg('Location permission not granted');
            return;
          }

          // Get current location
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Highest,
          });

          if (isActive) {
            setLocation(currentLocation);
            setErrorMsg(null);

            // If watchPosition is enabled, subscribe to updates
            if (watchPosition) {
              const id = await Location.watchPositionAsync(
                {
                  accuracy: Location.Accuracy.Highest,
                  distanceInterval,
                  timeInterval,
                },
                (newLocation) => {
                  if (isActive) {
                    setLocation(newLocation);
                  }
                }
              );

              if (isActive) {
                setWatchId(id);
              }
            }
          }
        }
      } catch (error) {
        if (isActive) {
          setErrorMsg(`Location error: ${error.message}`);
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    if (requestPermission) getPermissions();

    return () => {
      isActive = false;
      if (watchId) watchId.remove();
    };
  }, [requestPermission, watchPosition, distanceInterval, timeInterval]);

  /**
   * Checks if the user is within a specified radius of a target location
   * @param {Object} targetLocation - { latitude, longitude }
   * @param {number} radius - Radius in meters
   * @returns {boolean}
   */
  const isUserInRadius = (targetLocation, radius = 100) => {
    if (!location || !targetLocation) return false;

    const distance = calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      targetLocation.latitude,
      targetLocation.longitude
    );

    return distance <= radius;
  };

  /**
   * Calculates the distance between two geographic points (Haversine formula)
   * @param {number} lat1
   * @param {number} lon1
   * @param {number} lat2
   * @param {number} lon2
   * @returns {number} Distance in meters
   */
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  /**
   * Requests the current location manually
   * @returns {Promise<Object|null>}
   */
  const getCurrentLocation = async () => {
    if (permissionStatus !== 'granted') {
      Alert.alert(
        'Permission required',
        'Location permission is required to get your current location',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Location.requestForegroundPermissionsAsync() },
        ]
      );
      return null;
    }

    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      setLocation(currentLocation);
      return currentLocation;
    } catch (error) {
      setErrorMsg(`Location error: ${error.message}`);
      return null;
    }
  };

  return {
    location,
    errorMsg,
    permissionStatus,
    isLoading,
    isUserInRadius,
    calculateDistance,
    getCurrentLocation,
  };
}