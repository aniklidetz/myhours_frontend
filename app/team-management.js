import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import { useUser, ROLES } from '../src/contexts/UserContext';
import { useOffice } from '../src/contexts/OfficeContext';
import { useWorkStatus } from '../src/contexts/WorkStatusContext';
import useColors from '../hooks/useColors';
import useLocation from '../hooks/useLocation';
import ApiService from '../src/api/apiService';
import { safeLog } from '../src/utils/safeLogging';
import LiquidGlassScreenLayout from '../components/LiquidGlassScreenLayout';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import GlassModal from '../components/GlassModal';
import useGlassModal from '../hooks/useGlassModal';

// Force reload Wed Aug 27 22:45:18 IDT 2025
export default function TeamManagementScreen() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user, hasAccess, logout, loading: userLoading, isLoggingOut } = useUser();
  const { palette: _palette } = useColors();
  const theme = useLiquidGlassTheme();
  const { officeSettings: _officeSettings } = useOffice();
  const { location: _location, isUserInRadius: _isUserInRadius } = useLocation({
    watchPosition: false,
  });
  const {
    workStatus: _workStatus,
    loading: _workStatusLoading,
    loadWorkStatus: _loadWorkStatus,
    getCurrentDuration: _getCurrentDuration,
  } = useWorkStatus();
  const { modalState, showModal, hideModal, showConfirm, showAlert, showError } = useGlassModal();

  // Define roles MOVED BEFORE EARLY RETURN
  const _isEmployee = user?.role === ROLES.EMPLOYEE;
  const isAccountant = hasAccess(ROLES.ACCOUNTANT);
  const isAdmin = hasAccess(ROLES.ADMIN);
  const canManageEmployees = isAccountant || isAdmin;

  // ALL HOOKS MOVED BEFORE EARLY RETURN
  const fetchEmployees = useCallback(
    async (useCache = false, retryCount = 0) => {
      // Don't make API calls if logout is in progress
      if (isLoggingOut) {
        console.log(' [TEAM-MANAGEMENT] Skipping fetchEmployees - logout in progress');
        return;
      }

      try {
        console.log(' [TEAM-MANAGEMENT DEBUG] Starting fetchEmployees...');
        console.log(' [DEBUG] User:', user?.username, 'CanManage:', canManageEmployees);

        safeLog(' Fetching employees list for team management...');

        // Clear cache to ensure we get all employees with new page_size
        if (retryCount === 0) {
          await ApiService.employees.clearCache();
        }

        const response = await ApiService.employees.getAll({ page_size: 100 }, false);

        console.log(' [DEBUG] Response received:', response ? 'SUCCESS' : 'NO_RESPONSE');
        console.log(' [DEBUG] Response type:', Array.isArray(response) ? 'ARRAY' : typeof response);
        console.log(
          ' [DEBUG] Response.results:',
          response?.results ? `${response.results.length} employees` : 'NO_RESULTS'
        );

        if (!response) {
          console.error(' No response from API');
          showError({ message: 'No response from server. Please try again.' });
          return;
        }

        const employeesList = Array.isArray(response) ? response : response.results || [];

        if (!Array.isArray(employeesList)) {
          console.error(' Invalid employees data format:', typeof employeesList);
          showError({ message: 'Invalid data format received from server.' });
          return;
        }

        console.log(` Loaded ${employeesList.length} employees for team management`);
        setEmployees(employeesList);
      } catch (error) {
        console.error(' Failed to fetch employees:', error.message || error);

        if (retryCount < 2 && !isLoggingOut) {
          console.log(` Retrying... (${retryCount + 1}/2)`);
          setTimeout(() => {
            if (!isLoggingOut) {
              fetchEmployees(useCache, retryCount + 1);
            }
          }, 1000);
          return;
        }

        if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
          showError({ message: 'Request timed out. Please check your connection and try again.' });
        } else if (error.response?.status === 401) {
          console.log(' Authentication required, redirecting to login');
          await logout();
          router.replace('/');
        } else if (error.response?.status === 403) {
          showError({ message: 'You do not have permission to view employees.' });
        } else {
          showError({ message: `Failed to load employees: ${error.message}` });
        }
      }
    },
    [user, canManageEmployees, showError, logout, isLoggingOut]
  );

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
  }, [user, canManageEmployees, fetchEmployees]);

  // Redirect to login if user is null and not loading
  useEffect(() => {
    if (!user && !loading && !userLoading) {
      router.replace('/');
    }
  }, [user, loading, userLoading]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      // Wait for user loading to complete before fetching
      if (user && user.id && canManageEmployees && !userLoading) {
        // Small delay to ensure authentication is fully established
        setTimeout(() => {
          fetchEmployees(false);
        }, 200);
      }
    }, [user, canManageEmployees, userLoading, fetchEmployees])
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

  // Create liquid glass styles after theme is loaded
  const styles = StyleSheet.create({
    container: {
      backgroundColor: 'transparent',
      flex: 1,
      paddingBottom: 0, // Ensure content extends under tab bar
    },
    loader: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
    listContent: {
      // Padding handled by LiquidGlassScreenLayout
      paddingBottom: Platform.OS === 'ios' ? 100 : 80, // Reduced to allow content to reach tab bar
    },
    // FIX: Fixed Add Member button at bottom of content
    fixedAddButtonContainer: {
      // Horizontal padding handled by LiquidGlassScreenLayout
      paddingTop: theme.spacing.sm, //  it was lg (24px) now is sm (8px)
      paddingBottom: theme.spacing.md, //  it was lg (24px) now is md (16px)
      alignItems: 'center',
      backgroundColor: 'transparent',
      flexShrink: 0, // Prevent container from shrinking
      height: 'auto', // Auto height based on content
    },
    addMemberButton: {
      minWidth: 200,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 32,
    },
    addButtonText: {
      color: theme.colors.text.primary,
      fontSize: theme.typography.body.fontSize,
      fontWeight: 'bold',
    },
    employeeCard: {
      marginBottom: theme.spacing.md,
    },
    employeeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start', // Better alignment for multiline content
      marginBottom: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)', // Subtle separator
    },
    employeeInfo: {
      flex: 1,
      paddingRight: theme.spacing.md, // Space before status badge
    },
    employeeName: {
      color: theme.colors.text.primary,
      fontSize: theme.typography.body.fontSize,
      fontWeight: 'bold',
    },
    employeeRole: {
      color: theme.colors.text.secondary,
      fontSize: theme.typography.caption.fontSize,
      marginTop: theme.spacing.xs,
    },
    employeeEmail: {
      color: theme.colors.text.secondary,
      fontSize: theme.typography.caption.fontSize,
      marginTop: theme.spacing.xs,
    },
    employeeStats: {
      flexDirection: 'row',
      justifyContent: 'space-around', // Better distribution
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: 'rgba(255, 255, 255, 0.03)', // Subtle background
      borderRadius: theme.borderRadius.md,
    },
    statItem: {
      alignItems: 'center',
      flex: 1, // Equal width distribution
    },
    statLabel: {
      color: theme.colors.text.secondary,
      fontSize: theme.typography.caption.fontSize,
      marginBottom: theme.spacing.xs,
    },
    statValue: {
      color: theme.colors.text.primary,
      fontSize: theme.typography.body.fontSize,
      fontWeight: 'bold',
    },
    statusBadge: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      alignSelf: 'flex-start',
      minWidth: 80, // Consistent width
      alignItems: 'center', // Center text
    },
    statusActive: {
      backgroundColor: theme.colors.status.success[0],
    },
    statusInactive: {
      backgroundColor: theme.colors.glass.medium,
    },
    statusText: {
      color: theme.colors.text.primary,
      fontSize: theme.typography.caption.fontSize,
      fontWeight: 'bold',
    },
    actionButtons: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      justifyContent: 'space-between',
      marginTop: theme.spacing.md,
      alignItems: 'stretch',
    },
    actionButton: {
      flex: 1,
      marginHorizontal: 4,
      alignSelf: 'stretch',
      minWidth: 0,
      maxWidth: '50%', // Ensure equal distribution in row
    },
    emptyState: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      padding: theme.spacing.xl,
    },
    emptyStateTitle: {
      color: theme.colors.text.primary,
      fontSize: theme.typography.title.fontSize * 0.8,
      fontWeight: theme.typography.title.fontWeight,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    emptyStateText: {
      color: theme.colors.text.secondary,
      fontSize: theme.typography.body.fontSize,
      lineHeight: 24,
      textAlign: 'center',
    },
  });

  const _fetchEmployeesWithHours = async employeesBasic => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const updatedEmployees = [...employeesBasic];

      console.log(' Starting optimized team hours fetch:', {
        employeeCount: updatedEmployees.length,
        date: today,
      });

      // Extract employee IDs for bulk fetch
      const employeeIds = updatedEmployees.map(emp => emp.id);

      try {
        // Use new bulk API method instead of individual calls
        const teamWorkLogs = await ApiService.worktime.getTeamHours(employeeIds, today);

        // Process the bulk results
        updatedEmployees.forEach((emp, index) => {
          let todayHours = '0h 0m';
          let status = 'off-shift';

          if (teamWorkLogs && teamWorkLogs.results && teamWorkLogs.results.length > 0) {
            let totalMinutes = 0;
            let _hasActiveSession = false;

            // Filter logs for this specific employee
            const employeeLogs = teamWorkLogs.results.filter(log => {
              if (!log.check_in) return false;
              const isForThisEmployee =
                log.employee === emp.id ||
                log.employee_id === emp.id ||
                log.employee_name === `${emp.first_name || ''} ${emp.last_name || ''}`.trim();

              if (!isForThisEmployee) return false;

              const logDate = new Date(log.check_in).toISOString().split('T')[0];
              const todayDate = new Date().toISOString().split('T')[0];

              return logDate === todayDate;
            });

            employeeLogs.forEach(log => {
              if (log.check_in && !log.check_out) {
                _hasActiveSession = true;
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

          updatedEmployees[index] = {
            ...emp,
            status,
            todayHours,
          };
        });

        // Single update instead of progressive updates
        setEmployees(updatedEmployees);
        safeLog(` Loaded hours for ${updatedEmployees.length} employees (bulk fetch)`);
      } catch (bulkError) {
        console.warn(' Bulk fetch failed, falling back to individual requests:', bulkError);

        // Fallback to original individual fetch method
        for (let i = 0; i < updatedEmployees.length; i++) {
          const emp = updatedEmployees[i];

          try {
            const workLogs = await ApiService.worktime.getLogs({
              date: today,
              employee: emp.id,
              page_size: 20,
            });

            let todayHours = '0h 0m';
            let status = 'off-shift';

            if (workLogs && workLogs.results && workLogs.results.length > 0) {
              let totalMinutes = 0;
              let _hasActiveSession = false;

              const todayLogs = workLogs.results.filter(log => {
                if (!log.check_in) return false;
                const isForThisEmployee =
                  log.employee === emp.id ||
                  log.employee_id === emp.id ||
                  log.employee_name === `${emp.first_name || ''} ${emp.last_name || ''}`.trim();

                if (!isForThisEmployee) return false;

                const logDate = new Date(log.check_in).toISOString().split('T')[0];
                const todayDate = new Date().toISOString().split('T')[0];

                return logDate === todayDate;
              });

              todayLogs.forEach(log => {
                if (log.check_in && !log.check_out) {
                  _hasActiveSession = true;
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

            updatedEmployees[i] = {
              ...emp,
              status,
              todayHours,
            };

            // Update employees progressively for better UX
            if (i % 3 === 0 || i === updatedEmployees.length - 1) {
              setEmployees([...updatedEmployees]);
            }
          } catch (error) {
            console.error(` Error fetching hours for employee ${emp.id}:`, error);
            updatedEmployees[i] = {
              ...emp,
              status: 'off-shift',
              todayHours: '0h 0m',
            };
          }

          // Small delay for fallback method
          if (i < updatedEmployees.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }

        setEmployees(updatedEmployees);
        safeLog(` Loaded hours for ${updatedEmployees.length} employees (fallback)`);
      }
    } catch (error) {
      console.error(' Error loading employee hours:', error);
    }
  };

  const handleBiometricRegistration = employee => {
    router.push({
      pathname: '/biometric-registration',
      params: {
        employeeId: employee.id,
        employeeName: `${employee.first_name} ${employee.last_name}`,
      },
    });
  };

  const handleSendInvitation = async employee => {
    showConfirm({
      title: 'Send Invitation',
      message: `Send invitation email to ${employee.email}?`,
      confirmText: 'Send',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          safeLog(' Sending invitation to employee:', employee.id);
          const _result = await ApiService.employees.sendInvitation(employee.id);
          safeLog(' Invitation sent successfully');
          showAlert({
            title: 'Success',
            message: `Invitation sent to ${employee.email}`,
          });
          fetchEmployees(false);
        } catch (error) {
          console.error(' Error sending invitation:', error);
          showError({
            message: error.response?.data?.error || 'Failed to send invitation',
          });
        }
      },
    });
  };

  const handleEditEmployee = employee => {
    const editParams = {
      employeeId: employee.id,
      firstName: employee.first_name,
      lastName: employee.last_name,
      email: employee.email,
      phone: employee.phone || '',
      employmentType: employee.employment_type,
      hourlyRate: employee.hourly_rate || '',
      monthlySalary: employee.monthly_salary || '',
      role: employee.role,
    };

    router.push({
      pathname: '/edit-employee',
      params: editParams,
    });
  };

  const handleDeactivateEmployee = async employee => {
    showConfirm({
      title: 'Deactivate Employee',
      message: `Are you sure you want to deactivate ${employee.first_name} ${employee.last_name}?`,
      confirmText: 'Deactivate',
      confirmType: 'danger',
      onConfirm: async () => {
        try {
          safeLog(' Deactivating employee:', employee.id);
          await ApiService.employees.deactivate(employee.id);
          safeLog(' Employee deactivated successfully');
          showAlert({
            title: 'Success',
            message: 'Employee deactivated successfully',
          });
          fetchEmployees(false);
        } catch (error) {
          console.error(' Error deactivating employee:', error);
          showError({
            message: 'Failed to deactivate employee',
          });
        }
      },
    });
  };

  const handleDeleteEmployee = async employee => {
    showConfirm({
      title: 'Permanent Delete',
      message: `Are you absolutely sure you want to permanently delete ${employee.first_name} ${employee.last_name}? This action cannot be undone and will remove all employee data.`,
      confirmText: 'Delete Permanently',
      confirmType: 'danger',
      onConfirm: async () => {
        try {
          safeLog(' Attempting to delete employee:', employee.id);
          await ApiService.employees.delete(employee.id);
          safeLog(' Employee deleted successfully');
          showAlert({
            title: 'Success',
            message: 'Employee deleted permanently',
          });
          fetchEmployees(false);
        } catch (error) {
          console.error(' Error deleting employee:', error);

          // Check if it's a 404 or 405 error (method not allowed)
          if (error.response?.status === 405 || error.response?.status === 404) {
            showAlert({
              title: 'Not Available',
              message:
                'Permanent deletion is not available on this server. Employee has been deactivated instead for data safety.',
              onPress: async () => {
                try {
                  await ApiService.employees.deactivate(employee.id);
                  safeLog(' Employee deactivated as fallback');
                  fetchEmployees(false);
                } catch (deactivateError) {
                  console.error(' Error deactivating employee:', deactivateError);
                  showError({
                    message: 'Failed to deactivate employee',
                  });
                }
              },
            });
          } else {
            showError({
              message: `Failed to delete employee: ${error.message}`,
            });
          }
        }
      },
    });
  };

  const handleManageEmployee = async employee => {
    showModal({
      title: 'Manage Employee',
      message: `What would you like to do with ${employee.first_name} ${employee.last_name}?`,
      buttons: [
        {
          label: 'Cancel',
          type: 'secondary',
          onPress: () => {
            hideModal(); // Close modal
          },
        },
        {
          label: 'Edit Details',
          type: 'primary',
          onPress: () => {
            hideModal(); // Close modal first
            handleEditEmployee(employee);
          },
        },
        {
          label: 'Deactivate',
          type: 'danger',
          onPress: () => {
            hideModal(); // Close modal first
            handleDeactivateEmployee(employee);
          },
        },
        {
          label: 'Delete (Permanent)',
          type: 'danger',
          onPress: () => {
            hideModal(); // Close modal first
            handleDeleteEmployee(employee);
          },
        },
      ],
    });
  };

  const handleActivateEmployee = async employee => {
    showConfirm({
      title: 'Activate Employee',
      message: `Are you sure you want to activate ${employee.first_name} ${employee.last_name}?`,
      confirmText: 'Activate',
      onConfirm: async () => {
        try {
          safeLog(' Activating employee:', employee.id);
          await ApiService.employees.activate(employee.id);
          safeLog(' Employee activated successfully');
          showAlert({
            title: 'Success',
            message: 'Employee activated successfully',
          });
          fetchEmployees(false);
        } catch (error) {
          console.error(' Error activating employee:', error);
          showError({
            message: 'Failed to activate employee',
          });
        }
      },
    });
  };

  const renderEmployeeItem = ({ item }) => {
    const getEmployeeStatus = () => {
      if (!item.is_registered) {
        if (item.has_pending_invitation) {
          return { text: 'Invited', color: theme.colors.status.warning[0] };
        }
        return { text: 'Not Registered', color: theme.colors.status.error[0] };
      }
      if (!item.has_biometric) {
        return { text: 'No Biometric', color: theme.colors.status.warning[0] };
      }
      return { text: 'Active', color: theme.colors.status.success[0] };
    };

    const status = getEmployeeStatus();

    return (
      <LiquidGlassCard variant="bordered" padding="md" style={styles.employeeCard}>
        <View style={styles.employeeHeader}>
          <View style={styles.employeeInfo}>
            <Text style={styles.employeeName}>
              {item.first_name} {item.last_name}
            </Text>
            <Text style={styles.employeeEmail}>{item.email}</Text>
            <Text style={styles.employeeRole}>{item.role || 'Employee'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          </View>
        </View>

        {item.is_registered && (
          <View style={styles.employeeStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Today&apos;s Hours</Text>
              <Text style={styles.statValue}>{item.todayHours || '0h'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Status</Text>
              <Text style={styles.statValue}>{item.is_active ? 'Active' : 'Inactive'}</Text>
            </View>
          </View>
        )}

        <View style={styles.actionButtons}>
          {!item.is_registered ? (
            <LiquidGlassButton
              title={item.has_pending_invitation ? 'Resend' : 'Invite'}
              onPress={() => handleSendInvitation(item)}
              variant="primary"
              style={styles.actionButton}
            />
          ) : !item.has_biometric ? (
            <LiquidGlassButton
              title="Register Face"
              onPress={() => handleBiometricRegistration(item)}
              variant="secondary"
              style={styles.actionButton}
            />
          ) : null}

          {item.is_active ? (
            <LiquidGlassButton
              title="Manage"
              onPress={() => handleManageEmployee(item)}
              variant="secondary"
              style={styles.actionButton}
            />
          ) : (
            <LiquidGlassButton
              title="Activate"
              onPress={() => handleActivateEmployee(item)}
              variant="primary"
              style={styles.actionButton}
            />
          )}
        </View>
      </LiquidGlassCard>
    );
  };

  if (userLoading || loading) {
    return (
      <LiquidGlassScreenLayout scrollable={false}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.text.primary} />
          <Text style={{ color: theme.colors.text.primary, marginTop: 10 }}>
            Loading team data...
          </Text>
        </View>
      </LiquidGlassScreenLayout>
    );
  }

  if (!canManageEmployees) {
    return (
      <LiquidGlassScreenLayout scrollable={false}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>🚫 Access Denied</Text>
          <Text style={styles.emptyStateText}>
            You don&apos;t have permission to manage team members.
          </Text>
        </View>
      </LiquidGlassScreenLayout>
    );
  }

  return (
    <LiquidGlassScreenLayout.WithGlassHeader
      title="Team Members"
      backDestination="/employees"
      showLogout={true}
      scrollable={false}
      noBottomPadding={true}
    >
      <FlatList
        data={employees}
        renderItem={renderEmployeeItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        removeClippedSubviews={false}
        ListHeaderComponent={() => (
          // Add Member button at the top
          <View style={styles.fixedAddButtonContainer}>
            <LiquidGlassButton
              title="Add Member"
              onPress={() => router.push('/add-employee')}
              variant="ghost"
              style={styles.addMemberButton}
            />
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>👥 No Team Members</Text>
            <Text style={styles.emptyStateText}>
              Add your first team member to get started with team management.
            </Text>
          </View>
        )}
        ListFooterComponent={() => <View style={{ height: 50 }} />}
      />

      {/* Glass Modal */}
      <GlassModal
        visible={modalState.visible}
        title={modalState.title}
        message={modalState.message}
        buttons={modalState.buttons}
        onClose={modalState.onClose}
        closeOnBackdrop={modalState.closeOnBackdrop}
        closeOnBackButton={modalState.closeOnBackButton}
      />
    </LiquidGlassScreenLayout.WithGlassHeader>
  );
}
