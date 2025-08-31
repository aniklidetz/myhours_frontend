/* eslint-disable react/prop-types */
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import useLiquidGlassTheme from '../../hooks/useLiquidGlassTheme';

const GlassContainer = ({
  children,
  style,
  intensity = 'medium', // 'light', 'medium', 'heavy' or number
  tint = 'light',
  gradientColors,
  blurStyle,
  border = false,
  borderColors,
  borderRadius,
  borderWidth = 1,
  ...props
}) => {
  const theme = useLiquidGlassTheme();

  // Default gradient colors
  const defaultGradient = gradientColors || [theme.colors.glass.light, theme.colors.glass.light];

  // Default border colors
  const defaultBorderColors = borderColors || [
    theme.colors.glass.border,
    theme.colors.glass.border,
  ];

  // Convert intensity to number
  const getBlurIntensity = () => {
    if (typeof intensity === 'number') return intensity;

    const intensityMap = {
      light: theme.blur?.light || 30,
      medium: theme.blur?.medium || 50,
      heavy: theme.blur?.heavy || 80,
    };

    return intensityMap[intensity] || 50;
  };

  const blurIntensity = getBlurIntensity();
  const containerBorderRadius = borderRadius || theme.borderRadius?.xl || 15;

  const styles = StyleSheet.create({
    container: {
      overflow: 'hidden',
      borderRadius: containerBorderRadius,
      backgroundColor: 'transparent',
    },
    absoluteFill: {
      ...StyleSheet.absoluteFillObject,
    },
    gradientBorder: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: containerBorderRadius,
      borderWidth: borderWidth,
      borderColor: 'transparent',
    },
  });

  return (
    <View style={[styles.container, style]} {...props}>
      {/* Main blur and gradient background */}
      <BlurView
        intensity={Platform.OS === 'ios' ? blurIntensity : Math.max(blurIntensity / 2, 10)}
        tint={tint}
        style={[styles.absoluteFill, blurStyle]}
      >
        <LinearGradient
          colors={defaultGradient}
          style={styles.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </BlurView>

      {/* Optional border gradient */}
      {border && (
        <LinearGradient
          colors={defaultBorderColors}
          style={styles.gradientBorder}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}

      {children}
    </View>
  );
};

export default GlassContainer;
