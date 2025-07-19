import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';

/**
 * Component to show biometric system status and provide help to users
 */
export default function BiometricStatusIndicator({ 
  hasPermission, 
  cameraReady, 
  isCapturing, 
  error, 
  onRetry 
}) {
  const theme = useLiquidGlassTheme();

  if (!error && hasPermission && cameraReady && !isCapturing) {
    // Everything is working fine
    return null;
  }

  const getStatusInfo = () => {
    if (!hasPermission) {
      return {
        icon: '📷',
        title: 'Camera Permission Required',
        message: 'Please enable camera access in your device settings',
        actionText: 'Settings',
        color: theme.colors.warning
      };
    }

    if (error) {
      return {
        icon: '⚠️',
        title: 'Camera Issue',
        message: error,
        actionText: 'Try Again',
        color: theme.colors.danger
      };
    }

    if (!cameraReady) {
      return {
        icon: '⏳',
        title: 'Camera Initializing',
        message: 'Please wait for the camera to start...',
        actionText: null,
        color: theme.colors.info
      };
    }

    if (isCapturing) {
      return {
        icon: '📸',
        title: 'Taking Photo',
        message: 'Please hold still...',
        actionText: null,
        color: theme.colors.success
      };
    }

    return null;
  };

  const statusInfo = getStatusInfo();
  if (!statusInfo) return null;

  return (
    <View style={[styles.container, { backgroundColor: statusInfo.color + '20' }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>{statusInfo.icon}</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: statusInfo.color }]}>
            {statusInfo.title}
          </Text>
          <Text style={[styles.message, { color: theme.colors.text.light }]}>
            {statusInfo.message}
          </Text>
        </View>
        {statusInfo.actionText && onRetry && (
          <TouchableOpacity 
            style={[styles.actionButton, { borderColor: statusInfo.color }]}
            onPress={onRetry}
          >
            <Text style={[styles.actionText, { color: statusInfo.color }]}>
              {statusInfo.actionText}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    borderRadius: 12,
    padding: 16,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(10px)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 18,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});