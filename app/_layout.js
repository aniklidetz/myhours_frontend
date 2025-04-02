// app/_layout.js
import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function Layout() {
    return (
        <SafeAreaProvider>
            <Stack>
                <Stack.Screen name="index" options={{ title: 'Login' }} />
                <Stack.Screen name="employees" options={{ title: 'Employees' }} />
                <Stack.Screen
                    name="biometric-registration"
                    options={{ title: 'Biometric Registration' }}
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
    );
}