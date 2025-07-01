import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider, useUser, ROLES } from '../src/contexts/UserContext';
import { OfficeProvider } from '../src/contexts/OfficeContext';
import { WorkStatusProvider } from '../src/contexts/WorkStatusContext';
import useColors from '../hooks/useColors';

function TabsNavigator() {
  const { user, hasAccess } = useUser();
  const { palette } = useColors();

  const isEmployee = user?.role === ROLES.EMPLOYEE;
  const canManagePayroll = hasAccess(ROLES.ACCOUNTANT);
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
          title: isEmployee ? 'My Work Time' : 'Work Time',
          tabBarLabel: 'Time',
          tabBarIcon: ({ color }) => (
            <Ionicons name="time" size={24} color={color} />
          ),
          tabBarButton: !user ? () => null : undefined,
        }}
      />

      {/* Payroll - only for accountants and admins */}
      <Tabs.Screen
        name="payroll"
        options={{
          title: 'Payroll',
          tabBarLabel: 'Payroll',
          tabBarIcon: ({ color }) => (
            <Ionicons name="cash" size={24} color={color} />
          ),
          tabBarButton: (!user || !canManagePayroll) ? () => null : undefined,
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

      {/* Hidden screens - not displayed in tab bar */}
      <Tabs.Screen
        name="biometric-check"
        options={{
          title: 'Biometric Check',
          tabBarButton: () => null,
        }}
      />

      <Tabs.Screen
        name="biometric-registration"
        options={{
          title: 'Biometric Registration',
          tabBarButton: () => null,
        }}
      />

      <Tabs.Screen
        name="office-settings"
        options={{
          title: 'Office Settings',
          tabBarButton: () => null,
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