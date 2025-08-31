import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import ApiService from '../src/api/apiService';
import { showGlassAlert } from '../hooks/useGlobalGlassModal';
import { useEmployeeForm } from '../hooks/useEmployeeForm';
import { EmployeeForm } from '../components/EmployeeForm';
import LiquidGlassScreenLayout from '../components/LiquidGlassScreenLayout';
import LiquidGlassButton from '../components/LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/CommonStyles';

export default function AddEmployeeScreen() {
  const theme = useLiquidGlassTheme();
  const {
    loading: _loading,
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
    validateForm,
  } = useEmployeeForm();

  const handleHourlyRateEdit = () => {
    resetHourlyRate();
    setHourlyRateInput(formData.hourly_rate);
  };

  const handleMonthlySalaryEdit = () => {
    resetMonthlySalary();
    setMonthlySalaryInput(formData.monthly_salary);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const employeeData = {
        ...formData,
        hourly_rate:
          formData.employment_type === 'hourly' && formData.hourly_rate
            ? parseFloat(formData.hourly_rate)
            : null,
        monthly_salary:
          formData.employment_type === 'full_time' && formData.monthly_salary
            ? parseFloat(formData.monthly_salary)
            : null,
      };

      const employee = await ApiService.employees.create(employeeData);

      showGlassAlert('Employee Created', 'Would you like to send an invitation email now?', [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => router.push('/team-management'),
        },
        {
          text: 'Send Invitation',
          onPress: async () => {
            try {
              await ApiService.employees.sendInvitation(employee.id);
              showGlassAlert(
                'Success',
                `Invitation sent to ${employee.email}. They will receive an email with instructions to set up their account.`,
                [{ text: 'OK', onPress: () => router.push('/team-management') }]
              );
            } catch (error) {
              console.error('Error sending invitation:', error);
              showGlassAlert(
                'Invitation Failed',
                'Employee created but invitation could not be sent. You can resend it later from the employee list.',
                [{ text: 'OK', onPress: () => router.push('/team-management') }]
              );
            }
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating employee:', error);
      let errorMessage = 'Failed to create employee. Please try again.';

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.email?.[0]) {
        errorMessage = error.response.data.email[0];
      } else if (error.message) {
        errorMessage = error.message;
      }

      showGlassAlert('Error', errorMessage);
    }
  };

  const handleCancel = () => {
    showGlassAlert('Discard Employee', 'Are you sure you want to discard this new employee?', [
      { text: 'Keep Editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => router.push('/team-management'),
      },
    ]);
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: 'transparent',
      flex: 1,
    },

    // Header Section
    header: {
      alignItems: 'center',
      paddingBottom: SPACING.md,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.lg,
    },
    title: {
      ...TYPOGRAPHY.title,
      color: COLORS.textPrimary,
      fontSize: 20,
      marginBottom: SPACING.xs,
    },
    subtitle: {
      ...TYPOGRAPHY.body,
      color: COLORS.textSecondary,
      lineHeight: 20,
      textAlign: 'center',
    },

    // Footer with better spacing and single Cancel button
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

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>Add Team Member</Text>
      <Text style={styles.subtitle}>Create team member account and send invitation</Text>
    </View>
  );

  // Footer with only primary action and cancel
  const footer = (
    <View style={styles.footer}>
      {/* Primary Action Button */}
      <LiquidGlassButton
        title={saving ? 'Creating...' : 'Create Team Member & Send Invitation'}
        onPress={handleSubmit}
        disabled={saving}
        variant="primary"
        loading={saving}
      />

      {/* Single Cancel Button */}
      <LiquidGlassButton title="Cancel" onPress={handleCancel} disabled={saving} variant="ghost" />
    </View>
  );

  return (
    <LiquidGlassScreenLayout.WithGlassHeader
      title="Add Employee"
      backDestination="/team-management"
      showLogout={true}
      scrollable={true}
      footerContent={footer}
    >
      {header}
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
