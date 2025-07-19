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
import LiquidGlassLayout from '../components/LiquidGlassLayout';
import LiquidGlassButton from '../components/LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import HeaderBackButton from '../src/components/HeaderBackButton';

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
        { text: 'OK', onPress: () => router.push('/employees') }
      ]);
    }
  };

  if (!theme) {
    return null;
  }

  if (loading) {
    return (
      <LiquidGlassLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading employee data...</Text>
        </View>
      </LiquidGlassLayout>
    );
  }

  return (
    <LiquidGlassLayout>
      <HeaderBackButton destination="/employees" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Employee</Text>
          <LiquidGlassButton
            title={saving ? "Saving..." : "Save"}
            onPress={handleSave}
            disabled={saving}
            variant="primary"
            loading={saving}
            style={{ paddingHorizontal: 20 }}
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </LiquidGlassLayout>
  );
}

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
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
  },
});