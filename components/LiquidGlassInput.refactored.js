/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import GlassContainer from './shared/GlassContainer';

const LiquidGlassInput = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  style,
  inputRef,
  onSubmitEditing,
  returnKeyType,
  blurOnSubmit,
  rightIcon,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnimation = useSharedValue(0);

  const handleFocus = () => {
    setIsFocused(true);
    focusAnimation.value = withTiming(1, { duration: 300 });
  };

  const handleBlur = () => {
    setIsFocused(false);
    focusAnimation.value = withTiming(0, { duration: 300 });
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    borderColor: interpolate(
      focusAnimation.value,
      [0, 1],
      ['rgba(255,255,255,0.2)', 'rgba(233,69,96,0.6)']
    ),
    transform: [{ scale: interpolate(focusAnimation.value, [0, 1], [1, 1.02]) }],
  }));

  // Dynamic border colors for focus effect
  const borderGradientColors = isFocused
    ? ['rgba(233,69,96,0.6)', 'rgba(242,113,33,0.6)']
    : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)'];

  return (
    <Animated.View style={[styles.outerContainer, animatedContainerStyle, style]}>
      <GlassContainer
        intensity="light"
        gradientColors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
        borderRadius={15}
        style={styles.container}
        {...props}
      >
        {/* Focus border effect */}
        <LinearGradient
          colors={borderGradientColors}
          style={styles.border}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
        />

        {/* Input field */}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.5)"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          blurOnSubmit={blurOnSubmit}
          editable={true}
          style={[styles.input, rightIcon && styles.inputWithIcon]}
        />

        {/* Right icon */}
        {rightIcon && <View style={styles.iconContainer}>{rightIcon}</View>}
      </GlassContainer>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    marginVertical: 8,
  },
  container: {
    height: 56,
  },
  border: {
    borderRadius: 15,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
    pointerEvents: 'box-none',
  },
  input: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 16,
    height: '100%',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  inputWithIcon: {
    paddingRight: 60,
  },
});

export default LiquidGlassInput;
