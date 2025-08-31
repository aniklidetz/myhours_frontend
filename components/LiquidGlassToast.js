/* eslint-disable react/prop-types */
import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';

const { width: _screenWidth } = Dimensions.get('window');

const LiquidGlassToast = ({
  visible,
  message,
  type = 'info', // 'success', 'error', 'warning', 'info'
  duration = 3000,
  position = 'top', // 'top', 'bottom'
  onHide,
}) => {
  const theme = useLiquidGlassTheme();
  const translateY = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const rotateX = useRef(new Animated.Value(0)).current;

  // Pan responder for swipe to dismiss
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > 10;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (position === 'top') {
        translateY.setValue(gestureState.dy < 0 ? gestureState.dy : 0);
      } else {
        translateY.setValue(gestureState.dy > 0 ? gestureState.dy : 0);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (Math.abs(gestureState.dy) > 50) {
        // Swipe to dismiss
        hideToast();
      } else {
        // Snap back
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const showToast = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(opacity, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.sequence([
        Animated.timing(rotateX, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(rotateX, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [translateY, opacity, scale, rotateX]);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: position === 'top' ? -100 : 100,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(opacity, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(scale, {
        toValue: 0.8,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start(() => {
      onHide && onHide();
    });
  }, [translateY, opacity, scale, position, onHide]);

  useEffect(() => {
    if (visible) {
      showToast();

      if (duration > 0) {
        const timer = setTimeout(() => {
          hideToast();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      hideToast();
    }
  }, [visible, duration, showToast, hideToast]);

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          color: theme.colors.status.success[0],
          gradientColors: [
            'rgba(34, 197, 94, 0.4)',
            'rgba(34, 197, 94, 0.2)',
            'rgba(34, 197, 94, 0.1)',
          ],
        };
      case 'error':
        return {
          icon: 'alert-circle',
          color: theme.colors.status.error[0],
          gradientColors: [
            'rgba(239, 68, 68, 0.4)',
            'rgba(239, 68, 68, 0.2)',
            'rgba(239, 68, 68, 0.1)',
          ],
        };
      case 'warning':
        return {
          icon: 'warning',
          color: theme.colors.status.warning[0],
          gradientColors: [
            'rgba(251, 191, 36, 0.4)',
            'rgba(251, 191, 36, 0.2)',
            'rgba(251, 191, 36, 0.1)',
          ],
        };
      default:
        return {
          icon: 'information-circle',
          color: theme.colors.glass.border,
          gradientColors: [
            'rgba(255, 255, 255, 0.3)',
            'rgba(255, 255, 255, 0.15)',
            'rgba(255, 255, 255, 0.05)',
          ],
        };
    }
  };

  const typeConfig = getTypeConfig();

  const styles = StyleSheet.create({
    blurContainer: {
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
    },
    container: {
      bottom: position === 'bottom' ? (Platform.OS === 'ios' ? 50 : 30) : undefined,
      left: 0,
      paddingHorizontal: theme.spacing.lg,
      position: 'absolute',
      right: 0,
      top: position === 'top' ? (Platform.OS === 'ios' ? 50 : 30) : undefined,
      zIndex: 9999,
    },
    content: {
      alignItems: 'center',
      backgroundColor: theme.colors.glass.light,
      borderColor: theme.colors.glass.border,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    dismissIndicator: {
      alignSelf: 'center',
      backgroundColor: theme.colors.glass.border,
      borderRadius: 2,
      height: 3,
      marginTop: theme.spacing.xs,
      opacity: 0.6,
      width: 30,
    },
    gradient: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    iconContainer: {
      alignItems: 'center',
      height: 24,
      justifyContent: 'center',
      marginRight: theme.spacing.md,
      width: 24,
    },
    message: {
      color: theme.colors.text.primary,
      fontSize: theme.typography.body.fontSize,
      fontWeight: '600',
      textShadowColor: theme.shadows.text.color,
      textShadowOffset: theme.shadows.text.offset,
      textShadowRadius: theme.shadows.text.radius,
    },
    textContainer: {
      flex: 1,
    },
    toast: {
      borderRadius: theme.borderRadius.xl,
      elevation: theme.shadows.elevated.elevation,
      minHeight: 60,
      overflow: 'hidden',
      shadowColor: theme.shadows.elevated.shadowColor,
      shadowOffset: theme.shadows.elevated.shadowOffset,
      shadowOpacity: theme.shadows.elevated.shadowOpacity,
      shadowRadius: theme.shadows.elevated.shadowRadius,
    },
  });

  if (!visible && !translateY._value) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.toast,
          {
            transform: [
              { translateY },
              { scale },
              {
                rotateX: rotateX.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '5deg'],
                }),
              },
            ],
            opacity,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 80 : 50}
          tint="light"
          style={styles.blurContainer}
        >
          <LinearGradient
            colors={typeConfig.gradientColors}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name={typeConfig.icon} size={24} color={typeConfig.color} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.message}>{message}</Text>
            </View>
          </View>
          <View style={styles.dismissIndicator} />
        </BlurView>
      </Animated.View>
    </View>
  );
};

export default LiquidGlassToast;
