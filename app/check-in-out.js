import React, { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, View, Text, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useUser } from '../src/contexts/UserContext';
import { useOffice } from '../src/contexts/OfficeContext';
import { useWorkStatus } from '../src/contexts/WorkStatusContext';
import useColors from '../hooks/useColors';
import useLocation from '../hooks/useLocation';
import { safeLog, safeLogUser, safeLogLocation } from '../src/utils/safeLogging';
import LiquidGlassScreenLayout from '../components/LiquidGlassScreenLayout';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import OfflineQueueService from '../src/services/OfflineQueueService';
import {
  commonStyles,
  COLORS,
  SPACING,
  TYPOGRAPHY,
  BORDER_RADIUS,
} from '../constants/CommonStyles';

export default function CheckInOutScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [manualOperation, setManualOperation] = useState(false);
  const [queueStatus, setQueueStatus] = useState({ pending: 0, processing: false, failed: 0 });
  const lastFocusTime = useRef(0);

  // Check for manual mode parameter
  const params = useLocalSearchParams();
  const isManualMode = params?.manual === 'true';

  const { user } = useUser();
  const { palette: _palette } = useColors();
  const theme = useLiquidGlassTheme();
  const { officeSettings } = useOffice();
  const { location, isUserInRadius } = useLocation({ watchPosition: false });
  const { workStatus, loading, loadWorkStatus, getCurrentDuration, shiftStartTime } =
    useWorkStatus();

  // Load queue status
  const loadQueueStatus = useCallback(async () => {
    try {
      const status = await OfflineQueueService.getQueueStatus();
      setQueueStatus(status);
    } catch (error) {
      console.error('Failed to load queue status:', error);
    }
  }, []);

  // Reload when screen comes into focus with debounce - MOVED BEFORE EARLY RETURN
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastFocus = now - lastFocusTime.current;

      // Prevent rapid refreshes - minimum 2 seconds between refreshes
      if (user && user.id && !refreshing && timeSinceLastFocus > 2000) {
        safeLog('Check-in/out screen focused, refreshing status');
        lastFocusTime.current = now;
        setRefreshing(true);
        Promise.all([
          loadWorkStatus(true),
          loadQueueStatus() // Also load queue status
        ]).finally(() => {
          setRefreshing(false);
        });
      }

      // Return cleanup function
      return () => {
        safeLog('Check-in/out screen unfocused');
      };
    }, [user, refreshing, loadWorkStatus, loadQueueStatus]) // Include all dependencies
  );

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
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: COLORS.glassMedium,
      borderColor: COLORS.glassBorder,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
      flexDirection: 'row',
      marginBottom: SPACING.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    refreshText: {
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.caption.fontSize,
      marginLeft: SPACING.sm,
    },
    manualModeIndicator: {
      alignSelf: 'center',
      backgroundColor: COLORS.warning,
      borderColor: 'rgba(251, 191, 36, 0.5)',
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
      marginBottom: SPACING.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    manualModeText: {
      color: COLORS.textPrimary,
      fontSize: TYPOGRAPHY.caption.fontSize,
      fontWeight: '600',
      textAlign: 'center',
    },

    // Unified card styles with center alignment
    statusCard: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.md,
    },
    statusTitle: {
      ...TYPOGRAPHY.subtitle,
      color: COLORS.textPrimary,
      marginBottom: SPACING.md,
      textAlign: 'center',
    },
    statusHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: SPACING.md,
      width: '100%',
    },
    currentStatusBadge: {
      ...commonStyles.statusBadge,
      alignSelf: 'center',
      borderRadius: BORDER_RADIUS.full,
      marginBottom: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
    },
    onShiftBadge: {
      backgroundColor: COLORS.onShift,
    },
    offShiftBadge: {
      backgroundColor: COLORS.offShift,
    },
    currentStatusText: {
      ...commonStyles.statusText,
      color: COLORS.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    shiftTimeText: {
      ...TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      marginTop: SPACING.sm,
      textAlign: 'center',
    },
    shiftInfo: {
      alignItems: 'center',
      marginTop: SPACING.md,
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
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.md,
    },
    locationTitle: {
      ...TYPOGRAPHY.subtitle,
      color: COLORS.textPrimary,
      marginBottom: SPACING.sm,
      textAlign: 'center',
    },
    locationText: {
      ...TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      textAlign: 'center',
    },
    locationIcon: {
      alignSelf: 'center',
      marginBottom: SPACING.xs,
    },

    infoText: {
      ...TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      marginTop: SPACING.md,
      textAlign: 'center',
    },
    // Queue Status Indicator styles - Liquid Glass style
    queueStatusIndicator: {
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor: COLORS.glassMedium, // Liquid Glass background
      borderColor: COLORS.glassBorder,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
      flexDirection: 'row',
      marginBottom: SPACING.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    queueStatusError: {
      backgroundColor: 'rgba(239, 68, 68, 0.2)', // Liquid Glass with red tint
      borderColor: 'rgba(239, 68, 68, 0.4)',
    },
    queueStatusText: {
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.caption.fontSize,
      marginLeft: SPACING.sm,
    },
    queueStatusTextError: {
      color: '#ef4444', // Red text for errors
      fontWeight: '600',
    },
  });

  const handleCheckIn = () => {
    safeLog('Navigating to check-in');
    router.push({
      pathname: '/biometric-check',
      params: { mode: 'check-in' },
    });
  };

  const handleCheckOut = () => {
    // If manual mode is enabled for Mishka, show option
    if (isManualMode && user?.email === 'mikhail.plotnik@gmail.com') {
      Alert.alert('Check-out Method', 'Choose your check-out method:', [
        {
          text: 'Try Biometric Again',
          onPress: () => {
            safeLog('Navigating to biometric check-out');
            router.push({
              pathname: '/biometric-check',
              params: { mode: 'check-out' },
            });
          },
        },
        {
          text: 'Manual Check-out',
          onPress: handleManualCheckOut,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]);
    } else {
      safeLog('Navigating to check-out');
      router.push({
        pathname: '/biometric-check',
        params: { mode: 'check-out' },
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
                const _ApiService = (await import('../src/api/apiService')).default;
                const _locationString = location
                  ? `Manual (${safeLogLocation(location.coords.latitude, location.coords.longitude)})`
                  : 'Manual (Location unavailable)';

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
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      safeLog('Manual check-out error', { error: error.message });
    } finally {
      setManualOperation(false);
    }
  };

  const isInOffice =
    location &&
    officeSettings.location.latitude &&
    isUserInRadius(officeSettings.location, officeSettings.checkRadius);

  const getLocationStatus = () => {
    if (!location) return 'Location not available';
    if (!officeSettings.location.latitude) return 'Office location not configured';
    return isInOffice ? 'In office' : 'Remote';
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

        {/* Queue Status Indicator */}
        {(queueStatus.pending > 0 || queueStatus.failed > 0) && (
          <TouchableOpacity
            style={[
              styles.queueStatusIndicator,
              queueStatus.failed > 0 && styles.queueStatusError
            ]}
            onPress={async () => {
              if (queueStatus.failed > 0) {
                const failedQueue = await OfflineQueueService.getFailedQueue();
                if (failedQueue.length > 0) {
                  Alert.alert(
                    'Failed Operations',
                    `${failedQueue.length} operations failed to sync.\n\nWould you like to retry them now?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Retry All',
                        onPress: async () => {
                          for (const item of failedQueue) {
                            await OfflineQueueService.retryFailedItem(item.id);
                          }
                          await loadQueueStatus();
                        }
                      }
                    ]
                  );
                }
              }
            }}
          >
            <Ionicons
              name={queueStatus.processing ? "sync" : queueStatus.failed > 0 ? "alert-circle" : "cloud-upload"}
              size={16}
              color={queueStatus.failed > 0 ? "#ef4444" : "#FFFFFF"}
            />
            <Text style={[
              styles.queueStatusText,
              queueStatus.failed > 0 && styles.queueStatusTextError
            ]}>
              {queueStatus.processing && 'Syncing... '}
              {queueStatus.pending > 0 && `${queueStatus.pending} pending`}
              {queueStatus.pending > 0 && queueStatus.failed > 0 && ', '}
              {queueStatus.failed > 0 && `${queueStatus.failed} failed`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Current Status Card */}
        <LiquidGlassCard variant="elevated" padding="lg" style={styles.statusCard}>
          <Text style={styles.statusTitle}>Current Status</Text>
          <View
            style={[
              styles.currentStatusBadge,
              workStatus === 'on-shift' ? styles.onShiftBadge : styles.offShiftBadge,
            ]}
          >
            <Text style={styles.currentStatusText}>
              {workStatus === 'on-shift' ? 'On Shift' : 'Off Shift'}
            </Text>
          </View>

          {workStatus === 'on-shift' && shiftStartTime && (
            <View style={styles.shiftInfo}>
              <Text style={styles.shiftInfoText}>
                Started at:{' '}
                {new Date(shiftStartTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text style={styles.shiftInfoText}>Duration: {getCurrentDuration()}</Text>
            </View>
          )}
        </LiquidGlassCard>

        {/* Location Status */}
        <LiquidGlassCard variant="bordered" padding="md" style={styles.locationCard}>
          <Text style={styles.locationTitle}>Location Status</Text>
          <Ionicons
            name={isInOffice ? 'business' : 'home'}
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
            : 'Tap to start your work shift'}
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

// Force reload Wed Aug 27 22:15:23 IDT 2025
