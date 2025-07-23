import React from 'react';
import { TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useUser } from '../src/contexts/UserContext';
import { useToast } from '../contexts/ToastContext';
import { showGlassConfirm } from '../hooks/useGlobalGlassModal';

/**
 * Unified logout button component
 * Supports different styles and sizes
 *
 * @param {Object} props
 * @param {'header'|'button'|'icon'}   props.variant          - Button style
 * @param {'small'|'medium'|'large'}   props.size             - Button size
 * @param {string}                     props.color            - Icon color
 * @param {Object}                     props.style            - Additional styles
 * @param {Function}                   props.onLogoutStart    - Callback before logout starts
 * @param {Function}                   props.onLogoutSuccess  - Callback after successful logout
 * @param {Function}                   props.onLogoutError    - Callback on logout error
 * @param {boolean}                    props.showConfirmation - Whether to show confirmation (default true)
 * @param {string}                     props.confirmTitle     - Confirmation title
 * @param {string}                     props.confirmMessage   - Confirmation message
 */
export default function LogoutButton({
  variant = 'header',
  size = 'medium',
  color = '#FFFFFF',
  style,
  onLogoutStart,
  onLogoutSuccess,
  onLogoutError,
  showConfirmation = true,
  confirmTitle = 'Logout',
  confirmMessage = 'Are you sure you want to logout?',
  ...props
}) {
  const { logout } = useUser();
  const { showError } = useToast();
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Get icon size based on 'size'
  const getIconSize = () => {
    switch (size) {
      case 'small': return 20;
      case 'large': return 28;
      default: return 24; // medium
    }
  };

  // Get button styles based on 'variant'
  const getButtonStyle = () => {
    switch (variant) {
      case 'button':
        return styles.buttonVariant;
      case 'icon':
        return styles.iconVariant;
      default: // header
        return styles.headerVariant;
    }
  };

  const handleLogout = async () => {
    if (isProcessing) {
      console.log('🚪 Logout already processing, ignoring click');
      return;
    }
    
    console.log('🚪 Logout button clicked');
    setIsProcessing(true);

    // Trigger callback before starting
    if (onLogoutStart) {
      onLogoutStart();
    }

    const performLogout = async () => {
      try {
        console.log('🚪 Starting logout process...');
        await logout();
        console.log('✅ Logout successful, redirecting...');

        // Trigger success callback
        if (onLogoutSuccess) {
          onLogoutSuccess();
        }

        // Small delay for UI transition
        setTimeout(() => {
          router.replace('/');
        }, 100);
      } catch (error) {
        console.error('❌ Logout error:', error);
        const errorMessage = error?.message || 'Failed to logout. You may need to restart the app.';

        // Trigger error callback
        if (onLogoutError) {
          onLogoutError(error);
        } else {
          showError(errorMessage);
        }
      } finally {
        setIsProcessing(false);
      }
    };

    // Show confirmation or perform logout immediately
    if (showConfirmation) {
      if (Platform.OS === 'web') {
        const confirmed = window.confirm(confirmMessage);
        if (confirmed) {
          await performLogout();
        } else {
          setIsProcessing(false);
        }
      } else {
        // Use Glass Modal on mobile devices
        showGlassConfirm(
          confirmTitle,
          confirmMessage,
          performLogout,
          () => setIsProcessing(false) // onCancel callback
        );
      }
    } else {
      await performLogout();
    }
  };

  return (
    <TouchableOpacity
      onPress={handleLogout}
      style={[getButtonStyle(), style]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Logout"
      accessibilityHint="Double tap to logout from the application"
      {...props}
    >
      <Ionicons
        name="exit-outline"
        size={getIconSize()}
        color={color}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Style for header variant (default)
  headerVariant: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
  },

  // Style for regular button
  buttonVariant: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 53, 69, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  // Style for icon without background
  iconVariant: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
  },
});

/**
 * Pre-configured component shortcuts for common use cases
 */

// Logout button for header
LogoutButton.Header = (props) => (
  <LogoutButton variant="header" {...props} />
);

// Logout button as a regular button
LogoutButton.Button = (props) => (
  <LogoutButton variant="button" size="large" {...props} />
);

// Logout icon without background
LogoutButton.Icon = (props) => (
  <LogoutButton variant="icon" {...props} />
);

// Small logout button for compact places
LogoutButton.Small = (props) => (
  <LogoutButton variant="header" size="small" {...props} />
);

// Silent logout without confirmation (for admin operations)
LogoutButton.Silent = (props) => (
  <LogoutButton showConfirmation={false} {...props} />
);