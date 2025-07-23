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
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { LinearGradient } from 'expo-linear-gradient';
import { maskName, safeLog, safeLogUser } from '../src/utils/safeLogging';
import LiquidGlassScreenLayout from '../components/LiquidGlassScreenLayout';
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
      <LiquidGlassScreenLayout scrollable={false}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </LiquidGlassScreenLayout>
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
          
          // Count both completed work logs AND active sessions
          if (hoursWorked && hoursWorked > 0) {
            const minutesToAdd = Math.round(hoursWorked * 60);
            const sessionType = log.check_out ? 'completed work' : 'active session';
            console.log(`➕ Adding ${minutesToAdd} minutes (${hoursWorked}h) - ${sessionType}`);
            totalMinutes += minutesToAdd;
          } else if (log.check_in && !log.check_out) {
            console.log(`🔄 Found active session without total_hours: check_in=${log.check_in}`);
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

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      showGlassAlert({ title: 'Error', message: 'Failed to logout' });
    }
  };

  // Handle self-service biometric registration
  const handleSelfBiometricRegistration = () => {
    if (!user || !user.id) {
      showGlassAlert({ title: 'Error', message: 'User information not available' });
      return;
    }

    // Get the employee ID from the user's employee profile
    let employeeId = user.id; // Default fallback to user.id
    if (user.employee_id) {
      employeeId = user.employee_id;
    } else if (user.employee_profile?.id) {
      employeeId = user.employee_profile.id;
    }

    console.log('🔍 Self-service biometric registration:', {
      userId: user.id,
      employeeId: employeeId,
      userName: `${user.first_name} ${user.last_name}`
    });

    router.push({
      pathname: '/biometric-registration',
      params: {
        employeeId: employeeId,
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
      <LiquidGlassScreenLayout scrollable={false}>
        <View style={styles(theme).loader}>
          <ActivityIndicator size="large" color={theme.colors.text.primary} />
          <Text style={styles(theme).loaderText}>
            {userLoading ? 'Loading user...' : loading ? 'Loading...' : 'Loading work status...'}
          </Text>
        </View>
      </LiquidGlassScreenLayout>
    );
  }

  console.log('✅ Rendering main dashboard content');

  return (
    <LiquidGlassScreenLayout.WithGlassHeader
      title="Dashboard"
      subtitle={`Welcome, ${user?.first_name || user?.email || 'User'}`}
      showBackButton={false}
      showLogout={true}
      scrollable={true}
    >
      {/* Role Badge */}
      {user?.role && (
        <View style={styles(theme).roleBadgeContainer}>
          <View style={styles(theme).roleBadge}>
            <Text style={styles(theme).roleBadgeText}>
              {user.role}
            </Text>
          </View>
        </View>
      )}

      {/* Content */}
      <View style={styles(theme).personalDashboard}>
          {/* Shift Summary Section */}
          <View style={styles(theme).section}>
            <Text style={styles(theme).sectionHeader}>Shift Summary</Text>
            
            {/* Status Card */}
            <LiquidGlassCard 
              variant="elevated" 
              padding="lg"
              onPress={() => router.push('/check-in-out')}
              style={styles(theme).statusCard}
              accessibilityRole="button"
              accessibilityLabel="Current work status. Tap to check in or check out."
            >
              <View style={styles(theme).statusHeader}>
                <Ionicons name="time-outline" size={24} color={theme.colors.text.secondary} />
                <Text style={styles(theme).statusTitle}>Current Status</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.text.secondary} style={styles(theme).chevron} />
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

            {/* Stats Grid - Read-only data tiles */}
            <View style={styles(theme).statsGrid}>
              <View style={styles(theme).statCard}
                    accessibilityRole="text"
                    accessibilityLabel={`Today's work hours: ${todayHours}`}>
                <View style={styles(theme).statIconContainer}>
                  <Ionicons name="time" size={24} color="#FFFFFFAA" style={styles(theme).statIcon} />
                </View>
                <View style={styles(theme).statContent}>
                  <Text style={styles(theme).statValue} numberOfLines={1} ellipsizeMode="tail">
                    {todayHours}
                  </Text>
                </View>
                <Text style={styles(theme).statLabel} numberOfLines={1} ellipsizeMode="tail">
                  Hours
                </Text>
              </View>
              
              <View style={styles(theme).statCard}
                    accessibilityRole="text"
                    accessibilityLabel={`Current location: ${getLocationStatus()}`}>
                <View style={styles(theme).statIconContainer}>
                  <Ionicons name="location" size={24} color="#FFFFFFAA" style={styles(theme).statIcon} />
                </View>
                <View style={styles(theme).statContent}>
                  <Text style={styles(theme).statValue} numberOfLines={1} ellipsizeMode="tail">
                    {isInOffice ? 'Office' : 'Remote'}
                  </Text>
                </View>
                <Text style={styles(theme).statLabel} numberOfLines={1} ellipsizeMode="tail">
                  Location
                </Text>
              </View>
              
              <View style={styles(theme).statCard}
                    accessibilityRole="text"
                    accessibilityLabel={`Security status: ${biometricSessionValid ? 'Verified' : 'Standard'}`}>
                <View style={styles(theme).statIconContainer}>
                  <Ionicons name="shield-checkmark" size={24} color="#FFFFFFAA" style={styles(theme).statIcon} />
                </View>
                <View style={styles(theme).statContent}>
                  <Text style={styles(theme).statValue} numberOfLines={1} ellipsizeMode="tail">
                    {biometricSessionValid ? 'Verified' : 'Standard'}
                  </Text>
                </View>
                <Text style={styles(theme).statLabel} numberOfLines={1} ellipsizeMode="tail">
                  Security
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Actions Section */}
          <View style={styles(theme).section}>
            <Text style={styles(theme).sectionHeader}>Quick Actions</Text>
            
            <View style={styles(theme).quickActionsGrid}>
              {/* Row 1 */}
              <View style={styles(theme).actionRow}>
                <LiquidGlassCard 
                  variant="elevated" 
                  padding="md"
                  style={styles(theme).actionCard}
                  onPress={() => router.push('/worktime')}
                  accessibilityRole="button"
                  accessibilityLabel="Work Hours - View my work logs"
                >
                  <Ionicons name="time" size={24} color={theme.colors.text.primary} style={styles(theme).actionIcon} />
                  <Text style={styles(theme).actionTitle}>Work Hours</Text>
                  <Text style={styles(theme).actionSubtext}>View logs</Text>
                  <Ionicons name="chevron-forward" size={14} color={theme.colors.text.secondary} style={styles(theme).actionChevron} />
                </LiquidGlassCard>
                
                <LiquidGlassCard 
                  variant="elevated" 
                  padding="md"
                  style={styles(theme).actionCard}
                  onPress={() => router.push('/payroll')}
                  accessibilityRole="button"
                  accessibilityLabel="My Salary - View my payroll information"
                >
                  <Ionicons name="cash" size={24} color="#22c55e" style={styles(theme).actionIcon} />
                  <Text style={styles(theme).actionTitle}>My Salary</Text>
                  <Text style={styles(theme).actionSubtext}>View payroll</Text>
                  <Ionicons name="chevron-forward" size={14} color={theme.colors.text.secondary} style={styles(theme).actionChevron} />
                </LiquidGlassCard>
              </View>
              
              {/* Row 2 */}
              <View style={styles(theme).actionRow}>
                {/* Biometric Registration/Update Card */}
                {userBiometricStatus && (
                  <>
                    {!userBiometricStatus.has_biometric ? (
                      <LiquidGlassCard 
                        variant="elevated" 
                        padding="md"
                        style={[styles(theme).actionCard, styles(theme).biometricCard]}
                        onPress={handleSelfBiometricRegistration}
                        accessibilityRole="button"
                        accessibilityLabel="Register Face ID - Complete your biometric profile"
                      >
                        <Ionicons name="finger-print" size={24} color="#fbbf24" style={styles(theme).actionIcon} />
                        <Text style={styles(theme).actionTitle}>Face ID</Text>
                        <Text style={styles(theme).actionSubtext}>Register</Text>
                        <Ionicons name="chevron-forward" size={14} color={theme.colors.text.secondary} style={styles(theme).actionChevron} />
                      </LiquidGlassCard>
                    ) : (
                      <View style={[styles(theme).actionCard, styles(theme).completedCard]}
                            accessibilityRole="text"
                            accessibilityLabel={`Face ID Complete - Registered ${userBiometricStatus.registration_date ? new Date(userBiometricStatus.registration_date).toLocaleDateString() : 'successfully'}`}>
                        <Ionicons name="checkmark-circle" size={24} color="#22c55e" style={styles(theme).actionIcon} />
                        <Text style={styles(theme).actionTitle}>Face ID</Text>
                        <Text style={styles(theme).actionSubtext}>Complete</Text>
                      </View>
                    )}
                  </>
                )}
                
                {/* Modal Demo Button - Hidden in production */}
                {__DEV__ && (
                  <LiquidGlassCard 
                    variant="elevated" 
                    padding="md"
                    style={styles(theme).actionCard}
                    onPress={() => router.push('/modal-demo')}
                    accessibilityRole="button"
                    accessibilityLabel="Modal Demo - Test glass modals"
                  >
                    <Ionicons name="layers" size={24} color="#f59e0b" style={styles(theme).actionIcon} />
                    <Text style={styles(theme).actionTitle}>Modal Demo</Text>
                    <Text style={styles(theme).actionSubtext}>Test modals</Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.colors.text.secondary} style={styles(theme).actionChevron} />
                  </LiquidGlassCard>
                )}
              </View>
              
              {/* Development Tools Section */}
              {__DEV__ && (
                <View style={styles(theme).devSection}>
                  <Text style={styles(theme).devLabel}>Dev / Test</Text>
                </View>
              )}
            </View>
          </View>

      </View>
        
        {/* Bottom gradient mask for navigation */}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.3)']}
          style={styles(theme).bottomGradient}
          pointerEvents="none"
        />
    </LiquidGlassScreenLayout.WithGlassHeader>
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
    backgroundColor: theme.colors.glass.medium,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  logoutText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Personal Dashboard
  personalDashboard: {
    flex: 1,
    padding: 24, // Match SPACING.lg (24px) used by other screens
  },
  
  // Section styling
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  
  // Status Card (Interactive)
  statusCard: {
    marginBottom: 16,
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
    flex: 1,
  },
  chevron: {
    marginLeft: 'auto',
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
  
  // Stats Grid (Read-only data tiles with unified design)
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    height: 110, // Fixed height for consistent baseline
    padding: 16, // Unified 16px padding on all sides
    backgroundColor: 'rgba(255, 255, 255, 0.03)', // Slightly more subtle for read-only
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)', // Softer border for read-only
    flexDirection: 'column',
    justifyContent: 'space-between', // Distribute space evenly
    opacity: 0.9, // Slightly transparent to indicate read-only
  },
  statIconContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    // Centered horizontally, fixed distance from top
  },
  statContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
    numberOfLines: 1, // Force single line
    minHeight: 20, // Consistent height
  },
  statLabel: {
    fontSize: 12,
    color: '#FFFFFFCC', // Improved contrast from B3 to CC (80% vs 70%)
    textAlign: 'center',
    numberOfLines: 1, // Force single line
    minHeight: 16, // Consistent height for baseline alignment
  },
  
  // Quick Actions Grid (Interactive tiles with vivid treatment)
  quickActionsGrid: {
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionCard: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1.5, // Thicker border for interactive elements
    borderColor: 'rgba(255, 255, 255, 0.15)', // More visible border
    backgroundColor: 'rgba(255, 255, 255, 0.08)', // Brighter background for interactive
  },
  actionIcon: {
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  actionSubtext: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  actionChevron: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  
  // Completed/Read-only action cards
  completedCard: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    opacity: 0.7,
  },
  
  // Special styling
  biometricCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#fbbf24',
  },
  
  // Development section
  devSection: {
    width: 160,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '500',
    opacity: 0.6,
  },
  
  // Role Badge
  roleBadgeContainer: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  roleBadge: {
    backgroundColor: theme.colors.glass.medium,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  roleBadgeText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
  },
  
  // Bottom gradient mask for navigation
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 96, // ≈ 96 pt как требуется
    zIndex: 1,
  },
});