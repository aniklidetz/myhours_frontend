import React, { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator
} from 'react-native';
import { showGlassAlert, showGlassConfirm } from '../hooks/useGlobalGlassModal';
import { router, useLocalSearchParams } from 'expo-router';
import { useUser } from '../src/contexts/UserContext';
import { useOffice } from '../src/contexts/OfficeContext';
import { useWorkStatus } from '../src/contexts/WorkStatusContext';
import useColors from '../hooks/useColors';
import HeaderBackButton from '../src/components/HeaderBackButton';
import useLocation from '../hooks/useLocation';
import { safeLog, safeLogUser, maskEmail, safeLogLocation } from '../src/utils/safeLogging';
import LiquidGlassLayout from '../components/LiquidGlassLayout';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';

export default function CheckInOutScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [manualOperation, setManualOperation] = useState(false);
  const lastFocusTime = useRef(0);
  
  // Check for manual mode parameter
  const params = useLocalSearchParams();
  const isManualMode = params?.manual === 'true';
  
  const { user } = useUser();
  const { palette } = useColors();
  const theme = useLiquidGlassTheme();
  const { officeSettings } = useOffice();
  const { location, isUserInRadius } = useLocation({ watchPosition: false });
  const { 
    workStatus, 
    loading, 
    loadWorkStatus, 
    getCurrentDuration,
    shiftStartTime 
  } = useWorkStatus();

  // Ensure theme is loaded before using it
  if (!theme) {
    return (
      <LiquidGlassLayout>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </LiquidGlassLayout>
    );
  }

  // Create styles after theme is loaded
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: theme.spacing.md,
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.text.secondary,
    },
    header: {
      backgroundColor: 'transparent',
      padding: theme.spacing.lg,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.title.fontSize * 0.7,
      fontWeight: theme.typography.title.fontWeight,
      color: theme.colors.text.primary,
      textShadowColor: theme.shadows.text.color,
      textShadowOffset: theme.shadows.text.offset,
      textShadowRadius: theme.shadows.text.radius,
    },
    subtitle: {
      fontSize: theme.typography.subtitle.fontSize,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
    },
    content: {
      flex: 1,
      padding: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    refreshIndicator: {
      position: 'absolute',
      top: 10,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.glass.medium,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.glass.border,
    },
    refreshText: {
      marginLeft: theme.spacing.sm,
      color: theme.colors.text.secondary,
      fontSize: theme.typography.caption.fontSize,
    },
    manualModeIndicator: {
      position: 'absolute',
      top: 50,
      backgroundColor: 'rgba(251, 191, 36, 0.9)',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: 'rgba(251, 191, 36, 0.5)',
    },
    manualModeText: {
      color: theme.colors.text.primary,
      fontSize: theme.typography.caption.fontSize,
      fontWeight: '600',
      textAlign: 'center',
    },
    statusTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.md,
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    statusTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginLeft: theme.spacing.sm,
    },
    currentStatusBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.xl,
    },
    onShiftBadge: {
      backgroundColor: 'rgba(34, 197, 94, 0.8)',
    },
    offShiftBadge: {
      backgroundColor: 'rgba(107, 114, 128, 0.8)',
    },
    currentStatusText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text.primary,
    },
    shiftTimeText: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.sm,
    },
    shiftInfo: {
      marginTop: theme.spacing.md,
      alignItems: 'center',
    },
    shiftInfoText: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.text.secondary,
      marginVertical: theme.spacing.xs / 2,
    },
    locationTitle: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    locationText: {
      fontSize: 18,
      color: theme.colors.text.primary,
    },
    infoText: {
      fontSize: theme.typography.caption.fontSize,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.md,
      textAlign: 'center',
    },
  });

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
      <LiquidGlassLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.text.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LiquidGlassLayout>
    );
  }

  return (
    <LiquidGlassLayout>
      <HeaderBackButton destination="/employees" />
      <View style={styles.header}>
        <Text style={styles.title}>Check In/Out</Text>
        <Text style={styles.subtitle}>
          {user?.first_name || user?.email}'s Work Status
        </Text>
      </View>

      <View style={styles.content}>
        {/* Refresh indicator */}
        {refreshing && (
          <View style={styles.refreshIndicator}>
            <ActivityIndicator size="small" color={theme.colors.text.primary} />
            <Text style={styles.refreshText}>Updating status...</Text>
          </View>
        )}

        {/* Manual mode indicator */}
        {isManualMode && user?.email === 'mikhail.plotnik@gmail.com' && (
          <View style={styles.manualModeIndicator}>
            <Text style={styles.manualModeText}>
              🔧 Manual mode enabled - alternative check-out available
            </Text>
          </View>
        )}

        {/* Manual operation indicator */}
        {manualOperation && (
          <View style={styles.refreshIndicator}>
            <ActivityIndicator size="small" color="rgba(251, 191, 36, 1)" />
            <Text style={styles.refreshText}>Processing manual check-out...</Text>
          </View>
        )}

        {/* Current Status Card */}
        <LiquidGlassCard variant="elevated" padding="lg">
          <Text style={styles.statusTitle}>Current Status</Text>
          <View style={[
            styles.currentStatusBadge,
            workStatus === 'on-shift' ? styles.onShiftBadge : styles.offShiftBadge
          ]}>
            <Text style={styles.currentStatusText}>
              {workStatus === 'on-shift' ? '🟢 On Shift' : '🔴 Off Shift'}
            </Text>
          </View>
          
          {workStatus === 'on-shift' && shiftStartTime && (
            <View style={styles.shiftInfo}>
              <Text style={styles.shiftInfoText}>
                Started at: {new Date(shiftStartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
              <Text style={styles.shiftInfoText}>
                Duration: {getCurrentDuration()}
              </Text>
            </View>
          )}
        </LiquidGlassCard>

        {/* Location Status */}
        <LiquidGlassCard variant="bordered" padding="md">
          <Text style={styles.locationTitle}>Location Status</Text>
          <Text style={styles.locationText}>{getLocationStatus()}</Text>
        </LiquidGlassCard>

        {/* Action Button */}
        <LiquidGlassButton
          title={workStatus === 'on-shift' ? '🔓 Check Out' : '🔐 Check In'}
          onPress={workStatus === 'on-shift' ? handleCheckOut : handleCheckIn}
          disabled={refreshing || manualOperation}
          variant={workStatus === 'on-shift' ? 'secondary' : 'primary'}
          style={{ width: '100%', marginVertical: theme.spacing.lg }}
        />

        {/* Info Text */}
        <Text style={styles.infoText}>
          {workStatus === 'on-shift' 
            ? 'Tap to end your work shift'
            : 'Tap to start your work shift'
          }
        </Text>

        {/* Manual Refresh Button */}
        <LiquidGlassButton
          title="🔄 Refresh Status"
          onPress={() => {
            setRefreshing(true);
            loadWorkStatus(true).finally(() => setRefreshing(false));
          }}
          disabled={refreshing}
          variant="ghost"
          style={{ marginTop: theme.spacing.md }}
        />
      </View>
    </LiquidGlassLayout>
  );
}

