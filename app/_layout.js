// app/_layout.js
import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider } from '../src/contexts/UserContext';
import { View, Text } from 'react-native';

// Optional loading screen in case you want to add auth/loading logic later
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Loading...</Text>
    </View>
  );
}

// Root layout of the app with UserProvider and screen configuration
export default function Layout() {
  return (
    <UserProvider>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: true }}>
          <Stack.Screen 
            name="index" 
            options={{ 
              title: 'Login', 
              headerShown: false 
            }} 
          />
          <Stack.Screen 
            name="employees" 
            options={{ 
              title: 'Employees' 
            }} 
          />
          <Stack.Screen
            name="biometric-registration"
            options={{ 
              title: 'Biometric Registration' 
            }}
          />
          <Stack.Screen
            name="biometric-check"
            options={({ route }) => ({
              title:
                route.params?.mode === 'check-in'
                  ? 'Check-in'
                  : route.params?.mode === 'check-out'
                    ? 'Check-out'
                    : 'Biometric Check',
            })}
          />
        </Stack>
      </SafeAreaProvider>
    </UserProvider>
  );
}