// app/_layout.js
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider, useUser, ROLES } from '../src/contexts/UserContext';
import { OfficeProvider } from '../src/contexts/OfficeContext';
import useColors from '../hooks/useColors';

function TabsNavigator() {
  const { user, hasAccess } = useUser();
  const { palette, isDark } = useColors(); // Get color palette

  // Determine which tabs to show based on user role
  const showPayrollTab = hasAccess(ROLES.ACCOUNTANT); // Only for accountant and admin
  const showAdminTab = hasAccess(ROLES.ADMIN); // Only for administrators

  if (!user) {
    // If the user is not authenticated, show only the login screen
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: palette.primary,
          tabBarInactiveTintColor: palette.text.secondary,
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Login',
            tabBarStyle: { display: 'none' },
            headerShown: false,
            tabBarButton: () => null, // Hide from tab bar
          }}
        />
      </Tabs>
    );
  }

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
        tabBarStyle: {
          backgroundColor: palette.background.primary,
          borderTopColor: palette.border,
        },
      }}
    >
      <Tabs.Screen
        name="employees"
        options={{
          title: 'Employees',
          tabBarLabel: 'Employees',
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="worktime"
        options={{
          title: 'Work Time',
          tabBarLabel: 'Time',
          tabBarIcon: ({ color }) => (
            <Ionicons name="time" size={24} color={color} />
          ),
        }}
      />

      {showPayrollTab && (
        <Tabs.Screen
          name="payroll"
          options={{
            title: 'Payroll',
            tabBarLabel: 'Payroll',
            tabBarIcon: ({ color }) => (
              <Ionicons name="cash" size={24} color={color} />
            ),
          }}
        />
      )}

      {showAdminTab && (
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Administration',
            tabBarLabel: 'Admin',
            tabBarIcon: ({ color }) => (
              <Ionicons name="settings" size={24} color={color} />
            ),
          }}
        />
      )}

      <Tabs.Screen
        name="biometric-check"
        options={{
          title: 'Biometric Check',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />

      <Tabs.Screen
        name="biometric-registration"
        options={{
          title: 'Biometric Registration',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />

      <Tabs.Screen
        name="office-settings"
        options={{
          title: 'Office Settings',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: 'Login',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}

// Main layout component
export default function Layout() {
  return (
    <UserProvider>
      <OfficeProvider>
        <SafeAreaProvider>
          <TabsNavigator />
        </SafeAreaProvider>
      </OfficeProvider>
    </UserProvider>
  );
}