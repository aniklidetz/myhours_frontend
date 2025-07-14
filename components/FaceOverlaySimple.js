import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FaceOverlaySimple = ({ 
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
      {/* Четыре прямоугольника создают "рамку" вокруг круга */}
      
      {/* Верхняя часть */}
      <Animated.View
        style={[
          styles.overlaySection,
          {
            top: 0,
            left: 0,
            right: 0,
            height: centerY - circleRadius,
            backgroundColor: `rgba(0, 0, 0, ${backgroundOpacityAnim._value})`,
          }
        ]}
      />
      
      {/* Нижняя часть */}
      <Animated.View
        style={[
          styles.overlaySection,
          {
            bottom: 0,
            left: 0,
            right: 0,
            height: screenHeight - (centerY + circleRadius),
            backgroundColor: `rgba(0, 0, 0, ${backgroundOpacityAnim._value})`,
          }
        ]}
      />
      
      {/* Левая часть */}
      <Animated.View
        style={[
          styles.overlaySection,
          {
            top: centerY - circleRadius,
            left: 0,
            width: centerX - circleRadius,
            height: circleRadius * 2,
            backgroundColor: `rgba(0, 0, 0, ${backgroundOpacityAnim._value})`,
          }
        ]}
      />
      
      {/* Правая часть */}
      <Animated.View
        style={[
          styles.overlaySection,
          {
            top: centerY - circleRadius,
            right: 0,
            width: centerX - circleRadius,
            height: circleRadius * 2,
            backgroundColor: `rgba(0, 0, 0, ${backgroundOpacityAnim._value})`,
          }
        ]}
      />
      
      {/* Индикатор границы круга */}
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
  overlaySection: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    position: 'absolute',
  },
});

export default FaceOverlaySimple;