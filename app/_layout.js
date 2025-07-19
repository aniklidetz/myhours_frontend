import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TouchableOpacity, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { UserProvider, useUser, ROLES } from '../src/contexts/UserContext';
import { OfficeProvider } from '../src/contexts/OfficeContext';
import { WorkStatusProvider } from '../src/contexts/WorkStatusContext';
import { ToastProvider, useToast } from '../contexts/ToastContext';
import useColors from '../hooks/useColors';
import useGlobalGlassModal, { showGlassConfirm } from '../hooks/useGlobalGlassModal';
import { setupSilentLogging } from '../utils/silentLogger';

// Logout button component - now available inside ToastProvider
function LogoutButton() {
  const { logout } = useUser();
  const { palette } = useColors();
  const { showError } = useToast();

  const handleLogout = async () => {
    console.log('🚪 Logout button clicked');
    
    // For web, use window.confirm instead of Alert.alert
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        try {
          console.log('🚪 Starting logout process...');
          await logout();
          console.log('✅ Logout successful, redirecting...');
          router.replace('/');
        } catch (error) {
          console.error('❌ Logout error:', error);
          showError('Failed to logout: ' + error.message);
        }
      }
    } else {
      // Mobile version uses GlassModal
      showGlassConfirm(
        'Logout',
        'Are you sure you want to logout?',
        async () => {
          try {
            console.log('🚪 Logout button clicked');
            console.log('🚪 Starting logout process...');
            await logout();
            console.log('✅ Logout successful, redirecting...');
            
            // Force navigation to login screen
            setTimeout(() => {
              router.replace('/');
            }, 100);
          } catch (error) {
            console.error('❌ Logout error:', error);
            showError('Failed to logout. You may need to restart the app.');
          }
        }
      );
    }
  };

  return (
    <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
      <Ionicons name="log-out" size={24} color={palette.text.primary} />
    </TouchableOpacity>
  );
}

function TabsNavigator() {
  const { user, hasAccess } = useUser();
  const { palette } = useColors();
  const { modalState, GlassModal } = useGlobalGlassModal();

  const isEmployee = user?.role === ROLES.EMPLOYEE;
  const _canManagePayroll = hasAccess(ROLES.ACCOUNTANT);
  const canAdministrate = hasAccess(ROLES.ADMIN);
  const canManageTeam = hasAccess(ROLES.ACCOUNTANT) || hasAccess(ROLES.ADMIN);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: palette.primary,
          tabBarInactiveTintColor: palette.text.secondary,
          headerShown: true,
          headerStyle: {
            backgroundColor: palette.background.primary,
          },
          headerTintColor: palette.text.primary,
          headerBackVisible: true,
          headerRight: user ? () => <LogoutButton /> : undefined,
          tabBarStyle: user ? {
            backgroundColor: palette.background.primary,
            borderTopColor: palette.border,
          } : { display: 'none' },
        }}
      >
      {/* Login screen - show only if user is not authenticated */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Login',
          headerShown: false,
          tabBarButton: () => null,
        }}
      />

      {/* Check In/Out screen - FIRST TAB for authenticated users */}
      <Tabs.Screen
        name="check-in-out"
        options={{
          title: 'Check In/Out',
          tabBarLabel: 'Check In',
          tabBarIcon: ({ color }) => (
            <Ionicons name="finger-print" size={24} color={color} />
          ),
          tabBarButton: !user ? () => null : undefined,
        }}
      />

      {/* Dashboard - second screen */}
      <Tabs.Screen
        name="employees"
        options={{
          title: isEmployee ? 'My Workday' : 'Dashboard',
          tabBarLabel: isEmployee ? 'My Day' : 'Dashboard',
          tabBarIcon: ({ color }) => (
            <Ionicons 
              name={isEmployee ? "person" : "home"} 
              size={24} 
              color={color} 
            />
          ),
          tabBarButton: !user ? () => null : undefined,
        }}
      />

      {/* Work time screen - for all authenticated users */}
      <Tabs.Screen
        name="worktime"
        options={{
          title: isEmployee ? 'My Work Hours' : 'Work Time',
          tabBarLabel: isEmployee ? 'Hours' : 'Time',
          tabBarIcon: ({ color }) => (
            <Ionicons name="time" size={24} color={color} />
          ),
          tabBarButton: !user ? () => null : undefined,
        }}
      />

      {/* Payroll - available for all authenticated users (employees see own data, managers see all) */}
      <Tabs.Screen
        name="payroll"
        options={{
          title: isEmployee ? 'My Salary' : 'Payroll',
          tabBarLabel: isEmployee ? 'Salary' : 'Payroll',
          tabBarIcon: ({ color }) => (
            <Ionicons name="cash" size={24} color={color} />
          ),
          tabBarButton: !user ? () => null : undefined,
        }}
      />

      {/* Team Management - for accountants and admins */}
      <Tabs.Screen
        name="team-management"
        options={{
          title: 'Team Management',
          tabBarLabel: 'Team',
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={24} color={color} />
          ),
          tabBarButton: (!user || !canManageTeam) ? () => null : undefined,
        }}
      />

      {/* Administration - only for admins */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Administration',
          tabBarLabel: 'Admin',
          tabBarIcon: ({ color }) => (
            <Ionicons name="settings" size={24} color={color} />
          ),
          tabBarButton: (!user || !canAdministrate) ? () => null : undefined,
        }}
      />

      {/* Modal/nested screens - not displayed in tab bar, hide tab bar for these */}
      <Tabs.Screen
        name="biometric-check"
        options={{
          title: 'Biometric Check',
          tabBarButton: () => null,
          tabBarStyle: { display: 'none' },
          headerShown: true,
          headerBackVisible: true,
        }}
      />

      <Tabs.Screen
        name="biometric-registration"
        options={{
          title: 'Biometric Registration',
          tabBarButton: () => null,
          tabBarStyle: { display: 'none' },
          headerShown: true,
          headerBackVisible: true,
        }}
      />

      <Tabs.Screen
        name="office-settings"
        options={{
          title: 'Office Settings',
          tabBarButton: () => null,
          tabBarStyle: { display: 'none' },
          headerShown: true,
          headerBackVisible: true,
        }}
      />

      {/* Dev/Admin routes - completely hidden from tab bar */}
      <Tabs.Screen
        name="test-employees"
        options={{
          title: 'Test Employees',
          href: null, // Completely hide from routing
        }}
      />
      
      <Tabs.Screen
        name="add-employee"
        options={{
          title: 'Add Employee',
          href: null, // Completely hide from routing
        }}
      />
      
      <Tabs.Screen
        name="edit-employee"
        options={{
          title: 'Edit Employee',
          href: null, // Completely hide from routing
        }}
      />
      
      <Tabs.Screen
        name="biometric-verification"
        options={{
          title: 'Biometric Verification',
          href: null, // Completely hide from routing
        }}
      />
      
      <Tabs.Screen
        name="toast-demo"
        options={{
          title: 'Toast Demo',
          href: null, // Completely hide from routing
        }}
      />
      
      <Tabs.Screen
        name="modal-demo"
        options={{
          title: 'Modal Demo',
          href: null, // Completely hide from routing
        }}
      />
      </Tabs>
      
      {/* Global Glass Modal */}
      <GlassModal
        visible={modalState.visible}
        title={modalState.title}
        message={modalState.message}
        buttons={modalState.buttons}
        onClose={modalState.onClose}
        closeOnBackdrop={modalState.closeOnBackdrop}
        closeOnBackButton={modalState.closeOnBackButton}
      />
    </>
  );
}

// Main Layout component with all providers
export default function Layout() {
  // Set up silent logging on app start
  useEffect(() => {
    setupSilentLogging();
  }, []);

  return (
    <UserProvider>
      <OfficeProvider>
        <WorkStatusProvider>
          <ToastProvider>
            <SafeAreaProvider>
              <TabsNavigator />
            </SafeAreaProvider>
          </ToastProvider>
        </WorkStatusProvider>
      </OfficeProvider>
    </UserProvider>
  );
}