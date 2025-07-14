import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Defs, Mask, Rect, Circle, Path } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FaceCaptureOverlay = ({ 
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
  
  // Создаем SVG Path для круглой маски с even-odd правилом
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
  }, [isActive, fadeAnim, onAnimationComplete]);

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
      {/* SVG маска с круглым вырезом - используем Path с even-odd правилом */}
      <Svg
        width={dimensions.width}
        height={dimensions.height}
        style={StyleSheet.absoluteFillObject}
      >
        {/* Затемнённый слой с идеально круглым вырезом */}
        <Path
          d={createCircleMaskPath()}
          fill="rgba(0, 0, 0, 0.1)" // 10% opacity как требуется
          fillRule="evenodd" // even-odd правило для создания "дырки"
        />
      </Svg>
      
      {/* Опциональная тонкая обводка круга для акцента */}
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
  maskLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2, // Между камерой (1) и UI элементами (3+)
  },
  circleOutline: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)', // Тонкая белая обводка
    backgroundColor: 'transparent',
  },
});

export default FaceCaptureOverlay;