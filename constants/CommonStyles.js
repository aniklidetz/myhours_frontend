import { StyleSheet, Platform } from 'react-native';

/**
 * Global styles for unifying UI components
 * Used across the app for consistency with Liquid Glass design system
 */

// Base colors and constants
export const COLORS = {
  // Core palette
  primary: '#3b82f6',
  secondary: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.8)',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  textDisabled: 'rgba(255, 255, 255, 0.4)',
  
  // Glass effects
  glassLight: 'rgba(255, 255, 255, 0.1)',
  glassMedium: 'rgba(255, 255, 255, 0.2)',
  glassHeavy: 'rgba(255, 255, 255, 0.3)',
  glassBorder: 'rgba(255, 255, 255, 0.2)',
  
  // Shift statuses
  onShift: 'rgba(34, 197, 94, 0.8)',
  offShift: 'rgba(107, 114, 128, 0.8)',
  
  // Backgrounds
  backgroundPrimary: 'rgba(0, 0, 0, 0.6)',
  backgroundSecondary: 'rgba(0, 0, 0, 0.4)',

  // NEW: Gradient colors inspired by Team Members design
  gradients: {
    // Primary actions (like Team Members buttons)
    teamAction: ['#ec4899', '#f97316'], // Pink to orange gradient
    primary: ['#3b82f6', '#6366f1'],    // Blue gradient
    success: ['#22c55e', '#10b981'],    // Green gradient
    warning: ['#f59e0b', '#f97316'],    // Orange gradient
    danger: ['#ef4444', '#dc2626'],     // Red gradient
    
    // Liquid glass specific gradients
    liquidWarm: ['#e94560', '#f27121'],    // Warm blob colors
    liquidCool: ['#721b65', '#b80d57'],    // Cool blob colors
    liquidNeutral: ['#0f3460', '#533483'], // Neutral blob colors
    
    // Glass overlays
    glassOverlay: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'],
    glassBorder: ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)'],
  },
};

// Spacing and paddings
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border-radius sizes
export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

// Typography presets
export const TYPOGRAPHY = {
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  small: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
};

// Shadows
export const SHADOWS = {
  small: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Common component styles
export const commonStyles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  
  // Cards
  card: {
    backgroundColor: COLORS.glassLight,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  cardCompact: {
    backgroundColor: COLORS.glassLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  
  // Headers
  header: {
    backgroundColor: 'transparent',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  
  // Buttons (Enhanced with gradient support)
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
    ...SHADOWS.small,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonSecondary: {
    backgroundColor: COLORS.secondary,
  },
  buttonSuccess: {
    backgroundColor: COLORS.success,
  },
  buttonWarning: {
    backgroundColor: COLORS.warning,
  },
  buttonError: {
    backgroundColor: COLORS.error,
  },
  buttonGhost: {
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  // NEW: Gradient button styles (use with LinearGradient component)
  buttonGradientTeam: {
    // Apply COLORS.gradients.teamAction with LinearGradient
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  buttonGradientPrimary: {
    // Apply COLORS.gradients.primary with LinearGradient
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  buttonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  
  // Text styles
  textTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.textPrimary,
  },
  textSubtitle: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textPrimary,
  },
  textBody: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  textCaption: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  textSmall: {
    ...TYPOGRAPHY.small,
    color: COLORS.textMuted,
  },
  textCenter: {
    textAlign: 'center',
  },
  textBold: {
    fontWeight: '600',
  },
  
  // Status badges
  statusBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'flex-start',
  },
  statusOnShift: {
    backgroundColor: COLORS.onShift,
  },
  statusOffShift: {
    backgroundColor: COLORS.offShift,
  },
  statusSuccess: {
    backgroundColor: COLORS.success,
  },
  statusWarning: {
    backgroundColor: COLORS.warning,
  },
  statusError: {
    backgroundColor: COLORS.error,
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  
  // Form elements (Enhanced for better consistency)
  input: {
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    minHeight: 44,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.glassMedium,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inputConfirmed: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.glassLight,
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  
  // NEW: Input with button styles (for office-settings.js)
  inputWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  inputWithButtonText: {
    flex: 1,
  },
  confirmButton: {
    width: 44,
    height: 44,
    paddingHorizontal: 0,
    minWidth: 44,
    borderRadius: BORDER_RADIUS.full,
  },
  confirmedInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingRight: 90, // Space for Edit button
    borderWidth: 1,
    borderColor: COLORS.glassBorder, // FIX: Use standard border instead of success color
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.glassLight,
    position: 'relative',
  },
  confirmedText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  editButton: {
    position: 'absolute',
    right: 16,
    top: 12, // Fixed positioning instead of transform
    minWidth: 60,
    height: 32,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.glassMedium,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  
  // Loading state
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loaderText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  
  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyStateTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  emptyStateText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  
  // Navigation styles
  tabBar: {
    backgroundColor: COLORS.backgroundPrimary,
    borderTopWidth: 0,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
    height: Platform.OS === 'ios' ? 88 : 68,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  
  // Selector styles (for filters)
  selectorContainer: {
    marginBottom: SPACING.md,
  },
  selectorLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  selectorButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glassLight,
    marginRight: SPACING.xs,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  selectorButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  selectorButtonTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  
  // List styles
  listContainer: {
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  listItem: {
    backgroundColor: COLORS.glassLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.glassHeavy,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
    ...SHADOWS.large,
  },
  modalTitle: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  modalText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // NEW: Section styles for consistent card-based layouts
  sectionCard: {
    backgroundColor: COLORS.glassLight,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitleIcon: {
    fontSize: TYPOGRAPHY.subtitle.fontSize,
    marginRight: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textPrimary,
  },
  sectionDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },

  // NEW: Summary/overview styles
  summarySection: {
    backgroundColor: COLORS.glassLight,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  summaryTitle: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  summaryValue: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
});

// Utilities for creating responsive styles
export const createResponsiveStyle = (baseStyle, tabletStyle = {}, desktopStyle = {}) => {
  return {
    ...baseStyle,
    ...(Platform.OS === 'web' && tabletStyle),
    // Additional logic for large screens can be added here
  };
};

// Utility for creating themed styles
export const createThemedStyle = (lightStyle, darkStyle) => {
  // In this project we always return the dark style for liquid glass
  return darkStyle || lightStyle;
};

// Utility for creating gradient button wrapper
export const createGradientButtonStyle = (gradientColors, additionalStyle = {}) => {
  return {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...additionalStyle,
  };
};

// Export all constants
export {
  COLORS as Colors,
  SPACING as Spacing,
  BORDER_RADIUS as BorderRadius,
  TYPOGRAPHY as Typography,
  SHADOWS as Shadows,
};