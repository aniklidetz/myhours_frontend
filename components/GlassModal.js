import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  BackHandler,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const GlassModal = ({ 
  visible, 
  title, 
  message, 
  buttons = [], 
  onClose,
  closeOnBackdrop = true,
  closeOnBackButton = true,
}) => {
  const theme = useLiquidGlassTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Handle Android back button
  useEffect(() => {
    if (!visible || !closeOnBackButton || Platform.OS !== 'android') return;

    const backAction = () => {
      if (onClose) {
        onClose();
        return true; // Prevent default behavior
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible, closeOnBackButton, onClose]);

  // Animation effects
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 0.8,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(slideAnim, {
          toValue: 50,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    }
  }, [visible]);

  const handleBackdropPress = () => {
    if (closeOnBackdrop && onClose) {
      onClose();
    }
  };

  const getButtonVariant = (type) => {
    switch (type) {
      case 'primary':
        return {
          backgroundColor: theme.colors.status.success[0],
          textColor: theme.colors.text.primary,
        };
      case 'danger':
        return {
          backgroundColor: theme.colors.status.error[0],
          textColor: theme.colors.text.primary,
        };
      case 'secondary':
      default:
        return {
          backgroundColor: theme.colors.glass.medium,
          textColor: theme.colors.text.primary,
        };
    }
  };

  if (!theme || !theme.shadows || !theme.shadows.elevated) {
    console.warn('GlassModal: Theme not loaded or missing shadows.elevated');
    return null;
  }

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    modalContent: {
      width: Math.min(screenWidth * 0.85, 400),
      maxHeight: screenHeight * 0.8,
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
      shadowColor: theme.shadows.elevated.shadowColor,
      shadowOffset: theme.shadows.elevated.shadowOffset,
      shadowOpacity: theme.shadows.elevated.shadowOpacity,
      shadowRadius: theme.shadows.elevated.shadowRadius,
      elevation: theme.shadows.elevated.elevation,
    },
    blurContainer: {
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
    },
    gradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    content: {
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.glass.border,
      backgroundColor: theme.colors.glass.light,
    },
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontSize: theme.typography.title.fontSize * 0.8,
      fontWeight: theme.typography.title.fontWeight,
      color: theme.colors.text.primary,
      textAlign: 'center',
      textShadowColor: theme.shadows.text.color,
      textShadowOffset: theme.shadows.text.offset,
      textShadowRadius: theme.shadows.text.radius,
    },
    messageContainer: {
      marginBottom: theme.spacing.xl,
    },
    message: {
      fontSize: theme.typography.body.fontSize,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    buttonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    buttonsContainerColumn: {
      flexDirection: 'column',
      gap: theme.spacing.md,
    },
    button: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      borderWidth: 1,
      borderColor: theme.colors.glass.border,
    },
    buttonText: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: '600',
      textAlign: 'center',
    },
    singleButton: {
      alignSelf: 'center',
      minWidth: 120,
    },
    closeButton: {
      position: 'absolute',
      top: theme.spacing.md,
      right: theme.spacing.md,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.glass.medium,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeOnBackButton ? onClose : undefined}
    >
      <Animated.View
        style={[
          styles.modalContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim },
              ],
            },
          ]}
        >
          <BlurView
            intensity={Platform.OS === 'ios' ? 80 : 50}
            tint="light"
            style={styles.blurContainer}
          >
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.3)',
                'rgba(255, 255, 255, 0.15)',
                'rgba(255, 255, 255, 0.05)',
              ]}
              style={styles.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.content}>
              {/* Close Button */}
              {onClose && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={theme.colors.text.secondary}
                  />
                </TouchableOpacity>
              )}

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
              </View>

              {/* Message */}
              <View style={styles.messageContainer}>
                <Text style={styles.message}>{message}</Text>
              </View>

              {/* Buttons */}
              <View style={[
                buttons.length > 2 ? styles.buttonsContainerColumn : styles.buttonsContainer,
                buttons.length === 1 && { justifyContent: 'center' }
              ]}>
                {buttons.map((button, index) => {
                  const variant = getButtonVariant(button.type);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        buttons.length === 1 && styles.singleButton,
                        buttons.length > 2 && { flex: 0 }, // Don't stretch in column layout
                        { backgroundColor: variant.backgroundColor }
                      ]}
                      onPress={button.onPress}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.buttonText,
                        { color: variant.textColor }
                      ]}>
                        {button.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </BlurView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default GlassModal;