/* eslint-disable react/prop-types */
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import GlassContainer from './shared/GlassContainer';
import useGlassPressable from '../hooks/shared/useGlassPressable';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const LiquidGlassCard = ({
  children,
  style,
  onPress,
  variant = 'default', // 'default', 'elevated', 'bordered'
  padding = 'md',
  animate = true,
  ...props
}) => {
  const theme = useLiquidGlassTheme();
  const { animatedPressableStyle, handlePressIn, handlePressOut } = useGlassPressable(
    animate && !!onPress,
    {
      scaleTarget: 0.98,
      opacityTarget: 0.9,
    }
  );

  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          shadowColor: theme.shadows.box.color,
          shadowOffset: theme.shadows.box.offset,
          shadowRadius: theme.shadows.box.radius,
          elevation: theme.shadows.box.elevation,
        };
      default:
        return {};
    }
  };

  const getPadding = () => {
    const paddingMap = {
      xs: theme.spacing.xs,
      sm: theme.spacing.sm,
      md: theme.spacing.md,
      lg: theme.spacing.lg,
      xl: theme.spacing.xl,
    };
    return paddingMap[padding] || theme.spacing.md;
  };

  const CardContent = <View style={{ padding: getPadding() }}>{children}</View>;

  const commonContainerProps = {
    intensity: theme.blur?.medium || 50,
    gradientColors: [theme.colors.glass.light, theme.colors.glass.light],
    border: variant === 'bordered',
    borderRadius: theme.borderRadius.lg,
    style: [styles.container, getVariantStyles(), animatedPressableStyle, style],
    ...props,
  };

  if (onPress) {
    return (
      <AnimatedPressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <GlassContainer {...commonContainerProps}>{CardContent}</GlassContainer>
      </AnimatedPressable>
    );
  }

  return <GlassContainer {...commonContainerProps}>{CardContent}</GlassContainer>;
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
});

export default LiquidGlassCard;
