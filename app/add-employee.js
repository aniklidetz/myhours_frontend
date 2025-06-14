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
    role: 'employee',
  });

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
    if (formData.employment_type === 'hourly' && !formData.hourly_rate) {
      Alert.alert('Error', 'Hourly rate is required for hourly employees');
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
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : 0,
      };
      
      console.log('Creating employee:', employeeData);
      const employee = await ApiService.employees.create(employeeData);
      
      console.log('Employee created:', employee);
      
      // Send invitation
      Alert.alert(
        'Employee Created',
        'Would you like to send an invitation email now?',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => router.back(),
          },
          {
            text: 'Send Invitation',
            onPress: async () => {
              try {
                console.log('Sending invitation to employee:', employee.id);
                const invitation = await ApiService.employees.sendInvitation(employee.id);
                console.log('Invitation sent:', invitation);
                
                Alert.alert(
                  'Success',
                  `Invitation sent to ${employee.email}. They will receive an email with instructions to set up their account.`,
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              } catch (error) {
                console.error('Error sending invitation:', error);
                Alert.alert(
                  'Invitation Failed',
                  'Employee created but invitation could not be sent. You can resend it later from the employee list.',
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating employee:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 
        error.response?.data?.email?.[0] || 
        'Failed to create employee. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: palette.background.primary,
    },
    scrollContainer: {
      padding: 20,
    },
    header: {
      marginBottom: 30,
      alignItems: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: palette.text.primary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: palette.text.secondary,
      textAlign: 'center',
    },
    form: {
      marginBottom: 30,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: palette.text.primary,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      backgroundColor: palette.background.secondary,
      color: palette.text.primary,
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 8,
      backgroundColor: palette.background.secondary,
    },
    picker: {
      color: palette.text.primary,
    },
    button: {
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 12,
    },
    primaryButton: {
      backgroundColor: palette.primary,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: palette.primary,
    },
    disabledButton: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: 'white',
    },
  });

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Add New Employee</Text>
          <Text style={styles.subtitle}>
            Create employee account and send invitation
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
                onValueChange={(value) => setFormData({ ...formData, employment_type: value })}
                style={styles.picker}
              >
                <Picker.Item label="Hourly" value="hourly" />
                <Picker.Item label="Full Time" value="full_time" />
                <Picker.Item label="Part Time" value="part_time" />
                <Picker.Item label="Contract" value="contract" />
              </Picker>
            </View>
          </View>

          {/* Hourly Rate (conditional) */}
          {formData.employment_type === 'hourly' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hourly Rate *</Text>
              <TextInput
                style={styles.input}
                value={formData.hourly_rate}
                onChangeText={(text) => setFormData({ ...formData, hourly_rate: text })}
                placeholder="50.00"
                keyboardType="decimal-pad"
                placeholderTextColor={palette.text.secondary}
              />
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
            <Text style={styles.buttonText}>Create Employee & Send Invitation</Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: palette.primary }]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}