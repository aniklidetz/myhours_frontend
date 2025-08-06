import React, { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showGlassAlert, showGlassConfirm } from '../hooks/useGlobalGlassModal';
import { router, useLocalSearchParams } from 'expo-router';
import { useUser } from '../src/contexts/UserContext';
import { useOffice } from '../src/contexts/OfficeContext';
import { useWorkStatus } from '../src/contexts/WorkStatusContext';
import useColors from '../hooks/useColors';
import HeaderBackButton from '../src/components/HeaderBackButton';
import useLocation from '../hooks/useLocation';
import { safeLog, safeLogUser, maskEmail, safeLogLocation } from '../src/utils/safeLogging';
import LiquidGlassScreenLayout from '../components/LiquidGlassScreenLayout';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import LogoutButton from '../src/components/LogoutButton';
import { commonStyles, COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/CommonStyles';

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
      <LiquidGlassScreenLayout scrollable={false}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </LiquidGlassScreenLayout>
    );
  }

  // Create styles after theme is loaded using CommonStyles
  const styles = StyleSheet.create({
    container: commonStyles.container,
    loadingContainer: {
      ...commonStyles.loader,
    },
    loadingText: {
      ...commonStyles.loaderText,
    },
    content: {
      flex: 1,
      // Padding handled by LiquidGlassScreenLayout
    },
    refreshIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.glassMedium,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      marginBottom: SPACING.md,
      alignSelf: 'center',
    },
    refreshText: {
      marginLeft: SPACING.sm,
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.caption.fontSize,
    },
    manualModeIndicator: {
      backgroundColor: COLORS.warning,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
      borderColor: 'rgba(251, 191, 36, 0.5)',
      marginBottom: SPACING.md,
      alignSelf: 'center',
    },
    manualModeText: {
      color: COLORS.textPrimary,
      fontSize: TYPOGRAPHY.caption.fontSize,
      fontWeight: '600',
      textAlign: 'center',
    },
    
    // Unified card styles with center alignment
    statusCard: {
      marginBottom: SPACING.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusTitle: {
      ...TYPOGRAPHY.subtitle,
      color: COLORS.textPrimary,
      marginBottom: SPACING.md,
      textAlign: 'center',
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.md,
      width: '100%',
    },
    currentStatusBadge: {
      ...commonStyles.statusBadge,
      alignSelf: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.full,
      marginBottom: SPACING.sm,
    },
    onShiftBadge: {
      backgroundColor: COLORS.onShift,
    },
    offShiftBadge: {
      backgroundColor: COLORS.offShift,
    },
    currentStatusText: {
      ...commonStyles.statusText,
      fontSize: 16,
      fontWeight: 'bold',
      color: COLORS.textPrimary,
      textAlign: 'center',
    },
    shiftTimeText: {
      ...TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      marginTop: SPACING.sm,
      textAlign: 'center',
    },
    shiftInfo: {
      marginTop: SPACING.md,
      alignItems: 'center',
      width: '100%',
    },
    shiftInfoText: {
      ...TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      marginVertical: SPACING.xs / 2,
      textAlign: 'center',
    },
    
    // Location card styles with center alignment
    locationCard: {
      marginBottom: SPACING.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    locationTitle: {
      ...TYPOGRAPHY.body,
      fontWeight: '600',
      color: COLORS.textPrimary,
      marginBottom: SPACING.sm,
      textAlign: 'center',
    },
    locationText: {
      fontSize: 18,
      color: COLORS.textPrimary,
      textAlign: 'center',
    },
    locationIcon: {
      marginBottom: SPACING.xs,
      alignSelf: 'center',
    },
    
    infoText: {
      ...TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      marginTop: SPACING.md,
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
        safeLog('Check-in/out screen focused, refreshing status');
        lastFocusTime.current = now;
        setRefreshing(true);
        loadWorkStatus(true).finally(() => {
          setRefreshing(false);
        });
      }
      
      // Return cleanup function
      return () => {
        safeLog('Check-in/out screen unfocused');
      };
    }, [user?.id, refreshing, loadWorkStatus]) // Include all dependencies
  );


  const handleCheckIn = () => {
    safeLog('Navigating to check-in');
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
              safeLog('Navigating to biometric check-out');
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
      safeLog('Navigating to check-out');
      router.push({
        pathname: '/biometric-check',
        params: { mode: 'check-out' }
      });
    }
  };

  const handleManualCheckOut = async () => {
    try {
      setManualOperation(true);
      safeLog('Performing manual check-out', safeLogUser(user, 'manual_checkout'));
      
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
                safeLog('Simulating manual check-out');
                Alert.alert(
                  'Manual Check-out Complete',
                  'You have been checked out manually. Please contact your administrator if you continue to have biometric issues.',
                  [{ text: 'OK', onPress: () => router.replace('/check-in-out') }]
                );
                
              } catch (error) {
                safeLog('Manual check-out failed', { error: error.message });
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
      safeLog('Manual check-out error', { error: error.message });
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
      <LiquidGlassScreenLayout scrollable={false}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.text.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LiquidGlassScreenLayout>
    );
  }

  return (
    <LiquidGlassScreenLayout.WithGlassHeader
      title="Check In/Out"
      subtitle={`${user?.first_name || user?.email}'s Work Status`}
      showBackButton={false}
      showLogout={true}
      scrollable={true}
    >
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
              Manual mode enabled - alternative check-out available
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
        <LiquidGlassCard variant="elevated" padding="lg" style={styles.statusCard}>
          <Text style={styles.statusTitle}>Current Status</Text>
          <View style={[
            styles.currentStatusBadge,
            workStatus === 'on-shift' ? styles.onShiftBadge : styles.offShiftBadge
          ]}>
            <Text style={styles.currentStatusText}>
              {workStatus === 'on-shift' ? 'On Shift' : 'Off Shift'}
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
        <LiquidGlassCard variant="bordered" padding="md" style={styles.locationCard}>
          <Text style={styles.locationTitle}>Location Status</Text>
          <Ionicons 
            name={isInOffice ? "business" : "home"} 
            size={24} 
            color={COLORS.textPrimary} 
            style={styles.locationIcon}
          />
          <Text style={styles.locationText}>{getLocationStatus()}</Text>
        </LiquidGlassCard>

        {/* Action Button */}
        <LiquidGlassButton
          title={workStatus === 'on-shift' ? 'Check Out' : 'Check In'}
          onPress={workStatus === 'on-shift' ? handleCheckOut : handleCheckIn}
          disabled={refreshing || manualOperation}
          variant={workStatus === 'on-shift' ? 'secondary' : 'primary'}
          style={{ width: '100%', marginVertical: SPACING.lg }}
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
          title="Refresh Status"
          onPress={() => {
            setRefreshing(true);
            loadWorkStatus(true).finally(() => setRefreshing(false));
          }}
          disabled={refreshing}
          variant="ghost"
          style={{ marginTop: SPACING.md }}
        />
      </View>
    </LiquidGlassScreenLayout.WithGlassHeader>
  );
}

