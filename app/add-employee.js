import React from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import ApiService from '../src/api/apiService';
import { showGlassAlert } from '../hooks/useGlobalGlassModal';
import { useEmployeeForm } from '../hooks/useEmployeeForm';
import { EmployeeForm } from '../components/EmployeeForm';
import LiquidGlassLayout from '../components/LiquidGlassLayout';
import LiquidGlassButton from '../components/LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import HeaderBackButton from '../src/components/HeaderBackButton';

export default function AddEmployeeScreen() {
  const theme = useLiquidGlassTheme();
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
        hourly_rate: formData.employment_type === 'hourly' && formData.hourly_rate 
          ? parseFloat(formData.hourly_rate) 
          : null,
        monthly_salary: formData.employment_type === 'full_time' && formData.monthly_salary 
          ? parseFloat(formData.monthly_salary) 
          : null,
      };
      
      const employee = await ApiService.employees.create(employeeData);
      
      showGlassAlert(
        'Employee Created',
        'Would you like to send an invitation email now?',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => router.push('/employees'),
          },
          {
            text: 'Send Invitation',
            onPress: async () => {
              try {
                await ApiService.employees.sendInvitation(employee.id);
                showGlassAlert(
                  'Success',
                  `Invitation sent to ${employee.email}. They will receive an email with instructions to set up their account.`,
                  [{ text: 'OK', onPress: () => router.push('/employees') }]
                );
              } catch (error) {
                console.error('Error sending invitation:', error);
                showGlassAlert(
                  'Invitation Failed',
                  'Employee created but invitation could not be sent. You can resend it later from the employee list.',
                  [{ text: 'OK', onPress: () => router.push('/employees') }]
                );
              }
            },
          },
        ]
      );
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

  const styles = StyleSheet.create({
    container: {
      backgroundColor: 'transparent',
      flex: 1,
    },
    header: {
      alignItems: 'center',
      marginBottom: 30,
    },
    scrollContainer: {
      padding: 20,
    },
    subtitle: {
      color: theme.colors.text.secondary,
      fontSize: 16,
      textAlign: 'center',
    },
    title: {
      color: theme.colors.text.primary,
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 8,
    },
  });

  if (!theme) {
    return null;
  }

  return (
    <LiquidGlassLayout>
      <HeaderBackButton destination="/employees" />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Team Member</Text>
          <Text style={styles.subtitle}>
            Create team member account and send invitation
          </Text>
        </View>

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

        <LiquidGlassButton
          title={saving ? "Creating..." : "Create Team Member & Send Invitation"}
          onPress={handleSubmit}
          disabled={saving}
          variant="primary"
          style={{ marginBottom: 12 }}
          loading={saving}
        />

        <LiquidGlassButton
          title="Cancel"
          onPress={() => router.push('/employees')}
          disabled={saving}
          variant="ghost"
        />
        </ScrollView>
      </KeyboardAvoidingView>
    </LiquidGlassLayout>
  );
}