import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import useColors from '../hooks/useColors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const Toast = ({ 
  visible, 
  message, 
  type = 'info', // 'success', 'error', 'warning', 'info'
  duration = 3000,
  onHide,
  position = 'bottom' // 'top', 'bottom'
}) => {
  const { palette } = useColors();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(position === 'top' ? -100 : 100));
  
  useEffect(() => {
    if (visible) {
      // Показываем toast
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
      
      // Автоматически скрываем через заданное время
      const timer = setTimeout(() => {
        hideToast();
      }, duration);
      
      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: position === 'top' ? -100 : 100,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'rgba(72, 187, 120, 0.95)'; // Зеленый
      case 'error':
        return 'rgba(220, 53, 69, 0.95)'; // Красный
      case 'warning':
        return 'rgba(255, 193, 7, 0.95)'; // Желтый
      case 'info':
      default:
        return 'rgba(52, 144, 220, 0.95)'; // Синий
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles(palette).container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: getBackgroundColor(),
          [position]: 60, // Позиционирование сверху или снизу
        }
      ]}
    >
      <TouchableOpacity 
        style={styles(palette).touchable}
        onPress={hideToast}
        activeOpacity={0.8}
      >
        <View style={styles(palette).content}>
          <Text style={styles(palette).icon}>{getIcon()}</Text>
          <Text style={styles(palette).message}>{message}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Хук для удобного использования Toast
export const useToast = () => {
  const [toastState, setToastState] = useState({
    visible: false,
    message: '',
    type: 'info',
    duration: 3000,
    position: 'bottom'
  });

  const showToast = (message, type = 'info', duration = 3000, position = 'bottom') => {
    setToastState({
      visible: true,
      message,
      type,
      duration,
      position
    });
  };

  const hideToast = () => {
    setToastState(prev => ({ ...prev, visible: false }));
  };

  const showSuccess = (message, duration = 3000) => showToast(message, 'success', duration);
  const showError = (message, duration = 4000) => showToast(message, 'error', duration);
  const showWarning = (message, duration = 3500) => showToast(message, 'warning', duration);
  const showInfo = (message, duration = 3000) => showToast(message, 'info', duration);

  return {
    toastState,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    ToastComponent: () => (
      <Toast
        visible={toastState.visible}
        message={toastState.message}
        type={toastState.type}
        duration={toastState.duration}
        position={toastState.position}
        onHide={hideToast}
      />
    )
  };
};

const styles = (palette) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 12,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  touchable: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
  },
  icon: {
    fontSize: 18,
    marginRight: 12,
    color: palette.text.light,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: palette.text.light,
    lineHeight: 20,
  },
});

export default Toast;