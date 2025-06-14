import React, { useState, useEffect, useCallback } from 'react';
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
import useColors from '../hooks/useColors';
import useLocation from '../hooks/useLocation';
import ApiService from '../src/api/apiService';
import { APP_CONFIG } from '../src/config';

const WORK_STATUS_KEY = '@MyHours:WorkStatus';

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workStatus, setWorkStatus] = useState('off-shift'); // 'off-shift' | 'on-shift'
  const [todayHours, setTodayHours] = useState('0h 0m');
  const [shiftStartTime, setShiftStartTime] = useState(null);
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [requiresBiometric, setRequiresBiometric] = useState(false);
  const [biometricSessionValid, setBiometricSessionValid] = useState(false);
  
  const { user, hasAccess, logout } = useUser();
  const { palette } = useColors();
  const { officeSettings } = useOffice();
  const { location, isUserInRadius } = useLocation({ watchPosition: false });

  // Определяем, может ли пользователь управлять сотрудниками
  const canManageEmployees = hasAccess(ROLES.ACCOUNTANT);

  useEffect(() => {
    // Загружаем статус работы только если пользователь существует
    if (user && user.id) {
      loadEnhancedAuthStatus();
      loadEmployeeWorkStatus();
      if (canManageEmployees) {
        fetchEmployees();
      }
    } else {
      // Если пользователя нет, устанавливаем безопасные значения
      setLoading(false);
      setWorkStatus('off-shift');
      setTodayHours('0h 0m');
      setShiftStartTime(null);
    }
  }, [user, canManageEmployees, loadEmployeeWorkStatus]);

  // Загрузка статуса enhanced authentication
  const loadEnhancedAuthStatus = useCallback(async () => {
    try {
      const biometricRequired = await ApiService.auth.checkBiometricRequirement();
      const biometricSession = await ApiService.auth.checkBiometricSession();
      
      setRequiresBiometric(biometricRequired);
      setBiometricSessionValid(biometricSession.valid);
      
      console.log('🔐 Enhanced auth status:', {
        biometricRequired,
        sessionValid: biometricSession.valid,
        sessionExpires: biometricSession.session?.expires_at
      });
      
      // Проверяем expiration токена
      const tokenStatus = await ApiService.auth.checkTokenExpiration();
      if (tokenStatus.shouldRefresh && !tokenStatus.isExpired) {
        console.log('🔄 Token should be refreshed soon');
        try {
          await ApiService.auth.refreshToken();
          console.log('✅ Token refreshed successfully');
        } catch (refreshError) {
          console.warn('⚠️ Token refresh failed:', refreshError);
        }
      }
      
    } catch (error) {
      console.error('❌ Error loading enhanced auth status:', error);
    }
  }, []);

  // Загрузка статуса работы пользователя
  const loadEmployeeWorkStatus = useCallback(async () => {
    try {
      setLoading(true);
      
      // Проверяем, что пользователь существует
      if (!user || !user.id) {
        console.log('No user found, skipping work status load');
        setWorkStatus('off-shift');
        setTodayHours('0h 0m');
        setShiftStartTime(null);
        return;
      }
      
      console.log('🔍 Checking work status from backend...');
      
      try {
        // Проверяем реальный статус с бэкенда
        const backendStatus = await ApiService.biometrics.checkStatus();
        
        if (backendStatus.success) {
          const isCheckedIn = backendStatus.is_checked_in;
          const session = backendStatus.current_session;
          
          console.log('✅ Backend status received:', {
            isCheckedIn,
            sessionId: session?.worklog_id,
            employeeName: backendStatus.employee_info?.employee_name
          });
          
          if (isCheckedIn && session) {
            // Пользователь залогинен в системе
            setWorkStatus('on-shift');
            setShiftStartTime(session.check_in_time);
            
            // Вычисляем часы работы
            const startTime = new Date(session.check_in_time);
            const now = new Date();
            const diffMs = now - startTime;
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            setTodayHours(`${hours}h ${minutes}m`);
            
            // Сохраняем статус
            const statusData = {
              status: 'on-shift',
              shiftStartTime: session.check_in_time,
              worklogId: session.worklog_id
            };
            await AsyncStorage.setItem(`${WORK_STATUS_KEY}_${user.id}`, JSON.stringify(statusData));
            
          } else {
            // Пользователь не залогинен
            setWorkStatus('off-shift');
            setTodayHours('0h 0m');
            setShiftStartTime(null);
            
            // Очищаем сохраненный статус
            await AsyncStorage.removeItem(`${WORK_STATUS_KEY}_${user.id}`);
          }
          
        } else {
          throw new Error('Backend status check failed');
        }
        
      } catch (backendError) {
        console.log('⚠️ Backend status check failed, falling back to local storage:', backendError.message);
        
        // Fallback: загружаем сохраненный статус
        const savedStatus = await AsyncStorage.getItem(`${WORK_STATUS_KEY}_${user.id}`);
        if (savedStatus) {
          const statusData = JSON.parse(savedStatus);
          setWorkStatus(statusData.status);
          setShiftStartTime(statusData.shiftStartTime);
          
          // Вычисляем часы работы если на смене
          if (statusData.status === 'on-shift' && statusData.shiftStartTime) {
            const startTime = new Date(statusData.shiftStartTime);
            const now = new Date();
            const diffMs = now - startTime;
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            setTodayHours(`${hours}h ${minutes}m`);
          }
        } else {
          // Устанавливаем значения по умолчанию
          setWorkStatus('off-shift');
          setTodayHours('0h 0m');
          setShiftStartTime(null);
        }
      }
      
    } catch (error) {
      console.error('Error loading work status:', error);
      // Устанавливаем безопасные значения по умолчанию
      setWorkStatus('off-shift');
      setTodayHours('0h 0m');
      setShiftStartTime(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Для администраторов и бухгалтеров - загрузка списка сотрудников
  const fetchEmployees = async () => {
    try {
      // Загружаем реальный список сотрудников из API
      const response = await ApiService.employees.getAll();
      
      if (response && response.results) {
        // Преобразуем данные для отображения
        const employees = response.results.map(emp => ({
          ...emp,
          status: 'off-shift', // По умолчанию не на смене
          todayHours: '0h 0m'  // Будет обновляться из WorkLog
        }));
        setEmployees(employees);
      } else {
        // Если API не вернул данные, используем mock
        console.log('No employees from API, using mock data');
        const mockEmployees = [
          { id: 7, first_name: 'Admin', last_name: 'User', email: 'admin@example.com', status: 'off-shift', todayHours: '0h 0m' }
        ];
        setEmployees(mockEmployees);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      // При ошибке показываем хотя бы текущего пользователя
      if (user) {
        const currentUserEmployee = {
          id: user.id,
          first_name: user.first_name || 'Current',
          last_name: user.last_name || 'User',
          email: user.email,
          status: 'off-shift',
          todayHours: '0h 0m'
        };
        setEmployees([currentUserEmployee]);
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
              console.log('Sending invitation to:', employee.id);
              const result = await ApiService.employees.sendInvitation(employee.id);
              console.log('Invitation sent:', result);
              
              Alert.alert(
                'Success',
                `Invitation sent to ${employee.email}. They will receive an email with instructions to set up their account.`
              );
              
              // Refresh employee list to update invitation status
              fetchEmployees();
            } catch (error) {
              console.error('Error sending invitation:', error);
              Alert.alert(
                'Error',
                error.response?.data?.error || 'Failed to send invitation. Please try again.'
              );
            }
          }
        }
      ]
    );
  };

  const handleCheckIn = async () => {
    if (!user || !user.id) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }
    
    console.log('🔍 Starting CHECK-IN process');
    
    // Убрали дополнительную биометрическую верификацию для check-in
    // Теперь сразу идем на биометрический экран как раньше
    
    // Сохраняем статус "на смене"
    const statusData = {
      status: 'on-shift',
      shiftStartTime: new Date().toISOString()
    };
    
    try {
      await AsyncStorage.setItem(`${WORK_STATUS_KEY}_${user.id}`, JSON.stringify(statusData));
      setWorkStatus('on-shift');
      setShiftStartTime(new Date().toISOString());
      
      // Используем биометрическую проверку для check-in
      router.push('/biometric-check?mode=check-in');
    } catch (error) {
      console.error('Error saving check-in status:', error);
      Alert.alert('Error', 'Failed to save check-in status');
    }
  };

  const handleCheckOut = async () => {
    if (!user || !user.id) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }
    
    console.log('🔍 Starting CHECK-OUT process');
    
    // Убрали дополнительную биометрическую верификацию для check-out
    // Теперь сразу идем на биометрический экран как раньше
    
    // Сохраняем статус "не на смене"
    const statusData = {
      status: 'off-shift',
      shiftStartTime: null
    };
    
    try {
      await AsyncStorage.setItem(`${WORK_STATUS_KEY}_${user.id}`, JSON.stringify(statusData));
      setWorkStatus('off-shift');
      setShiftStartTime(null);
      
      // Используем биометрическую проверку для check-out
      router.push('/biometric-check?mode=check-out');
    } catch (error) {
      console.error('Error saving check-out status:', error);
      Alert.alert('Error', 'Failed to save check-out status');
    }
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
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Проверяем, находится ли пользователь в офисе
  const isInOffice = location && officeSettings.location.latitude && 
    isUserInRadius(officeSettings.location, officeSettings.checkRadius);

  const getLocationStatus = () => {
    if (!location) return 'Location not available';
    if (!officeSettings.location.latitude) return 'Office location not configured';
    return isInOffice ? '📍 In office' : '🏠 Remote';
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case ROLES.ADMIN: return 'Administrator';
      case ROLES.ACCOUNTANT: return 'Accountant';
      case ROLES.EMPLOYEE: return 'Employee';
      default: return role;
    }
  };

  // Рендер элемента сотрудника для управления
  const renderEmployeeItem = ({ item }) => {
    const getEmployeeStatus = () => {
      if (!item.is_registered) {
        if (item.has_pending_invitation) {
          return { text: '📧 Invited', color: palette.warning };
        }
        return { text: '⏳ Not Registered', color: palette.error };
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

  if (!user) {
    return (
      <View style={styles(palette).loader}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles(palette).container}>
        <ActivityIndicator size="large" color={palette.primary} style={styles(palette).loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(palette).container}>
      {/* Header */}
      <View style={styles(palette).header}>
        <View style={styles(palette).headerInfo}>
          <Text style={styles(palette).headerTitle}>
            {canManageEmployees && showEmployeeList ? 'Employee Management' : 'My Workday'}
          </Text>
          <Text style={styles(palette).headerSubtitle}>
            Welcome, {user.first_name || user.username || user.email} • {getRoleDisplayName(user.role)}
          </Text>
        </View>
      </View>

      {/* Toggle and Logout buttons moved below header */}
      <View style={styles(palette).controlBar}>
        {canManageEmployees && (
          <TouchableOpacity 
            style={styles(palette).toggleButton}
            onPress={() => setShowEmployeeList(!showEmployeeList)}
          >
            <Text style={styles(palette).toggleButtonText}>
              {showEmployeeList ? '👤 My Day' : '👥 Employees'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={styles(palette).logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles(palette).logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Контент */}
      {canManageEmployees && showEmployeeList ? (
        // Список сотрудников для управления
        <FlatList
          data={employees}
          renderItem={renderEmployeeItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles(palette).listContent}
          ListHeaderComponent={() => (
            <View>
              <View style={styles(palette).listHeader}>
                <Text style={styles(palette).listHeaderText}>
                  👥 Manage Employees
                </Text>
                <TouchableOpacity
                  style={styles(palette).addButton}
                  onPress={() => router.push('/add-employee')}
                >
                  <Text style={styles(palette).addButtonText}>+ Add Employee</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles(palette).listSubtext}>
                Create employees and send invitations
              </Text>
            </View>
          )}
        />
      ) : (
        // Персональный дашборд для ВСЕХ ролей
        <ScrollView style={styles(palette).personalDashboard}>
          {/* Статус работы */}
          <View style={styles(palette).statusCard}>
            <Text style={styles(palette).statusTitle}>🕐 Current Status</Text>
            <View style={[
              styles(palette).currentStatusBadge,
              workStatus === 'on-shift' ? styles(palette).onShiftBadge : styles(palette).offShiftBadge
            ]}>
              <Text style={styles(palette).currentStatusText}>
                {workStatus === 'on-shift' ? 
                  `On Shift${shiftStartTime ? ` since ${new Date(shiftStartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}` : 
                  'Not on shift'
                }
              </Text>
            </View>
          </View>

          {/* Статистика */}
          <View style={styles(palette).statsCard}>
            <View style={styles(palette).statItem}>
              <Text style={styles(palette).statLabel}>📊 Today's Hours</Text>
              <Text style={styles(palette).statValue}>{todayHours}</Text>
            </View>
            <View style={styles(palette).statItem}>
              <Text style={styles(palette).statLabel}>📍 Location</Text>
              <Text style={styles(palette).statValue}>{getLocationStatus()}</Text>
            </View>
            <View style={styles(palette).statItem}>
              <Text style={styles(palette).statLabel}>🔐 Security</Text>
              <Text style={styles(palette).statValue}>
                {requiresBiometric ? 
                  (biometricSessionValid ? '✅ Verified' : '🔒 Needs Auth') : 
                  '🔓 Standard'
                }
              </Text>
            </View>
          </View>

          {/* Быстрые переходы к данным */}
          <View style={styles(palette).quickAccessCard}>
            <Text style={styles(palette).quickAccessTitle}>📊 My Data</Text>
            <View style={styles(palette).quickAccessButtons}>
              <TouchableOpacity 
                style={styles(palette).quickAccessButton}
                onPress={() => router.push('/worktime')}
              >
                <Text style={styles(palette).quickAccessButtonText}>🕐 Work Hours</Text>
                <Text style={styles(palette).quickAccessSubtext}>View time tracking</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles(palette).quickAccessButton}
                onPress={() => router.push('/payroll')}
              >
                <Text style={styles(palette).quickAccessButtonText}>💰 Salary</Text>
                <Text style={styles(palette).quickAccessSubtext}>
                  {canManageEmployees ? 'View all salaries' : 'View my salary'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Дополнительная информация для руководства */}
          {canManageEmployees && (
            <View style={styles(palette).managementCard}>
              <Text style={styles(palette).managementTitle}>👔 Management Tools</Text>
              <Text style={styles(palette).managementText}>
                📌 Tip: Use the "👥 Employees" button above to manage your team, or stay here to view your personal data.
              </Text>
              <View style={styles(palette).managementActions}>
                <TouchableOpacity 
                  style={styles(palette).switchToEmployeesButton}
                  onPress={() => setShowEmployeeList(true)}
                >
                  <Text style={styles(palette).switchButtonText}>👥 Manage Employees</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles(palette).adminPanelButton}
                  onPress={() => router.push('/admin')}
                >
                  <Text style={styles(palette).adminPanelButtonText}>⚙️ Admin Panel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Кнопки Check-in/Check-out */}
          <View style={styles(palette).actionButtons}>
            {workStatus === 'off-shift' ? (
              <TouchableOpacity 
                style={[styles(palette).actionButton, styles(palette).checkInButton]}
                onPress={handleCheckIn}
              >
                <Text style={styles(palette).actionButtonText}>
                  🔐 Check In {isInOffice ? '(Office)' : '(Remote)'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles(palette).actionButton, styles(palette).checkOutButton]}
                onPress={handleCheckOut}
              >
                <Text style={styles(palette).actionButtonText}>
                  🔓 Check Out {isInOffice ? '(Office)' : '(Remote)'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Тестирование биометрии */}
          <View style={styles(palette).testingCard}>
            <Text style={styles(palette).testingTitle}>🧪 Testing Tools</Text>
            <TouchableOpacity 
              style={styles(palette).testBiometricButton}
              onPress={() => router.push('/test-biometric-flow')}
            >
              <Text style={styles(palette).testButtonText}>🧪 Test Biometric Flow</Text>
            </TouchableOpacity>
          </View>

          {/* Быстрые действия для руководства */}
          {canManageEmployees && (
            <View style={styles(palette).quickActions}>
              <Text style={styles(palette).quickActionsTitle}>⚡ Quick Actions</Text>
              <View style={styles(palette).quickActionButtons}>
                <TouchableOpacity 
                  style={styles(palette).quickActionButton}
                  onPress={() => setShowEmployeeList(true)}
                >
                  <Text style={styles(palette).quickActionText}>👥 Manage Employees</Text>
                </TouchableOpacity>
                {hasAccess(ROLES.ADMIN) && (
                  <TouchableOpacity 
                    style={styles(palette).quickActionButton}
                    onPress={() => router.push('/admin')}
                  >
                    <Text style={styles(palette).quickActionText}>⚙️ Admin Panel</Text>
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
  header: {
    backgroundColor: palette.background.primary,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: palette.text.secondary,
    marginTop: 2,
  },
  controlBar: {
    backgroundColor: palette.background.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  toggleButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleButtonText: {
    color: palette.text.light,
    fontSize: 14,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: palette.danger,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutText: {
    color: palette.text.light,
    fontSize: 14,
    fontWeight: 'bold',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Персональный дашборд
  personalDashboard: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: palette.background.primary,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.text.primary,
    marginBottom: 12,
  },
  currentStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  currentStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.text.light,
  },
  statsCard: {
    backgroundColor: palette.background.primary,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    elevation: 2,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: palette.text.secondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.text.primary,
  },
  managementCard: {
    backgroundColor: palette.primaryBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: palette.primary,
  },
  managementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.primary,
    marginBottom: 8,
  },
  managementText: {
    fontSize: 14,
    color: palette.primaryDark,
    lineHeight: 20,
  },
  actionButtons: {
    marginBottom: 24,
  },
  actionButton: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.text.light,
  },
  checkInButton: {
    backgroundColor: palette.success,
  },
  checkOutButton: {
    backgroundColor: palette.danger,
  },
  biometricButton: {
    backgroundColor: palette.primary,
    marginTop: 12,
  },
  quickActions: {
    backgroundColor: palette.background.primary,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.text.primary,
    marginBottom: 12,
  },
  quickActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionButton: {
    backgroundColor: palette.text.secondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  quickActionText: {
    color: palette.text.light,
    fontWeight: 'bold',
    fontSize: 12,
  },
  
  // Секция тестирования
  testingCard: {
    backgroundColor: palette.background.primary,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: palette.success,
  },
  testingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.success,
    marginBottom: 12,
  },
  testBiometricButton: {
    backgroundColor: palette.success,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: palette.text.light,
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // Список сотрудников
  listContent: {
    padding: 16,
  },
  listHeader: {
    backgroundColor: palette.primaryBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listHeaderText: {
    fontSize: 16,
    color: palette.primary,
    fontWeight: 'bold',
  },
  listSubtext: {
    fontSize: 14,
    color: palette.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
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
    fontSize: 18,
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
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: palette.text.light,
  },
  hoursText: {
    fontSize: 12,
    color: palette.text.secondary,
  },
  onShiftBadge: {
    backgroundColor: palette.success,
  },
  offShiftBadge: {
    backgroundColor: palette.text.secondary,
  },
  registerButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  registerButtonText: {
    color: palette.text.light,
    fontWeight: 'bold',
  },
  
  // Employee status and actions
  employeeActions: {
    marginLeft: 12,
  },
  employeeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  employeeStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  inviteButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 70,
  },
  inviteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  registerButton: {
    backgroundColor: palette.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 70,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  completeText: {
    color: palette.success,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  // Quick access styles
  quickAccessCard: {
    backgroundColor: palette.background.primary,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickAccessTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: palette.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  quickAccessButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickAccessButton: {
    flex: 1,
    backgroundColor: palette.primary + '15',
    borderColor: palette.primary,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  quickAccessButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: palette.primary,
    marginBottom: 4,
  },
  quickAccessSubtext: {
    fontSize: 12,
    color: palette.text.secondary,
    textAlign: 'center',
  },
  managementActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  switchToEmployeesButton: {
    flex: 1,
    backgroundColor: palette.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  switchButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  adminPanelButton: {
    flex: 1,
    backgroundColor: palette.warning,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  adminPanelButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});