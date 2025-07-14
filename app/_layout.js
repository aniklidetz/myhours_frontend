import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TouchableOpacity, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { UserProvider, useUser, ROLES } from '../src/contexts/UserContext';
import { OfficeProvider } from '../src/contexts/OfficeContext';
import { WorkStatusProvider } from '../src/contexts/WorkStatusContext';
import useColors from '../hooks/useColors';

function LogoutButton() {
  const { logout } = useUser();
  const { palette } = useColors();

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
          window.alert('Failed to logout: ' + error.message);
        }
      }
    } else {
      // Mobile version uses Alert.alert
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
                console.log('🚪 Starting logout process...');
                await logout();
                console.log('✅ Logout successful, redirecting...');
                router.replace('/');
              } catch (error) {
                console.error('❌ Logout error:', error);
                Alert.alert('Error', 'Failed to logout: ' + error.message);
              }
            }
          }
        ]
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

  const isEmployee = user?.role === ROLES.EMPLOYEE;
  const _canManagePayroll = hasAccess(ROLES.ACCOUNTANT);
  const canAdministrate = hasAccess(ROLES.ADMIN);

  return (
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
        name="biometric-verification"
        options={{
          title: 'Biometric Verification',
          href: null, // Completely hide from routing
        }}
      />
    </Tabs>
  );
}

// Main Layout component with WorkStatusProvider
export default function Layout() {
  return (
    <UserProvider>
      <OfficeProvider>
        <WorkStatusProvider>
          <SafeAreaProvider>
            <TabsNavigator />
          </SafeAreaProvider>
        </WorkStatusProvider>
      </OfficeProvider>
    </UserProvider>
  );
}