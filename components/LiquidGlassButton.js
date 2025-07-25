import React from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const LiquidGlassButton = ({ 
  onPress, 
  title, 
  disabled, 
  loading, 
  style,
  textStyle,
  variant = 'primary' // 'primary', 'secondary', 'ghost'
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 10, stiffness: 400 });
    opacity.value = withTiming(0.8, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 400 });
    opacity.value = withTiming(1, { duration: 100 });
  };

  const getGradientColors = () => {
    if (disabled) return ['rgba(100,100,100,0.3)', 'rgba(80,80,80,0.3)'];
    
    switch (variant) {
      case 'primary':
        return ['rgba(233,69,96,0.8)', 'rgba(242,113,33,0.8)'];
      case 'secondary':
        return ['rgba(114,27,101,0.8)', 'rgba(184,13,87,0.8)'];
      case 'ghost':
        return ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'];
      default:
        return ['rgba(233,69,96,0.8)', 'rgba(242,113,33,0.8)'];
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[styles.container, animatedStyle, style]}
    >
      {/* Glass background */}
      <BlurView intensity={20} style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={getGradientColors()}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </BlurView>

      {/* Border gradient */}
      <LinearGradient
        colors={disabled ? ['rgba(100,100,100,0.5)', 'rgba(80,80,80,0.5)'] : ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
        style={styles.border}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Button content */}
      <Text style={[styles.text, textStyle, disabled && styles.disabledText]}>
        {loading ? 'Loading...' : title}
      </Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 30,
    overflow: 'hidden',
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 5,
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    zIndex: 1,
  },
  disabledText: {
    opacity: 0.7,
  },
});

export default LiquidGlassButton;