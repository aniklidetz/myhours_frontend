// app/(tabs)/_layout.js
// Адаптер для совместимости с tsx версией

import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import useColors from '../../hooks/useColors';

/**
 * Табы для вложенной навигации. 
 * Этот файл создан как адаптер для совместимости с _layout.tsx
 */
export default function TabsLayout() {
  const { palette, isDark } = useColors();
  const colorScheme = useColorScheme(); // для совместимости

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.text.secondary,
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
      {/* Здесь можно определить вложенные табы если они используются */}
    </Tabs>
  );
}