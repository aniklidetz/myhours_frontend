import React, { useState, useEffect } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import useColors from '../hooks/useColors';
import ApiService from '../src/api/apiService';
import { safeLog } from '../src/utils/safeLogging';

export default function EditEmployeeScreen() {
  const { palette } = useColors();
  const params = useLocalSearchParams();
  const employeeId = params.employeeId || params.id;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeData();
    } else {
      Alert.alert('Error', 'Employee ID is required');
      router.back();
    }
  }, [employeeId]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      safeLog('📡 Fetching employee data for ID:', employeeId);
      
      const employeeData = await ApiService.employees.getById(employeeId);
      safeLog('✅ Employee data fetched successfully');
      
      setFormData({
        first_name: employeeData.first_name || '',
        last_name: employeeData.last_name || '',
        email: employeeData.email || '',
        phone: employeeData.phone || '',
        employment_type: employeeData.employment_type || 'hourly',
        hourly_rate: employeeData.hourly_rate ? employeeData.hourly_rate.toString() : '',
        monthly_salary: employeeData.monthly_salary ? employeeData.monthly_salary.toString() : '',
        role: employeeData.role || 'employee',
      });

      // Set up the confirmed states based on existing data
      if (employeeData.hourly_rate) {
        setHourlyRateInput(employeeData.hourly_rate.toString());
        setHourlyRateConfirmed(true);
      }
      if (employeeData.monthly_salary) {
        setMonthlySalaryInput(employeeData.monthly_salary.toString());
        setMonthlySalaryConfirmed(true);
      }
      
    } catch (error) {
      console.error('Error fetching employee data:', error);
      Alert.alert('Error', 'Failed to load employee data');
      router.back();
    } finally {
      setLoading(false);
    }
  };

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
      setFormData({ ...formData, employment_type: value, hourly_rate: '' });
      setHourlyRateInput('');
      setHourlyRateConfirmed(false);
    } else {
      // Reset monthly salary when switching to hourly
      setFormData({ ...formData, employment_type: value, monthly_salary: '' });
      setMonthlySalaryInput('');
      setMonthlySalaryConfirmed(false);
    }
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
    
    if (formData.employment_type === 'hourly') {
      if (!hourlyRateConfirmed) {
        Alert.alert('Error', 'Please confirm the hourly rate');
        return false;
      }
    } else {
      if (!monthlySalaryConfirmed) {
        Alert.alert('Error', 'Please confirm the monthly salary');
        return false;
      }
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      safeLog('💾 Updating employee data...');

      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        employment_type: formData.employment_type,
        hourly_rate: formData.employment_type === 'hourly' ? parseFloat(formData.hourly_rate) || null : null,
        monthly_salary: formData.employment_type === 'full_time' ? parseFloat(formData.monthly_salary) || null : null,
      };

      await ApiService.employees.update(employeeId, updateData);
      safeLog('✅ Employee updated successfully');
      
      Alert.alert('Success', 'Employee updated successfully', [
        { text: 'OK', onPress: () => router.push('/employees') }
      ]);
      
    } catch (error) {
      console.error('Error updating employee:', error);
      Alert.alert('Error', 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles(palette).container}>
        <View style={styles(palette).loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles(palette).loadingText}>Loading employee data...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles(palette).container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles(palette).header}>
        <TouchableOpacity 
          style={styles(palette).backButton}
          onPress={() => router.push('/employees')}
        >
          <Text style={styles(palette).backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles(palette).headerTitle}>Edit Employee</Text>
        <TouchableOpacity
          style={[styles(palette).saveButton, saving && styles(palette).saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={palette.text.light} />
          ) : (
            <Text style={styles(palette).saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles(palette).scrollView}>
        <View style={styles(palette).form}>
          <View style={styles(palette).formGroup}>
            <Text style={styles(palette).label}>First Name *</Text>
            <TextInput
              style={styles(palette).input}
              value={formData.first_name}
              onChangeText={(text) => setFormData({...formData, first_name: text})}
              placeholder="Enter first name"
              placeholderTextColor={palette.text.secondary}
            />
          </View>

          <View style={styles(palette).formGroup}>
            <Text style={styles(palette).label}>Last Name *</Text>
            <TextInput
              style={styles(palette).input}
              value={formData.last_name}
              onChangeText={(text) => setFormData({...formData, last_name: text})}
              placeholder="Enter last name"
              placeholderTextColor={palette.text.secondary}
            />
          </View>

          <View style={styles(palette).formGroup}>
            <Text style={styles(palette).label}>Email *</Text>
            <TextInput
              style={styles(palette).input}
              value={formData.email}
              onChangeText={(text) => setFormData({...formData, email: text})}
              placeholder="Enter email address"
              placeholderTextColor={palette.text.secondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles(palette).formGroup}>
            <Text style={styles(palette).label}>Phone</Text>
            <TextInput
              style={styles(palette).input}
              value={formData.phone}
              onChangeText={(text) => setFormData({...formData, phone: text})}
              placeholder="Enter phone number"
              placeholderTextColor={palette.text.secondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles(palette).formGroup}>
            <Text style={styles(palette).label}>Role</Text>
            <View style={styles(palette).pickerContainer}>
              <Picker
                selectedValue={formData.role}
                onValueChange={(value) => setFormData({...formData, role: value})}
                style={styles(palette).picker}
                mode="dropdown"
                enabled={true}
                itemStyle={{
                  color: palette.text.primary,
                  backgroundColor: palette.background.primary,
                }}
              >
                <Picker.Item label="Employee" value="employee" />
                <Picker.Item label="Admin" value="admin" />
                <Picker.Item label="Accountant" value="accountant" />
              </Picker>
            </View>
          </View>

          <View style={styles(palette).formGroup}>
            <Text style={styles(palette).label}>Employment Type</Text>
            <View style={styles(palette).pickerContainer}>
              <Picker
                selectedValue={formData.employment_type}
                onValueChange={handleEmploymentTypeChange}
                style={styles(palette).picker}
                mode="dropdown"
                enabled={true}
                itemStyle={{
                  color: palette.text.primary,
                  backgroundColor: palette.background.primary,
                }}
              >
                <Picker.Item label="Hourly" value="hourly" />
                <Picker.Item label="Full Time" value="full_time" />
              </Picker>
            </View>
          </View>

          {formData.employment_type === 'hourly' && (
            <View style={styles(palette).formGroup}>
              <Text style={styles(palette).label}>Hourly Rate *</Text>
              {!hourlyRateConfirmed ? (
                <View style={styles(palette).salaryInputContainer}>
                  <TextInput
                    style={styles(palette).salaryInput}
                    value={hourlyRateInput}
                    onChangeText={setHourlyRateInput}
                    placeholder="Enter hourly rate"
                    placeholderTextColor={palette.text.secondary}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={styles(palette).confirmButton}
                    onPress={handleHourlyRateConfirm}
                  >
                    <Text style={styles(palette).confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles(palette).confirmedSalaryContainer}>
                  <Text style={styles(palette).confirmedSalaryText}>
                    ${formData.hourly_rate}/hour
                  </Text>
                  <TouchableOpacity
                    style={styles(palette).editButton}
                    onPress={handleHourlyRateEdit}
                  >
                    <Text style={styles(palette).editButtonText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {formData.employment_type === 'full_time' && (
            <View style={styles(palette).formGroup}>
              <Text style={styles(palette).label}>Monthly Salary *</Text>
              {!monthlySalaryConfirmed ? (
                <View style={styles(palette).salaryInputContainer}>
                  <TextInput
                    style={styles(palette).salaryInput}
                    value={monthlySalaryInput}
                    onChangeText={setMonthlySalaryInput}
                    placeholder="Enter monthly salary"
                    placeholderTextColor={palette.text.secondary}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={styles(palette).confirmButton}
                    onPress={handleMonthlySalaryConfirm}
                  >
                    <Text style={styles(palette).confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles(palette).confirmedSalaryContainer}>
                  <Text style={styles(palette).confirmedSalaryText}>
                    ${formData.monthly_salary}/month
                  </Text>
                  <TouchableOpacity
                    style={styles(palette).editButton}
                    onPress={handleMonthlySalaryEdit}
                  >
                    <Text style={styles(palette).editButtonText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (palette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: palette.text.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: palette.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.text.primary,
  },
  saveButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: palette.text.secondary,
  },
  saveButtonText: {
    color: palette.text.light,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  formGroup: {
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: palette.text.primary,
    backgroundColor: palette.background.primary,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    backgroundColor: palette.background.primary,
    overflow: 'hidden',
    minHeight: 50,
  },
  picker: {
    height: Platform.OS === 'ios' ? 200 : 50,
    color: palette.text.primary,
    backgroundColor: palette.background.primary,
  },
  salaryInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  salaryInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: palette.text.primary,
    backgroundColor: palette.background.primary,
  },
  confirmButton: {
    backgroundColor: palette.success,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: palette.text.light,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmedSalaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: palette.success + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.success,
  },
  confirmedSalaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text.primary,
  },
  editButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: palette.text.light,
    fontSize: 12,
    fontWeight: '600',
  },
});