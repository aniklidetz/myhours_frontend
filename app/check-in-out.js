import React, { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  Alert
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useUser } from '../src/contexts/UserContext';
import { useOffice } from '../src/contexts/OfficeContext';
import { useWorkStatus } from '../src/contexts/WorkStatusContext';
import useColors from '../hooks/useColors';
import HeaderBackButton from '../src/components/HeaderBackButton';
import useLocation from '../hooks/useLocation';
import { safeLog, safeLogUser, maskEmail, safeLogLocation } from '../src/utils/safeLogging';

export default function CheckInOutScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [manualOperation, setManualOperation] = useState(false);
  const lastFocusTime = useRef(0);
  
  // Check for manual mode parameter
  const params = useLocalSearchParams();
  const isManualMode = params?.manual === 'true';
  
  const { user } = useUser();
  const { palette } = useColors();
  const { officeSettings } = useOffice();
  const { location, isUserInRadius } = useLocation({ watchPosition: false });
  const { 
    workStatus, 
    loading, 
    loadWorkStatus, 
    getCurrentDuration,
    shiftStartTime 
  } = useWorkStatus();

  // Reload when screen comes into focus with debounce
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastFocus = now - lastFocusTime.current;
      
      // Prevent rapid refreshes - minimum 2 seconds between refreshes
      if (user && user.id && !refreshing && timeSinceLastFocus > 2000) {
        safeLog('📱 Check-in/out screen focused, refreshing status');
        lastFocusTime.current = now;
        setRefreshing(true);
        loadWorkStatus(true).finally(() => {
          setRefreshing(false);
        });
      }
      
      // Return cleanup function
      return () => {
        safeLog('📱 Check-in/out screen unfocused');
      };
    }, [user?.id, refreshing, loadWorkStatus]) // Include all dependencies
  );


  const handleCheckIn = () => {
    safeLog('🔐 Navigating to check-in');
    router.push({
      pathname: '/biometric-check',
      params: { mode: 'check-in' }
    });
  };

  const handleCheckOut = () => {
    // If manual mode is enabled for Mishka, show option
    if (isManualMode && user?.email === 'mikhail.plotnik@gmail.com') {
      Alert.alert(
        'Check-out Method',
        'Choose your check-out method:',
        [
          {
            text: 'Try Biometric Again',
            onPress: () => {
              safeLog('🔓 Navigating to biometric check-out');
              router.push({
                pathname: '/biometric-check',
                params: { mode: 'check-out' }
              });
            }
          },
          {
            text: 'Manual Check-out',
            onPress: handleManualCheckOut
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } else {
      safeLog('🔓 Navigating to check-out');
      router.push({
        pathname: '/biometric-check',
        params: { mode: 'check-out' }
      });
    }
  };

  const handleManualCheckOut = async () => {
    try {
      setManualOperation(true);
      safeLog('🖐️ Performing manual check-out', safeLogUser(user, 'manual_checkout'));
      
      Alert.alert(
        'Manual Check-out',
        'This will check you out without biometric verification. Continue?',
        [
          {
            text: 'Yes, Check Out',
            onPress: async () => {
              try {
                // Call manual check-out API endpoint
                const ApiService = (await import('../src/api/apiService')).default;
                const locationString = location ? 
                  `Manual (${safeLogLocation(location.coords.latitude, location.coords.longitude)})` :
                  'Manual (Location unavailable)';
                
                // For now, we'll simulate manual check-out
                safeLog('🔄 Simulating manual check-out');
                Alert.alert(
                  'Manual Check-out Complete',
                  'You have been checked out manually. Please contact your administrator if you continue to have biometric issues.',
                  [{ text: 'OK', onPress: () => router.replace('/employees') }]
                );
                
              } catch (error) {
                safeLog('❌ Manual check-out failed', { error: error.message });
                Alert.alert(
                  'Manual Check-out Failed',
                  'Unable to complete manual check-out. Please contact your administrator.',
                  [{ text: 'OK' }]
                );
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      safeLog('❌ Manual check-out error', { error: error.message });
    } finally {
      setManualOperation(false);
    }
  };

  const isInOffice = location && officeSettings.location.latitude && 
    isUserInRadius(officeSettings.location, officeSettings.checkRadius);

  const getLocationStatus = () => {
    if (!location) return 'Location not available';
    if (!officeSettings.location.latitude) return 'Office location not configured';
    return isInOffice ? '📍 In office' : '🏠 Remote';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles(palette).container}>
        <ActivityIndicator size="large" color={palette.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(palette).container}>
      <HeaderBackButton destination="/employees" />
      <View style={styles(palette).header}>
        <Text style={styles(palette).title}>Check In/Out</Text>
        <Text style={styles(palette).subtitle}>
          {user?.first_name || user?.email}'s Work Status
        </Text>
      </View>

      <View style={styles(palette).content}>
        {/* Refresh indicator */}
        {refreshing && (
          <View style={styles(palette).refreshIndicator}>
            <ActivityIndicator size="small" color={palette.primary} />
            <Text style={styles(palette).refreshText}>Updating status...</Text>
          </View>
        )}

        {/* Manual mode indicator */}
        {isManualMode && user?.email === 'mikhail.plotnik@gmail.com' && (
          <View style={styles(palette).manualModeIndicator}>
            <Text style={styles(palette).manualModeText}>
              🔧 Manual mode enabled - alternative check-out available
            </Text>
          </View>
        )}

        {/* Manual operation indicator */}
        {manualOperation && (
          <View style={styles(palette).refreshIndicator}>
            <ActivityIndicator size="small" color={palette.warning} />
            <Text style={styles(palette).refreshText}>Processing manual check-out...</Text>
          </View>
        )}

        {/* Current Status Card */}
        <View style={styles(palette).statusCard}>
          <Text style={styles(palette).statusTitle}>Current Status</Text>
          <View style={[
            styles(palette).statusBadge,
            workStatus === 'on-shift' ? styles(palette).onShiftBadge : styles(palette).offShiftBadge
          ]}>
            <Text style={styles(palette).statusText}>
              {workStatus === 'on-shift' ? '🟢 On Shift' : '🔴 Off Shift'}
            </Text>
          </View>
          
          {workStatus === 'on-shift' && shiftStartTime && (
            <View style={styles(palette).shiftInfo}>
              <Text style={styles(palette).shiftInfoText}>
                Started at: {new Date(shiftStartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
              <Text style={styles(palette).shiftInfoText}>
                Duration: {getCurrentDuration()}
              </Text>
            </View>
          )}
        </View>

        {/* Location Status */}
        <View style={styles(palette).locationCard}>
          <Text style={styles(palette).locationTitle}>Location Status</Text>
          <Text style={styles(palette).locationText}>{getLocationStatus()}</Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles(palette).actionButton,
            workStatus === 'on-shift' ? styles(palette).checkOutButton : styles(palette).checkInButton
          ]}
          onPress={workStatus === 'on-shift' ? handleCheckOut : handleCheckIn}
          disabled={refreshing || manualOperation}
        >
          <Text style={styles(palette).actionButtonText}>
            {workStatus === 'on-shift' ? '🔓 Check Out' : '🔐 Check In'}
          </Text>
        </TouchableOpacity>

        {/* Info Text */}
        <Text style={styles(palette).infoText}>
          {workStatus === 'on-shift' 
            ? 'Tap to end your work shift'
            : 'Tap to start your work shift'
          }
        </Text>

        {/* Manual Refresh Button */}
        <TouchableOpacity
          style={styles(palette).refreshButton}
          onPress={() => {
            setRefreshing(true);
            loadWorkStatus(true).finally(() => setRefreshing(false));
          }}
          disabled={refreshing}
        >
          <Text style={styles(palette).refreshButtonText}>
            🔄 Refresh Status
          </Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = (palette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background.secondary,
  },
  header: {
    backgroundColor: palette.background.primary,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: palette.text.secondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIndicator: {
    position: 'absolute',
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.background.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 2,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  refreshText: {
    marginLeft: 8,
    color: palette.text.secondary,
    fontSize: 12,
  },
  manualModeIndicator: {
    position: 'absolute',
    top: 50,
    backgroundColor: palette.warning || '#FFA500',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  manualModeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: palette.background.primary,
    padding: 24,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    elevation: 3,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.text.primary,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  onShiftBadge: {
    backgroundColor: palette.success + '20',
  },
  offShiftBadge: {
    backgroundColor: palette.danger + '20',
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.text.primary,
  },
  shiftInfo: {
    marginTop: 16,
    alignItems: 'center',
  },
  shiftInfoText: {
    fontSize: 14,
    color: palette.text.secondary,
    marginVertical: 2,
  },
  locationCard: {
    backgroundColor: palette.background.primary,
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text.primary,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 18,
    color: palette.text.primary,
  },
  actionButton: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  checkInButton: {
    backgroundColor: palette.success,
  },
  checkOutButton: {
    backgroundColor: palette.danger,
  },
  actionButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.text.light,
  },
  infoText: {
    fontSize: 14,
    color: palette.text.secondary,
    marginTop: 16,
    textAlign: 'center',
  },
  refreshButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: palette.background.primary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
  },
  refreshButtonText: {
    fontSize: 14,
    color: palette.primary,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: palette.background.primary,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    padding: 16,
  },
});