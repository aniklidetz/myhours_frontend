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
            
            console.log('🔍 Fetching payroll data...');
            
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

            if (selectedEmployee) {
                // Specific employee selected - use enhanced API
                const apiParams = getApiParams(selectedEmployee.id);
                const salaryParams = { employee: selectedEmployee.id };
                
                const [earnings, salaries] = await Promise.all([
                    ApiService.payroll.getEnhancedEarnings(apiParams),
                    ApiService.payroll.getSalaries(salaryParams)
                ]);
                
                earningsData = earnings;
                salariesData = salaries.results || salaries || [];
                
            } else if (canViewAllEmployees) {
                // "All Employees" mode - fetch data for each employee with enhanced API
                console.log('🌍 Fetching enhanced data for all employees');
                
                // First get all salaries to know which employees to fetch
                const salariesResponse = await ApiService.payroll.getSalaries();
                salariesData = salariesResponse.results || salariesResponse || [];
                console.log('📊 Found salaries for employees:', salariesData.map(s => s.employee));
                
                // Fetch enhanced earnings for each employee with period (handle errors individually)
                const earningsPromises = salariesData.map(async (salary) => {
                    try {
                        const params = getApiParams(salary.employee);
                        console.log(`🔍 Fetching earnings for employee ${salary.employee} with params:`, params);
                        const data = await ApiService.payroll.getEnhancedEarnings(params);
                        return data;
                    } catch (error) {
                        console.error(`❌ Failed to fetch earnings for employee ${salary.employee}:`, error);
                        // Return null for failed requests instead of throwing
                        return null;
                    }
                });
                
                earningsData = await Promise.all(earningsPromises);
                
                // Filter out failed requests and log results
                const successfulEarnings = earningsData.filter(data => data !== null);
                const failedCount = earningsData.length - successfulEarnings.length;
                
                if (failedCount > 0) {
                    console.warn(`⚠️ ${failedCount} out of ${earningsData.length} employees failed to load payroll data`);
                }
                
                earningsData = successfulEarnings;
                
            } else {
                // Regular employee viewing their own data - use enhanced API
                const apiParams = getApiParams(user.id);
                const salaryParams = { employee: user.id };
                
                const [earnings, salaries] = await Promise.all([
                    ApiService.payroll.getEnhancedEarnings(apiParams),
                    ApiService.payroll.getSalaries(salaryParams)
                ]);
                
                earningsData = earnings;
                salariesData = salaries.results || salaries || [];
            }
            
            console.log('📊 Earnings API data:', earningsData);
            console.log('📊 Salaries API data:', salariesData);
            
            // Transform single earnings response to array format for cards
            const apiData = Array.isArray(earningsData) ? earningsData : [earningsData];
            
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
                
                // Find matching salary data for base salary
                const salaryInfo = salariesData.find(s => s.employee === employeeId) || {};
                console.log('🔍 Found salary info for employee:', { employeeId, salaryInfo });
                
                // Combine data from both APIs
                const baseSalary = safeParse(salaryInfo.base_salary || 0);
                const hoursWorked = safeParse(earnings.regular_hours || earnings.total_hours || 0);
                const overtime = safeParse(earnings.overtime_hours || 0);
                
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
                
                console.log('🔍 Enhanced payroll earnings processing:', {
                    employeeData,
                    employeeName,
                    hoursWorked,
                    overtime,
                    totalPayout,
                    overtimePay: `${overtimePay} (${typeof overtimePay})`,
                    sabbathPay: `${sabbathPay} (${typeof sabbathPay})`,
                    holidayPay: `${holidayPay} (${typeof holidayPay})`,
                    compensatoryDays: `${compensatoryDays} (${typeof compensatoryDays})`,
                    earningsId: earnings.id || 'generated',
                    payBreakdown,
                    specialDayPayData
                });
                
                return {
                    id: earnings.id || `earnings-${employeeId}-${Date.now()}`,
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
                    compensatoryDays: Number(compensatoryDays) || 0
                };
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
                console.log(`💰 Filtering payroll for user: ${user.email}, found ${filteredData.length} records`);
            } else if (selectedEmployee) {
                // Admin/accountant viewing specific employee
                filteredData = transformedData.filter(item => item.employee.id === selectedEmployee.id);
            }
            
            setPayrollData(filteredData);
            
        } catch (error) {
            console.error('Error fetching payroll data:', error);
            console.error('Error details:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            
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
                
                console.warn('🚨 Server error (500) - detailed:', errorData);
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
                
                console.warn('🚨 Data not found (404):', errorData);
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
                
                console.warn('🚨 Invalid configuration (400):', errorData);
                Alert.alert(title, message, [{ text: 'OK' }]);
                
            } else {
                console.warn('🚨 Network or other error');
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
            console.log('🔍 Fetching employees list for payroll...');
            const response = await ApiService.employees.getAll();
            
            if (response && response.results) {
                const employeeList = response.results.map(emp => ({
                    id: emp.id,
                    name: `${emp.first_name} ${emp.last_name}`,
                    email: emp.email
                }));
                setEmployees(employeeList);
                console.log('✅ Fetched', employeeList.length, 'employees for payroll');
            }
        } catch (error) {
            console.error('❌ Error fetching employees for payroll:', error);
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
                    data = await ApiService.payroll.getEnhancedEarnings(getApiParams(selectedEmployee.id));
                } else if (canViewAllEmployees) {
                    // "All Employees" mode - fetch aggregated data with enhanced API
                    console.log('🌍 Fetching enhanced earnings for all employees');
                    data = await ApiService.payroll.getEnhancedEarnings(getApiParams());
                } else {
                    // Regular employee viewing their own data - use enhanced API
                    data = await ApiService.payroll.getEnhancedEarnings(getApiParams(user.id));
                }
                
                if (data) {
                    console.log('Payroll API response:', data);
                    
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
                            hoursWorkedThisMonth: Math.round(data.total_hours || data.hours_worked || 0),
                            daysWorked: data.worked_days || data.breakdown?.days_worked || currentDay,
                            daysInMonth: daysInMonth,
                            status: 'In Progress'
                        });
                        return;
                    }
                }
            } catch (apiError) {
                console.log('Could not fetch current earnings, using estimates. Error:', apiError);
            }
            
            // Fallback - hide current salary display if no real data is available
            console.log('⚠️ No current earnings data available - hiding current month progress section');
            setCurrentSalaryData(null);
            
        } catch (error) {
            console.error('Error fetching current salary data:', error);
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
                            console.log('CSV Export:', csv);
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
            console.error('Export error:', error);
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
        // Extract additional data from enhanced breakdown
        const enhanced = item.enhancedBreakdown || {};
        const calculationType = enhanced.calculation_type || 'unknown';
        const workedDays = enhanced.worked_days || 0;
        const totalWorkingDays = enhanced.total_working_days || 0;
        const regularHours = enhanced.regular_hours || 0;
        const overtimeHours = enhanced.overtime_hours || 0;
        const holidayHours = enhanced.holiday_hours || 0;
        const sabbathHours = enhanced.shabbat_hours || 0;
        
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

                {/* Primary Info Row */}
                <View style={stylesWithDarkMode.detailRow}>
                    <View style={stylesWithDarkMode.detailItem}>
                        <Text style={stylesWithDarkMode.detailLabel}>
                            {calculationType === 'monthly' ? 'Base Salary:' : 'Total Earnings:'}
                        </Text>
                        <Text style={stylesWithDarkMode.detailValue}>{item.baseSalary} ₪</Text>
                    </View>
                    <View style={stylesWithDarkMode.detailItem}>
                        <Text style={stylesWithDarkMode.detailLabel}>Total Hours:</Text>
                        <Text style={stylesWithDarkMode.detailValue}>{item.hoursWorked}h</Text>
                    </View>
                </View>

                {/* Work Attendance Row */}
                <View style={stylesWithDarkMode.detailRow}>
                    <View style={stylesWithDarkMode.detailItem}>
                        <Text style={stylesWithDarkMode.detailLabel}>Days Worked:</Text>
                        <Text style={stylesWithDarkMode.detailValue}>{workedDays} / {totalWorkingDays}</Text>
                    </View>
                    <View style={stylesWithDarkMode.detailItem}>
                        <Text style={stylesWithDarkMode.detailLabel}>Regular Hours:</Text>
                        <Text style={stylesWithDarkMode.detailValue}>{regularHours}h</Text>
                    </View>
                </View>

                {/* Overtime and Special Hours */}
                {(overtimeHours > 0 || holidayHours > 0 || sabbathHours > 0) && (
                    <View style={stylesWithDarkMode.detailRow}>
                        {overtimeHours > 0 && (
                            <View style={stylesWithDarkMode.detailItem}>
                                <Text style={stylesWithDarkMode.detailLabel}>Overtime:</Text>
                                <Text style={stylesWithDarkMode.detailValue}>{overtimeHours}h</Text>
                            </View>
                        )}
                        {(holidayHours > 0 || sabbathHours > 0) && (
                            <View style={stylesWithDarkMode.detailItem}>
                                <Text style={stylesWithDarkMode.detailLabel}>Special Days:</Text>
                                <Text style={stylesWithDarkMode.detailValue}>
                                    {holidayHours > 0 && `${holidayHours}h holidays`}
                                    {holidayHours > 0 && sabbathHours > 0 && ', '}
                                    {sabbathHours > 0 && `${sabbathHours}h sabbath`}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Bonuses Row */}
                {item.bonuses > 0 && (
                    <View style={stylesWithDarkMode.detailRow}>
                        <View style={stylesWithDarkMode.detailItem}>
                            <Text style={stylesWithDarkMode.detailLabel}>Bonuses & Extras:</Text>
                            <Text style={stylesWithDarkMode.detailValue}>{item.bonuses} ₪</Text>
                        </View>
                    </View>
                )}

                {/* Enhanced Breakdown Section */}
                {(Number(item.overtimePay) > 0 || Number(item.sabbathPay) > 0 || Number(item.holidayPay) > 0 || Number(item.compensatoryDays) > 0) && (
                    <View style={stylesWithDarkMode.enhancedSection}>
                        <Text style={stylesWithDarkMode.enhancedTitle}>📊 Detailed Breakdown</Text>
                        
                        {Number(item.overtimePay) > 0 && (
                            <View style={stylesWithDarkMode.enhancedRow}>
                                <Text style={stylesWithDarkMode.enhancedLabel}>Overtime Pay:</Text>
                                <Text style={stylesWithDarkMode.enhancedValue}>{Number(item.overtimePay).toLocaleString()} ₪</Text>
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
                        <Text style={stylesWithDarkMode.totalLabel}>Total Salary:</Text>
                        <Text style={stylesWithDarkMode.totalValue}>{item.totalPayout} ₪</Text>
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
                    ? "No payroll records found. Make sure employees have salary configuration."
                    : "No payroll records found for your account."}
            </Text>
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
});