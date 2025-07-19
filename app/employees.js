import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView,
  Platform
} from 'react-native';
import { showGlassAlert } from '../hooks/useGlobalGlassModal';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser, ROLES } from '../src/contexts/UserContext';
import { useOffice } from '../src/contexts/OfficeContext';
import { useWorkStatus } from '../src/contexts/WorkStatusContext';
import useColors from '../hooks/useColors';
import useLocation from '../hooks/useLocation';
import ApiService from '../src/api/apiService';
import { APP_CONFIG } from '../src/config';
import { Ionicons } from '@expo/vector-icons';
import { maskName, safeLog, safeLogUser } from '../src/utils/safeLogging';
import LiquidGlassLayout from '../components/LiquidGlassLayout';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';

export default function EmployeesScreen() {
  const [loading, setLoading] = useState(true);
  const [requiresBiometric, setRequiresBiometric] = useState(false);
  const [biometricSessionValid, setBiometricSessionValid] = useState(false);
  const [lastAuthCheck, setLastAuthCheck] = useState(0);
  const [todayHours, setTodayHours] = useState('0h 0m');
  const [userBiometricStatus, setUserBiometricStatus] = useState(null);
  
  const { user, hasAccess, logout, loading: userLoading } = useUser();
  const { palette } = useColors();
  const theme = useLiquidGlassTheme();
  const { officeSettings } = useOffice();
  const { location, isUserInRadius } = useLocation({ watchPosition: false });
  const { workStatus, loading: workStatusLoading, loadWorkStatus, getCurrentDuration } = useWorkStatus();

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

  // Определяем роли
  const isEmployee = user?.role === ROLES.EMPLOYEE;

  // Функция для расчета часов - перенесена выше использования
  const calculateTodayHours = useCallback(async () => {
    if (!user || !user.id) {
      setTodayHours('0h 0m');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      console.log(`🔍 Calculating today's hours for user ${user.id} on ${today}`);
      
      const workLogs = await ApiService.worktime.getLogs({
        date: today,
        // Don't pass employee param - let backend determine from token
        page_size: 50  // Ограничиваем количество записей
      });

      console.log(`⏰ Work logs for current user:`, {
        count: workLogs.count,
        next: workLogs.next,
        previous: workLogs.previous,
        results: workLogs.results?.map(log => ({
          ...log,
          employee_name: log.employee_name ? maskName(log.employee_name) : 'unknown'
        }))
      });

      let totalMinutes = 0;

      if (workLogs && workLogs.results && workLogs.results.length > 0) {
        const todayLogs = workLogs.results.filter(log => {
          if (!log.check_in) return false;
          
          const checkInDate = new Date(log.check_in).toISOString().split('T')[0];
          const checkOutDate = log.check_out ? new Date(log.check_out).toISOString().split('T')[0] : null;
          const todayDate = new Date().toISOString().split('T')[0];
          
          // Include shifts that started today OR ended today (for night shifts)
          return checkInDate === todayDate || checkOutDate === todayDate;
        });

        console.log(`📊 Filtered logs for current user: ${todayLogs.length}/${workLogs.results.length}`);

        todayLogs.forEach(log => {
          const hoursWorked = log.total_hours || log.hours_worked;
          console.log(`📊 Processing log: hours=${hoursWorked}, check_in=${log.check_in}, check_out=${log.check_out}`);
          
          // Only count completed work logs (exclude active sessions)
          if (log.check_in && !log.check_out) {
            console.log(`🔄 Found active session: check_in=${log.check_in}, excluding from today's hours`);
          } else if (hoursWorked && hoursWorked > 0) {
            const minutesToAdd = Math.round(hoursWorked * 60);
            console.log(`➕ Adding ${minutesToAdd} minutes (${hoursWorked}h) - completed work`);
            totalMinutes += minutesToAdd;
          }
        });
      }

      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const formattedTime = `${hours}h ${minutes}m`;
      
      console.log(`✅ Today's hours calculated: ${formattedTime} (${totalMinutes} total minutes)`);
      setTodayHours(formattedTime);
      
    } catch (error) {
      if (error.message?.includes('Network Error') || error.message?.includes('timeout')) {
        console.warn('⚠️ Network unavailable or timeout, using cached hours');
        setTodayHours('--');
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('exceeded')) {
        console.warn('⚠️ Request timeout exceeded, retrying with cached data');
        setTodayHours('--');
      } else {
        console.error('❌ Error calculating today hours:', error.message || error);
        setTodayHours('Error');
      }
    }
  }, [user]);


  useEffect(() => {
    console.log('🔄 EmployeesScreen useEffect triggered:', {
      hasUser: !!user,
      userId: user?.id,
      loading,
      workStatusLoading
    });
    
    if (user && user.id) {
      loadEnhancedAuthStatus();
      loadUserBiometricStatus();
      calculateTodayHours();
      // Ensure loading is set to false after user is loaded
      setLoading(false);
    } else {
      console.log('⚠️ No user found, setting loading to false');
      setLoading(false);
    }
  }, [user, calculateTodayHours]);

  // Redirect to login if user is null and not loading
  useEffect(() => {
    if (!user && !loading && !userLoading) {
      console.log('🔄 No user found and not loading - redirecting to login');
      router.replace('/');
    }
  }, [user, loading, userLoading]);

  // Auto-reload auth status periodically
  useEffect(() => {
    if (user && user.id) {
      const timer = setInterval(() => {
        loadEnhancedAuthStatus();
      }, 60000);
      
      return () => clearInterval(timer);
    }
  }, [user]);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      console.log('🚨 Safety timeout triggered - forcing loading to false');
      setLoading(false);
    }, 30000); // 30 seconds max loading time (increased from 10s)
    
    return () => clearTimeout(safetyTimeout);
  }, []);

  // Debug user role and loading states
  useEffect(() => {
    if (user) {
      safeLog('🔍 EMPLOYEES SCREEN - User data:', safeLogUser(user, 'screen_render'));
    } else {
      console.log('❌ EMPLOYEES SCREEN - No user found, showing loading or redirect');
    }
  }, [user, loading, workStatusLoading, workStatus]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      if (user && user.id) {
        console.log('📱 Dashboard focused, refreshing data...');
        loadEnhancedAuthStatus();
        loadUserBiometricStatus();
        loadWorkStatus();
        calculateTodayHours();
      }
    }, [user, loadWorkStatus, calculateTodayHours])
  );

  const loadEnhancedAuthStatus = useCallback(async () => {
    try {
      console.log('🔄 Loading enhanced auth status...');
      const now = Date.now();
      if (now - lastAuthCheck < 5000) {
        console.log('⏭️ Skipping auth check (too soon)');
        return;
      }
      setLastAuthCheck(now);
      
      const biometricRequired = await ApiService.auth.checkBiometricRequirement();
      const biometricSession = await ApiService.auth.checkBiometricSession();
      
      console.log('🔐 Auth status loaded:', {
        biometricRequired,
        biometricSessionValid: biometricSession.valid
      });
      
      setRequiresBiometric(biometricRequired);
      setBiometricSessionValid(biometricSession.valid);
      
      const tokenStatus = await ApiService.auth.checkTokenExpiration();
      if (tokenStatus.shouldRefresh && !tokenStatus.isExpired) {
        try {
          await ApiService.auth.refreshToken();
          console.log('✅ Token refreshed successfully');
        } catch (refreshError) {
          console.warn('⚠️ Token refresh failed:', refreshError);
        }
      }
    } catch (error) {
      console.error('❌ Error loading auth status:', error);
      // Don't fail the entire component, just log the error
      setRequiresBiometric(false);
      setBiometricSessionValid(false);
    }
  }, [lastAuthCheck]);

  // Load user's biometric status
  const loadUserBiometricStatus = useCallback(async () => {
    try {
      console.log('🔍 Loading user biometric status...');
      const status = await ApiService.biometrics.getBiometricStatus();
      
      console.log('🔐 User biometric status detailed:', {
        hasBiometric: status.has_biometric,
        registrationDate: status.registration_date,
        lastVerification: status.last_verification,
        fullResponse: status
      });
      
      // Ensure we have proper boolean values
      const normalizedStatus = {
        has_biometric: Boolean(status.has_biometric),
        registration_date: status.registration_date,
        last_verification: status.last_verification
      };
      
      console.log('🔐 Normalized biometric status:', normalizedStatus);
      setUserBiometricStatus(normalizedStatus);
    } catch (error) {
      console.error('❌ Error loading user biometric status:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Set default status if API fails
      setUserBiometricStatus({
        has_biometric: false,
        registration_date: null,
        last_verification: null
      });
    }
  }, []);

  // Handle self-service biometric registration
  const handleSelfBiometricRegistration = () => {
    if (!user || !user.id) {
      showGlassAlert({ title: 'Error', message: 'User information not available' });
      return;
    }

    router.push({
      pathname: '/biometric-registration',
      params: {
        employeeId: user.id,
        employeeName: `${user.first_name || 'Unknown'} ${user.last_name || 'User'}`,
        selfService: 'true' // Flag to indicate self-service registration
      }
    });
  };

  const isInOffice = location && officeSettings.location.latitude && 
    isUserInRadius(officeSettings.location, officeSettings.checkRadius);

  const getLocationStatus = () => {
    if (!location) return 'Location not available';
    if (!officeSettings.location.latitude) return 'Office not configured';
    return isInOffice ? '📍 In office' : '🏠 Remote';
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case ROLES.ADMIN: return 'Administrator';
      case ROLES.ACCOUNTANT: return 'Accountant';
      case ROLES.EMPLOYEE: return 'Employee';
      default: return role || 'Employee';
    }
  };

  const getRoleBadgeStyle = () => {
    if (!user?.role) return styles(theme).employeeBadge;
    
    switch (user.role) {
      case ROLES.ADMIN:
        return styles(theme).adminBadge;
      case ROLES.ACCOUNTANT:
        return styles(theme).accountantBadge;
      default:
        return styles(theme).employeeBadge;
    }
  };


  // Debug logging disabled to reduce console noise
  // console.log('🎨 EmployeesScreen render conditions:', {
  //   hasUser: !!user,
  //   loading,
  //   userLoading,
  //   workStatusLoading,
  //   shouldShowLoader: userLoading || loading || workStatusLoading || (!user && userLoading)
  // });

  if (userLoading || loading || workStatusLoading || (!user && userLoading)) {
    // console.log('⏳ Showing loader screen');
    return (
      <LiquidGlassLayout>
        <View style={styles(theme).loader}>
          <ActivityIndicator size="large" color={theme.colors.text.primary} />
          <Text style={styles(theme).loaderText}>
            {userLoading ? 'Loading user...' : loading ? 'Loading...' : 'Loading work status...'}
          </Text>
        </View>
      </LiquidGlassLayout>
    );
  }

  console.log('✅ Rendering main dashboard content');

  return (
    <LiquidGlassLayout>
      {/* Header */}
      <View style={styles(theme).header}>
        <Text style={styles(theme).headerTitle}>
          Dashboard
        </Text>
        <Text style={styles(theme).headerSubtitle}>
          Welcome, {user?.first_name || user?.email || 'User'}
        </Text>
      </View>

      {/* Control Bar */}
      <View style={styles(theme).controlBar}>
        <View style={styles(theme).controlBarLeft}>
          {/* Role Badge - только если роль определена */}
          {user?.role && (
            <View style={[styles(theme).roleBadge, getRoleBadgeStyle()]}>
              <Text style={styles(theme).roleBadgeText}>
                {getRoleDisplayName(user.role)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles(theme).personalDashboard}>
          {/* Status Card */}
          <LiquidGlassCard 
            variant="elevated" 
            padding="lg"
            onPress={() => router.push('/check-in-out')}
          >
            <View style={styles(theme).statusHeader}>
              <Ionicons name="time-outline" size={24} color={theme.colors.text.secondary} />
              <Text style={styles(theme).statusTitle}>Current Status</Text>
            </View>
            <View style={[
              styles(theme).currentStatusBadge,
              workStatus === 'on-shift' ? styles(theme).onShiftBadge : styles(theme).offShiftBadge
            ]}>
              <Text style={styles(theme).currentStatusText}>
                {workStatus === 'on-shift' ? 'On Shift' : 'Not on shift'}
              </Text>
            </View>
            {workStatus === 'on-shift' && (
              <Text style={styles(theme).shiftTimeText}>
                Shift in progress
              </Text>
            )}
          </LiquidGlassCard>

          {/* Stats Grid */}
          <View style={styles(theme).statsGrid}>
            <LiquidGlassCard variant="bordered" padding="md" style={styles(theme).statCard}>
              <Text style={styles(theme).statIcon}>📊</Text>
              <Text style={styles(theme).statLabel}>Today's Hours</Text>
              <Text style={styles(theme).statValue}>{todayHours}</Text>
            </LiquidGlassCard>
            
            <LiquidGlassCard variant="bordered" padding="md" style={styles(theme).statCard}>
              <Text style={styles(theme).statIcon}>📍</Text>
              <Text style={styles(theme).statLabel}>Location</Text>
              <Text style={styles(theme).statValue}>{getLocationStatus()}</Text>
            </LiquidGlassCard>
            
            <LiquidGlassCard variant="bordered" padding="md" style={styles(theme).statCard}>
              <Text style={styles(theme).statIcon}>🔐</Text>
              <Text style={styles(theme).statLabel}>Security</Text>
              <Text style={styles(theme).statValue}>
                {biometricSessionValid ? 'Verified' : 'Standard'}
              </Text>
            </LiquidGlassCard>
          </View>

          {/* Quick Access */}
          <View style={styles(theme).quickAccessSection}>
            <Text style={styles(theme).sectionTitle}>📊 My Data</Text>
            <View style={styles(theme).quickAccessGrid}>
              <LiquidGlassCard 
                variant="elevated" 
                padding="md"
                style={styles(theme).quickAccessCard}
                onPress={() => router.push('/worktime')}
              >
                <Ionicons name="time" size={24} color={theme.colors.text.primary} />
                <Text style={styles(theme).quickAccessTitle}>Work Hours</Text>
                <Text style={styles(theme).quickAccessSubtext}>View my work logs</Text>
              </LiquidGlassCard>
              
              <LiquidGlassCard 
                variant="elevated" 
                padding="md"
                style={styles(theme).quickAccessCard}
                onPress={() => router.push('/payroll')}
              >
                <Ionicons name="cash" size={24} color="#22c55e" />
                <Text style={styles(theme).quickAccessTitle}>My Salary</Text>
                <Text style={styles(theme).quickAccessSubtext}>View my payroll</Text>
              </LiquidGlassCard>
              
              {/* Biometric Registration/Update Cards */}
              {userBiometricStatus && (
                <>
                  {console.log('🎨 Rendering biometric card. Status:', {
                    hasBiometric: userBiometricStatus.has_biometric,
                    statusType: typeof userBiometricStatus.has_biometric,
                    registrationDate: userBiometricStatus.registration_date
                  })}
                  
                  {!userBiometricStatus.has_biometric ? (
                    // Show registration card if no biometric data
                    <LiquidGlassCard 
                      variant="elevated" 
                      padding="md"
                      style={[styles(theme).quickAccessCard, styles(theme).biometricCard]}
                      onPress={handleSelfBiometricRegistration}
                    >
                      <Ionicons name="finger-print" size={24} color="#fbbf24" />
                      <Text style={styles(theme).quickAccessTitle}>Register Face ID</Text>
                      <Text style={styles(theme).quickAccessSubtext}>Complete your profile</Text>
                    </LiquidGlassCard>
                  ) : (
                    // Show completion status if biometric data exists
                    <LiquidGlassCard 
                      variant="elevated" 
                      padding="md"
                      style={[styles(theme).quickAccessCard, styles(theme).biometricCompleteCard]}
                    >
                      <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                      <Text style={styles(theme).quickAccessTitle}>Face ID Complete</Text>
                      <Text style={styles(theme).quickAccessSubtext}>
                        Registered {userBiometricStatus.registration_date ? 
                          new Date(userBiometricStatus.registration_date).toLocaleDateString() : 
                          'successfully'}
                      </Text>
                    </LiquidGlassCard>
                  )}
                </>
              )}
              
              {/* Modal Demo Button - Hidden in production */}
              {__DEV__ && (
                <LiquidGlassCard 
                  variant="elevated" 
                  padding="md"
                  style={styles(theme).quickAccessCard}
                  onPress={() => router.push('/modal-demo')}
                >
                  <Ionicons name="layers" size={24} color="#f59e0b" />
                  <Text style={styles(theme).quickAccessTitle}>Modal Demo</Text>
                  <Text style={styles(theme).quickAccessSubtext}>Test glass modals</Text>
                </LiquidGlassCard>
              )}
              
            </View>
          </View>

        </ScrollView>
    </LiquidGlassLayout>
  );
}

const styles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    fontSize: theme.typography.body.fontSize,
  },
  header: {
    backgroundColor: 'transparent',
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: theme.typography.title.fontSize * 0.6,
    fontWeight: theme.typography.title.fontWeight,
    color: theme.colors.text.primary,
    textShadowColor: theme.shadows.text.color,
    textShadowOffset: theme.shadows.text.offset,
    textShadowRadius: theme.shadows.text.radius,
  },
  headerSubtitle: {
    fontSize: theme.typography.subtitle.fontSize * 0.8,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  controlBar: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  controlBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  employeeBadge: {
    backgroundColor: theme.colors.glass.medium,
  },
  accountantBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  adminBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.glass.medium,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  toggleButtonText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Personal Dashboard
  personalDashboard: {
    flex: 1,
    padding: theme.spacing.lg,
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
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  quickAccessSection: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  quickAccessCard: {
    minWidth: '48%',
    maxWidth: '48%',
    alignItems: 'center',
  },
  quickAccessTitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.sm,
  },
  quickAccessSubtext: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  biometricCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#fbbf24',
  },
  biometricUpdateCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  biometricCompleteCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
    opacity: 0.8,
  },
  logoutCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
});