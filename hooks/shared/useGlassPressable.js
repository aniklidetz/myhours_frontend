import { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

const useGlassPressable = (animate = true, config = {}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const {
    scaleTarget = 0.95,
    opacityTarget = 0.8,
    springConfig = { damping: 10, stiffness: 400 },
    timingConfig = { duration: 100 },
  } = config;

  const animatedPressableStyle = useAnimatedStyle(() => ({
    transform: animate ? [{ scale: scale.value }] : [],
    opacity: animate ? opacity.value : 1,
  }));

  const handlePressIn = () => {
    if (animate) {
      scale.value = withSpring(scaleTarget, springConfig);
      opacity.value = withTiming(opacityTarget, timingConfig);
    }
  };

  const handlePressOut = () => {
    if (animate) {
      scale.value = withSpring(1, springConfig);
      opacity.value = withTiming(1, timingConfig);
    }
  };

  const reset = () => {
    if (animate) {
      scale.value = 1;
      opacity.value = 1;
    }
  };

  return {
    animatedPressableStyle,
    handlePressIn,
    handlePressOut,
    reset,
    scale,
    opacity,
  };
};

export default useGlassPressable;
