/* eslint-disable react/prop-types */
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FaceCaptureOverlay = ({ isActive = false, _isCapturing = false, onAnimationComplete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [dimensions, setDimensions] = useState({
    width: screenWidth,
    height: screenHeight,
  });

  // Calculate circle size and position
  const calculateCircleParams = () => {
    const minDimension = Math.min(dimensions.width, dimensions.height);
    const circleRadius = (minDimension * 0.8) / 2; // 80% of the smallest side
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2 - dimensions.height * 0.1; // Shift up by 10%

    return { circleRadius, centerX, centerY };
  };

  const { circleRadius, centerX, centerY } = calculateCircleParams();

  // Create SVG Path for circular mask with even-odd rule
  const createCircleMaskPath = () => {
    const diameter = circleRadius * 2;
    return `
      M0 0 H${dimensions.width} V${dimensions.height} H0 V0
      M${centerX} ${centerY}
      m -${circleRadius}, 0
      a ${circleRadius},${circleRadius} 0 1,0 ${diameter},0
      a ${circleRadius},${circleRadius} 0 1,0 -${diameter},0
    `;
  };

  useEffect(() => {
    if (isActive) {
      // Mask fade-in 150ms
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      });
    } else {
      // Hide mask
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, fadeAnim, onAnimationComplete]);

  const handleLayout = event => {
    const { width, height } = event.nativeEvent.layout;
    setDimensions({ width, height });
  };

  if (!isActive) return null;

  return (
    <Animated.View
      style={[
        styles.maskLayer,
        {
          opacity: fadeAnim,
          width: dimensions.width,
          height: dimensions.height,
        },
      ]}
      onLayout={handleLayout}
      pointerEvents="none" // Don't intercept touch events
      accessible={false} // Don't get focus in screen reader
    >
      {/* SVG mask with circular cutout - using Path with even-odd rule */}
      <Svg
        width={dimensions.width}
        height={dimensions.height}
        style={StyleSheet.absoluteFillObject}
      >
        {/* Darkened layer with perfectly circular cutout */}
        <Path
          d={createCircleMaskPath()}
          fill="rgba(0, 0, 0, 0.1)" // 10% opacity as required
          fillRule="evenodd" // even-odd rule to create a "hole"
        />
      </Svg>

      {/* Optional thin circle outline for accent */}
      <View
        style={[
          styles.circleOutline,
          {
            left: centerX - circleRadius,
            top: centerY - circleRadius,
            width: circleRadius * 2,
            height: circleRadius * 2,
            borderRadius: circleRadius,
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  circleOutline: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)', // Thin white border
    backgroundColor: 'transparent',
  },
  maskLayer: {
    left: 0,
    position: 'absolute',
    top: 0,
    zIndex: 2, // Between camera (1) and UI elements (3+)
  },
});

export default FaceCaptureOverlay;
