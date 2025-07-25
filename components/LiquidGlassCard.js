import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const LiquidGlassCard = ({ 
  children, 
  style,
  onPress,
  variant = 'default', // 'default', 'elevated', 'bordered'
  padding = 'md',
  animate = true,
}) => {
  const theme = useLiquidGlassTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: animate ? [{ scale: scale.value }] : [],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (animate && onPress) {
      scale.value = withSpring(0.98, { damping: 10, stiffness: 400 });
      opacity.value = withTiming(0.9, { duration: 100 });
    }
  };

  const handlePressOut = () => {
    if (animate && onPress) {
      scale.value = withSpring(1, { damping: 10, stiffness: 400 });
      opacity.value = withTiming(1, { duration: 100 });
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          shadowColor: theme.shadows.box.color,
          shadowOffset: theme.shadows.box.offset,
          shadowRadius: theme.shadows.box.radius,
          elevation: theme.shadows.box.elevation,
        };
      case 'bordered':
        return {
          borderWidth: 2,
          borderColor: theme.colors.glass.border,
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

  const CardContent = (
    <>
      {/* Glass background */}
      <BlurView intensity={theme.blur.medium} style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={[theme.colors.glass.light, theme.colors.glass.light]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </BlurView>

      {/* Border gradient for bordered variant */}
      {variant === 'bordered' && (
        <LinearGradient
          colors={[theme.colors.glass.medium, theme.colors.glass.light]}
          style={styles.border}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}

      {/* Content */}
      <View style={{ padding: getPadding() }}>
        {children}
      </View>
    </>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.container,
          getVariantStyles(),
          animatedStyle,
          style
        ]}
      >
        {CardContent}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        getVariantStyles(),
        animatedStyle,
        style
      ]}
    >
      {CardContent}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 8,
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
});

export default LiquidGlassCard;