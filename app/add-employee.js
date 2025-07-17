import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import useColors from '../hooks/useColors';
import ApiService from '../src/api/apiService';

export default function AddEmployeeScreen() {
  const { palette } = useColors();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    employment_type: 'hourly',
    hourly_rate: '',
    monthly_salary: '',
    role: 'employee',
  });

  const [hourlyRateInput, setHourlyRateInput] = useState('');
  const [hourlyRateConfirmed, setHourlyRateConfirmed] = useState(false);
  const [monthlySalaryInput, setMonthlySalaryInput] = useState('');
  const [monthlySalaryConfirmed, setMonthlySalaryConfirmed] = useState(false);

  const handleHourlyRateConfirm = () => {
    if (hourlyRateInput.trim() === '') {
      Alert.alert('Error', 'Please enter an hourly rate');
      return;
    }
    
    const rate = parseFloat(hourlyRateInput);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Error', 'Please enter a valid hourly rate');
      return;
    }
    
    setFormData({ ...formData, hourly_rate: hourlyRateInput });
    setHourlyRateConfirmed(true);
  };

  const handleHourlyRateEdit = () => {
    setHourlyRateConfirmed(false);
    setHourlyRateInput(formData.hourly_rate);
  };

  const handleMonthlySalaryConfirm = () => {
    if (monthlySalaryInput.trim() === '') {
      Alert.alert('Error', 'Please enter a monthly salary');
      return;
    }
    
    const salary = parseFloat(monthlySalaryInput);
    if (isNaN(salary) || salary <= 0) {
      Alert.alert('Error', 'Please enter a valid monthly salary');
      return;
    }
    
    setFormData({ ...formData, monthly_salary: monthlySalaryInput });
    setMonthlySalaryConfirmed(true);
  };

  const handleMonthlySalaryEdit = () => {
    setMonthlySalaryConfirmed(false);
    setMonthlySalaryInput(formData.monthly_salary);
  };

  const handleEmploymentTypeChange = (value) => {
    if (value === 'full_time') {
      // Reset hourly rate when switching to full_time
      setFormData({ ...formData, employment_type: value, hourly_rate: '', monthly_salary: '' });
      setHourlyRateInput('');
      setHourlyRateConfirmed(false);
      setMonthlySalaryInput('');
      setMonthlySalaryConfirmed(false);
    } else {
      // Reset monthly salary when switching to hourly
      setFormData({ ...formData, employment_type: value, monthly_salary: '' });
      setMonthlySalaryInput('');
      setMonthlySalaryConfirmed(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      employment_type: 'hourly',
      hourly_rate: '',
      monthly_salary: '',
      role: 'employee',
    });
    setHourlyRateInput('');
    setHourlyRateConfirmed(false);
    setMonthlySalaryInput('');
    setMonthlySalaryConfirmed(false);
  };

  const validateForm = () => {
    if (!formData.first_name.trim()) {
      Alert.alert('Error', 'First name is required');
      return false;
    }
    if (!formData.last_name.trim()) {
      Alert.alert('Error', 'Last name is required');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (formData.employment_type === 'hourly' && (!formData.hourly_rate || !hourlyRateConfirmed)) {
      Alert.alert('Error', 'Please confirm the hourly rate for hourly employees');
      return false;
    }
    if (formData.employment_type === 'full_time' && (!formData.monthly_salary || !monthlySalaryConfirmed)) {
      Alert.alert('Error', 'Please confirm the monthly salary for full-time employees');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Create employee
      const employeeData = {
        ...formData,
        hourly_rate: formData.employment_type === 'hourly' && formData.hourly_rate 
          ? parseFloat(formData.hourly_rate) 
          : null,
        monthly_salary: formData.employment_type === 'full_time' && formData.monthly_salary 
          ? parseFloat(formData.monthly_salary) 
          : null,
      };
      
      // Creating employee...
      const employee = await ApiService.employees.create(employeeData);
      
      // Employee created successfully
      
      // Send invitation
      Alert.alert(
        'Employee Created',
        'Would you like to send an invitation email now?',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => {
              resetForm();
              router.push('/employees');
            },
          },
          {
            text: 'Send Invitation',
            onPress: async () => {
              try {
                // Sending invitation...
                const invitation = await ApiService.employees.sendInvitation(employee.id);
                // Invitation sent successfully
                
                Alert.alert(
                  'Success',
                  `Invitation sent to ${employee.email}. They will receive an email with instructions to set up their account.`,
                  [{ text: 'OK', onPress: () => {
                    resetForm();
                    router.push('/employees');
                  } }]
                );
              } catch (error) {
                console.error('Error sending invitation:', error);
                Alert.alert(
                  'Invitation Failed',
                  'Employee created but invitation could not be sent. You can resend it later from the employee list.',
                  [{ text: 'OK', onPress: () => {
                    resetForm();
                    router.push('/employees');
                  } }]
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
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    button: {
      alignItems: 'center',
      borderRadius: 8,
      marginBottom: 12,
      padding: 16,
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    confirmButton: {
      alignItems: 'center',
      backgroundColor: palette.primary,
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
      backgroundColor: palette.background.secondary,
      borderColor: palette.success || palette.primary,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 12,
    },
    confirmedText: {
      color: palette.text.primary,
      fontSize: 16,
      fontWeight: '500',
    },
    container: {
      backgroundColor: palette.background.primary,
      flex: 1,
    },
    disabledButton: {
      opacity: 0.6,
    },
    editButton: {
      backgroundColor: 'transparent',
      borderColor: palette.primary,
      borderRadius: 6,
      borderWidth: 1,
      padding: 8,
    },
    editButtonText: {
      color: palette.primary,
      fontSize: 14,
      fontWeight: '500',
    },
    form: {
      marginBottom: 30,
    },
    header: {
      alignItems: 'center',
      marginBottom: 30,
    },
    input: {
      backgroundColor: palette.background.secondary,
      borderColor: palette.border,
      borderRadius: 8,
      borderWidth: 1,
      color: palette.text.primary,
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
      color: palette.text.primary,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    picker: {
      color: palette.text.primary,
    },
    pickerContainer: {
      backgroundColor: palette.background.secondary,
      borderColor: palette.border,
      borderRadius: 8,
      borderWidth: 1,
    },
    primaryButton: {
      backgroundColor: palette.primary,
    },
    scrollContainer: {
      padding: 20,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderColor: palette.primary,
      borderWidth: 1,
    },
    subtitle: {
      color: palette.text.secondary,
      fontSize: 16,
      textAlign: 'center',
    },
    title: {
      color: palette.text.primary,
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 8,
    },
  });

  return (
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

        <View style={styles.form}>
          {/* First Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.first_name}
              onChangeText={(text) => setFormData({ ...formData, first_name: text })}
              placeholder="John"
              autoCapitalize="words"
              placeholderTextColor={palette.text.secondary}
            />
          </View>

          {/* Last Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.last_name}
              onChangeText={(text) => setFormData({ ...formData, last_name: text })}
              placeholder="Doe"
              autoCapitalize="words"
              placeholderTextColor={palette.text.secondary}
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text.toLowerCase() })}
              placeholder="john.doe@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={palette.text.secondary}
            />
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone (Optional)</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="+1234567890"
              keyboardType="phone-pad"
              placeholderTextColor={palette.text.secondary}
            />
          </View>

          {/* Employment Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Employment Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.employment_type}
                onValueChange={handleEmploymentTypeChange}
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
                    onChangeText={setHourlyRateInput}
                    placeholder="50.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor={palette.text.secondary}
                  />
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleHourlyRateConfirm}
                  >
                    <Text style={styles.confirmButtonText}>✓</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.confirmedInput}>
                  <Text style={styles.confirmedText}>₪{formData.hourly_rate}</Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={handleHourlyRateEdit}
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
                    onChangeText={setMonthlySalaryInput}
                    placeholder="5000.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor={palette.text.secondary}
                  />
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleMonthlySalaryConfirm}
                  >
                    <Text style={styles.confirmButtonText}>✓</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.confirmedInput}>
                  <Text style={styles.confirmedText}>₪{formData.monthly_salary}</Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={handleMonthlySalaryEdit}
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
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                style={styles.picker}
              >
                <Picker.Item label="Employee" value="employee" />
                <Picker.Item label="Accountant" value="accountant" />
                <Picker.Item label="Administrator" value="admin" />
              </Picker>
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Create Team Member & Send Invitation</Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.push('/employees')}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: palette.primary }]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}