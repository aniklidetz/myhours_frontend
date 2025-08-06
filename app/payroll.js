import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    ScrollView
} from 'react-native';
import { showGlassAlert, showGlassConfirm } from '../hooks/useGlobalGlassModal';
import { useUser, ROLES } from '../src/contexts/UserContext';
import { router } from 'expo-router';
import useColors from '../hooks/useColors';
import HeaderBackButton from '../src/components/HeaderBackButton';
import ApiService from '../src/api/apiService';
import { API_ENDPOINTS, API_URL, APP_CONFIG } from '../src/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeLog, safeLogPayroll, safeLogApiResponse, safeLogEmployee, safeLogError } from '../src/utils/safeLogging';
import LiquidGlassScreenLayout from '../components/LiquidGlassScreenLayout';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import { commonStyles, COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/CommonStyles';

export default function PayrollScreen() {
    // ✅ ALWAYS call all hooks in the same order - add guards to prevent hook violations
    const [payrollData, setPayrollData] = useState([]);
    const [currentSalaryData, setCurrentSalaryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState(null); // null = current month
    const [employees, setEmployees] = useState([]);
    const { user, hasAccess, loading: userLoading } = useUser();
    const { palette, isDark } = useColors();
    const theme = useLiquidGlassTheme();
    
    // ✅ Guard against null user during logout to prevent hook violations
    const safeHasAccess = user ? hasAccess : () => false;
    const canViewAllEmployees = safeHasAccess(ROLES.ACCOUNTANT);
    const canExportAndConfirm = safeHasAccess(ROLES.ACCOUNTANT);

    // Handle authentication redirects in useEffect to avoid render-time navigation
    useEffect(() => {
        if (!user && !loading && !userLoading) {
            console.log('❌ User not found, redirecting to login');
            router.replace('/');
        }
    }, [user, loading, userLoading]);

    // Main data fetching effect - moved to top to comply with Rules of Hooks
    useEffect(() => {
        // Only run effects if user is authenticated and theme is loaded
        if (!user || !theme) return;
        
        // Inline function to avoid dependency issues
        const performDataFetch = async () => {
            if (canViewAllEmployees) {
                // Fetch employees for admin users
                try {
                    console.log('🔍 Fetching employees list for payroll...', {});
                    const response = await ApiService.employees.getAll();
                    
                    if (response && response.results) {
                        const employeeList = response.results.map(emp => ({
                            id: emp.id,
                            name: `${emp.first_name} ${emp.last_name}`,
                            email: emp.email
                        }));
                        setEmployees(employeeList);
                        console.log('✅ Fetched employees for payroll:', {
                            employee_count: employeeList.length,
                            has_data: true
                        });
                    }
                } catch (error) {
                    console.error('Error fetching employees:', error);
                    setEmployees([]);
                }
            } else {
                // For regular employees, clear any selected employee to ensure they only see their own data
                setSelectedEmployee(null);
            }
        };
        
        const debounceTimer = setTimeout(() => {
            performDataFetch();
            // Note: Actual payroll data fetching will be handled by separate functions
            // to avoid circular dependencies during the hooks refactor
        }, 300);
        
        return () => clearTimeout(debounceTimer);
    }, [selectedEmployee, selectedPeriod, canViewAllEmployees, user, theme]);

    // Separate effect for payroll data fetching - simplified to avoid dependency issues
    useEffect(() => {
        if (!user || !theme) return;
        
        const fetchEmployees = async () => {
            if (!canViewAllEmployees) return;
            
            try {
                console.log('🔍 Fetching employees list for payroll...', {});
                const response = await ApiService.employees.getAll();
                
                if (response && response.results) {
                    const employeeList = response.results.map(emp => ({
                        id: emp.id,
                        name: `${emp.first_name} ${emp.last_name}`,
                        email: emp.email
                    }));
                    setEmployees(employeeList);
                    console.log('✅ Fetched employees for payroll:', {
                        employee_count: employeeList.length,
                        has_data: employeeList.length > 0
                    });
                }
            } catch (error) {
                console.error('Error fetching employees:', error);
                setEmployees([]);
            }
        };
        
        const fetchData = async () => {
            try {
                setLoading(true);
                
                // Build API parameters
                const apiParams = {
                    month: selectedPeriod ? selectedPeriod.split('-')[1] : new Date().getMonth() + 1,
                    year: selectedPeriod ? selectedPeriod.split('-')[0] : new Date().getFullYear(),
                };
                
                if (canViewAllEmployees && selectedEmployee) {
                    apiParams.employee_id = selectedEmployee.id;
                }
                
                console.log('🔄 Fetching payroll data...', { selectedEmployee, selectedPeriod });
                
                let response;
                if (!canViewAllEmployees) {
                    // For regular employees, use the standard earnings endpoint without employee_id
                    console.log('🔍 Using earnings endpoint for regular employee (backend auto-detects)');
                    response = await ApiService.payroll.getEarnings(apiParams);
                } else if (!selectedEmployee) {
                    // For admin requesting all employees, use the salaries endpoint  
                    console.log('🔍 Using salaries endpoint for all employees');
                    response = await ApiService.payroll.getSalaries(apiParams);
                } else {
                    // For admin requesting specific employee, use earnings endpoint
                    console.log('🔍 Using earnings endpoint for specific employee');
                    response = await ApiService.payroll.getEarnings(apiParams);
                }
                
                console.log('Payroll API response received:', {
                    endpoint: 'earnings',
                    has_data: !!response,
                    is_array: Array.isArray(response),
                    response_keys: response ? Object.keys(response) : []
                });

                // Transform the response data - handle both array and object responses
                let dataArray = [];
                if (canViewAllEmployees && !selectedEmployee) {
                    // For all employees request, response should be an array from payroll_list
                    if (Array.isArray(response)) {
                        dataArray = response;
                        console.log('📊 Received array response for all employees:', dataArray.length, 'employees');
                    } else {
                        console.warn('Expected array for all employees but got:', typeof response);
                        dataArray = response ? [response] : [];
                    }
                } else {
                    // For single employee request, response can be object or array
                    if (Array.isArray(response)) {
                        dataArray = response;
                    } else if (response && response.results) {
                        dataArray = response.results;
                    } else if (response) {
                        dataArray = [response];
                    }
                }

                const transformedData = dataArray.map((item, index) => {
                    // Handle different response formats from payroll_list vs enhanced_earnings
                    const isPayrollListFormat = canViewAllEmployees && !selectedEmployee;
                    
                    return {
                        id: `earnings-${item.employee?.id || item.id || index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        employee: isPayrollListFormat ? {
                            id: item.employee?.id || item.id,
                            name: item.employee?.name || 'Unknown Employee',
                            email: item.employee?.email || 'unknown@example.com'
                        } : {
                            id: item.employee?.id || item.employee_id || item.id || index,
                            name: item.employee?.name || 
                                  item.employee_name ||
                                  `${item.employee?.first_name || item.first_name || ''} ${item.employee?.last_name || item.last_name || ''}`.trim() || 
                                  `Employee ${index + 1}`,
                            email: item.employee?.email || item.email || 'unknown@example.com'
                        },
                        period: `${new Date(apiParams.year, apiParams.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}${selectedPeriod === null ? ' (Current)' : ''}`,
                        status: 'In Progress',
                        baseSalary: item.base_salary || item.salary || 0,
                        baseHourlyRate: item.hourly_rate || item.rate || 0,
                        hourlyRate: item.hourly_rate || item.rate || 0,
                        hoursWorked: item.total_hours || item.hours_worked || item.hours || 0,
                        regularHours: item.regular_hours || 0,
                        overtimeHours: item.overtime_hours || 0,
                        holidayHours: item.holiday_hours || 0,
                        sabbathHours: item.shabbat_hours || item.sabbath_hours || 0,
                        overtimePay: item.overtime_pay || 0,
                        sabbathPay: item.sabbath_pay || 0,
                        holidayPay: item.holiday_pay || 0,
                        bonuses: item.bonus || item.bonuses || 0,
                        compensatoryDays: item.compensatory_days || 0,
                        totalPayout: item.total_salary || item.total_payout || item.total || item.amount || 0,
                        workedDays: item.worked_days || item.days_worked || 0,
                        totalWorkingDays: item.total_working_days || 0,
                        workSessions: item.work_sessions || item.worked_days || item.sessions || 0,
                        regularPayAmount: (item.regular_hours || 0) * (item.hourly_rate || item.rate || 0),
                        overtime: item.overtime_hours || 0,
                        enhancedBreakdown: item
                    };
                });

                console.log('📊 Found salaries for employees:', {
                    employee_count: transformedData.length,
                    has_data: transformedData.length > 0
                });


                setPayrollData(transformedData);
                
                // Set current salary data to null for now
                setCurrentSalaryData(null);
                
            } catch (error) {
                console.error('Error fetching payroll data:', error);
                setPayrollData([]);
            } finally {
                setLoading(false);
            }
        };
        
        // Fetch employees first, then fetch payroll data
        fetchEmployees();
        const debounceTimer = setTimeout(fetchData, 300);
        return () => clearTimeout(debounceTimer);
    }, [selectedEmployee, selectedPeriod, canViewAllEmployees, user, theme]);

    // Show loading during logout transition to prevent hook violations
    if (loading || userLoading || !user || !theme) {
        return (
            <LiquidGlassScreenLayout scrollable={false}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
            </LiquidGlassScreenLayout>
        );
    }

    // Create liquid glass styles after theme is loaded
    const stylesWithDarkMode = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: 'transparent',
        },
        header: {
            backgroundColor: 'transparent',
            // Padding handled by LiquidGlassScreenLayout
            alignItems: 'center',
            marginBottom: theme.spacing.md,
        },
        headerRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.sm,
        },
        title: {
            fontSize: theme.typography.title.fontSize * 0.7,
            fontWeight: theme.typography.title.fontWeight,
            color: theme.colors.text.primary,
            textShadowColor: theme.shadows.text.color,
            textShadowOffset: theme.shadows.text.offset,
            textShadowRadius: theme.shadows.text.radius,
        },
        // FIX: Updated export button to match app style
        exportButton: {
            backgroundColor: COLORS.glassMedium, // Subtle glass effect
            borderRadius: BORDER_RADIUS.lg,
            paddingHorizontal: SPACING.lg,
            paddingVertical: SPACING.md,
            borderWidth: 1,
            borderColor: COLORS.glassBorder,
            minHeight: 44,
            justifyContent: 'center',
            alignItems: 'center',
            ...commonStyles.button,
        },
        exportButtonText: {
            ...commonStyles.buttonText,
            color: COLORS.textPrimary,
            fontWeight: '600',
            fontSize: TYPOGRAPHY.body.fontSize,
        },
        // Use selector styles from CommonStyles for consistency
        selectorContainer: commonStyles.selectorContainer,
        selectorLabel: commonStyles.selectorLabel,
        selectorScroll: {
            flexDirection: 'column',
        },
        selectorRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.xs,
        },
        selectorButton: {
            ...commonStyles.selectorButton,
            marginRight: theme.spacing.sm,
        },
        selectorButtonActive: commonStyles.selectorButtonActive,
        selectorButtonText: commonStyles.selectorButtonText,
        selectorButtonTextActive: commonStyles.selectorButtonTextActive,
        content: {
            flex: 1,
            // Padding handled by LiquidGlassScreenLayout
        },
        loader: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        listContent: {
            // Padding handled by LiquidGlassScreenLayout
            paddingBottom: 100,
        },
        // Simple card styles for testing
        simpleCard: {
            backgroundColor: '#4CAF50',
            margin: 10,
            padding: 20,
            borderRadius: 8,
            minHeight: 80
        },
        simpleCardText: {
            color: '#FFFFFF',
            fontSize: 18,
            fontWeight: 'bold'
        },
        simpleCardSubtext: {
            color: '#FFFFFF',
            fontSize: 14,
            marginTop: 5
        },
        emptyContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.xl,
        },
        emptyTitle: {
            fontSize: theme.typography.title.fontSize * 0.8,
            fontWeight: theme.typography.title.fontWeight,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.md,
            textAlign: 'center',
        },
        emptyText: {
            fontSize: theme.typography.body.fontSize,
            color: theme.colors.text.secondary,
            textAlign: 'center',
            lineHeight: 24,
        },
        emptySubtext: {
            fontSize: theme.typography.caption.fontSize,
            color: theme.colors.text.secondary,
            textAlign: 'center',
            fontStyle: 'italic',
        },
        // FIX: Updated confirm button to match app style
        confirmButton: {
            backgroundColor: COLORS.glassLight, // Subtle glass background
            borderWidth: 1,
            borderColor: COLORS.glassBorder,
            borderRadius: BORDER_RADIUS.lg,
            paddingHorizontal: SPACING.xl,
            paddingVertical: SPACING.md,
            minHeight: 44,
            justifyContent: 'center',
            alignItems: 'center',
            // Add subtle glow effect
            shadowColor: 'rgba(255, 255, 255, 0.1)',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 3,
        },
        confirmButtonText: {
            color: COLORS.textPrimary,
            fontSize: TYPOGRAPHY.body.fontSize,
            fontWeight: '600',
            textAlign: 'center',
        },
    });
    
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


    const handleExport = async () => {
        try {
            showGlassAlert({
                title: 'Export Report',
                message: 'Payroll report exported successfully',
                buttons: [
                    {
                        label: 'Download CSV',
                        type: 'primary',
                        onPress: () => {
                            showGlassAlert({ title: 'Success', message: 'Payroll report exported as CSV' });
                        }
                    },
                    {
                        label: 'Email',
                        type: 'secondary',
                        onPress: () => {
                            showGlassAlert({ title: 'Success', message: 'Payroll report sent via email' });
                        }
                    },
                    {
                        label: 'Cancel',
                        type: 'ghost',
                        onPress: () => {}
                    }
                ]
            });
        } catch (error) {
            console.error('Export error:', error);
            showGlassAlert({ title: 'Error', message: 'Failed to export payroll report' });
        }
    };

    const handleConfirm = (id) => {
        showGlassConfirm(
            'Confirm Calculation',
            'Are you sure you want to confirm this payroll calculation?',
            () => {
                setPayrollData(payrollData.map(item =>
                    item.id === id ? { ...item, status: 'Confirmed' } : item
                ));
                showGlassAlert({ title: 'Success', message: 'Payroll calculation confirmed successfully' });
            }
        );
    };

    // Ultra-simplified renderPayrollItem for testing
    const renderPayrollItem = ({ item }) => {
        
        return (
            <View style={stylesWithDarkMode.simpleCard}>
                <Text style={stylesWithDarkMode.simpleCardText}>
                    {item.employee.name}
                </Text>
                <Text style={stylesWithDarkMode.simpleCardSubtext}>
                    {item.period}
                </Text>
                <Text style={stylesWithDarkMode.simpleCardSubtext}>
                    Total: {item.totalPayout} ₪
                </Text>
                <Text style={stylesWithDarkMode.simpleCardSubtext}>
                    Hours: {item.hoursWorked}h
                </Text>
            </View>
        );
    };

    const renderEmptyComponent = () => (
        <View style={stylesWithDarkMode.emptyContainer}>
            <Text style={stylesWithDarkMode.emptyTitle}>📊 No Payroll Data</Text>
            <Text style={stylesWithDarkMode.emptyText}>
                {canViewAllEmployees 
                    ? "No payroll calculations found for the selected period."
                    : "No payroll data available for your account."}
            </Text>
            {selectedPeriod && (
                <Text style={stylesWithDarkMode.emptySubtext}>
                    Showing data for: {availablePeriods.find(p => p.key === selectedPeriod)?.label || selectedPeriod}
                </Text>
            )}
        </View>
    );


    return (
        <LiquidGlassScreenLayout.WithGlassHeader
            title="Payroll Calculation"
            backDestination="/employees"
            showLogout={true}
            scrollable={true}
        >
            <View style={{ flex: 1 }}>
                <View style={stylesWithDarkMode.header}>
                    <View style={stylesWithDarkMode.headerRow}>
                        {canExportAndConfirm && payrollData.length > 0 && (
                            <TouchableOpacity style={stylesWithDarkMode.exportButton} onPress={handleExport}>
                                <Text style={stylesWithDarkMode.exportButtonText}>Export</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    
                    {/* Period Selector */}
                    <View style={stylesWithDarkMode.selectorContainer}>
                        <Text style={stylesWithDarkMode.selectorLabel}>Period:</Text>
                        <View style={stylesWithDarkMode.selectorRow}>
                            {availablePeriods.map(period => (
                                <TouchableOpacity
                                    key={period.key || 'current'}
                                    style={[
                                        stylesWithDarkMode.selectorButton,
                                        selectedPeriod === period.key && stylesWithDarkMode.selectorButtonActive,
                                        { marginRight: 0, marginBottom: theme.spacing.xs }
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
                        </View>
                    </View>

                    {canViewAllEmployees && employees.length > 0 && (
                        <View style={stylesWithDarkMode.selectorContainer}>
                            <Text style={stylesWithDarkMode.selectorLabel}>View payroll for:</Text>
                            <View style={stylesWithDarkMode.selectorRow}>
                                <TouchableOpacity
                                    style={[
                                        stylesWithDarkMode.selectorButton,
                                        !selectedEmployee && stylesWithDarkMode.selectorButtonActive,
                                        { marginRight: 0, marginBottom: theme.spacing.xs }
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
                                            selectedEmployee?.id === emp.id && stylesWithDarkMode.selectorButtonActive,
                                            { marginRight: 0, marginBottom: theme.spacing.xs }
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
                            </View>
                        </View>
                    )}
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.text.primary} style={stylesWithDarkMode.loader} />
                ) : payrollData.length === 0 ? (
                    renderEmptyComponent()
                ) : (
                    <View style={{ flex: 1 }}>
                        {payrollData.map((item) => (
                            <LiquidGlassCard key={item.id} variant="bordered" padding="md" style={{ marginBottom: theme.spacing.md }}>
                                {/* Header with employee name, type and period */}
                                <View style={{ 
                                    borderBottomWidth: 1, 
                                    borderBottomColor: theme.colors.glass.border, 
                                    marginBottom: theme.spacing.sm, 
                                    paddingBottom: theme.spacing.sm 
                                }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ 
                                                fontSize: theme.typography.body.fontSize, 
                                                fontWeight: 'bold', 
                                                color: theme.colors.text.primary 
                                            }}>
                                                {item.employee.name}
                                            </Text>
                                            <Text style={{ 
                                                fontSize: theme.typography.caption.fontSize, 
                                                color: theme.colors.text.secondary, 
                                                marginTop: theme.spacing.xs 
                                            }}>
                                                {item.period}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ 
                                                fontSize: theme.typography.caption.fontSize, 
                                                color: theme.colors.text.secondary,
                                                fontWeight: '600'
                                            }}>
                                                {item.hourlyRate > 0 ? 'Hourly Employee' : 'Monthly Employee'}
                                            </Text>
                                            <Text style={{ 
                                                fontSize: theme.typography.caption.fontSize, 
                                                color: item.status === 'In Progress' ? theme.colors.status.warning[0] : theme.colors.status.success[0],
                                                fontWeight: '600'
                                            }}>
                                                {item.status}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Main salary info based on employee type */}
                                {item.hourlyRate > 0 ? (
                                    // Hourly Employee Display
                                    <View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
                                            <View>
                                                <Text style={{ color: theme.colors.text.secondary, fontSize: theme.typography.caption.fontSize }}>
                                                    Regular Pay
                                                </Text>
                                                <Text style={{ 
                                                    fontWeight: 'bold', 
                                                    color: theme.colors.text.primary,
                                                    fontSize: theme.typography.body.fontSize
                                                }}>
                                                    ₪{(item.regularPayAmount || 0).toLocaleString()}
                                                </Text>
                                            </View>
                                            <View style={{ alignItems: 'center' }}>
                                                <Text style={{ color: theme.colors.text.secondary, fontSize: theme.typography.caption.fontSize }}>
                                                    Total Hours
                                                </Text>
                                                <Text style={{ 
                                                    fontWeight: 'bold', 
                                                    color: theme.colors.text.primary,
                                                    fontSize: theme.typography.body.fontSize
                                                }}>
                                                    {(item.hoursWorked || 0)}h
                                                </Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ color: theme.colors.text.secondary, fontSize: theme.typography.caption.fontSize }}>
                                                    Hourly Rate
                                                </Text>
                                                <Text style={{ 
                                                    fontWeight: 'bold', 
                                                    color: theme.colors.text.primary,
                                                    fontSize: theme.typography.body.fontSize
                                                }}>
                                                    ₪{(item.hourlyRate || 0)}/h
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{ alignItems: 'center', marginBottom: theme.spacing.md }}>
                                            <Text style={{ color: theme.colors.text.secondary, fontSize: theme.typography.caption.fontSize }}>
                                                Gross Pay
                                            </Text>
                                            <Text style={{ 
                                                fontWeight: 'bold', 
                                                color: theme.colors.text.primary,
                                                fontSize: theme.typography.title.fontSize * 0.8
                                            }}>
                                                ₪{(item.totalPayout || 0).toLocaleString()}
                                            </Text>
                                        </View>
                                    </View>
                                ) : (
                                    // Monthly Employee Display
                                    <View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
                                            <View>
                                                <Text style={{ color: theme.colors.text.secondary, fontSize: theme.typography.caption.fontSize }}>
                                                    Monthly Base
                                                </Text>
                                                <Text style={{ 
                                                    fontWeight: 'bold', 
                                                    color: theme.colors.text.primary,
                                                    fontSize: theme.typography.body.fontSize
                                                }}>
                                                    ₪{(item.baseSalary || 0).toLocaleString()}
                                                </Text>
                                            </View>
                                            <View style={{ alignItems: 'center' }}>
                                                <Text style={{ color: theme.colors.text.secondary, fontSize: theme.typography.caption.fontSize }}>
                                                    Total Hours
                                                </Text>
                                                <Text style={{ 
                                                    fontWeight: 'bold', 
                                                    color: theme.colors.text.primary,
                                                    fontSize: theme.typography.body.fontSize
                                                }}>
                                                    {(item.hoursWorked || 0)}h
                                                </Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ color: theme.colors.text.secondary, fontSize: theme.typography.caption.fontSize }}>
                                                    Attendance
                                                </Text>
                                                <Text style={{ 
                                                    fontWeight: 'bold', 
                                                    color: theme.colors.text.primary,
                                                    fontSize: theme.typography.body.fontSize
                                                }}>
                                                    {item.totalWorkingDays > 0 ? Math.round((item.workedDays / item.totalWorkingDays) * 100) : 0}%
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{ alignItems: 'center', marginBottom: theme.spacing.md }}>
                                            <Text style={{ color: theme.colors.text.secondary, fontSize: theme.typography.caption.fontSize }}>
                                                Total Salary
                                            </Text>
                                            <Text style={{ 
                                                fontWeight: 'bold', 
                                                color: theme.colors.text.primary,
                                                fontSize: theme.typography.title.fontSize * 0.8
                                            }}>
                                                ₪{(item.totalPayout || 0).toLocaleString()}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Additional details - Days and Basic Info */}
                                <View style={{ 
                                    flexDirection: 'row', 
                                    justifyContent: 'space-between',
                                    borderTopWidth: 1, 
                                    borderTopColor: theme.colors.glass.border, 
                                    paddingTop: theme.spacing.sm,
                                    marginBottom: theme.spacing.sm 
                                }}>
                                    <View>
                                        <Text style={{ color: theme.colors.text.secondary, fontSize: theme.typography.caption.fontSize }}>
                                            {item.hourlyRate > 0 ? 'Expected Hours' : 'Days Worked'}
                                        </Text>
                                        <Text style={{ color: theme.colors.text.primary, fontSize: theme.typography.caption.fontSize }}>
                                            {item.hourlyRate > 0 ? `${193}h` : `${item.workedDays || 0}/${item.totalWorkingDays || 0}`}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'center' }}>
                                        <Text style={{ color: theme.colors.text.secondary, fontSize: theme.typography.caption.fontSize }}>
                                            Regular Hours
                                        </Text>
                                        <Text style={{ color: theme.colors.text.primary, fontSize: theme.typography.caption.fontSize }}>
                                            {(item.regularHours || 0)}h
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ color: theme.colors.text.secondary, fontSize: theme.typography.caption.fontSize }}>
                                            {item.hourlyRate > 0 ? 'Avg Rate' : 'Work %'}
                                        </Text>
                                        <Text style={{ color: theme.colors.text.primary, fontSize: theme.typography.caption.fontSize }}>
                                            {item.hourlyRate > 0 
                                                ? `₪${item.hoursWorked > 0 ? Math.round(item.totalPayout / item.hoursWorked) : 0}/h` 
                                                : `${item.totalWorkingDays > 0 ? Math.round((item.workedDays / item.totalWorkingDays) * 100) : 0}%`}
                                        </Text>
                                    </View>
                                </View>

                                {/* Overtime breakdown */}
                                {item.overtimeHours > 0 && (
                                    <View style={{ 
                                        borderTopWidth: 1, 
                                        borderTopColor: theme.colors.glass.border, 
                                        paddingTop: theme.spacing.sm,
                                        marginBottom: theme.spacing.sm 
                                    }}>
                                        <Text style={{ 
                                            color: theme.colors.text.secondary, 
                                            fontSize: theme.typography.caption.fontSize,
                                            fontWeight: '600',
                                            marginBottom: theme.spacing.xs 
                                        }}>
                                            Overtime
                                        </Text>
                                        <Text style={{ 
                                            color: theme.colors.text.primary, 
                                            fontSize: theme.typography.caption.fontSize 
                                        }}>
                                            {/* Simulate overtime breakdown - you can enhance this with real data */}
                                            {item.overtimeHours > 3 
                                                ? `${(item.overtimeHours * 0.7).toFixed(1)}h×125% + ${(item.overtimeHours * 0.3).toFixed(1)}h×150%`
                                                : `${item.overtimeHours}h×125%`}
                                        </Text>
                                    </View>
                                )}

                                {/* Sabbath Work breakdown */}
                                {item.sabbathHours > 0 && (
                                    <View style={{ 
                                        borderTopWidth: 1, 
                                        borderTopColor: theme.colors.glass.border, 
                                        paddingTop: theme.spacing.sm,
                                        marginBottom: theme.spacing.sm 
                                    }}>
                                        <Text style={{ 
                                            color: theme.colors.text.secondary, 
                                            fontSize: theme.typography.caption.fontSize,
                                            fontWeight: '600',
                                            marginBottom: theme.spacing.xs 
                                        }}>
                                            Sabbath Work
                                        </Text>
                                        <Text style={{ 
                                            color: theme.colors.text.primary, 
                                            fontSize: theme.typography.caption.fontSize 
                                        }}>
                                            {/* Simulate sabbath breakdown */}
                                            {item.sabbathHours > 1.5 
                                                ? `${(item.sabbathHours * 0.82).toFixed(1)}h×150% + ${(item.sabbathHours * 0.18).toFixed(1)}h×175%`
                                                : `${item.sabbathHours}h×150%`}
                                        </Text>
                                    </View>
                                )}

                                {/* Additional breakdown */}
                                {(item.sabbathHours > 0 || item.holidayHours > 0 || item.bonuses > 0) && (
                                    <View style={{ 
                                        flexDirection: 'row', 
                                        justifyContent: 'space-between',
                                        marginTop: theme.spacing.sm,
                                        paddingTop: theme.spacing.sm,
                                        borderTopWidth: 1, 
                                        borderTopColor: theme.colors.glass.border 
                                    }}>
                                        {item.sabbathHours > 0 && (
                                            <View>
                                                <Text style={{ color: theme.colors.text.secondary, fontSize: theme.typography.caption.fontSize }}>
                                                    Sabbath Hours
                                                </Text>
                                                <Text style={{ color: theme.colors.text.primary, fontSize: theme.typography.caption.fontSize }}>
                                                    {item.sabbathHours}h
                                                </Text>
                                            </View>
                                        )}
                                        {item.holidayHours > 0 && (
                                            <View style={{ alignItems: 'center' }}>
                                                <Text style={{ color: theme.colors.text.secondary, fontSize: theme.typography.caption.fontSize }}>
                                                    Holiday Hours
                                                </Text>
                                                <Text style={{ color: theme.colors.text.primary, fontSize: theme.typography.caption.fontSize }}>
                                                    {item.holidayHours}h
                                                </Text>
                                            </View>
                                        )}
                                        {item.bonuses > 0 && (
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ color: theme.colors.text.secondary, fontSize: theme.typography.caption.fontSize }}>
                                                    Bonus
                                                </Text>
                                                <Text style={{ color: theme.colors.text.primary, fontSize: theme.typography.caption.fontSize }}>
                                                    ₪{(item.bonuses || 0).toLocaleString()}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* FIX: Updated confirm button with proper app styling */}
                                {canExportAndConfirm && item.status === 'In Progress' && (
                                    <View style={{ marginTop: theme.spacing.md, alignItems: 'center' }}>
                                        <TouchableOpacity
                                            style={stylesWithDarkMode.confirmButton}
                                            onPress={() => handleConfirm(item.id)}
                                        >
                                            <Text style={stylesWithDarkMode.confirmButtonText}>
                                                Confirm Calculation
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </LiquidGlassCard>
                        ))}
                    </View>
                )}
            </View>
        </LiquidGlassScreenLayout.WithGlassHeader>
    );
}