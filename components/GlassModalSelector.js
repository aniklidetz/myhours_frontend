/* eslint-disable react/prop-types */
import React from 'react';
import { View as _View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/CommonStyles';

export default function GlassModalSelector({
  label: _label,
  value,
  options,
  onValueChange: _onValueChange,
  onPress, // Will trigger the glass modal
  placeholder = 'Select option',
}) {
  const selectedOption = options.find(option => option.value === value);

  const styles = StyleSheet.create({
    // Selector Button matching your existing liquid glass style
    selectorButton: {
      alignItems: 'center',
      backgroundColor: COLORS.glassLight,
      borderColor: COLORS.glassBorder,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      minHeight: 44,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },

    selectorText: {
      ...TYPOGRAPHY.body,
      color: selectedOption ? COLORS.textPrimary : COLORS.textMuted,
      flex: 1,
    },

    dropdownIcon: {
      ...TYPOGRAPHY.body,
      color: COLORS.textSecondary,
      fontSize: 12,
      marginLeft: SPACING.sm,
    },
  });

  return (
    <TouchableOpacity style={styles.selectorButton} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.selectorText}>{selectedOption ? selectedOption.label : placeholder}</Text>
      <Text style={styles.dropdownIcon}>▼</Text>
    </TouchableOpacity>
  );
}
