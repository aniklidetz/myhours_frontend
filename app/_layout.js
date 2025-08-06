import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { UserProvider, useUser, ROLES } from '../src/contexts/UserContext';
import { OfficeProvider } from '../src/contexts/OfficeContext';
import { WorkStatusProvider } from '../src/contexts/WorkStatusContext';
import { ToastProvider } from '../contexts/ToastContext';
import useColors from '../hooks/useColors';
import useGlobalGlassModal from '../hooks/useGlobalGlassModal';
// ✅ SAFE IMPORT: Add error handling for silentLogger
// import { setupSilentLogging } from '../utils/silentLogger';

// FIX: Use the dedicated component instead of duplicating code
import LogoutButton from '../components/LogoutButton';
// FIX: Use shared styles
import { COLORS, SPACING } from '../constants/CommonStyles';

// FIX: Adaptive distribution of navigation icons
const getTabBarStyle = (visibleTabsCount) => ({
  backgroundColor: COLORS.backgroundPrimary, // Semi-transparent black rgba(0, 0, 0, 0.6)
  backdropFilter: 'blur(20px)',
  borderTopWidth: 0,
  borderTopColor: 'transparent',
  paddingTop: SPACING.sm,
  paddingBottom: Platform.OS === 'ios' ? 28 : SPACING.sm,
  height: Platform.OS === 'ios' ? 88 : 68,
  elevation: 0,
  shadowOpacity: 0,
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowRadius: 0,
  position: 'absolute', // Make tab bar float over content
  left: 0,
  right: 0,
  bottom: 0,
  // KEY FIX: even distribution
  justifyContent: 'space-evenly',
  alignItems: 'center',
  flexDirection: 'row',
  paddingHorizontal: visibleTabsCount > 5 ? 4 : SPACING.sm,
});

// Count visible tabs based on the user's role
const getVisibleTabsCount = (user, canManageTeam, canAdministrate) => {
  if (!user) return 1; // Login only

  let count = 4; // Base tabs: Check In/Out, Dashboard, Time, Payroll

  if (canManageTeam)   count += 1; // Team Management
  if (canAdministrate) count += 2; // Admin + Office

  return count;
};

function TabsNavigator() {
  const { user, hasAccess, isLoggingOut } = useUser();
  const { palette } = useColors();
  const { modalState, GlassModal } = useGlobalGlassModal();

  const isEmployee       = user?.role === ROLES.EMPLOYEE;
  const canManagePayroll = hasAccess(ROLES.ACCOUNTANT);
  const canAdministrate  = hasAccess(ROLES.ADMIN);
  const canManageTeam    = hasAccess(ROLES.ACCOUNTANT) || hasAccess(ROLES.ADMIN);

  // Calculate number of visible tabs
  const visibleTabsCount = getVisibleTabsCount(user, canManageTeam, canAdministrate);

  return (
    <>
      <Tabs
        sceneContainerStyle={{ backgroundColor: 'transparent' }}
        screenOptions={{
          tabBarActiveTintColor:   COLORS.textPrimary,   // Use constant
          tabBarInactiveTintColor: COLORS.textSecondary, // Use constant
          headerShown: true,
          headerStyle: {
            backgroundColor: palette.background.primary,
          },
          headerTintColor: COLORS.textPrimary,           // Use constant
          headerTitleStyle: {
            color:      COLORS.textPrimary,              // Use constant
            fontWeight: '600',
          },
          headerBackVisible:           true,
          headerBackTitleVisible:      false,
          headerBackButtonMenuEnabled: false,
          // FIX: Use the LogoutButton component
          headerRight: user ? () => <LogoutButton.Header /> : undefined,
          // FIX: Adaptive navigation style
          tabBarStyle: user
            ? getTabBarStyle(visibleTabsCount)
            : { display: 'none' },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: 2,
            textShadowColor:   'rgba(0, 0, 0, 0.3)',
            textShadowOffset:  { width: 0, height: 1 },
            textShadowRadius:  1,
          },
          tabBarIconStyle: {
            marginBottom: 2,
            shadowColor:   '#000000',
            shadowOffset:  { width: 0, height: 1 },
            shadowOpacity: 0.3,
            shadowRadius:  1,
          },
          // FIX: Adaptive icon sizes
          tabBarItemStyle: {
            flex: 1,
            maxWidth:        visibleTabsCount > 6 ? 60 : 80,
            paddingHorizontal: visibleTabsCount > 6 ? 2 : 4,
          },
        }}
      >
        {/* Login screen */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Login',
            headerShown: false,
            tabBarButton: () => null,
          }}
        />

        {/* Check In/Out screen */}
        <Tabs.Screen
          name="check-in-out"
          options={{
            title: 'Check In/Out',
            tabBarLabel: 'Check In',
            tabBarIcon: ({ color }) => (
              <Ionicons name="finger-print" size={24} color={color} />
            ),
            tabBarButton: (!user && !isLoggingOut) ? () => null : undefined,
          }}
        />

        {/* Dashboard */}
        <Tabs.Screen
          name="employees"
          options={{
            title:      isEmployee ? 'My Workday' : 'Dashboard',
            tabBarLabel: isEmployee ? 'My Day'   : 'Dashboard',
            tabBarIcon: ({ color }) => (
              <Ionicons
                name={isEmployee ? 'person' : 'home'}
                size={24}
                color={color}
              />
            ),
            tabBarButton: (!user && !isLoggingOut) ? () => null : undefined,
          }}
        />

        {/* Work-time screen */}
        <Tabs.Screen
          name="worktime"
          options={{
            title:      isEmployee ? 'My Work Hours' : 'Work Time',
            tabBarLabel: isEmployee ? 'Hours'        : 'Time',
            tabBarIcon: ({ color }) => (
              <Ionicons name="time" size={24} color={color} />
            ),
            tabBarButton: (!user && !isLoggingOut) ? () => null : undefined,
          }}
        />

        {/* Payroll */}
        <Tabs.Screen
          name="payroll"
          options={{
            title:      isEmployee ? 'My Salary' : 'Payroll',
            tabBarLabel: isEmployee ? 'Salary'   : 'Payroll',
            tabBarIcon: ({ color }) => (
              <Ionicons name="cash" size={24} color={color} />
            ),
            tabBarButton: (!user && !isLoggingOut) ? () => null : undefined,
          }}
        />

        {/* Team Management */}
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


        {/* Advanced Office Settings */}
        <Tabs.Screen
          name="advanced-office-settings"
          options={{
            title: 'Administration',
            tabBarLabel: 'Admin',
            tabBarIcon: ({ color }) => (
              <Ionicons name="settings" size={24} color={color} />
            ),
            tabBarButton: (!user || !canAdministrate) ? () => null : undefined,
          }}
        />

        {/* Other hidden screens remain unchanged */}
        <Tabs.Screen
          name="biometric-check"
          options={{
            title: 'Biometric Check',
            tabBarButton: () => null,
            headerShown: true,
            headerBackVisible: true,
          }}
        />

        <Tabs.Screen
          name="biometric-registration"
          options={{
            title: 'Biometric Registration',
            tabBarButton: () => null,
            headerShown: true,
            headerBackVisible: true,
          }}
        />


        {/* Dev/Admin routes – completely hidden from tab bar */}
        <Tabs.Screen
          name="test-employees"
          options={{
            title: 'Test Employees',
            href: null,
          }}
        />

        <Tabs.Screen
          name="add-employee"
          options={{
            title: 'Add Employee',
            href: null,
          }}
        />

        <Tabs.Screen
          name="edit-employee"
          options={{
            title: 'Edit Employee',
            href: null,
          }}
        />

        <Tabs.Screen
          name="biometric-verification"
          options={{
            title: 'Biometric Verification',
            href: null,
          }}
        />

        <Tabs.Screen
          name="toast-demo"
          options={{
            title: 'Toast Demo',
            href: null,
          }}
        />

        <Tabs.Screen
          name="modal-demo"
          options={{
            title: 'Modal Demo',
            href: null,
          }}
        />
      </Tabs>

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

// ✅ SAFE SILENT LOGGING SETUP
const setupSafeSilentLogging = async () => {
  try {
    const { setupSilentLogging } = await import('../utils/silentLogger');
    setupSilentLogging();
    console.log('✅ Silent logging setup completed');
  } catch (error) {
    console.warn('⚠️ Could not setup silent logging:', error.message);
    // Continue without silent logging - not critical for app functionality
  }
};

// Main Layout component with safe silent logging
export default function Layout() {
  useEffect(() => {
    // ✅ SAFE SETUP: Use async import with error handling
    setupSafeSilentLogging();
  }, []);

  return (
    <SafeAreaProvider>
      <UserProvider>
        <OfficeProvider>
          <WorkStatusProvider>
            <ToastProvider>
              <TabsNavigator />
            </ToastProvider>
          </WorkStatusProvider>
        </OfficeProvider>
      </UserProvider>
    </SafeAreaProvider>
  );
}