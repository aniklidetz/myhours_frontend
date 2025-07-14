// CACHE BUSTER: Updated at 2025-01-11T16:45:00Z - Force reload with overtime breakdown
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    Alert,
    ScrollView
} from 'react-native';
import { useUser, ROLES } from '../src/contexts/UserContext';
import useColors from '../hooks/useColors';
import HeaderBackButton from '../src/components/HeaderBackButton';
import ApiService from '../src/api/apiService';
import { API_ENDPOINTS, API_URL, APP_CONFIG } from '../src/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeLog, safeLogPayroll, safeLogApiResponse, safeLogEmployee, safeLogError } from '../src/utils/safeLogging';

export default function PayrollScreen() {
    const [payrollData, setPayrollData] = useState([]);
    const [currentSalaryData, setCurrentSalaryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState(null); // null = current month
    const [employees, setEmployees] = useState([]);
    const { user, hasAccess } = useUser();
    const { palette, isDark } = useColors();
    const canViewAllEmployees = hasAccess(ROLES.ACCOUNTANT);
    const canExportAndConfirm = hasAccess(ROLES.ACCOUNTANT);
    
    // Debug режим только для development и когда явно не отключен
    const isDebugMode = __DEV__ && !process.env.DISABLE_PAYROLL_DEBUG;

    // Generate available periods (current + last 6 months)
    const getAvailablePeriods = () => {
        const periods = [];
        const now = new Date();
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            periods.push({
                key: i === 0 ? null : periodKey, // null for current month
                label: i === 0 ? `${monthName} (Current)` : monthName,
                date: date
            });
        }
        
        return periods;
    };

    const availablePeriods = getAvailablePeriods();

    useEffect(() => {
        if (canViewAllEmployees) {
            fetchEmployees();
        }
        
        const debounceTimer = setTimeout(() => {
            fetchPayrollData();
            fetchCurrentSalaryData();
        }, 300);
        
        return () => clearTimeout(debounceTimer);
    }, [selectedEmployee, selectedPeriod]);

    const fetchPayrollData = async () => {
        try {
            setLoading(true);
            
            if (isDebugMode) {
                safeLog('🔍 Fetching payroll data...', { 
                    selectedEmployee: selectedEmployee ? safeLogEmployee(selectedEmployee, 'payroll_fetch') : null,
                    selectedPeriod 
                });
            }
            
            const token = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
            if (!token) {
                console.warn('⚠️ No auth token found');
                throw new Error('No authentication token');
            }
            
            // Use ApiService for consistent API calls
            let earningsData = [];
            let salariesData = [];
            
            // Prepare API parameters with period
            const getApiParams = (employeeId = null) => {
                const params = {};
                if (employeeId) params.employee_id = employeeId;
                
                // Add period parameters if not current month
                if (selectedPeriod) {
                    const [year, month] = selectedPeriod.split('-');
                    params.year = year;
                    params.month = month;
                }
                
                return params;
            };

            console.log('🔍 Payroll fetch conditions:', {
                selectedEmployee: !!selectedEmployee,
                canViewAllEmployees,
                userRole: user?.role,
                userId: user?.id
            });

            if (selectedEmployee) {
                console.log('📊 Branch: Specific employee selected');
                // Specific employee selected - use enhanced API
                const apiParams = getApiParams(selectedEmployee.id);
                const salaryParams = { employee: selectedEmployee.id };
                
                const [earnings, salaries] = await Promise.all([
                    ApiService.payroll.getEarnings(apiParams),
                    ApiService.payroll.getSalaries(salaryParams)
                ]);
                
                earningsData = earnings;
                salariesData = salaries.results || salaries || [];
                
            } else if (canViewAllEmployees) {
                console.log('📊 Branch: Admin viewing all employees');
                // "All Employees" mode - fetch data for each employee with enhanced API
                if (isDebugMode) {
                    safeLog('🌍 Fetching enhanced data for all employees');
                }
                
                // First get all salaries to know which employees to fetch
                const salariesResponse = await ApiService.payroll.getSalaries();
                salariesData = salariesResponse.results || salariesResponse || [];
                if (isDebugMode) {
                    safeLog('📊 Found salaries for employees:', { 
                        employee_count: salariesData.length,
                        has_data: salariesData.length > 0
                    });
                }
                
                // Fetch enhanced earnings for each employee with period (handle errors individually)
                const earningsPromises = salariesData.map(async (salary) => {
                    try {
                        // FIXED: salary.employee is an object, we need the ID
                        const employeeId = salary.employee?.id || salary.employee;
                        const params = getApiParams(employeeId);
                        if (isDebugMode) {
                            safeLog(`🔍 Fetching earnings for employee`, { 
                                employee_id: employeeId,
                                employee_name: salary.employee?.name,
                                has_params: Object.keys(params).length > 0,
                                params_debug: params
                            });
                        }
                        const data = await ApiService.payroll.getEarnings(params);
                        return data;
                    } catch (error) {
                        const employeeId = salary.employee?.id || salary.employee;
                        safeLogError(`❌ Failed to fetch earnings for employee`, {
                            employee_id: employeeId,
                            employee_name: salary.employee?.name,
                            error
                        });
                        // Return null for failed requests instead of throwing
                        return null;
                    }
                });
                
                earningsData = await Promise.all(earningsPromises);
                
                // Filter out failed requests and log results
                const successfulEarnings = earningsData.filter(data => data !== null);
                const failedCount = earningsData.length - successfulEarnings.length;
                
                if (failedCount > 0) {
                    safeLog(`⚠️ Some employees failed to load payroll data`, {
                        failed_count: failedCount,
                        total_count: earningsData.length,
                        success_rate: `${Math.round((successfulEarnings.length / earningsData.length) * 100)}%`
                    });
                }
                
                earningsData = successfulEarnings;
                
            } else {
                console.log('📊 Branch: Regular employee viewing own data', { userId: user?.id });
                // Regular employee viewing their own data - let backend determine user from token
                const apiParams = getApiParams(); // Don't pass employee_id, let backend use token
                const salaryParams = {}; // Don't specify employee, let backend use current user
                
                console.log('📊 Employee API params (no employee_id for security):', { apiParams, salaryParams });
                
                const [earnings, salaries] = await Promise.all([
                    ApiService.payroll.getEarnings(apiParams),
                    ApiService.payroll.getSalaries(salaryParams)
                ]);
                
                earningsData = earnings;
                salariesData = salaries.results || salaries || [];
                
                console.log('📊 Employee data received:', {
                    earningsCount: Array.isArray(earningsData) ? earningsData.length : 'not array',
                    salariesCount: salariesData.length
                });
            }
            
            if (isDebugMode) {
                safeLog('📊 API responses received:', {
                    earnings: safeLogApiResponse(earningsData, 'earnings'),
                    salaries: safeLogApiResponse(salariesData, 'salaries')
                });
            }
            
            
            // Transform earnings data to flat array format for cards
            const apiData = [];
            if (Array.isArray(earningsData)) {
                // In "All Employees" mode, earningsData is an array of earnings objects
                earningsData.forEach((earnings) => {
                    if (earnings) {
                        apiData.push(earnings);
                    }
                });
            } else if (earningsData) {
                // Single employee mode
                apiData.push(earningsData);
            }
            
            // Transform API data to match UI format (combining earnings + salary data)
            const transformedData = Array.isArray(apiData) ? apiData.map(earnings => {
                // Determine the period label based on selected period
                const periodDate = selectedPeriod ? 
                    new Date(selectedPeriod + '-01') : 
                    new Date();
                const periodLabel = periodDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                const isCurrentMonth = !selectedPeriod;
                
                const safeParse = (value, fallback = 0) => {
                    const parsed = parseFloat(value);
                    return isNaN(parsed) ? fallback : parsed;
                };
                
                // Extract employee data from earnings API
                const employeeData = earnings.employee || {};
                const employeeId = employeeData.id || selectedEmployee?.id || user?.id;
                
                // Extract employee info
                const employeeName = employeeData.name || selectedEmployee?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Unknown Employee';
                const employeeEmail = employeeData.email || selectedEmployee?.email || user?.email || 'unknown@example.com';
                
                // Find matching salary data for base salary (fallback only)
                const salaryInfo = salariesData.find(s => s.employee === employeeId) || {};
                if (isDebugMode) {
                    safeLog('🔍 Found salary info for employee:', { 
                        employee_hash: employeeId ? `emp_${employeeId}` : 'unknown',
                        has_salary_info: Object.keys(salaryInfo).length > 0
                    });
                }
                
                // Use enhanced earnings API data directly (more accurate)
                const baseSalary = safeParse(earnings.base_salary || earnings.hourly_rate || salaryInfo.base_salary || 0);
                const hoursWorked = safeParse(earnings.total_hours || earnings.regular_hours || 0);
                const overtime = safeParse(earnings.overtime_hours || 0);
                // Calculate regular pay amount for display
                const calculationType = earnings.calculation_type || 'unknown';
                const regularPayAmount = calculationType === 'hourly' ? 
                    safeParse(earnings.regular_hours || 0) * safeParse(earnings.hourly_rate || 0) :
                    safeParse(earnings.base_salary || 0);
                
                // Extract enhanced breakdown data from nested structure
                const payBreakdown = earnings.pay_breakdown || {};
                const overtimePayData = payBreakdown.overtime_pay || {};
                const specialDayPayData = payBreakdown.special_day_pay || {};
                const hoursBreakdown = earnings.hours_breakdown || {};
                const specialHoursData = hoursBreakdown.special_days || {};
                
                // Calculate overtime pay from nested breakdown
                const overtimePay = safeParse(
                    (overtimePayData.first_2h || 0) + 
                    (overtimePayData.additional || 0) + 
                    (overtimePayData.holiday_overtime || 0) + 
                    (overtimePayData.sabbath_overtime || 0)
                );
                
                // Extract sabbath and holiday pay
                const sabbathPay = safeParse(specialDayPayData.sabbath_base || 0);
                const holidayPay = safeParse(specialDayPayData.holiday_base || 0);
                
                // Calculate total bonuses
                const bonuses = safeParse(earnings.bonus || (overtimePay + sabbathPay + holidayPay));
                    
                const totalPayout = safeParse(
                    earnings.summary?.total_gross_pay || 
                    earnings.total_salary || 
                    earnings.total_earnings || 
                    0
                );
                
                // Extract compensatory days
                const compensatoryDays = earnings.compensatory_days?.earned_this_period || 0;
                
                // Calculate worked days from enhanced earnings API data
                const workedDaysFromData = earnings.worked_days || 
                                        earnings.summary?.worked_days || 
                                        earnings.attendance?.days_worked || 
                                        (earnings.daily_calculations ? earnings.daily_calculations.length : 0) ||
                                        0;
                
                if (isDebugMode) {
                    safeLog('🔍 Enhanced payroll earnings processing:', {
                        employee_hash: employeeData.id ? `emp_${employeeData.id}` : 'unknown',
                        calculation_type: calculationType,
                        has_overtime: overtime > 0,
                        has_enhanced_breakdown: !!earnings.enhanced_breakdown,
                        has_detailed_breakdown: !!earnings.detailed_breakdown,
                        data_quality: {
                            has_regular_hours: !!(earnings.regular_hours),
                            has_work_sessions: !!(earnings.work_sessions_count),
                            has_pay_breakdown: !!payBreakdown && Object.keys(payBreakdown).length > 0
                        }
                    });
                }
                
                const result = {
                    id: earnings.id || `earnings-${employeeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    period: isCurrentMonth ? `${periodLabel} (Current)` : periodLabel,
                    employee: {
                        id: employeeId,
                        name: employeeName,
                        email: employeeEmail
                    },
                    baseSalary,
                    hoursWorked,
                    overtime,
                    bonuses,
                    totalPayout,
                    status: isCurrentMonth ? 'In Progress' : 'Completed', // Historical periods are completed
                    
                    // Enhanced breakdown data with proper extraction
                    enhancedBreakdown: earnings,
                    overtimePay: Number(overtimePay) || 0,
                    sabbathPay: Number(sabbathPay) || 0,
                    holidayPay: Number(holidayPay) || 0,
                    compensatoryDays: Number(compensatoryDays) || 0,
                    
                    // Additional fields for UI display
                    workedDays: workedDaysFromData || Math.max(1, Math.round(hoursWorked / 8.5)),
                    workSessions: earnings.enhanced_breakdown?.work_sessions || earnings.work_sessions_count || workedDaysFromData || Math.max(1, Math.round(hoursWorked / 8.5)),
                    regularPayAmount: regularPayAmount,
                    hourlyRate: earnings.hourly_rate || earnings.enhanced_breakdown?.rates?.base_hourly || 0,
                    
                    // Map API fields to UI expected fields for consistent access
                    regularHours: earnings.regular_hours || 0,
                    overtimeHours: earnings.overtime_hours || 0,
                    holidayHours: earnings.holiday_hours || 0,
                    sabbathHours: earnings.shabbat_hours || 0,
                    totalWorkingDays: earnings.total_working_days || 0,
                    baseHourlyRate: earnings.hourly_rate || 0
                };
                
                if (isDebugMode) {
                    safeLog('🔧 Payroll data transformation completed:', {
                        employee_hash: employeeData.id ? `emp_${employeeData.id}` : 'unknown',
                        transformation_success: true,
                        calculation_type: calculationType,
                        has_required_fields: !!(hoursWorked && totalPayout),
                        hours_range: hoursWorked > 0 ? (hoursWorked < 50 ? 'low' : hoursWorked < 200 ? 'medium' : 'high') : 'none'
                    });
                }
                
                return result;
            }) : [];
            
            // Apply role-based filtering
            let filteredData = transformedData;
            
            if (!canViewAllEmployees) {
                // Employee: only their own data
                filteredData = transformedData.filter(item => {
                    const isOwnData = item.employee.id === user.id || 
                                      item.employee.email === user.email ||
                                      item.employee.name.includes(user.first_name || '') ||
                                      item.employee.name.includes(user.last_name || '');
                    return isOwnData;
                });
                if (isDebugMode) {
                    safeLog('💰 Filtering payroll for user:', {
                        user_hash: user.id ? `usr_${user.id}` : 'unknown',
                        filtered_records: filteredData.length,
                        total_records: transformedData.length
                    });
                }
            } else if (selectedEmployee) {
                // Admin/accountant viewing specific employee
                filteredData = transformedData.filter(item => item.employee.id === selectedEmployee.id);
            }
            
            
            setPayrollData(filteredData);
            
        } catch (error) {
            safeLogError('Error fetching payroll data:', error);
            if (isDebugMode) {
                safeLogError('Error details:', {
                    message: error.message,
                    status: error.response?.status,
                    has_response_data: !!error.response?.data
                });
            }
            
            // Show user-friendly error message based on enhanced backend error responses
            if (error.response?.status === 500) {
                const errorData = error.response?.data;
                let title = 'Configuration Error';
                let message = 'Unable to load payroll data. This may be due to incomplete salary configuration.';
                
                // Check for specific error types from enhanced backend validation
                if (errorData?.error) {
                    if (errorData.error.includes('Hourly rate not configured')) {
                        title = 'Hourly Rate Missing';
                        message = 'Employee hourly rate is not configured. Please set the hourly rate in salary settings.';
                    } else if (errorData.error.includes('Base salary not configured')) {
                        title = 'Base Salary Missing';
                        message = 'Employee base salary is not configured. Please set the base salary in salary settings.';
                    } else if (errorData.error.includes('Project dates not configured')) {
                        title = 'Project Dates Missing';
                        message = 'Project start and end dates are required for project-based employees.';
                    } else if (errorData.error.includes('calculation type not configured')) {
                        title = 'Calculation Type Missing';
                        message = 'Employee salary calculation type is not set. Please configure in admin panel.';
                    } else if (errorData.error.includes('No salary configuration')) {
                        title = 'Salary Configuration Missing';
                        message = 'No salary configuration found for this employee. Please create salary settings in admin panel.';
                    } else if (errorData.error.includes('calculation error') || errorData.error.includes('mathematical error')) {
                        title = 'Calculation Error';
                        message = 'Error in salary calculation. Please contact administrator to resolve this issue.';
                    }
                }
                
                // Add details if available for debugging
                if (errorData?.details && errorData.details.suggestion) {
                    message += `\n\nSuggestion: ${errorData.details.suggestion}`;
                }
                
                if (isDebugMode) {
                    safeLogError('🚨 Server error (500):', { 
                        has_error_data: !!errorData,
                        error_type: errorData?.error ? 'configuration' : 'unknown'
                    });
                }
                Alert.alert(title, message, [{ text: 'OK' }]);
                
            } else if (error.response?.status === 404) {
                const errorData = error.response?.data;
                let title = 'No Data Found';
                let message = 'No payroll data found for the selected period.';
                
                if (errorData?.error && errorData.error.includes('No salary configuration')) {
                    title = 'Salary Configuration Missing';
                    message = 'No salary configuration found for this employee. Please create salary settings in admin panel.';
                } else {
                    message = 'No payroll data found for the selected period. Please ensure employees have completed work sessions.';
                }
                
                if (isDebugMode) {
                    safeLogError('🚨 Data not found (404):', {
                        has_error_data: !!errorData,
                        error_type: errorData?.error ? 'configuration' : 'missing_data'
                    });
                }
                Alert.alert(title, message, [{ text: 'OK' }]);
                
            } else if (error.response?.status === 400) {
                const errorData = error.response?.data;
                let title = 'Invalid Configuration';
                let message = 'Invalid salary configuration detected.';
                
                if (errorData?.error) {
                    message = errorData.error;
                }
                
                if (errorData?.details && errorData.details.suggestion) {
                    message += `\n\nSuggestion: ${errorData.details.suggestion}`;
                }
                
                if (isDebugMode) {
                    safeLogError('🚨 Invalid configuration (400):', {
                        has_error_data: !!errorData,
                        has_suggestion: !!(errorData?.details?.suggestion)
                    });
                }
                Alert.alert(title, message, [{ text: 'OK' }]);
                
            } else {
                safeLogError('🚨 Network or other error', { error_type: 'network_or_unknown' });
                Alert.alert(
                    'Network Error', 
                    'Unable to load payroll data. Please check your connection and try again.',
                    [{ text: 'OK' }]
                );
            }
            
            // Use empty array instead of mock data
            setPayrollData([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        if (!canViewAllEmployees) return;
        
        try {
            if (isDebugMode) {
                safeLog('🔍 Fetching employees list for payroll...');
            }
            const response = await ApiService.employees.getAll();
            
            if (response && response.results) {
                const employeeList = response.results.map(emp => ({
                    id: emp.id,
                    name: `${emp.first_name} ${emp.last_name}`,
                    email: emp.email
                }));
                setEmployees(employeeList);
                if (isDebugMode) {
                    safeLog('✅ Fetched employees for payroll:', { 
                        employee_count: employeeList.length,
                        has_data: employeeList.length > 0
                    });
                }
            }
        } catch (error) {
            safeLogError('❌ Error fetching employees for payroll:', error);
            setEmployees([{
                id: user.id,
                name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email,
                email: user.email
            }]);
        }
    };

    const fetchCurrentSalaryData = async () => {
        try {
            // Determine period for current salary display
            const periodDate = selectedPeriod ? 
                new Date(selectedPeriod + '-01') : 
                new Date();
            const periodLabel = periodDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const isCurrentMonth = !selectedPeriod;
            
            const currentDay = isCurrentMonth ? new Date().getDate() : new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0).getDate();
            const daysInMonth = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0).getDate();
            
            // Try to fetch real current earnings from API
            try {
                let data;
                
                // Prepare API parameters with period for current salary
                const getApiParams = (employeeId = null) => {
                    const params = {};
                    if (employeeId) params.employee_id = employeeId;
                    
                    if (selectedPeriod) {
                        const [year, month] = selectedPeriod.split('-');
                        params.year = year;
                        params.month = month;
                    }
                    
                    return params;
                };

                if (selectedEmployee) {
                    // Specific employee selected - use enhanced API
                    data = await ApiService.payroll.getEarnings(getApiParams(selectedEmployee.id));
                } else if (canViewAllEmployees) {
                    // "All Employees" mode - fetch aggregated data with enhanced API
                    console.log('🌍 Fetching enhanced earnings for all employees');
                    data = await ApiService.payroll.getEarnings(getApiParams());
                } else {
                    // Regular employee viewing their own data - use enhanced API without employee_id
                    data = await ApiService.payroll.getEarnings(getApiParams());
                }
                
                if (data) {
                    if (isDebugMode) {
                        safeLog('Payroll API response received:', safeLogApiResponse(data, 'current_salary'));
                    }
                    
                    // Handle both single employee and multiple employees data
                    const isArrayData = Array.isArray(data);
                    const isAllEmployeesMode = !selectedEmployee && canViewAllEmployees;
                    
                    if (isAllEmployeesMode && isArrayData && data.length > 0) {
                        // Aggregate data for "All Employees" mode
                        const aggregatedData = data.reduce((acc, employee) => ({
                            totalSalary: acc.totalSalary + (employee.total_salary || employee.total_earnings || 0),
                            totalHours: acc.totalHours + (employee.total_hours || employee.hours_worked || 0),
                            totalDays: acc.totalDays + (employee.worked_days || 0)
                        }), { totalSalary: 0, totalHours: 0, totalDays: 0 });
                        
                        setCurrentSalaryData({
                            period: isCurrentMonth ? `${periodLabel} (Current)` : periodLabel,
                            employee: {
                                id: 'all',
                                name: `All Employees (${data.length})`
                            },
                            estimatedSalary: Math.round(aggregatedData.totalSalary),
                            hoursWorkedThisMonth: Math.round(aggregatedData.totalHours),
                            daysWorked: Math.round(aggregatedData.totalDays / data.length), // Average days worked
                            daysInMonth: daysInMonth,
                            status: 'In Progress'
                        });
                        return;
                    } else if (!isArrayData && data && (data.total_earnings !== undefined || data.total_salary !== undefined)) {
                        // Single employee data
                        setCurrentSalaryData({
                            period: isCurrentMonth ? `${periodLabel} (Current)` : periodLabel,
                            employee: {
                                id: data.employee?.id || (selectedEmployee?.id || user?.id),
                                name: data.employee?.name || selectedEmployee?.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email
                            },
                            estimatedSalary: Math.round(data.total_earnings || data.total_salary || 0),
                            hoursWorkedThisMonth: Math.round(
                                data.total_hours > 0 ? data.total_hours : 
                                (data.regular_hours || 0) + (data.overtime_hours || 0) + (data.holiday_hours || 0) + (data.shabbat_hours || 0) ||
                                data.hours_worked || 0
                            ),
                            daysWorked: data.worked_days || data.breakdown?.days_worked || currentDay,
                            daysInMonth: daysInMonth,
                            status: 'In Progress'
                        });
                        return;
                    }
                }
            } catch (apiError) {
                if (isDebugMode) {
                    safeLogError('Could not fetch current earnings, using estimates:', apiError);
                }
            }
            
            // Fallback - hide current salary display if no real data is available
            if (isDebugMode) {
                safeLog('⚠️ No current earnings data available - hiding current month progress section');
            }
            setCurrentSalaryData(null);
            
        } catch (error) {
            safeLogError('Error fetching current salary data:', error);
        }
    };

    const handleExport = async () => {
        try {
            const exportData = payrollData.map(item => ({
                Period: item.period,
                Employee: item.employee.name,
                'Base Salary': `${item.baseSalary} ₪`,
                'Hours Worked': item.hoursWorked,
                'Overtime Hours': item.overtime,
                'Bonuses': `${item.bonuses} ₪`,
                'Total Payout': `${item.totalPayout} ₪`,
                Status: item.status
            }));
            
            const headers = Object.keys(exportData[0] || {}).join(',');
            const rows = exportData.map(item => Object.values(item).join(',')).join('\n');
            const csv = `${headers}\n${rows}`;
            
            Alert.alert(
                'Export Payroll Report',
                'Choose export format:',
                [
                    {
                        text: 'CSV',
                        onPress: () => {
                            if (isDebugMode) {
                                safeLog('CSV Export initiated:', { 
                                    export_type: 'csv',
                                    record_count: exportData.length
                                });
                            }
                            Alert.alert('Success', 'Payroll report exported as CSV');
                        }
                    },
                    {
                        text: 'Email',
                        onPress: () => {
                            Alert.alert('Success', 'Payroll report sent via email');
                        }
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    }
                ]
            );
        } catch (error) {
            safeLogError('Export error:', error);
            Alert.alert('Error', 'Failed to export payroll report');
        }
    };

    const handleConfirm = (id) => {
        Alert.alert(
            'Confirm Calculation', 
            'Are you sure you want to confirm this payroll calculation?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Confirm',
                    onPress: () => {
                        setPayrollData(payrollData.map(item => 
                            item.id === id ? { ...item, status: 'Confirmed' } : item
                        ));
                        Alert.alert('Success', 'Payroll calculation confirmed successfully');
                    }
                }
            ]
        );
    };

    const stylesWithDarkMode = styles(palette, isDark);

    const renderPayrollItem = ({ item }) => {
        // Extract additional data from enhanced breakdown and direct API data
        const enhanced = item.enhancedBreakdown || {};
        const calculationType = enhanced.calculation_type || 'unknown';
        
        // Use the mapped data from the API response first, then fallback to enhanced breakdown
        const workedDays = item.workedDays || enhanced.worked_days || enhanced.summary?.worked_days || enhanced.attendance?.days_worked || 0;
        const totalWorkingDays = item.totalWorkingDays || enhanced.attendance?.working_days_in_period || enhanced.total_working_days || 
                                 (calculationType === 'monthly' ? 22 : 0); // Default to 22 working days for monthly employees
        
        // Calculate correct hours breakdown
        const totalHours = item.hoursWorked || enhanced.total_hours || 0;
        const overtimeHours = item.overtimeHours || enhanced.overtime_hours || 0;
        const holidayHours = item.holidayHours || enhanced.holiday_hours || 0;
        const sabbathHours = item.sabbathHours || enhanced.shabbat_hours || 0;
        
        // Get regular hours from API response (more accurate than calculation)
        const regularHours = enhanced.regular_hours || Math.max(0, totalHours - overtimeHours - holidayHours - sabbathHours);
        
        // Calculate regular pay for hourly employees
        const hourlyRate = enhanced.hourly_rate || enhanced.rates?.base_hourly || item.baseHourlyRate || 0;
        const regularPay = enhanced.enhanced_breakdown?.regular_pay || (regularHours * hourlyRate);
        
        // Safe debug logging for UI values
        if (isDebugMode) {
            safeLog('🎨 UI RENDER VALUES - TIMESTAMP:', new Date().toISOString(), {
                employee_hash: item.employee.id ? `emp_${item.employee.id}` : 'unknown',
                calculation_type: calculationType,
                has_enhanced_data: !!enhanced,
                render_success: true
            });
        }
        
        // Safe debugging for specific employee (if needed)
        if (isDebugMode && item.employee.id === 33) { // Itai's ID
            safeLog('🚨 Employee debug data:', {
                employee_hash: 'emp_33',
                has_work_sessions: item.workSessions > 0,
                has_worked_days: workedDays > 0,
                has_hours: item.hoursWorked > 0,
                data_consistency: item.workSessions === workedDays
            });
        }
        
        return (
            <View style={stylesWithDarkMode.card}>
                <View style={stylesWithDarkMode.cardHeader}>
                    <Text style={stylesWithDarkMode.periodText}>{item.period}</Text>
                    {canViewAllEmployees && <Text style={stylesWithDarkMode.employeeText}>{item.employee.name}</Text>}
                    <View style={[stylesWithDarkMode.statusBadge,
                        item.status === 'Confirmed' ? stylesWithDarkMode.statusConfirmed :
                        item.status === 'Pending' ? stylesWithDarkMode.statusPending :
                        stylesWithDarkMode.statusDraft]}>
                        <Text style={stylesWithDarkMode.statusText}>{item.status}</Text>
                    </View>
                </View>

                {/* Employee Type and Basic Info */}
                <View style={stylesWithDarkMode.typeRow}>
                    <Text style={stylesWithDarkMode.typeLabel}>
                        {calculationType === 'monthly' ? '📅 Monthly Employee' : 
                         calculationType === 'hourly' ? '⏰ Hourly Employee' : '👤 Employee'}
                    </Text>
                </View>

                {/* Primary Info Row - Enhanced for different employee types */}
                <View style={stylesWithDarkMode.detailRow}>
                    <View style={stylesWithDarkMode.detailItem}>
                        <Text style={stylesWithDarkMode.detailLabel}>
                            {calculationType === 'monthly' ? 'Monthly Base:' : 'Regular Pay:'}
                        </Text>
                        <Text style={stylesWithDarkMode.detailValue}>
                            {calculationType === 'monthly' ? 
                                `${item.baseSalary} ₪` : 
                                `${Math.round(regularPay)} ₪`
                            }
                        </Text>
                    </View>
                    <View style={stylesWithDarkMode.detailItem}>
                        <Text style={stylesWithDarkMode.detailLabel}>Total Hours:</Text>
                        <Text style={stylesWithDarkMode.detailValue}>
                            {/* Use the highest available value, prioritizing actual total */}
                            {(totalHours > 0 ? totalHours : 
                              (regularHours + overtimeHours + holidayHours + sabbathHours) || 
                              item.hoursWorked || 0).toFixed(1)}h
                        </Text>
                    </View>
                </View>
                
                {/* Rate Information Row for Hourly Employees */}
                {calculationType === 'hourly' && (item.baseHourlyRate || item.hourlyRate) && (
                    <View style={stylesWithDarkMode.detailRow}>
                        <View style={stylesWithDarkMode.detailItem}>
                            <Text style={stylesWithDarkMode.detailLabel}>Hourly Rate:</Text>
                            <Text style={stylesWithDarkMode.detailValue}>{item.baseHourlyRate || item.hourlyRate} ₪/h</Text>
                        </View>
                        <View style={stylesWithDarkMode.detailItem}>
                            <Text style={stylesWithDarkMode.detailLabel}>Gross Pay:</Text>
                            <Text style={stylesWithDarkMode.detailValue}>
                                {Math.round(item.totalPayout)} ₪
                            </Text>
                        </View>
                    </View>
                )}
                
                {/* Monthly Employee Progress */}
                {calculationType === 'monthly' && (
                    <View style={stylesWithDarkMode.detailRow}>
                        <View style={stylesWithDarkMode.detailItem}>
                            <Text style={stylesWithDarkMode.detailLabel}>Attendance:</Text>
                            <Text style={stylesWithDarkMode.detailValue}>
                                {enhanced.attendance_percentage ? Math.round(enhanced.attendance_percentage) : 
                                 totalWorkingDays > 0 ? Math.round((workedDays / totalWorkingDays) * 100) : 0}%
                            </Text>
                        </View>
                        <View style={stylesWithDarkMode.detailItem}>
                            <Text style={stylesWithDarkMode.detailLabel}>Expected Hours:</Text>
                            <Text style={stylesWithDarkMode.detailValue}>
                                {totalWorkingDays > 0 ? Math.round(totalWorkingDays * 8.4) : 182}h
                            </Text>
                        </View>
                    </View>
                )}

                {/* Work Attendance Row - Different display for hourly vs monthly */}
                <View style={stylesWithDarkMode.detailRow}>
                    <View style={stylesWithDarkMode.detailItem}>
                        <Text style={stylesWithDarkMode.detailLabel}>
                            {calculationType === 'hourly' ? 'Work Sessions:' : 'Days Worked:'}
                        </Text>
                        <Text style={stylesWithDarkMode.detailValue}>
                            {calculationType === 'hourly' ? 
                                (item.workSessions > 0 ? `${item.workSessions} session${item.workSessions > 1 ? 's' : ''}` : 'No work sessions') :
                                `${workedDays} / ${totalWorkingDays}`
                            }
                        </Text>
                    </View>
                    <View style={stylesWithDarkMode.detailItem}>
                        <Text style={stylesWithDarkMode.detailLabel}>
                            {calculationType === 'hourly' ? 'Regular Hours:' : 'Regular Hours:'}
                        </Text>
                        <Text style={stylesWithDarkMode.detailValue}>
                            {`${regularHours.toFixed(1)}h`}
                        </Text>
                    </View>
                </View>

                {/* Additional info row for hourly employees */}
                {calculationType === 'hourly' && (
                    <View style={stylesWithDarkMode.detailRow}>
                        <View style={stylesWithDarkMode.detailItem}>
                            <Text style={stylesWithDarkMode.detailLabel}>Avg. Hours/Day:</Text>
                            <Text style={stylesWithDarkMode.detailValue}>
                                {workedDays > 0 ? `${Math.round((item.hoursWorked / workedDays) * 10) / 10}h` : '0h'}
                            </Text>
                        </View>
                        <View style={stylesWithDarkMode.detailItem}>
                            <Text style={stylesWithDarkMode.detailLabel}>Days Worked:</Text>
                            <Text style={stylesWithDarkMode.detailValue}>
                                {workedDays} days
                            </Text>
                        </View>
                    </View>
                )}

                {/* Overtime and Special Hours */}
                {(overtimeHours > 0 || holidayHours > 0 || sabbathHours > 0) && (
                    <View style={stylesWithDarkMode.detailRow}>
                        {overtimeHours > 0 && (
                            <View style={stylesWithDarkMode.detailItem}>
                                <Text style={stylesWithDarkMode.detailLabel}>⏰ Overtime:</Text>
                                <Text style={stylesWithDarkMode.detailValue}>
                                    {/* Extract precise overtime breakdown from enhanced data */}
                                    {(() => {
                                        // Try multiple paths to find overtime breakdown data
                                        const overtime125Hours = enhanced.detailed_breakdown?.overtime_125_hours || 
                                                               enhanced.enhanced_breakdown?.overtime_breakdown?.overtime_125_hours || 
                                                               enhanced.overtime_breakdown?.overtime_125_hours || 
                                                               enhanced.enhanced_breakdown?.overtime_125_hours || 0;
                                        const overtime150Hours = enhanced.detailed_breakdown?.overtime_150_hours || 
                                                               enhanced.enhanced_breakdown?.overtime_breakdown?.overtime_150_hours || 
                                                               enhanced.overtime_breakdown?.overtime_150_hours || 
                                                               enhanced.enhanced_breakdown?.overtime_150_hours || 0;
                                        
                                        // Israeli labor law: first 2 hours overtime = 125%, rest = 150%
                                        // If no breakdown available, calculate according to law
                                        let display125Hours = overtime125Hours;
                                        let display150Hours = overtime150Hours;
                                        
                                        if (overtime125Hours === 0 && overtime150Hours === 0 && overtimeHours > 0) {
                                            // No detailed breakdown - apply Israeli law
                                            if (overtimeHours <= 2) {
                                                display125Hours = overtimeHours;
                                                display150Hours = 0;
                                            } else {
                                                display125Hours = 2;
                                                display150Hours = overtimeHours - 2;
                                            }
                                        }
                                        
                                        if (isDebugMode) {
                                            safeLog('🔍 Overtime breakdown debug:', {
                                                has_125_hours: overtime125Hours > 0,
                                                has_150_hours: overtime150Hours > 0,
                                                has_detailed_breakdown: !!enhanced.detailed_breakdown,
                                                has_enhanced_breakdown: !!enhanced.enhanced_breakdown,
                                                breakdown_source: 'api_data'
                                            });
                                        }
                                        
                                        if (display125Hours > 0 && display150Hours > 0) {
                                            return `${display125Hours.toFixed(1)}h × 125% + ${display150Hours.toFixed(1)}h × 150%`;
                                        } else if (display125Hours > 0) {
                                            return `${display125Hours.toFixed(1)}h × 125%`;
                                        } else if (display150Hours > 0) {
                                            return `${display150Hours.toFixed(1)}h × 150%`;
                                        } else {
                                            return `${overtimeHours.toFixed(1)}h × 125-150%`;
                                        }
                                    })()}
                                </Text>
                            </View>
                        )}
                        {(holidayHours > 0 || sabbathHours > 0) && (
                            <View style={stylesWithDarkMode.detailItem}>
                                <Text style={stylesWithDarkMode.detailLabel}>🕯️ Sabbath:</Text>
                                <Text style={stylesWithDarkMode.detailValue}>
                                    {sabbathHours > 0 && (
                                        (() => {
                                            // Israeli law: Sabbath shift norm is 7 hours
                                            const sabbathNormal = Math.min(sabbathHours, 7);
                                            const sabbathOvertime = Math.max(0, sabbathHours - 7);
                                            
                                            if (sabbathOvertime > 0) {
                                                return `├── Regular: ${sabbathNormal.toFixed(1)}h × 150%\n└── Overtime: ${sabbathOvertime.toFixed(1)}h × 175%`;
                                            } else {
                                                return `${sabbathNormal.toFixed(1)}h × 150%`;
                                            }
                                        })()
                                    )}
                                    {holidayHours > 0 && `${holidayHours.toFixed(1)}h holidays × 150%`}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Bonuses Row */}
                {item.bonuses > 0 && (
                    <View style={stylesWithDarkMode.detailRow}>
                        <View style={stylesWithDarkMode.detailItem}>
                            <Text style={stylesWithDarkMode.detailLabel}>Premium Pay:</Text>
                            <Text style={stylesWithDarkMode.detailValue}>
                                {(() => {
                                    // Calculate total overtime premium (25% + 50% premiums only, not full pay)
                                    const overtime125Hours = enhanced.enhanced_breakdown?.overtime_breakdown?.overtime_125_hours || 0;
                                    const overtime150Hours = enhanced.enhanced_breakdown?.overtime_breakdown?.overtime_150_hours || 0;
                                    const baseRate = enhanced.enhanced_breakdown?.rates?.base_hourly || 110;
                                    
                                    const overtimePremium125 = overtime125Hours * baseRate * 0.25; // 25% premium only
                                    const overtimePremium150 = overtime150Hours * baseRate * 0.50; // 50% premium only
                                    const overtimePay = overtimePremium125 + overtimePremium150;
                                    
                                    // Calculate sabbath premium (50% + 75% premiums only, not full pay)  
                                    const sabbathRegularHours = enhanced.enhanced_breakdown?.special_days?.sabbath_regular_hours || 0;
                                    const sabbathOvertimeHours = enhanced.enhanced_breakdown?.special_days?.sabbath_overtime_hours || 0;
                                    
                                    const sabbathPremium150 = sabbathRegularHours * baseRate * 0.50; // 50% premium for sabbath regular
                                    const sabbathPremium175 = sabbathOvertimeHours * baseRate * 0.75; // 75% premium for sabbath overtime 
                                    const sabbathPay = sabbathPremium150 + sabbathPremium175;
                                    
                                    const holidayPay = enhanced.enhanced_breakdown?.special_days?.holiday_pay || 0;
                                    
                                    const components = [];
                                    if (overtimePay > 0) components.push(`Overtime: ${Math.round(overtimePay)}₪`);
                                    if (sabbathPay > 0) components.push(`Sabbath: ${Math.round(sabbathPay)}₪`);
                                    if (holidayPay > 0) components.push(`Holiday: ${Math.round(holidayPay)}₪`);
                                    
                                    return components.length > 0 ? components.join(' + ') : `${item.bonuses} ₪`;
                                })()}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Enhanced Breakdown Section */}
                {(Number(item.overtimePay) > 0 || Number(item.sabbathPay) > 0 || Number(item.holidayPay) > 0 || Number(item.compensatoryDays) > 0) && (
                    <View style={stylesWithDarkMode.enhancedSection}>
                        <Text style={stylesWithDarkMode.enhancedTitle}>📊 Payroll Calculation Details</Text>
                        
                        {/* Legal basis note */}
                        <Text style={[stylesWithDarkMode.enhancedLabel, {fontSize: 11, fontStyle: 'italic', marginBottom: 8}]}>
                            📋 Based on Israeli Labor Law (Hours of Work and Rest Law, Articles 2 & 16)
                        </Text>
                        
                        {Number(item.overtimePay) > 0 && (
                            <View>
                                {/* Show precise overtime breakdown if available */}
                                {(() => {
                                    // Try multiple paths to find overtime breakdown data
                                    const overtime125Hours = enhanced.detailed_breakdown?.overtime_125_hours || 
                                                           enhanced.enhanced_breakdown?.overtime_breakdown?.overtime_125_hours || 
                                                           enhanced.overtime_breakdown?.overtime_125_hours || 
                                                           enhanced.enhanced_breakdown?.overtime_125_hours || 0;
                                    const overtime150Hours = enhanced.detailed_breakdown?.overtime_150_hours || 
                                                           enhanced.enhanced_breakdown?.overtime_breakdown?.overtime_150_hours || 
                                                           enhanced.overtime_breakdown?.overtime_150_hours || 
                                                           enhanced.enhanced_breakdown?.overtime_150_hours || 0;
                                    const overtime125Pay = enhanced.detailed_breakdown?.overtime_125_pay || 
                                                         enhanced.enhanced_breakdown?.overtime_breakdown?.overtime_125_pay || 
                                                         enhanced.overtime_breakdown?.overtime_125_pay || 
                                                         enhanced.enhanced_breakdown?.overtime_125_pay || 0;
                                    const overtime150Pay = enhanced.detailed_breakdown?.overtime_150_pay || 
                                                         enhanced.enhanced_breakdown?.overtime_breakdown?.overtime_150_pay || 
                                                         enhanced.overtime_breakdown?.overtime_150_pay || 
                                                         enhanced.enhanced_breakdown?.overtime_150_pay || 0;
                                    
                                    // Calculate premium amounts (not full pay)
                                    const baseRate = enhanced.enhanced_breakdown?.rates?.base_hourly || enhanced.hourly_rate || 110;
                                    let display125Hours = overtime125Hours;
                                    let display150Hours = overtime150Hours;
                                    let display125Pay = overtime125Hours * baseRate * 0.25; // 25% premium only
                                    let display150Pay = overtime150Hours * baseRate * 0.50; // 50% premium only
                                    
                                    if (overtime125Hours === 0 && overtime150Hours === 0 && overtimeHours > 0) {
                                        const hourlyRate = enhanced.hourly_rate || enhanced.rates?.base_hourly || 110;
                                        if (overtimeHours <= 2) {
                                            display125Hours = overtimeHours;
                                            display125Pay = overtimeHours * hourlyRate * 0.25; // 25% premium only
                                        } else {
                                            display125Hours = 2;
                                            display150Hours = overtimeHours - 2;
                                            display125Pay = 2 * hourlyRate * 0.25; // 25% premium only
                                            display150Pay = (overtimeHours - 2) * hourlyRate * 0.50; // 50% premium only
                                        }
                                    }
                                    
                                    if (display125Hours > 0 || display150Hours > 0) {
                                        return (
                                            <View>
                                                {display125Hours > 0 && (
                                                    <View style={stylesWithDarkMode.enhancedRow}>
                                                        <Text style={stylesWithDarkMode.enhancedLabel}>First 2h overtime (+25%):</Text>
                                                        <Text style={stylesWithDarkMode.enhancedValue}>
                                                            {display125Hours.toFixed(1)}h premium = {Math.round(display125Pay).toLocaleString()} ₪
                                                        </Text>
                                                    </View>
                                                )}
                                                {display150Hours > 0 && (
                                                    <View style={stylesWithDarkMode.enhancedRow}>
                                                        <Text style={stylesWithDarkMode.enhancedLabel}>Additional overtime (+50%):</Text>
                                                        <Text style={stylesWithDarkMode.enhancedValue}>
                                                            {display150Hours.toFixed(1)}h premium = {Math.round(display150Pay).toLocaleString()} ₪
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    } else {
                                        return (
                                            <View style={stylesWithDarkMode.enhancedRow}>
                                                <Text style={stylesWithDarkMode.enhancedLabel}>Overtime Pay:</Text>
                                                <Text style={stylesWithDarkMode.enhancedValue}>{Number(item.overtimePay).toLocaleString()} ₪</Text>
                                            </View>
                                        );
                                    }
                                })()}
                            </View>
                        )}
                        
                        {Number(item.sabbathPay) > 0 && (
                            <View style={stylesWithDarkMode.enhancedRow}>
                                <Text style={stylesWithDarkMode.enhancedLabel}>Sabbath Work:</Text>
                                <Text style={stylesWithDarkMode.enhancedValue}>{Number(item.sabbathPay).toLocaleString()} ₪</Text>
                            </View>
                        )}
                        
                        {Number(item.holidayPay) > 0 && (
                            <View style={stylesWithDarkMode.enhancedRow}>
                                <Text style={stylesWithDarkMode.enhancedLabel}>Holiday Work:</Text>
                                <Text style={stylesWithDarkMode.enhancedValue}>{Number(item.holidayPay).toLocaleString()} ₪</Text>
                            </View>
                        )}
                        
                        {Number(item.compensatoryDays) > 0 && (
                            <View style={stylesWithDarkMode.enhancedRow}>
                                <Text style={stylesWithDarkMode.enhancedLabel}>Compensatory Days:</Text>
                                <Text style={stylesWithDarkMode.enhancedValue}>{Number(item.compensatoryDays)}</Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={stylesWithDarkMode.divider} />

                <View style={stylesWithDarkMode.summaryRow}>
                    <View style={stylesWithDarkMode.summaryColumn}>
                        <Text style={stylesWithDarkMode.totalLabel}>
                            {calculationType === 'hourly' ? 'Total Earnings:' : 'Total Salary:'}
                        </Text>
                        <Text style={stylesWithDarkMode.totalValue}>{item.totalPayout} ₪</Text>
                        {calculationType === 'hourly' && item.hoursWorked > 0 && (
                            <Text style={stylesWithDarkMode.rateDisplay}>
                                ({Math.round((item.totalPayout / item.hoursWorked) * 100) / 100} ₪/h avg)
                            </Text>
                        )}
                    </View>
                </View>

                {canExportAndConfirm && item.status !== 'Confirmed' && (
                    <TouchableOpacity style={stylesWithDarkMode.confirmButton} onPress={() => handleConfirm(item.id)}>
                        <Text style={stylesWithDarkMode.confirmButtonText}>Confirm Calculation</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderEmptyComponent = () => (
        <View style={stylesWithDarkMode.emptyContainer}>
            <Text style={stylesWithDarkMode.emptyTitle}>📊 No Payroll Data</Text>
            <Text style={stylesWithDarkMode.emptyText}>
                {canViewAllEmployees 
                    ? "No payroll records found. Make sure employees have salary configuration and work logs."
                    : "No payroll records found for your account. Please check that you have:\n• Salary configuration set up\n• Completed work sessions\n• Proper employment type assigned"}
            </Text>
            {selectedPeriod && (
                <Text style={stylesWithDarkMode.emptySubtext}>
                    Showing data for: {availablePeriods.find(p => p.key === selectedPeriod)?.label || selectedPeriod}
                </Text>
            )}
        </View>
    );

    return (
        <SafeAreaView style={stylesWithDarkMode.container}>
            <HeaderBackButton destination="/employees" />
            <View style={stylesWithDarkMode.header}>
                <View style={stylesWithDarkMode.headerRow}>
                    <Text style={stylesWithDarkMode.title}>Payroll Calculation</Text>
                    {canExportAndConfirm && payrollData.length > 0 && (
                        <TouchableOpacity style={stylesWithDarkMode.exportButton} onPress={handleExport}>
                            <Text style={stylesWithDarkMode.exportButtonText}>Export</Text>
                        </TouchableOpacity>
                    )}
                </View>
                
                {/* Period Selector */}
                <View style={stylesWithDarkMode.periodSelector}>
                    <Text style={stylesWithDarkMode.selectorLabel}>Period:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={stylesWithDarkMode.selectorScroll}>
                        {availablePeriods.map(period => (
                            <TouchableOpacity
                                key={period.key || 'current'}
                                style={[
                                    stylesWithDarkMode.selectorButton,
                                    selectedPeriod === period.key && stylesWithDarkMode.selectorButtonActive
                                ]}
                                onPress={() => setSelectedPeriod(period.key)}
                            >
                                <Text style={[
                                    stylesWithDarkMode.selectorButtonText,
                                    selectedPeriod === period.key && stylesWithDarkMode.selectorButtonTextActive
                                ]}>
                                    {period.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {canViewAllEmployees && employees.length > 0 && (
                    <View style={stylesWithDarkMode.employeeSelector}>
                        <Text style={stylesWithDarkMode.selectorLabel}>View data for:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={stylesWithDarkMode.selectorScroll}>
                            <TouchableOpacity
                                style={[
                                    stylesWithDarkMode.selectorButton,
                                    !selectedEmployee && stylesWithDarkMode.selectorButtonActive
                                ]}
                                onPress={() => setSelectedEmployee(null)}
                            >
                                <Text style={[
                                    stylesWithDarkMode.selectorButtonText,
                                    !selectedEmployee && stylesWithDarkMode.selectorButtonTextActive
                                ]}>
                                    All Employees
                                </Text>
                            </TouchableOpacity>
                            {employees.map(emp => (
                                <TouchableOpacity
                                    key={emp.id}
                                    style={[
                                        stylesWithDarkMode.selectorButton,
                                        selectedEmployee?.id === emp.id && stylesWithDarkMode.selectorButtonActive
                                    ]}
                                    onPress={() => setSelectedEmployee(emp)}
                                >
                                    <Text style={[
                                        stylesWithDarkMode.selectorButtonText,
                                        selectedEmployee?.id === emp.id && stylesWithDarkMode.selectorButtonTextActive
                                    ]}>
                                        {emp.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={palette.primary} style={stylesWithDarkMode.loader} />
            ) : (
                <>
                    {/* Current Month Accumulated Salary */}
                    {currentSalaryData && (
                        <View style={stylesWithDarkMode.currentSalaryCard}>
                            <Text style={stylesWithDarkMode.currentSalaryTitle}>
                                💰 Current Month Progress
                            </Text>
                            <View style={stylesWithDarkMode.currentSalaryInfo}>
                                <Text style={stylesWithDarkMode.currentSalaryPeriod}>
                                    {currentSalaryData.period}
                                </Text>
                                <Text style={stylesWithDarkMode.currentSalaryAmount}>
                                    ₪{(currentSalaryData.estimatedSalary || 0).toLocaleString()}
                                </Text>
                                <Text style={stylesWithDarkMode.currentSalarySubtext}>
                                    Estimated based on {currentSalaryData.daysWorked}/{currentSalaryData.daysInMonth} days worked
                                </Text>
                                <Text style={stylesWithDarkMode.currentSalaryHours}>
                                    Hours: {currentSalaryData.hoursWorkedThisMonth}h this month
                                </Text>
                            </View>
                        </View>
                    )}
                    
                    {/* Historical Payroll Data */}
                    <FlatList
                        data={payrollData}
                        renderItem={renderPayrollItem}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={stylesWithDarkMode.listContent}
                        ListEmptyComponent={renderEmptyComponent}
                        ListHeaderComponent={() => payrollData.length > 0 ? (
                            <Text style={stylesWithDarkMode.sectionTitle}>
                                📋 {selectedEmployee ? `${selectedEmployee.name} - Current Period` : 'Current Period'}
                            </Text>
                        ) : null}
                    />
                </>
            )}

        </SafeAreaView>
    );
}

const styles = (palette, isDark) => StyleSheet.create({
    container: {
        backgroundColor: palette.background.secondary,
        flex: 1,
    },
    header: {
        backgroundColor: palette.background.primary,
        borderBottomColor: palette.border,
        borderBottomWidth: 1,
        padding: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: palette.text.primary,
    },
    exportButton: {
        backgroundColor: palette.success,
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    exportButtonText: {
        color: palette.text.light,
        fontWeight: 'bold',
    },
    periodSelector: {
        marginTop: 12,
        width: '100%',
    },
    employeeSelector: {
        marginTop: 16,
        width: '100%',
    },
    selectorLabel: {
        fontSize: 14,
        color: palette.text.secondary,
        marginBottom: 8,
    },
    selectorScroll: {
        flexDirection: 'row',
    },
    selectorButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.background.secondary,
        marginRight: 8,
    },
    selectorButtonActive: {
        backgroundColor: palette.primary,
        borderColor: palette.primary,
    },
    selectorButtonText: {
        fontSize: 14,
        color: palette.text.primary,
        fontWeight: '500',
    },
    selectorButtonTextActive: {
        color: palette.text.light,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: palette.text.primary,
        marginBottom: 12,
        marginTop: 8,
    },
    currentSalaryCard: {
        backgroundColor: palette.success + '15',
        borderColor: palette.success,
        borderWidth: 2,
        borderRadius: 12,
        margin: 16,
        padding: 16,
        elevation: 3,
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    currentSalaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: palette.success,
        marginBottom: 12,
        textAlign: 'center',
    },
    currentSalaryInfo: {
        alignItems: 'center',
    },
    currentSalaryPeriod: {
        fontSize: 14,
        color: palette.text.secondary,
        marginBottom: 4,
    },
    currentSalaryAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: palette.success,
        marginBottom: 8,
    },
    currentSalarySubtext: {
        fontSize: 12,
        color: palette.text.secondary,
        textAlign: 'center',
        marginBottom: 4,
    },
    currentSalaryHours: {
        fontSize: 12,
        color: palette.text.secondary,
        fontStyle: 'italic',
    },
    card: {
        backgroundColor: palette.background.primary,
        borderRadius: 8,
        elevation: 2,
        marginBottom: 16,
        padding: 16,
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: {
        alignItems: 'center',
        borderBottomColor: palette.border,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingBottom: 12,
    },
    periodText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: palette.text.primary,
    },
    employeeText: {
        color: palette.text.secondary,
        fontSize: 14,
    },
    statusBadge: {
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    statusConfirmed: {
        backgroundColor: palette.successLight,
    },
    statusDraft: {
        backgroundColor: palette.warningLight,
    },
    statusPending: {
        backgroundColor: palette.primaryLight,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: palette.text.primary,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    detailItem: {
        flex: 1,
    },
    detailLabel: {
        color: palette.text.secondary,
        fontSize: 13,
    },
    detailValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: palette.text.primary,
    },
    typeRow: {
        marginBottom: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: palette.background.secondary,
        borderRadius: 6,
    },
    typeLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: palette.text.primary,
        textAlign: 'center',
    },
    enhancedSection: {
        backgroundColor: palette.background.secondary,
        borderRadius: 6,
        padding: 12,
        marginVertical: 8,
    },
    enhancedTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: palette.text.primary,
        marginBottom: 8,
    },
    enhancedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    enhancedLabel: {
        fontSize: 13,
        color: palette.text.secondary,
    },
    enhancedValue: {
        fontSize: 13,
        fontWeight: '600',
        color: palette.text.primary,
    },
    divider: {
        backgroundColor: palette.border,
        height: 1,
        marginVertical: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryColumn: {
        alignItems: 'flex-end',
    },
    totalLabel: {
        color: palette.text.primary,
        fontSize: 14,
        fontWeight: 'bold',
    },
    totalValue: {
        color: palette.success,
        fontSize: 18,
        fontWeight: 'bold',
    },
    rateDisplay: {
        color: palette.text.secondary,
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 2,
    },
    confirmButton: {
        alignItems: 'center',
        backgroundColor: palette.primary,
        borderRadius: 4,
        marginTop: 12,
        padding: 10,
    },
    confirmButtonText: {
        color: palette.text.light,
        fontWeight: 'bold',
    },
    footer: {
        backgroundColor: palette.background.primary,
        borderTopColor: palette.border,
        borderTopWidth: 1,
        padding: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: palette.text.primary,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 16,
        color: palette.text.secondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    emptySubtext: {
        fontSize: 14,
        color: palette.text.secondary,
        textAlign: 'center',
        marginTop: 12,
        fontStyle: 'italic',
    },
});// Force cache reload - Fri Jul 11 15:33:41 IDT 2025
