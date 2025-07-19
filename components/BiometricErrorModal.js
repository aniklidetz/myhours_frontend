import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import LiquidGlassButton from './LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';

/**
 * Enhanced error modal for biometric issues with helpful actions
 */
export default function BiometricErrorModal({ title, message, onClose, employeeId, employeeName }) {
  const theme = useLiquidGlassTheme();

  const handleRegisterBiometric = () => {
    onClose?.();
    router.push({
      pathname: '/biometric-registration',
      params: {
        employeeId: employeeId,
        employeeName: employeeName,
        returnTo: '/check-in-out'
      }
    });
  };

  const handleRetry = () => {
    onClose?.();
    // The user can try again
  };

  const isRegistrationNeeded = title.includes('Not Recognized') || 
                               title.includes('No Biometric Data') ||
                               message.includes('register');

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>
          {title.includes('Face') ? '👤' : 
           title.includes('Camera') ? '📷' : 
           title.includes('Permission') ? '🔒' : '⚠️'}
        </Text>
      </View>
      
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        {title}
      </Text>
      
      <Text style={[styles.message, { color: theme.colors.text.light }]}>
        {message}
      </Text>

      <View style={styles.actions}>
        {isRegistrationNeeded && employeeId && (
          <LiquidGlassButton
            title="Register Face"
            onPress={handleRegisterBiometric}
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            textStyle={{ color: '#FFFFFF' }}
          />
        )}
        
        <LiquidGlassButton
          title={isRegistrationNeeded ? "Try Later" : "Try Again"}
          onPress={handleRetry}
          style={[styles.actionButton, styles.secondaryButton]}
          textStyle={{ color: theme.colors.primary }}
        />
      </View>

      {isRegistrationNeeded && (
        <View style={styles.helpContainer}>
          <Text style={[styles.helpTitle, { color: theme.colors.primary }]}>
            💡 Tips for better face recognition:
          </Text>
          <Text style={[styles.helpText, { color: theme.colors.text.light }]}>
            • Ensure good lighting on your face{'\n'}
            • Remove glasses if possible{'\n'}
            • Look directly at the camera{'\n'}
            • Keep your face within the circle
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 300,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  helpContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 18,
  },
});