import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider, useUser, ROLES } from '../src/contexts/UserContext';
import { OfficeProvider } from '../src/contexts/OfficeContext';
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
      {/* Экран входа - показываем только если пользователь не авторизован */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Login',
          headerShown: false,
          tabBarButton: () => null,
        }}
      />

      {/* Главный экран - разный для разных ролей */}
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

      {/* Экран рабочего времени - для всех авторизованных */}
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

      {/* Зарплата - только для бухгалтеров и админов */}
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

      {/* Администрирование - только для админов */}
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

      {/* Скрытые экраны - не отображаются в таб-баре */}
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
    </Tabs>
  );
}

// Главный компонент Layout
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