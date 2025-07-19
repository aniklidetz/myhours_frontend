import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import LiquidGlassCard from './LiquidGlassCard';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';

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
    confirmButton: {
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      height: 44,
      justifyContent: 'center',
      padding: 12,
      width: 44,
    },
    confirmButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
    },
    confirmedInput: {
      alignItems: 'center',
      backgroundColor: theme.colors.background.secondary,
      borderColor: theme.colors.success || theme.colors.primary,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 12,
    },
    confirmedText: {
      color: theme.colors.text.primary,
      fontSize: 16,
      fontWeight: '500',
    },
    editButton: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.primary,
      borderRadius: 6,
      borderWidth: 1,
      padding: 8,
    },
    editButtonText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: '500',
    },
    form: {
      marginBottom: 30,
    },
    input: {
      backgroundColor: theme.colors.background.secondary,
      borderColor: theme.colors.border,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.colors.text.primary,
      fontSize: 16,
      padding: 12,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputWithButton: {
      alignItems: 'center',
      flexDirection: 'row',
    },
    inputWithButtonText: {
      flex: 1,
      marginRight: 8,
    },
    label: {
      color: theme.colors.text.primary,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    picker: {
      color: theme.colors.text.primary,
    },
    pickerContainer: {
      backgroundColor: theme.colors.background.secondary,
      borderColor: theme.colors.border,
      borderRadius: 8,
      borderWidth: 1,
    },
  });

  if (!theme) {
    return null;
  }

  return (
    <LiquidGlassCard padding="lg" style={styles.form}>
      {/* First Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>First Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.first_name}
          onChangeText={(text) => onFormChange({ ...formData, first_name: text })}
          placeholder="John"
          autoCapitalize="words"
          placeholderTextColor={theme.colors.text.secondary}
        />
      </View>

      {/* Last Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Last Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.last_name}
          onChangeText={(text) => onFormChange({ ...formData, last_name: text })}
          placeholder="Doe"
          autoCapitalize="words"
          placeholderTextColor={theme.colors.text.secondary}
        />
      </View>

      {/* Email */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={formData.email}
          onChangeText={(text) => onFormChange({ ...formData, email: text.toLowerCase() })}
          placeholder="john.doe@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={theme.colors.text.secondary}
        />
      </View>

      {/* Phone */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone (Optional)</Text>
        <TextInput
          style={styles.input}
          value={formData.phone}
          onChangeText={(text) => onFormChange({ ...formData, phone: text })}
          placeholder="+1234567890"
          keyboardType="phone-pad"
          placeholderTextColor={theme.colors.text.secondary}
        />
      </View>

      {/* Employment Type */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Employment Type</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.employment_type}
            onValueChange={onEmploymentTypeChange}
            style={styles.picker}
          >
            <Picker.Item label="Hourly" value="hourly" />
            <Picker.Item label="Full Time" value="full_time" />
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
                keyboardType="decimal-pad"
                placeholderTextColor={theme.colors.text.secondary}
              />
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={onHourlyRateConfirm}
              >
                <Text style={styles.confirmButtonText}>✓</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.confirmedInput}>
              <Text style={styles.confirmedText}>₪{formData.hourly_rate}</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={onHourlyRateEdit}
              >
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
                keyboardType="decimal-pad"
                placeholderTextColor={theme.colors.text.secondary}
              />
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={onMonthlySalaryConfirm}
              >
                <Text style={styles.confirmButtonText}>✓</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.confirmedInput}>
              <Text style={styles.confirmedText}>₪{formData.monthly_salary}</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={onMonthlySalaryEdit}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Role */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Role</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={formData.role}
            onValueChange={(value) => onFormChange({ ...formData, role: value })}
            style={styles.picker}
          >
            <Picker.Item label="Employee" value="employee" />
            <Picker.Item label="Accountant" value="accountant" />
            <Picker.Item label="Administrator" value="admin" />
          </Picker>
        </View>
      </View>
    </LiquidGlassCard>
  );
}