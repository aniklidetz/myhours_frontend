import React from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { showGlassAlert } from '../hooks/useGlobalGlassModal';
import { useEmployeeForm } from '../hooks/useEmployeeForm';
import { EmployeeForm } from '../components/EmployeeForm';
import LiquidGlassScreenLayout from '../components/LiquidGlassScreenLayout';
import LiquidGlassButton from '../components/LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import HeaderBackButton from '../src/components/HeaderBackButton';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/CommonStyles';

export default function EditEmployeeScreen() {
  const theme = useLiquidGlassTheme();
  const params = useLocalSearchParams();
  const employeeId = params.employeeId || params.id;
  
  const {
    loading,
    saving,
    formData,
    setFormData,
    hourlyRateInput,
    setHourlyRateInput,
    hourlyRateConfirmed,
    monthlySalaryInput,
    setMonthlySalaryInput,
    monthlySalaryConfirmed,
    handleHourlyRateConfirm,
    handleMonthlySalaryConfirm,
    resetHourlyRate,
    resetMonthlySalary,
    handleEmploymentTypeChange,
    saveEmployee,
    validateForm,
  } = useEmployeeForm(employeeId);

  if (!employeeId) {
    showGlassAlert('Error', 'Employee ID is required', [
      { text: 'OK', onPress: () => router.back() }
    ]);
    return null;
  }

  const handleHourlyRateEdit = () => {
    resetHourlyRate();
    setHourlyRateInput(formData.hourly_rate);
  };

  const handleMonthlySalaryEdit = () => {
    resetMonthlySalary();
    setMonthlySalaryInput(formData.monthly_salary);
  };

  const handleSave = async () => {
    const result = await saveEmployee();
    if (result) {
      showGlassAlert('Success', 'Employee updated successfully', [
        { text: 'OK', onPress: () => router.push('/team-management') }
      ]);
    }
  };

  const handleCancel = () => {
    showGlassAlert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { 
          text: 'Discard', 
          style: 'destructive',
          onPress: () => router.push('/team-management')
        }
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: SPACING.md,
      fontSize: TYPOGRAPHY.body.fontSize,
      color: COLORS.textPrimary,
    },
    
    // Improved Footer with better spacing and single Cancel button
    footer: {
      padding: SPACING.lg,
      paddingBottom: Platform.OS === 'ios' ? 34 + SPACING.md : SPACING.lg, // Safe area for iOS
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      gap: SPACING.md,
    },
  });

  if (!theme) {
    return null;
  }

  if (loading) {
    return (
      <LiquidGlassScreenLayout.WithGlassHeader
        title="Edit Employee"
        backDestination="/team-management"
        showLogout={true}
        scrollable={false}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.text.primary} />
          <Text style={styles.loadingText}>Loading employee data...</Text>
        </View>
      </LiquidGlassScreenLayout.WithGlassHeader>
    );
  }

  // Simplified footer with only primary action and cancel
  const footer = (
    <View style={styles.footer}>
      {/* Primary Action Button */}
      <LiquidGlassButton
        title={saving ? "Saving..." : "Save Changes"}
        onPress={handleSave}
        disabled={saving}
        variant="primary"
        loading={saving}
      />
      
      {/* Single Cancel Button - removed redundant Back button */}
      <LiquidGlassButton
        title="Cancel"
        onPress={handleCancel}
        disabled={saving}
        variant="ghost"
      />
    </View>
  );

  return (
    <LiquidGlassScreenLayout.WithGlassHeader
      title="Edit Employee"
      backDestination="/team-management"
      showLogout={true}
      scrollable={true}
      footerContent={footer}
    >
      <EmployeeForm
        formData={formData}
        onFormChange={setFormData}
        hourlyRateInput={hourlyRateInput}
        onHourlyRateInputChange={setHourlyRateInput}
        hourlyRateConfirmed={hourlyRateConfirmed}
        onHourlyRateConfirm={handleHourlyRateConfirm}
        onHourlyRateEdit={handleHourlyRateEdit}
        monthlySalaryInput={monthlySalaryInput}
        onMonthlySalaryInputChange={setMonthlySalaryInput}
        monthlySalaryConfirmed={monthlySalaryConfirmed}
        onMonthlySalaryConfirm={handleMonthlySalaryConfirm}
        onMonthlySalaryEdit={handleMonthlySalaryEdit}
        onEmploymentTypeChange={handleEmploymentTypeChange}
      />
    </LiquidGlassScreenLayout.WithGlassHeader>
  );
}