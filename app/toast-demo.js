import React from 'react';
import { View, StyleSheet } from 'react-native';
import { router as _router } from 'expo-router';
import { useToast } from '../contexts/ToastContext';
import LiquidGlassLayout from '../components/LiquidGlassLayout';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import HeaderBackButton from '../src/components/HeaderBackButton';

export default function ToastDemoScreen() {
  const theme = useLiquidGlassTheme();
  const { showSuccess, showError, showWarning, showInfo, clearAll } = useToast();

  if (!theme) {
    return null;
  }

  const styles = StyleSheet.create({
    buttonContainer: {
      minWidth: '45%',
    },
    buttonsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
      justifyContent: 'center',
    },
    container: {
      backgroundColor: 'transparent',
      flex: 1,
    },
    content: {
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    title: {
      color: theme.colors.text.primary,
      fontSize: theme.typography.title.fontSize * 0.8,
      fontWeight: theme.typography.title.fontWeight,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
  });

  return (
    <LiquidGlassLayout>
      <HeaderBackButton destination="/employees" />
      <View style={styles.content}>
        <LiquidGlassCard variant="elevated" padding="lg">
          <View style={styles.buttonsGrid}>
            <LiquidGlassButton
              title="Success Toast"
              variant="primary"
              style={styles.buttonContainer}
              onPress={() => showSuccess('Operation completed successfully!')}
            />

            <LiquidGlassButton
              title="Error Toast"
              variant="danger"
              style={styles.buttonContainer}
              onPress={() => showError('Something went wrong!')}
            />

            <LiquidGlassButton
              title="Warning Toast"
              variant="warning"
              style={styles.buttonContainer}
              onPress={() => showWarning('Please check your input')}
            />

            <LiquidGlassButton
              title="Info Toast"
              variant="secondary"
              style={styles.buttonContainer}
              onPress={() => showInfo('Here is some information')}
            />

            <LiquidGlassButton
              title="Long Message"
              variant="ghost"
              style={styles.buttonContainer}
              onPress={() =>
                showSuccess(
                  'This is a longer message to test how the toast handles multiple lines of text content.'
                )
              }
            />

            <LiquidGlassButton
              title="Bottom Toast"
              variant="primary"
              style={styles.buttonContainer}
              onPress={() => showInfo('This toast appears at the bottom', { position: 'bottom' })}
            />

            <LiquidGlassButton
              title="Persistent Toast"
              variant="secondary"
              style={styles.buttonContainer}
              onPress={() => showWarning('This toast stays until dismissed', { duration: 0 })}
            />

            <LiquidGlassButton
              title="Clear All"
              variant="danger"
              style={styles.buttonContainer}
              onPress={clearAll}
            />
          </View>
        </LiquidGlassCard>
      </View>
    </LiquidGlassLayout>
  );
}
