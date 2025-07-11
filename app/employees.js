import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView
} from 'react-native';
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

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [requiresBiometric, setRequiresBiometric] = useState(false);
  const [biometricSessionValid, setBiometricSessionValid] = useState(false);
  const [lastAuthCheck, setLastAuthCheck] = useState(0);
  const [todayHours, setTodayHours] = useState('0h 0m');
  
  const { user, hasAccess, logout, loading: userLoading } = useUser();
  const { palette } = useColors();
  const { officeSettings } = useOffice();
  const { location, isUserInRadius } = useLocation({ watchPosition: false });
  const { workStatus, loading: workStatusLoading, loadWorkStatus, getCurrentDuration } = useWorkStatus();

  // Определяем роли
  const isEmployee = user?.role === ROLES.EMPLOYEE;
  const isAccountant = hasAccess(ROLES.ACCOUNTANT);
  const isAdmin = hasAccess(ROLES.ADMIN);
  const canManageEmployees = isAccountant || isAdmin;

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
        employee: user.id,
        page_size: 50  // Ограничиваем количество записей
      });

      console.log(`⏰ Work logs for current user:`, workLogs);

      let totalMinutes = 0;

      if (workLogs && workLogs.results && workLogs.results.length > 0) {
        const todayLogs = workLogs.results.filter(log => {
          if (!log.check_in) return false;
          
          const logDate = new Date(log.check_in).toISOString().split('T')[0];
          const todayDate = new Date().toISOString().split('T')[0];
          
          return logDate === todayDate;
        });

        console.log(`📊 Filtered logs for current user: ${todayLogs.length}/${workLogs.results.length}`);

        todayLogs.forEach(log => {
          const hoursWorked = log.total_hours || log.hours_worked;
          console.log(`📊 Processing log: hours=${hoursWorked}, check_in=${log.check_in}, check_out=${log.check_out}`);
          
          if (hoursWorked && hoursWorked > 0) {
            const minutesToAdd = Math.round(hoursWorked * 60);
            console.log(`➕ Adding ${minutesToAdd} minutes (${hoursWorked}h)`);
            totalMinutes += minutesToAdd;
          }
          
          // Add current session time if checked in but not out
          if (log.check_in && !log.check_out) {
            const now = new Date();
            const checkInTime = new Date(log.check_in);
            const currentSessionMinutes = Math.max(0, Math.floor((now - checkInTime) / (1000 * 60)));
            console.log(`⏱️ Adding current session: ${currentSessionMinutes} minutes`);
            totalMinutes += currentSessionMinutes;
          }
        });
      }

      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const formattedTime = `${hours}h ${minutes}m`;
      
      console.log(`✅ Today's hours calculated: ${formattedTime} (${totalMinutes} total minutes)`);
      setTodayHours(formattedTime);
      
    } catch (error) {
      console.error('❌ Error calculating today hours:', error);
      setTodayHours('Error');
    }
  }, [user]);

  useEffect(() => {
    console.log('🔄 EmployeesScreen useEffect triggered:', {
      hasUser: !!user,
      userId: user?.id,
      canManageEmployees,
      loading,
      workStatusLoading
    });
    
    if (user && user.id) {
      loadEnhancedAuthStatus();
      calculateTodayHours();
      if (canManageEmployees) {
        fetchEmployees();
      }
      // Ensure loading is set to false after user is loaded
      setLoading(false);
    } else {
      console.log('⚠️ No user found, setting loading to false');
      setLoading(false);
    }
  }, [user, canManageEmployees, calculateTodayHours]);

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
    }, 10000); // 10 seconds max loading time
    
    return () => clearTimeout(safetyTimeout);
  }, []);

  // Debug user role and loading states
  useEffect(() => {
    if (user) {
      console.log('🔍 EMPLOYEES SCREEN - User data:', {
        role: user.role,
        is_superuser: user.is_superuser,
        email: user.email,
        id: user.id,
        loading,
        workStatusLoading,
        workStatus
      });
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
        loadWorkStatus();
        calculateTodayHours();
        // Refresh employee hours after check-in/out
        if (canManageEmployees) {
          fetchEmployees();
        }
      }
    }, [user, loadWorkStatus, canManageEmployees, calculateTodayHours])
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


  const fetchEmployees = async () => {
    try {
      console.log('🔄 Fetching employees list...');
      const response = await ApiService.employees.getAll({}, true); // Enable cache
      
      console.log('👥 Employees API response:', response);
      
      if (response && response.results) {
        // Get today's date for filtering work logs
        const today = new Date().toISOString().split('T')[0];
        console.log('📅 Fetching hours for date:', today);

        // Fetch employees with their today's hours
        const employeesWithHours = await Promise.all(
          response.results.map(async (emp) => {
            try {
              // Fetch work logs for this employee for today
              // ВАЖНО: бэкенд ожидает параметр 'employee', а не 'employee_id'
              console.log(`🔍 Fetching logs for employee ${emp.id} (${emp.first_name || 'Unknown'}) on ${today}`);
              const workLogs = await ApiService.worktime.getLogs({
                date: today,
                employee: emp.id,  // Изменено с employee_id на employee
                page_size: 50  // Ограничиваем количество записей
              });

              console.log(`⏰ Work logs for ${emp.first_name || 'Unknown'} ${emp.last_name || ''}:`, workLogs);

              let todayHours = '0h 0m';
              let status = 'off-shift';

              if (workLogs && workLogs.results && workLogs.results.length > 0) {
                // Calculate total hours for today
                let totalMinutes = 0;
                let hasActiveSession = false;

                // Filter logs to only include this employee's entries for today
                const todayLogs = workLogs.results.filter(log => {
                  if (!log.check_in) return false;
                  
                  // Проверить что это запись именно для этого сотрудника
                  const isForThisEmployee = log.employee === emp.id || 
                                           log.employee_id === emp.id ||
                                           log.employee_name === `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
                  
                  if (!isForThisEmployee) {
                    console.log(`🚫 Skipping log for different employee: ${log.employee_name} (expected: ${emp.first_name || ''} ${emp.last_name || ''})`);
                    return false;
                  }
                  
                  const logDate = new Date(log.check_in).toISOString().split('T')[0];
                  const todayDate = new Date().toISOString().split('T')[0];
                  
                  // Only include logs from today
                  return logDate === todayDate;
                });

                console.log(`📊 Filtered logs for ${emp.first_name || 'Unknown'}: ${todayLogs.length}/${workLogs.results.length} (excluded future dates)`);

                todayLogs.forEach(log => {
                  // API возвращает total_hours, а не hours_worked
                  const hoursWorked = log.total_hours || log.hours_worked;
                  console.log(`📊 Processing log for ${emp.first_name || 'Unknown'}: hours=${hoursWorked}, check_in=${log.check_in}, check_out=${log.check_out}`);
                  
                  if (hoursWorked && hoursWorked > 0) {
                    // Convert hours to minutes and add to total
                    const minutesToAdd = Math.round(hoursWorked * 60);
                    console.log(`➕ Adding ${minutesToAdd} minutes (${hoursWorked}h) for ${emp.first_name}`);
                    totalMinutes += minutesToAdd;
                  }
                  
                  // Check if there's an active session (checked in but not out)
                  // API возвращает check_in и check_out, а не check_in_time и check_out_time
                  if (log.check_in && !log.check_out) {
                    hasActiveSession = true;
                    status = 'on-shift';
                    
                    // Calculate current session duration
                    const checkInTime = new Date(log.check_in);
                    const now = new Date();
                    const sessionMinutes = Math.floor((now - checkInTime) / (1000 * 60));
                    
                    // Only add session time if it's reasonable (not negative or too large)
                    if (sessionMinutes >= 0 && sessionMinutes < 24 * 60) {
                      totalMinutes += sessionMinutes;
                    }
                  }
                });

                // Convert total minutes back to hours and minutes
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                todayHours = `${hours}h ${minutes}m`;
                
                console.log(`💼 ${emp.first_name || 'Unknown'} ${emp.last_name || ''}: ${todayHours}, status: ${status}`);
              }

              return {
                ...emp,
                status,
                todayHours
              };
            } catch (error) {
              console.error(`❌ Error fetching hours for employee ${emp.id}:`, error);
              return {
                ...emp,
                status: 'off-shift',
                todayHours: '0h 0m'
              };
            }
          })
        );

        console.log(`✅ Loaded ${employeesWithHours.length} employees with hours data`);
        setEmployees(employeesWithHours);
      } else {
        console.warn('⚠️ No employees data in response');
        setEmployees([]);
      }
    } catch (error) {
      // Only log network timeouts less frequently
      if (error.message?.includes('timeout')) {
        console.warn('⏰ Employees fetch timed out, using fallback');
      } else {
        console.error('❌ Error loading employees:', error);
      }
      
      if (user) {
        const currentUserEmployee = {
          id: user.id,
          first_name: user.first_name || 'Current',
          last_name: user.last_name || 'User',
          email: user.email,
          status: 'off-shift',
          todayHours: '0h 0m'
        };
        console.log('📋 Using fallback user as employee:', currentUserEmployee);
        setEmployees([currentUserEmployee]);
      } else {
        console.warn('⚠️ No user available for fallback employee');
        setEmployees([]);
      }
    }
  };

  const handleBiometricRegistration = (employee) => {
    router.push({
      pathname: '/biometric-registration',
      params: {
        employeeId: employee.id,
        employeeName: `${employee.first_name} ${employee.last_name}`
      }
    });
  };

  const handleSendInvitation = async (employee) => {
    Alert.alert(
      'Send Invitation',
      `Send invitation email to ${employee.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              const result = await ApiService.employees.sendInvitation(employee.id);
              Alert.alert(
                'Success',
                `Invitation sent to ${employee.email}`
              );
              fetchEmployees();
            } catch (error) {
              Alert.alert(
                'Error',
                error.response?.data?.error || 'Failed to send invitation'
              );
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
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
    if (!user?.role) return styles(palette).employeeBadge;
    
    switch (user.role) {
      case ROLES.ADMIN:
        return styles(palette).adminBadge;
      case ROLES.ACCOUNTANT:
        return styles(palette).accountantBadge;
      default:
        return styles(palette).employeeBadge;
    }
  };

  const renderEmployeeItem = ({ item }) => {
    const getEmployeeStatus = () => {
      if (!item.is_registered) {
        if (item.has_pending_invitation) {
          return { text: '📧 Invited', color: palette.warning };
        }
        return { text: '⏳ Not Registered', color: palette.danger };
      }
      if (!item.has_biometric) {
        return { text: '🔐 No Biometric', color: palette.warning };
      }
      return { text: '✅ Active', color: palette.success };
    };

    const status = getEmployeeStatus();

    return (
      <View style={styles(palette).employeeCard}>
        <View style={styles(palette).employeeInfo}>
          <Text style={styles(palette).employeeName}>{item.first_name} {item.last_name}</Text>
          <Text style={styles(palette).employeeEmail}>{item.email}</Text>
          <View style={styles(palette).statusRow}>
            <View style={[styles(palette).employeeStatusBadge, { backgroundColor: status.color + '20' }]}>
              <Text style={[styles(palette).employeeStatusText, { color: status.color }]}>
                {status.text}
              </Text>
            </View>
            {item.is_registered && (
              <Text style={styles(palette).hoursText}>Today: {item.todayHours}</Text>
            )}
          </View>
        </View>
        <View style={styles(palette).employeeActions}>
          {!item.is_registered ? (
            <TouchableOpacity 
              style={styles(palette).inviteButton}
              onPress={() => handleSendInvitation(item)}
            >
              <Text style={styles(palette).inviteButtonText}>
                {item.has_pending_invitation ? 'Resend' : 'Invite'}
              </Text>
            </TouchableOpacity>
          ) : !item.has_biometric ? (
            <TouchableOpacity 
              style={styles(palette).registerButton}
              onPress={() => handleBiometricRegistration(item)}
            >
              <Text style={styles(palette).registerButtonText}>Register Face</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles(palette).completeText}>✓ Complete</Text>
          )}
        </View>
      </View>
    );
  };

  // Debug render conditions
  console.log('🎨 EmployeesScreen render conditions:', {
    hasUser: !!user,
    loading,
    userLoading,
    workStatusLoading,
    shouldShowLoader: userLoading || loading || workStatusLoading || (!user && userLoading)
  });

  if (userLoading || loading || workStatusLoading || (!user && userLoading)) {
    console.log('⏳ Showing loader screen');
    return (
      <SafeAreaView style={styles(palette).container}>
        <View style={styles(palette).loader}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={{ color: palette.text.primary, marginTop: 10 }}>
            {userLoading ? 'Loading user...' : loading ? 'Loading...' : 'Loading work status...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  console.log('✅ Rendering main dashboard content');

  return (
    <SafeAreaView style={styles(palette).container}>
      {/* Header */}
      <View style={styles(palette).header}>
        <Text style={styles(palette).headerTitle}>
          {canManageEmployees && showEmployeeList ? 'Team Management' : 'Dashboard'}
        </Text>
        <Text style={styles(palette).headerSubtitle}>
          {canManageEmployees && showEmployeeList ? 
            'Manage team members' : 
            `Welcome, ${user?.first_name || user?.email || 'User'}`
          }
        </Text>
      </View>

      {/* Control Bar - без красной рамки */}
      <View style={styles(palette).controlBar}>
        <View style={styles(palette).controlBarLeft}>
          {/* Role Badge - только если роль определена */}
          {user?.role && !showEmployeeList && (
            <View style={[styles(palette).roleBadge, getRoleBadgeStyle()]}>
              <Text style={styles(palette).roleBadgeText}>
                {getRoleDisplayName(user.role)}
              </Text>
            </View>
          )}
          
          {/* Team Toggle для менеджеров */}
          {canManageEmployees && (
            <TouchableOpacity 
              style={styles(palette).toggleButton}
              onPress={() => setShowEmployeeList(!showEmployeeList)}
            >
              <Ionicons 
                name={showEmployeeList ? "person" : "people"} 
                size={20} 
                color={palette.text.light} 
              />
              <Text style={styles(palette).toggleButtonText}>
                {showEmployeeList ? 'My Dashboard' : 'Team'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles(palette).logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles(palette).logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {canManageEmployees && showEmployeeList ? (
        <FlatList
          data={employees}
          renderItem={renderEmployeeItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles(palette).listContent}
          ListHeaderComponent={() => (
            <View style={styles(palette).listHeader}>
              <Text style={styles(palette).listHeaderText}>
                Team Members ({employees.length})
              </Text>
              <TouchableOpacity
                style={styles(palette).addButton}
                onPress={() => router.push('/add-employee')}
              >
                <Text style={styles(palette).addButtonText}>+ Add</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <ScrollView style={styles(palette).personalDashboard}>
          {/* Status Card */}
          <TouchableOpacity 
            style={styles(palette).statusCard}
            onPress={() => router.push('/check-in-out')}
            activeOpacity={0.8}
          >
            <View style={styles(palette).statusHeader}>
              <Ionicons name="time-outline" size={24} color={palette.text.secondary} />
              <Text style={styles(palette).statusTitle}>Current Status</Text>
            </View>
            <View style={[
              styles(palette).currentStatusBadge,
              workStatus === 'on-shift' ? styles(palette).onShiftBadge : styles(palette).offShiftBadge
            ]}>
              <Text style={styles(palette).currentStatusText}>
                {workStatus === 'on-shift' ? 'On Shift' : 'Not on shift'}
              </Text>
            </View>
            {workStatus === 'on-shift' && (
              <Text style={styles(palette).shiftTimeText}>
                Shift in progress
              </Text>
            )}
          </TouchableOpacity>

          {/* Stats Grid */}
          <View style={styles(palette).statsGrid}>
            <View style={styles(palette).statCard}>
              <Text style={styles(palette).statIcon}>📊</Text>
              <Text style={styles(palette).statLabel}>Today's Hours</Text>
              <Text style={styles(palette).statValue}>{todayHours}</Text>
            </View>
            
            <View style={styles(palette).statCard}>
              <Text style={styles(palette).statIcon}>📍</Text>
              <Text style={styles(palette).statLabel}>Location</Text>
              <Text style={styles(palette).statValue}>{getLocationStatus()}</Text>
            </View>
            
            <View style={styles(palette).statCard}>
              <Text style={styles(palette).statIcon}>🔐</Text>
              <Text style={styles(palette).statLabel}>Security</Text>
              <Text style={styles(palette).statValue}>
                {biometricSessionValid ? 'Verified' : 'Standard'}
              </Text>
            </View>
          </View>

          {/* Quick Access */}
          <View style={styles(palette).quickAccessSection}>
            <Text style={styles(palette).sectionTitle}>📊 My Data</Text>
            <View style={styles(palette).quickAccessGrid}>
              <TouchableOpacity 
                style={styles(palette).quickAccessCard}
                onPress={() => router.push('/worktime')}
              >
                <Ionicons name="time" size={24} color={palette.primary} />
                <Text style={styles(palette).quickAccessTitle}>Work Hours</Text>
                <Text style={styles(palette).quickAccessSubtext}>View time tracking</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles(palette).quickAccessCard}
                onPress={() => router.push('/payroll')}
              >
                <Ionicons name="cash" size={24} color={palette.success} />
                <Text style={styles(palette).quickAccessTitle}>Salary</Text>
                <Text style={styles(palette).quickAccessSubtext}>View earnings</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Management Tools */}
          {canManageEmployees && (
            <View style={styles(palette).managementSection}>
              <Text style={styles(palette).sectionTitle}>🛠 Management Tools</Text>
              <Text style={styles(palette).tipText}>
                📌 Tip: Use the "Team" button above to manage employees
              </Text>
              <View style={styles(palette).managementGrid}>
                <TouchableOpacity 
                  style={styles(palette).managementCard}
                  onPress={() => setShowEmployeeList(true)}
                >
                  <Ionicons name="people" size={24} color={palette.text.light} />
                  <Text style={styles(palette).managementCardText}>Manage Team</Text>
                </TouchableOpacity>
                
                {isAdmin && (
                  <TouchableOpacity 
                    style={[styles(palette).managementCard, styles(palette).adminCard]}
                    onPress={() => router.push('/admin')}
                  >
                    <Ionicons name="settings" size={24} color={palette.text.light} />
                    <Text style={styles(palette).managementCardText}>Admin Panel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = (palette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background.secondary,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: palette.background.primary,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.text.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: palette.text.secondary,
    marginTop: 4,
  },
  controlBar: {
    backgroundColor: palette.background.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  controlBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  employeeBadge: {
    backgroundColor: palette.primary + '20',
  },
  accountantBadge: {
    backgroundColor: palette.success + '20',
  },
  adminBadge: {
    backgroundColor: palette.warning + '20',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.text.primary,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  toggleButtonText: {
    color: palette.text.light,
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: palette.danger,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: palette.text.light,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Personal Dashboard
  personalDashboard: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: palette.background.primary,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.text.primary,
    marginLeft: 8,
  },
  currentStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  onShiftBadge: {
    backgroundColor: palette.success,
  },
  offShiftBadge: {
    backgroundColor: palette.text.secondary,
  },
  currentStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.text.light,
  },
  shiftTimeText: {
    fontSize: 14,
    color: palette.text.secondary,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.background.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: palette.text.secondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: palette.text.primary,
    textAlign: 'center',
  },
  quickAccessSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.text.primary,
    marginBottom: 12,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAccessCard: {
    flex: 1,
    backgroundColor: palette.background.primary,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickAccessTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.text.primary,
    marginTop: 8,
  },
  quickAccessSubtext: {
    fontSize: 12,
    color: palette.text.secondary,
    marginTop: 4,
  },
  managementSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  tipText: {
    fontSize: 14,
    color: palette.primary,
    backgroundColor: palette.primary + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  managementGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  managementCard: {
    flex: 1,
    backgroundColor: palette.primary,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  adminCard: {
    backgroundColor: palette.warning,
  },
  managementCardText: {
    color: palette.text.light,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  
  // Employee List
  listContent: {
    padding: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.text.primary,
  },
  addButton: {
    backgroundColor: palette.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: palette.text.light,
    fontWeight: '600',
  },
  employeeCard: {
    backgroundColor: palette.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.text.primary,
    marginBottom: 4,
  },
  employeeEmail: {
    fontSize: 14,
    color: palette.text.secondary,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  employeeStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hoursText: {
    fontSize: 12,
    color: palette.text.secondary,
  },
  employeeActions: {
    marginLeft: 12,
  },
  inviteButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  inviteButtonText: {
    color: palette.text.light,
    fontSize: 12,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: palette.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  registerButtonText: {
    color: palette.text.light,
    fontSize: 12,
    fontWeight: '600',
  },
  completeText: {
    color: palette.success,
    fontSize: 12,
    fontWeight: '600',
  },
});