import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import useLiquidGlassTheme from '../../hooks/useLiquidGlassTheme';
import { showGlassAlert } from '../../hooks/useGlobalGlassModal';

export default function LogoutButton({ style }) {
  const { logout } = useUser();
  const theme = useLiquidGlassTheme();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      showGlassAlert({ title: 'Error', message: 'Failed to logout' });
    }
  };

  if (!theme) return null;

  return (
    <TouchableOpacity 
      style={[styles(theme).logoutButton, style]}
      onPress={handleLogout}
    >
      <Ionicons name="log-out-outline" size={20} color={theme.colors.text.primary} />
    </TouchableOpacity>
  );
}

const styles = (theme) => StyleSheet.create({
  logoutButton: {
    position: 'absolute',
    top: theme.spacing.lg + 10,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.glass.medium,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
    zIndex: 10,
  },
});