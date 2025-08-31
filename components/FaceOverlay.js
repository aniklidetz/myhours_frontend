/* eslint-disable react/prop-types */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Defs, Mask, Rect, Circle } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FaceOverlay = ({ isActive = false, isCapturing = false, onAnimationComplete }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const backgroundOpacityAnim = useRef(new Animated.Value(0.1)).current;

  // Calculate circle size and position
  const minDimension = Math.min(screenWidth, screenHeight);
  const circleRadius = (minDimension * 0.8) / 2; // 80% of the smallest side
  const centerX = screenWidth / 2;
  const centerY = screenHeight / 2 - 50; // Slightly above center for buttons at bottom

  useEffect(() => {
    if (isActive) {
      // Show overlay
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Hide overlay with fade-out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, fadeAnim]);

  useEffect(() => {
    if (isCapturing) {
      // Animation when starting capture
      const scaleSequence = Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]);

      const backgroundOpacityAnimation = Animated.timing(backgroundOpacityAnim, {
        toValue: 0.2, // Increase darkening to 20%
        duration: 300,
        useNativeDriver: false, // opacity for View needs native driver false
      });

      // Run animations in parallel
      Animated.parallel([scaleSequence, backgroundOpacityAnimation]).start(() => {
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      });
    } else {
      // Return to initial state
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundOpacityAnim, {
          toValue: 0.1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isCapturing, scaleAnim, backgroundOpacityAnim, onAnimationComplete]);

  if (!isActive) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
        },
      ]}
      pointerEvents="none" // Pass touch events through overlay
    >
      {/* Use SVG to create mask with even-odd rule */}
      <Svg width={screenWidth} height={screenHeight} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <Mask id="faceMask">
            {/* White rectangle - full area */}
            <Rect x="0" y="0" width={screenWidth} height={screenHeight} fill="white" />
            {/* Black circle - cut out area */}
            <Animated.G
              transform={[
                { translateX: centerX },
                { translateY: centerY },
                { scale: scaleAnim },
                { translateX: -centerX },
                { translateY: -centerY },
              ]}
            >
              <Circle cx={centerX} cy={centerY} r={circleRadius} fill="black" />
            </Animated.G>
          </Mask>
        </Defs>

        {/* Darkened background with mask */}
        <Animated.Rect
          x="0"
          y="0"
          width={screenWidth}
          height={screenHeight}
          fill="black"
          opacity={backgroundOpacityAnim}
          mask="url(#faceMask)"
        />
      </Svg>

      {/* Additional circle border indicator (optional) */}
      <Animated.View
        style={[
          styles.circleIndicator,
          {
            left: centerX - circleRadius,
            top: centerY - circleRadius,
            width: circleRadius * 2,
            height: circleRadius * 2,
            borderRadius: circleRadius,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  circleIndicator: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)', // Thin white border for better visibility
    backgroundColor: 'transparent',
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1, // Between camera and UI elements
  },
});

export default FaceOverlay;
