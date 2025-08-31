// hooks/useLocation.js
import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { APP_CONFIG } from '../src/config';
import { safeLog, safeLogLocation } from '../src/utils/safeLogging';

const useLocation = (options = {}) => {
  const { watchPosition = false, highAccuracy = true } = options;
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const watchRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const getLocationAsync = async () => {
      try {
        console.log('Requesting location permissions...');

        // Request permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Location permission denied');
          setLoading(false);
          return;
        }

        console.log('Location permission granted');

        // Get current position
        const getCurrentLocation = async () => {
          try {
            const currentLocation = await Location.getCurrentPositionAsync({
              accuracy: highAccuracy
                ? Location.Accuracy.BestForNavigation
                : Location.Accuracy.Balanced,
              timeout: APP_CONFIG.LOCATION_TIMEOUT,
            });

            if (mounted) {
              setLocation(currentLocation);
              setErrorMsg(null);
              safeLog('Location obtained:', {
                location: safeLogLocation(
                  currentLocation.coords.latitude,
                  currentLocation.coords.longitude
                ),
                accuracy: currentLocation.coords.accuracy?.toFixed(0) + 'm',
              });
            }
          } catch (error) {
            console.error('Error getting current location:', error);

            // For emulator, provide fallback location
            if (mounted && APP_CONFIG.IS_EMULATOR) {
              console.log('Using emulator fallback location');
              const fallbackLocation = {
                coords: {
                  latitude: APP_CONFIG.EMULATOR_LOCATION.latitude,
                  longitude: APP_CONFIG.EMULATOR_LOCATION.longitude,
                  accuracy: APP_CONFIG.EMULATOR_LOCATION.accuracy,
                  altitude: null,
                  heading: null,
                  speed: null,
                },
                timestamp: Date.now(),
              };
              setLocation(fallbackLocation);
              setErrorMsg(null);
              safeLog('Emulator location fallback:', {
                location: safeLogLocation(
                  fallbackLocation.coords.latitude,
                  fallbackLocation.coords.longitude
                ),
                accuracy: fallbackLocation.coords.accuracy + 'm',
              });
            } else if (mounted) {
              setErrorMsg('Failed to get current location');
            }
          }
        };

        // Get initial location
        await getCurrentLocation();

        // Set up location watching if requested
        if (watchPosition && mounted) {
          console.log('Starting location watching...');

          watchRef.current = await Location.watchPositionAsync(
            {
              accuracy: highAccuracy
                ? Location.Accuracy.BestForNavigation
                : Location.Accuracy.Balanced,
              timeInterval: 10000, // Update every 10 seconds
              distanceInterval: 10, // Update when moved 10 meters
            },
            newLocation => {
              if (mounted) {
                setLocation(newLocation);
                setErrorMsg(null);
                safeLog('Location updated:', {
                  location: safeLogLocation(
                    newLocation.coords.latitude,
                    newLocation.coords.longitude
                  ),
                });
              }
            }
          );
        }
      } catch (error) {
        console.error('Location setup error:', error);
        if (mounted) {
          setErrorMsg('Location service error');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getLocationAsync();

    // Cleanup function
    return () => {
      mounted = false;
      if (watchRef.current) {
        console.log('Stopping location watching...');
        watchRef.current.remove();
        watchRef.current = null;
      }
    };
  }, [watchPosition, highAccuracy]);

  // Helper function to calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = deg => (deg * Math.PI) / 180;
    const R = 6371000; // Earth radius in meters

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(a));
  };

  // Helper function to check if user is within radius of a location
  const isUserInRadius = (targetLocation, radius) => {
    if (!location || !targetLocation) return false;

    const { latitude, longitude } = location.coords;
    const distance = calculateDistance(
      latitude,
      longitude,
      targetLocation.latitude,
      targetLocation.longitude
    );

    return distance <= radius;
  };

  // Helper function to get distance to a specific location
  const getDistanceTo = targetLocation => {
    if (!location || !targetLocation) return null;

    const { latitude, longitude } = location.coords;
    return calculateDistance(
      latitude,
      longitude,
      targetLocation.latitude,
      targetLocation.longitude
    );
  };

  // Helper function to get formatted location string
  const getLocationString = () => {
    if (!location) return 'Location unavailable';

    const { latitude, longitude, accuracy } = location.coords;
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${Math.round(accuracy)}m)`;
  };

  // Helper function to check if location is accurate enough
  const isLocationAccurate = (maxAccuracy = 100) => {
    if (!location) return false;
    return location.coords.accuracy <= maxAccuracy;
  };

  return {
    location,
    errorMsg,
    loading,
    isUserInRadius,
    getDistanceTo,
    getLocationString,
    isLocationAccurate,
    calculateDistance,

    // Expose coordinates directly for convenience
    coordinates: location?.coords
      ? {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
        }
      : null,
  };
};

export default useLocation;
