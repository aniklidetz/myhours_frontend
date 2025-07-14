import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, { Defs, Mask, Rect, Circle } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FaceOverlay = ({ 
  isActive = false, 
  isCapturing = false, 
  onAnimationComplete 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const backgroundOpacityAnim = useRef(new Animated.Value(0.1)).current;
  
  // Вычисляем размер и позицию круга
  const minDimension = Math.min(screenWidth, screenHeight);
  const circleRadius = (minDimension * 0.8) / 2; // 80% от наименьшей стороны
  const centerX = screenWidth / 2;
  const centerY = screenHeight / 2 - 50; // Слегка выше центра для кнопок внизу
  
  useEffect(() => {
    if (isActive) {
      // Показываем оверлей
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Скрываем оверлей с fade-out анимацией
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive]);
  
  useEffect(() => {
    if (isCapturing) {
      // Анимация при начале съёмки
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
        toValue: 0.2, // Увеличиваем затемнение до 20%
        duration: 300,
        useNativeDriver: false, // opacity для View нужен нативный драйвер false
      });
      
      // Запускаем анимации параллельно
      Animated.parallel([
        scaleSequence,
        backgroundOpacityAnimation
      ]).start(() => {
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      });
    } else {
      // Возвращаем к исходному состоянию
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
  }, [isCapturing]);
  
  if (!isActive) return null;
  
  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
        }
      ]}
      pointerEvents="none" // Пропускаем touch events через оверлей
    >
      {/* Используем SVG для создания маски с even-odd правилом */}
      <Svg
        width={screenWidth}
        height={screenHeight}
        style={StyleSheet.absoluteFillObject}
      >
        <Defs>
          <Mask id="faceMask">
            {/* Белый прямоугольник - полная область */}
            <Rect
              x="0"
              y="0"
              width={screenWidth}
              height={screenHeight}
              fill="white"
            />
            {/* Чёрный круг - вырезаемая область */}
            <Animated.G
              transform={[
                { translateX: centerX },
                { translateY: centerY },
                { scale: scaleAnim },
                { translateX: -centerX },
                { translateY: -centerY },
              ]}
            >
              <Circle
                cx={centerX}
                cy={centerY}
                r={circleRadius}
                fill="black"
              />
            </Animated.G>
          </Mask>
        </Defs>
        
        {/* Затемнённый фон с маской */}
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
      
      {/* Дополнительный индикатор границы круга (опционально) */}
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
          }
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  circleIndicator: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)', // Тонкая белая рамка для лучшей видимости
    backgroundColor: 'transparent',
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1, // Между камерой и UI элементами
  },
});

export default FaceOverlay;