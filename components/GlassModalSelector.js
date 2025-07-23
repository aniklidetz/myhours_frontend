import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/CommonStyles';

export default function GlassModalSelector({ 
  label, 
  value, 
  options, 
  onValueChange,
  onPress, // Will trigger the glass modal
  placeholder = "Select option" 
}) {
  const selectedOption = options.find(option => option.value === value);

  const styles = StyleSheet.create({
    // Selector Button matching your existing liquid glass style
    selectorButton: {
      backgroundColor: COLORS.glassLight,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      minHeight: 44,
      justifyContent: 'center',
      flexDirection: 'row',
      alignItems: 'center',
    },
    
    selectorText: {
      ...TYPOGRAPHY.body,
      color: selectedOption ? COLORS.textPrimary : COLORS.textMuted,
      flex: 1,
    },
    
    dropdownIcon: {
      ...TYPOGRAPHY.body,
      color: COLORS.textSecondary,
      marginLeft: SPACING.sm,
      fontSize: 12,
    },
  });

  return (
    <TouchableOpacity
      style={styles.selectorButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.selectorText}>
        {selectedOption ? selectedOption.label : placeholder}
      </Text>
      <Text style={styles.dropdownIcon}>▼</Text>
    </TouchableOpacity>
  );
}