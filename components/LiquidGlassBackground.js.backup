import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const LiquidGlassBackground = ({ children, style }) => {
  // Animation values for floating blobs
  const blob1X = useSharedValue(0);
  const blob1Y = useSharedValue(0);
  const blob2X = useSharedValue(0);
  const blob2Y = useSharedValue(0);
  const blob3X = useSharedValue(0);
  const blob3Y = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Blob 1 animation
    blob1X.value = withRepeat(
      withSequence(
        withTiming(30, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-30, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    blob1Y.value = withRepeat(
      withSequence(
        withTiming(-40, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
        withTiming(40, { duration: 3500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Blob 2 animation
    blob2X.value = withRepeat(
      withSequence(
        withTiming(-40, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
        withTiming(40, { duration: 5000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    blob2Y.value = withRepeat(
      withSequence(
        withTiming(30, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
        withTiming(-30, { duration: 4500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Blob 3 animation
    blob3X.value = withRepeat(
      withSequence(
        withTiming(50, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-50, { duration: 6000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    blob3Y.value = withRepeat(
      withSequence(
        withTiming(-60, { duration: 5500, easing: Easing.inOut(Easing.ease) }),
        withTiming(60, { duration: 5500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Rotation animation
    rotation.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const blob1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: blob1X.value },
      { translateY: blob1Y.value },
      { scale: interpolate(blob1X.value, [-30, 30], [0.9, 1.1]) },
    ],
  }));

  const blob2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: blob2X.value },
      { translateY: blob2Y.value },
      { scale: interpolate(blob2Y.value, [-30, 30], [0.95, 1.05]) },
    ],
  }));

  const blob3Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: blob3X.value },
      { translateY: blob3Y.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <View style={[styles.container, style]}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Animated blobs */}
      <Animated.View style={[styles.blob1, blob1Style]}>
        <LinearGradient
          colors={['#e94560', '#f27121']}
          style={styles.blobGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      <Animated.View style={[styles.blob2, blob2Style]}>
        <LinearGradient
          colors={['#721b65', '#b80d57']}
          style={styles.blobGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      <Animated.View style={[styles.blob3, blob3Style]}>
        <LinearGradient
          colors={['#0f3460', '#533483']}
          style={styles.blobGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Glass effect overlay */}
      <BlurView intensity={50} style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </BlurView>

      {/* Content */}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute',
    top: height * 0.1,
    left: width * 0.1,
    width: width * 0.5,
    height: width * 0.5,
  },
  blob2: {
    position: 'absolute',
    bottom: height * 0.2,
    right: width * 0.1,
    width: width * 0.6,
    height: width * 0.6,
  },
  blob3: {
    position: 'absolute',
    top: height * 0.4,
    right: width * 0.3,
    width: width * 0.4,
    height: width * 0.4,
  },
  blobGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    opacity: 0.7,
  },
});

export default LiquidGlassBackground;