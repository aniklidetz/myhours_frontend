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
  ScrollView,
  Platform
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
import { maskName, safeLog, safeLogUser, safeLogEmployeesList } from '../src/utils/safeLogging';

export default function TeamManagementScreen() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
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

  useEffect(() => {
    if (user && user.id && canManageEmployees) {
      fetchEmployees(false);
      setLoading(false);
    } else if (user && !canManageEmployees) {
      // Redirect non-managers to their dashboard
      router.replace('/employees');
    } else {
      setLoading(false);
    }
  }, [user, canManageEmployees]);

  // Redirect to login if user is null and not loading
  useEffect(() => {
    if (!user && !loading && !userLoading) {
      router.replace('/');
    }
  }, [user, loading, userLoading]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      if (user && user.id && canManageEmployees) {
        fetchEmployees(false);
      }
    }, [user, canManageEmployees])
  );

  const fetchEmployees = async (useCache = false) => {
    try {
      safeLog('🔄 Fetching employees list for team management...');
      const response = await ApiService.employees.getAll({}, useCache);
      
      safeLog('👥 Team management employees response:', safeLogEmployeesList(response));
      
      if (response && response.results) {
        // Get today's date for filtering work logs
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch employees with their today's hours
        const employeesWithHours = [];
        for (let i = 0; i < response.results.length; i++) {
          const emp = response.results[i];
          
          // Add delay between requests to prevent rate limiting
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          try {
            const workLogs = await ApiService.worktime.getLogs({
              date: today,
              employee: emp.id,
              page_size: 50
            });

            let todayHours = '0h 0m';
            let status = 'off-shift';

            if (workLogs && workLogs.results && workLogs.results.length > 0) {
              let totalMinutes = 0;
              let hasActiveSession = false;

              const todayLogs = workLogs.results.filter(log => {
                if (!log.check_in) return false;
                const isForThisEmployee = log.employee === emp.id || 
                                         log.employee_id === emp.id ||
                                         log.employee_name === `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
                
                if (!isForThisEmployee) return false;
                
                const logDate = new Date(log.check_in).toISOString().split('T')[0];
                const todayDate = new Date().toISOString().split('T')[0];
                
                return logDate === todayDate;
              });

              todayLogs.forEach((log) => {
                if (log.check_in && !log.check_out) {
                  hasActiveSession = true;
                  status = 'on-shift';
                } else {
                  const hoursWorked = log.total_hours || log.hours_worked;
                  if (hoursWorked && hoursWorked > 0) {
                    const minutesToAdd = Math.round(hoursWorked * 60);
                    totalMinutes += minutesToAdd;
                  }
                }
              });

              const hours = Math.floor(totalMinutes / 60);
              const minutes = totalMinutes % 60;
              todayHours = `${hours}h ${minutes}m`;
            }

            const empWithHours = {
              ...emp,
              status,
              todayHours
            };
            employeesWithHours.push(empWithHours);
          } catch (error) {
            console.error(`❌ Error fetching hours for employee ${emp.id}:`, error);
            const empWithHours = {
              ...emp,
              status: 'off-shift',
              todayHours: '0h 0m'
            };
            employeesWithHours.push(empWithHours);
          }
        }

        safeLog(`✅ Loaded ${employeesWithHours.length} employees for team management`);
        setEmployees(employeesWithHours);
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error('❌ Error loading employees for team management:', error);
      setEmployees([]);
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
              safeLog('📧 Sending invitation to employee:', employee.id);
              const result = await ApiService.employees.sendInvitation(employee.id);
              safeLog('📧 Invitation sent successfully');
              Alert.alert('Success', `Invitation sent to ${employee.email}`);
              fetchEmployees(false);
            } catch (error) {
              console.error('❌ Error sending invitation:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to send invitation');
            }
          }
        }
      ]
    );
  };

  const handleEditEmployee = (employee) => {
    const editParams = {
      employeeId: employee.id,
      firstName: employee.first_name,
      lastName: employee.last_name,
      email: employee.email,
      phone: employee.phone || '',
      employmentType: employee.employment_type,
      hourlyRate: employee.hourly_rate || '',
      monthlySalary: employee.monthly_salary || '',
      role: employee.role
    };
    
    router.push({
      pathname: '/edit-employee',
      params: editParams
    });
  };

  const handleDeleteEmployee = async (employee) => {
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete ${employee.first_name} ${employee.last_name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              safeLog('🗑️ Deleting employee:', employee.id);
              await ApiService.employees.delete(employee.id);
              safeLog('✅ Employee deleted successfully');
              Alert.alert('Success', 'Employee deleted successfully');
              fetchEmployees(false);
            } catch (error) {
              console.error('❌ Error deleting employee:', error);
              Alert.alert('Error', 'Failed to delete employee');
            }
          }
        }
      ]
    );
  };

  const handleActivateEmployee = async (employee) => {
    Alert.alert(
      'Activate Employee',
      `Are you sure you want to activate ${employee.first_name} ${employee.last_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            try {
              safeLog('✅ Activating employee:', employee.id);
              await ApiService.employees.activate(employee.id);
              safeLog('✅ Employee activated successfully');
              Alert.alert('Success', 'Employee activated successfully');
              fetchEmployees(false);
            } catch (error) {
              console.error('❌ Error activating employee:', error);
              Alert.alert('Error', 'Failed to activate employee');
            }
          }
        }
      ]
    );
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
          
          <View style={styles(palette).managementActions}>
            <TouchableOpacity 
              style={styles(palette).editButton}
              onPress={() => handleEditEmployee(item)}
            >
              <Ionicons name="pencil" size={16} color={palette.primary} />
            </TouchableOpacity>
            
            {item.is_active ? (
              <TouchableOpacity 
                style={styles(palette).deleteButton}
                onPress={() => handleDeleteEmployee(item)}
              >
                <Ionicons name="trash-outline" size={16} color={palette.danger} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles(palette).activateButton}
                onPress={() => handleActivateEmployee(item)}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color={palette.success} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (userLoading || loading) {
    return (
      <SafeAreaView style={styles(palette).container}>
        <View style={styles(palette).loader}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={{ color: palette.text.primary, marginTop: 10 }}>
            Loading team data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canManageEmployees) {
    return (
      <SafeAreaView style={styles(palette).container}>
        <View style={styles(palette).loader}>
          <Text style={{ color: palette.text.primary, textAlign: 'center' }}>
            You don't have permission to manage employees
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(palette).container}>
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
  managementActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  editButton: {
    backgroundColor: palette.background.secondary,
    borderColor: palette.primary,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: palette.background.secondary,
    borderColor: palette.danger,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activateButton: {
    backgroundColor: palette.background.secondary,
    borderColor: palette.success,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});