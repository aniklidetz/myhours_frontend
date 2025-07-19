import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

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

  const animatedStyle = useAnimatedStyle(() => ({
    borderWidth: interpolate(focusAnimation.value, [0, 1], [1, 2]),
    transform: [
      { scale: interpolate(focusAnimation.value, [0, 1], [1, 1.02]) }
    ],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {/* Glass background */}
      <BlurView intensity={30} style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </BlurView>

      {/* Border gradient */}
      <LinearGradient
        colors={
          isFocused 
            ? ['rgba(233,69,96,0.6)', 'rgba(242,113,33,0.6)']
            : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']
        }
        style={styles.border}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
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
        style={[styles.input, rightIcon && styles.inputWithIcon]}
        {...props}
      />

      {/* Right icon */}
      {rightIcon && (
        <View style={styles.iconContainer}>
          {rightIcon}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 15,
    overflow: 'hidden',
    marginVertical: 8,
    height: 56,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 15,
  },
  input: {
    flex: 1,
    paddingHorizontal: 20,
    color: '#FFFFFF',
    fontSize: 16,
    height: '100%',
  },
  inputWithIcon: {
    paddingRight: 60,
  },
  iconContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LiquidGlassInput;