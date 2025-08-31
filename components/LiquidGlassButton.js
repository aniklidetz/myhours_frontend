/* eslint-disable react/prop-types */
import React from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import GlassContainer from './shared/GlassContainer';
import useGlassPressable from '../hooks/shared/useGlassPressable';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const LiquidGlassButton = ({
  onPress,
  title,
  disabled,
  loading,
  style,
  textStyle,
  variant = 'primary', // 'primary', 'secondary', 'ghost'
  ...props
}) => {
  const { animatedPressableStyle, handlePressIn, handlePressOut } = useGlassPressable(
    !disabled && !loading
  );

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

  const getBorderColors = () => {
    return disabled
      ? ['rgba(100,100,100,0.5)', 'rgba(80,80,80,0.5)']
      : ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)'];
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[animatedPressableStyle, style]}
      {...props}
    >
      <GlassContainer
        intensity={20}
        gradientColors={getGradientColors()}
        border={true}
        borderColors={getBorderColors()}
        borderRadius={25}
        style={styles.container}
      >
        <Text style={[styles.text, textStyle, disabled && styles.disabledText]}>
          {loading ? 'Loading...' : title}
        </Text>
      </GlassContainer>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    paddingHorizontal: 30,
    paddingVertical: 15,
    marginVertical: 5,
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

export default LiquidGlassButton; // Force reload Wed Aug 27 22:45:18 IDT 2025
