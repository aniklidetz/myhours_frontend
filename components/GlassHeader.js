/* eslint-disable react/prop-types */
import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import { useUser } from '../src/contexts/UserContext';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../constants/CommonStyles';
import LogoutButton from './LogoutButton';

export default function GlassHeader({
  title,
  subtitle,
  onBack,
  backDestination,
  showBackButton = true,
  rightIcon,
  onRightPress,
  rightComponent,
  showLogout = false,
  style,
  scrollOffset = 0,
  ...props
}) {
  const theme = useLiquidGlassTheme();
  const insets = useSafeAreaInsets();
  const { logout } = useUser();

  if (!theme) return null;

  const handleBackPress = () => {
    if (onBack) {
      onBack();
    } else if (backDestination) {
      router.push(backDestination);
    } else {
      router.back();
    }
  };

  const _handleLogoutPress = async () => {
    try {
      await logout();
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // FIX: Increase header height for better positioning
  const headerHeight = 70 + insets.top; // Increased from 50 to 70px
  const contentHeight = 70; // Increased from 50 to 70px

  const _titleScale = Math.max(0.85, 1 - scrollOffset * 0.0005);
  const _titleOpacity = Math.max(0.7, 1 - scrollOffset * 0.002);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: 'transparent',
      height: headerHeight,
      paddingTop: insets.top,
      zIndex: 100,
    },
    blurContainer: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'transparent',
    },
    gradientOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'transparent',
    },
    contentContainer: {
      height: contentHeight,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20, // Increased from 16 to 20px
      paddingVertical: 12, // Added vertical padding
      backgroundColor: 'transparent',
      justifyContent: 'space-between',
    },
    // FIX: Left section with increased spacing
    leftSection: {
      width: 60, // Increased from 50 to 60px
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingLeft: 4, // Added padding from edge
    },
    backButton: {
      alignItems: 'center',
      backgroundColor: COLORS.glassLight,
      borderRadius: BORDER_RADIUS.full,
      height: 44,
      justifyContent: 'center',
      width: 44,
      ...SHADOWS.small,
      borderColor: COLORS.glassBorder,
      borderWidth: 1,
      margin: 0,
    },
    backButtonPressed: {
      shadowColor: '#FFFFFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      transform: [{ scale: 0.95 }],
    },
    // FIX: Center section with improved positioning
    centerSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16, // Increased from 8 to 16px
      maxHeight: contentHeight,
      minHeight: 44, // Minimum height for better centering
    },
    titleContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4, // Added vertical padding
    },
    title: {
      color: COLORS.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      lineHeight: 22,
      marginBottom: 2,
      textAlign: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.6)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3, // Spacing between title and subtitle
    },
    titleLong: {
      fontSize: 16,
      lineHeight: 20,
    },
    subtitle: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: theme.typography.caption.fontSize,
      marginTop: 2,
      textAlign: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.4)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    // FIX: Right section symmetrical to left
    rightSection: {
      width: 60, // Increased from 50 to 60px (symmetrical to left)
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingRight: 4, // Added padding from edge
    },
    actionButton: {
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderRadius: 22,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    actionButtonPressed: {
      transform: [{ scale: 0.9 }],
    },
    glassBorder: {
      ...StyleSheet.absoluteFillObject,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
      borderBottomWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.05)',
      borderTopWidth: Platform.OS === 'ios' ? 0 : 1,
    },
    outerShadow: {
      ...StyleSheet.absoluteFillObject,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 14,
    },
  });

  const isLongTitle = title && title.length > 20;

  return (
    <View style={[styles.container, style]} {...props}>
      <View style={styles.outerShadow} />

      <BlurView intensity={20} style={styles.blurContainer} tint="dark" />

      <View
        style={[
          styles.gradientOverlay,
          {
            backgroundColor: 'transparent',
            background:
              Platform.OS === 'web'
                ? 'linear-gradient(90deg, rgba(255,127,134,0.15) 8%, rgba(184,102,255,0.15) 65%, rgba(91,141,255,0.15) 100%)'
                : undefined,
          },
        ]}
      />

      <View style={styles.glassBorder} />

      {/* FIXED CONTENT with improved positioning */}
      <View style={styles.contentContainer}>
        {/* Left: Back Button */}
        <View style={styles.leftSection}>
          {showBackButton && (
            <Pressable
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              onPress={handleBackPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
                size={20}
                color="rgba(255, 255, 255, 0.9)"
              />
            </Pressable>
          )}
        </View>

        {/* Center: Title */}
        <View style={styles.centerSection}>
          <View style={styles.titleContainer}>
            <Text
              style={[styles.title, isLongTitle && styles.titleLong]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {/* Right: Action Button or Custom Component */}
        <View style={styles.rightSection}>
          {rightComponent ? (
            rightComponent
          ) : showLogout ? (
            // FIX: Use dedicated component
            <LogoutButton.Icon size="small" />
          ) : rightIcon && onRightPress ? (
            <Pressable
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
              onPress={onRightPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name={rightIcon} size={20} color="rgba(255, 255, 255, 0.9)" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// Variants remain unchanged
GlassHeader.WithLogout = props => <GlassHeader {...props} showLogout />;
GlassHeader.Root = props => <GlassHeader {...props} showBackButton={false} />;
GlassHeader.WithExport = ({ onExport, ...props }) => (
  <GlassHeader {...props} rightIcon="share-outline" onRightPress={onExport} />
);
