import { useState, useEffect, useCallback } from 'react';
import ApiService from '../src/api/apiService';
import { showGlassAlert } from './useGlobalGlassModal';
import { router } from 'expo-router';

/**
 * Custom hook for managing employee form state and operations
 * Handles both adding new employees and editing existing ones
 */
export function useEmployeeForm(employeeId = null) {
  const [loading, setLoading] = useState(false);
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

  // Temporary input states for rates/salaries
  const [hourlyRateInput, setHourlyRateInput] = useState('');
  const [hourlyRateConfirmed, setHourlyRateConfirmed] = useState(false);
  const [monthlySalaryInput, setMonthlySalaryInput] = useState('');
  const [monthlySalaryConfirmed, setMonthlySalaryConfirmed] = useState(false);

  const isEditMode = !!employeeId;

  // Load employee data for editing
  useEffect(() => {
    if (!isEditMode) return;

    const loadEmployee = async () => {
      setLoading(true);
      try {
        const employee = await ApiService.employees.getById(employeeId);
        setFormData({
          first_name: employee.first_name || '',
          last_name: employee.last_name || '',
          email: employee.email || '',
          phone: employee.phone || '',
          employment_type: employee.employment_type || 'hourly',
          hourly_rate: employee.hourly_rate || '',
          monthly_salary: employee.monthly_salary || '',
          role: employee.role || 'employee',
        });

        // Set confirmed states for existing rates
        if (employee.hourly_rate) {
          setHourlyRateInput(employee.hourly_rate.toString());
          setHourlyRateConfirmed(true);
        }
        if (employee.monthly_salary) {
          setMonthlySalaryInput(employee.monthly_salary.toString());
          setMonthlySalaryConfirmed(true);
        }
      } catch (error) {
        console.error('Error loading employee:', error);
        showGlassAlert('Error', 'Failed to load employee data');
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [employeeId, isEditMode]);

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    if (!formData.first_name.trim()) {
      showGlassAlert('Validation Error', 'First name is required');
      return false;
    }
    if (!formData.last_name.trim()) {
      showGlassAlert('Validation Error', 'Last name is required');
      return false;
    }
    if (!formData.email.trim()) {
      showGlassAlert('Validation Error', 'Email is required');
      return false;
    }
    if (!validateEmail(formData.email)) {
      showGlassAlert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    // Validate rates based on employment type
    if (formData.employment_type === 'hourly') {
      if (!hourlyRateConfirmed || !formData.hourly_rate) {
        showGlassAlert('Validation Error', 'Please confirm the hourly rate');
        return false;
      }
    } else if (formData.employment_type === 'full_time') {
      if (!monthlySalaryConfirmed || !formData.monthly_salary) {
        showGlassAlert('Validation Error', 'Please confirm the monthly salary');
        return false;
      }
    }

    return true;
  };

  // Rate/Salary handlers
  const handleHourlyRateConfirm = useCallback(() => {
    if (hourlyRateInput.trim() === '') {
      showGlassAlert('Error', 'Please enter an hourly rate');
      return;
    }
    
    const rate = parseFloat(hourlyRateInput);
    if (isNaN(rate) || rate <= 0) {
      showGlassAlert('Error', 'Please enter a valid hourly rate');
      return;
    }

    setFormData(prev => ({ ...prev, hourly_rate: rate }));
    setHourlyRateConfirmed(true);
    showGlassAlert('Success', `Hourly rate confirmed: ₪${rate}/hour`);
  }, [hourlyRateInput]);

  const handleMonthlySalaryConfirm = useCallback(() => {
    if (monthlySalaryInput.trim() === '') {
      showGlassAlert('Error', 'Please enter a monthly salary');
      return;
    }
    
    const salary = parseFloat(monthlySalaryInput);
    if (isNaN(salary) || salary <= 0) {
      showGlassAlert('Error', 'Please enter a valid monthly salary');
      return;
    }

    setFormData(prev => ({ ...prev, monthly_salary: salary }));
    setMonthlySalaryConfirmed(true);
    showGlassAlert('Success', `Monthly salary confirmed: ₪${salary}/month`);
  }, [monthlySalaryInput]);

  const resetHourlyRate = useCallback(() => {
    setHourlyRateInput('');
    setHourlyRateConfirmed(false);
    setFormData(prev => ({ ...prev, hourly_rate: '' }));
  }, []);

  const resetMonthlySalary = useCallback(() => {
    setMonthlySalaryInput('');
    setMonthlySalaryConfirmed(false);
    setFormData(prev => ({ ...prev, monthly_salary: '' }));
  }, []);

  // Handle employment type change
  const handleEmploymentTypeChange = useCallback((value) => {
    setFormData(prev => ({ ...prev, employment_type: value }));
    
    // Reset rates when switching employment type
    if (value === 'hourly') {
      resetMonthlySalary();
    } else if (value === 'full_time') {
      resetHourlyRate();
    }
  }, [resetHourlyRate, resetMonthlySalary]);

  // Save employee (create or update) - simplified for hook usage
  const saveEmployee = useCallback(async () => {
    if (!validateForm()) return false;

    setSaving(true);
    try {
      let result;
      if (isEditMode) {
        result = await ApiService.employees.update(employeeId, formData);
      } else {
        result = await ApiService.employees.create(formData);
      }
      return result;
    } catch (error) {
      console.error('Error saving employee:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      showGlassAlert('Error', `Failed to ${isEditMode ? 'update' : 'create'} employee: ${errorMessage}`);
      return false;
    } finally {
      setSaving(false);
    }
  }, [formData, isEditMode, employeeId, validateForm]);

  return {
    // State
    loading,
    saving,
    formData,
    setFormData,
    isEditMode,
    
    // Rate/Salary handlers
    hourlyRateInput,
    setHourlyRateInput,
    hourlyRateConfirmed,
    monthlySalaryInput,
    setMonthlySalaryInput,
    monthlySalaryConfirmed,
    
    // Handlers
    handleHourlyRateConfirm,
    handleMonthlySalaryConfirm,
    resetHourlyRate,
    resetMonthlySalary,
    handleEmploymentTypeChange,
    
    // Main actions
    saveEmployee,
    validateForm,
  };
}