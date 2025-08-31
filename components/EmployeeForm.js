/* eslint-disable react/prop-types */
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import LiquidGlassCard from './LiquidGlassCard';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/CommonStyles';

export function EmployeeForm({
  formData,
  onFormChange,
  hourlyRateInput,
  onHourlyRateInputChange,
  hourlyRateConfirmed,
  onHourlyRateConfirm,
  onHourlyRateEdit,
  monthlySalaryInput,
  onMonthlySalaryInputChange,
  monthlySalaryConfirmed,
  onMonthlySalaryConfirm,
  onMonthlySalaryEdit,
  onEmploymentTypeChange,
}) {
  const theme = useLiquidGlassTheme();

  const styles = StyleSheet.create({
    form: {
      marginBottom: SPACING.xl * 2, // Extra bottom margin to prevent footer overlap
    },

    // Input Group with larger spacing for pickers
    inputGroup: {
      marginBottom: SPACING.lg,
    },

    // Label Style
    label: {
      ...TYPOGRAPHY.body,
      color: COLORS.textPrimary,
      fontWeight: '600',
      marginBottom: SPACING.sm,
    },

    // Input Styles - Liquid Glass Style
    input: {
      backgroundColor: COLORS.glassLight,
      borderColor: COLORS.glassBorder,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      color: COLORS.textPrimary,
      fontSize: TYPOGRAPHY.body.fontSize,
      minHeight: 44,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },

    // Picker Container
    pickerContainer: {
      backgroundColor: COLORS.glassLight,
      borderColor: COLORS.glassBorder,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
    },

    // Picker Style
    picker: {
      color: COLORS.textPrimary, // White text
    },

    // Input with Button Layout
    inputWithButton: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    inputWithButtonText: {
      flex: 1,
    },

    // Confirm Button
    confirmButton: {
      alignItems: 'center',
      backgroundColor: COLORS.primary,
      borderRadius: BORDER_RADIUS.full,
      elevation: 3,
      height: 44,
      justifyContent: 'center',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      width: 44,
    },
    confirmButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
    },

    // Confirmed Input Display
    confirmedInput: {
      alignItems: 'center',
      backgroundColor: COLORS.glassLight,
      borderColor: COLORS.glassBorder,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 44,
      padding: SPACING.md,
    },
    confirmedText: {
      ...TYPOGRAPHY.body,
      color: COLORS.textPrimary,
      flex: 1,
      fontWeight: '600',
    },

    // Edit Button
    editButton: {
      backgroundColor: COLORS.glassMedium,
      borderColor: COLORS.glassBorder,
      borderRadius: BORDER_RADIUS.sm,
      borderWidth: 1,
      minWidth: 60,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
    },
    editButtonText: {
      color: COLORS.textPrimary,
      fontSize: TYPOGRAPHY.caption.fontSize,
      fontWeight: '600',
      textAlign: 'center',
    },

    // Safe bottom padding to prevent footer overlap
    safeBottomPadding: {
      paddingBottom: SPACING.xl,
    },
  });

  if (!theme) {
    return null;
  }

  return (
    <View style={styles.form}>
      <LiquidGlassCard padding="lg">
        {/* First Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.first_name}
            onChangeText={text => onFormChange({ ...formData, first_name: text })}
            placeholder="John"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="words"
          />
        </View>

        {/* Last Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Last Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.last_name}
            onChangeText={text => onFormChange({ ...formData, last_name: text })}
            placeholder="Doe"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="words"
          />
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={text => onFormChange({ ...formData, email: text.toLowerCase() })}
            placeholder="john.doe@example.com"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Phone */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={text => onFormChange({ ...formData, phone: text })}
            placeholder="+1234567890"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
          />
        </View>

        {/* Employment Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Employment Type *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.employment_type}
              onValueChange={onEmploymentTypeChange}
              style={styles.picker}
            >
              <Picker.Item label="Hourly" value="hourly" color={COLORS.textPrimary} />
              <Picker.Item label="Full Time" value="full_time" color={COLORS.textPrimary} />
            </Picker>
          </View>
        </View>

        {/* Hourly Rate (conditional) */}
        {formData.employment_type === 'hourly' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hourly Rate *</Text>
            {!hourlyRateConfirmed ? (
              <View style={styles.inputWithButton}>
                <TextInput
                  style={[styles.input, styles.inputWithButtonText]}
                  value={hourlyRateInput}
                  onChangeText={onHourlyRateInputChange}
                  placeholder="50.00"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity style={styles.confirmButton} onPress={onHourlyRateConfirm}>
                  <Text style={styles.confirmButtonText}>✓</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.confirmedInput}>
                <Text style={styles.confirmedText}>₪{formData.hourly_rate}</Text>
                <TouchableOpacity style={styles.editButton} onPress={onHourlyRateEdit}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Monthly Salary (conditional) */}
        {formData.employment_type === 'full_time' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monthly Salary *</Text>
            {!monthlySalaryConfirmed ? (
              <View style={styles.inputWithButton}>
                <TextInput
                  style={[styles.input, styles.inputWithButtonText]}
                  value={monthlySalaryInput}
                  onChangeText={onMonthlySalaryInputChange}
                  placeholder="5000.00"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity style={styles.confirmButton} onPress={onMonthlySalaryConfirm}>
                  <Text style={styles.confirmButtonText}>✓</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.confirmedInput}>
                <Text style={styles.confirmedText}>₪{formData.monthly_salary}</Text>
                <TouchableOpacity style={styles.editButton} onPress={onMonthlySalaryEdit}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Role */}
        <View style={[styles.inputGroup, styles.safeBottomPadding]}>
          <Text style={styles.label}>Role *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.role}
              onValueChange={value => onFormChange({ ...formData, role: value })}
              style={styles.picker}
            >
              <Picker.Item label="Employee" value="employee" color={COLORS.textPrimary} />
              <Picker.Item label="Accountant" value="accountant" color={COLORS.textPrimary} />
              <Picker.Item label="Administrator" value="admin" color={COLORS.textPrimary} />
            </Picker>
          </View>
        </View>
      </LiquidGlassCard>
    </View>
  );
}
