import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FaceCaptureOverlaySimple = ({ 
  isActive = false, 
  isCapturing = false, 
  onAnimationComplete 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [dimensions, setDimensions] = useState({
    width: screenWidth,
    height: screenHeight
  });
  
  // Вычисляем размер и позицию круга
  const calculateCircleParams = () => {
    const minDimension = Math.min(dimensions.width, dimensions.height);
    const circleRadius = (minDimension * 0.8) / 2; // 80% от наименьшей стороны
    const centerX = dimensions.width / 2;
    const centerY = (dimensions.height / 2) - (dimensions.height * 0.1); // Сдвиг вверх на 10%
    
    return { circleRadius, centerX, centerY };
  };

  const { circleRadius, centerX, centerY } = calculateCircleParams();
  
  useEffect(() => {
    if (isActive) {
      // Маска fade-in 150ms
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
      // Скрываем маску
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive]);

  const handleLayout = (event) => {
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
        }
      ]}
      onLayout={handleLayout}
      pointerEvents="none" // Не перехватываем touch events
      accessible={false} // Не попадаем в фокус скрин-ридера
    >
      {/* Четыре области затемнения вокруг круга */}
      
      {/* Верхняя область */}
      <View
        style={[
          styles.overlaySection,
          {
            top: 0,
            left: 0,
            right: 0,
            height: Math.max(0, centerY - circleRadius),
          }
        ]}
      />
      
      {/* Нижняя область */}
      <View
        style={[
          styles.overlaySection,
          {
            bottom: 0,
            left: 0,
            right: 0,
            height: Math.max(0, dimensions.height - (centerY + circleRadius)),
          }
        ]}
      />
      
      {/* Левая область */}
      <View
        style={[
          styles.overlaySection,
          {
            top: Math.max(0, centerY - circleRadius),
            left: 0,
            width: Math.max(0, centerX - circleRadius),
            height: circleRadius * 2,
          }
        ]}
      />
      
      {/* Правая область */}
      <View
        style={[
          styles.overlaySection,
          {
            top: Math.max(0, centerY - circleRadius),
            right: 0,
            width: Math.max(0, centerX - circleRadius),
            height: circleRadius * 2,
          }
        ]}
      />
      
      {/* Опциональная тонкая обводка круга */}
      <View
        style={[
          styles.circleOutline,
          {
            left: centerX - circleRadius,
            top: centerY - circleRadius,
            width: circleRadius * 2,
            height: circleRadius * 2,
            borderRadius: circleRadius,
          }
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  circleOutline: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)', // Тонкая белая обводка
    backgroundColor: 'transparent',
  },
  maskLayer: {
    left: 0,
    position: 'absolute',
    top: 0,
    zIndex: 2, // Между камерой (1) и UI элементами (3+)
  },
  overlaySection: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    position: 'absolute', // 10% opacity как требуется
  },
});

export default FaceCaptureOverlaySimple;