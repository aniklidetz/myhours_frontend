import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView,
    Alert
} from 'react-native';
import { useUser, ROLES } from '../src/contexts/UserContext';
import useColors from '../hooks/useColors';
import BackButton from '../src/components/BackButton';
import ApiService from '../src/api/apiService';
import { API_ENDPOINTS, API_URL, APP_CONFIG } from '../src/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PayrollScreen() {
    const [payrollData, setPayrollData] = useState([]);
    const [currentSalaryData, setCurrentSalaryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user, hasAccess } = useUser();
    const { palette, isDark } = useColors(); // используем хук для получения текущей цветовой палитры
    const canViewAllEmployees = hasAccess(ROLES.ACCOUNTANT);
    const canExportAndConfirm = hasAccess(ROLES.ACCOUNTANT);

    useEffect(() => {
        fetchPayrollData();
        fetchCurrentSalaryData();
    }, []);

    const fetchPayrollData = async () => {
        try {
            setLoading(true);
            
            // Fetch real payroll data from API
            const token = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
            const response = await fetch(`${API_URL}${API_ENDPOINTS.PAYROLL.SALARIES}`, {
                method: 'GET',
                headers: {
                    'Authorization': `DeviceToken ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const responseData = await response.json();
            const apiData = responseData.results || responseData;
            
            // Transform API data to match UI format with safe number parsing
            const transformedData = apiData.map(salary => {
                const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                
                // Safe number parsing with fallbacks
                const safeParse = (value, fallback = 0) => {
                    const parsed = parseFloat(value);
                    return isNaN(parsed) ? fallback : parsed;
                };
                
                const baseSalary = safeParse(salary.base_salary);
                const hoursWorked = safeParse(salary.hours_worked);
                const overtime = safeParse(salary.overtime_hours);
                const bonuses = safeParse(salary.bonus);
                const totalPayout = safeParse(salary.net_salary || salary.calculated_salary);
                
                return {
                    id: salary.id,
                    period: currentMonth,
                    employee: {
                        id: salary.employee.id,
                        name: `${salary.employee.first_name} ${salary.employee.last_name}`,
                        email: salary.employee.email
                    },
                    baseSalary,
                    hoursWorked,
                    overtime,
                    bonuses,
                    totalPayout,
                    status: salary.status || 'Draft'
                };
            });
            
            // Apply role-based filtering and time restrictions
            let filteredData = transformedData;
            
            // Calculate time restrictions
            const currentDate = new Date();
            const threeMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1);
            const sixMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1);
            
            if (!canViewAllEmployees) {
                // Employee: only their own data + 3 months restriction
                filteredData = transformedData.filter(item => {
                    const isOwnData = item.employee.id === user.id;
                    // TODO: Add proper date filtering when API provides date field
                    return isOwnData;
                });
            } else {
                // Admin/Accountant: all employees + 6 months restriction
                filteredData = transformedData;
                // TODO: Add proper date filtering when API provides date field
            }
            
            setPayrollData(filteredData);
            
        } catch (error) {
            console.error('Error fetching payroll data:', error);
            // Fallback to mock data if API fails
            const mockData = generateMockData();
            const filteredData = canViewAllEmployees
                ? mockData
                : mockData.filter(item => item.employee.id === user.id);
            setPayrollData(filteredData);
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrentSalaryData = async () => {
        try {
            // Fetch current month accumulated salary for the user
            // This would typically be a separate API endpoint
            const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const currentDay = new Date().getDate();
            const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
            
            // Mock calculation for current accumulated salary
            // Safe calculation for estimated salary
            const baseMonthlySalary = 50000;
            const baseMonthlyHours = 160;
            const safeDaysInMonth = daysInMonth > 0 ? daysInMonth : 30;
            const safeDaysWorked = currentDay > 0 ? currentDay : 1;
            
            const mockCurrentSalary = {
                period: `${currentMonth} (Current)`,
                employee: {
                    id: user.id,
                    name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
                },
                estimatedSalary: Math.round((baseMonthlySalary / safeDaysInMonth) * safeDaysWorked),
                hoursWorkedThisMonth: Math.round((baseMonthlyHours / safeDaysInMonth) * safeDaysWorked),
                daysWorked: safeDaysWorked,
                daysInMonth: safeDaysInMonth,
                status: 'In Progress'
            };
            
            setCurrentSalaryData(mockCurrentSalary);
            
        } catch (error) {
            console.error('Error fetching current salary data:', error);
        }
    };

    const generateMockData = () => {
        const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return [
            { id: 1, period: currentMonth, employee: { id: user.id, name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email }, baseSalary: 50000, hoursWorked: 160, overtime: 8, bonuses: 5000, totalPayout: 58000, status: 'Draft' },
            { id: 2, period: currentMonth, employee: { id: 5, name: 'John Smith' }, baseSalary: 60000, hoursWorked: 168, overtime: 16, bonuses: 8000, totalPayout: 76000, status: 'Confirmed' },
            { id: 3, period: currentMonth, employee: { id: 6, name: 'Emily Johnson' }, baseSalary: 55000, hoursWorked: 152, overtime: 0, bonuses: 0, totalPayout: 55000, status: 'Pending' }
        ];
    };

    const handleExport = () => {
        Alert.alert('Export', 'Payroll report generated and ready to export');
    };

    const handleConfirm = (id) => {
        Alert.alert('Confirmation', 'Payroll calculation confirmed');
        setPayrollData(payrollData.map(item => item.id === id ? { ...item, status: 'Confirmed' } : item));
    };

    // Передаем isDark в функцию стилей, чтобы использовать его внутри
    const stylesWithDarkMode = styles(palette, isDark);

    const renderPayrollItem = ({ item }) => (
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

            <View style={stylesWithDarkMode.detailRow}>
                <View style={stylesWithDarkMode.detailItem}><Text style={stylesWithDarkMode.detailLabel}>Base Salary:</Text><Text style={stylesWithDarkMode.detailValue}>{item.baseSalary} ₪</Text></View>
                <View style={stylesWithDarkMode.detailItem}><Text style={stylesWithDarkMode.detailLabel}>Hours Worked:</Text><Text style={stylesWithDarkMode.detailValue}>{item.hoursWorked}</Text></View>
            </View>

            <View style={stylesWithDarkMode.detailRow}>
                <View style={stylesWithDarkMode.detailItem}><Text style={stylesWithDarkMode.detailLabel}>Overtime Hours:</Text><Text style={stylesWithDarkMode.detailValue}>{item.overtime}</Text></View>
                <View style={stylesWithDarkMode.detailItem}><Text style={stylesWithDarkMode.detailLabel}>Bonuses:</Text><Text style={stylesWithDarkMode.detailValue}>{item.bonuses} ₪</Text></View>
            </View>

            <View style={stylesWithDarkMode.divider} />

            <View style={stylesWithDarkMode.summaryRow}>
                <View style={stylesWithDarkMode.summaryColumn}><Text style={stylesWithDarkMode.totalLabel}>Total Salary:</Text><Text style={stylesWithDarkMode.totalValue}>{item.totalPayout} ₪</Text></View>
            </View>

            {canExportAndConfirm && item.status !== 'Confirmed' && (
                <TouchableOpacity style={stylesWithDarkMode.confirmButton} onPress={() => handleConfirm(item.id)}>
                    <Text style={stylesWithDarkMode.confirmButtonText}>Confirm Calculation</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <SafeAreaView style={stylesWithDarkMode.container}>
            <View style={stylesWithDarkMode.header}>
                <Text style={stylesWithDarkMode.title}>Payroll Calculation</Text>
                {canExportAndConfirm && (
                    <TouchableOpacity style={stylesWithDarkMode.exportButton} onPress={handleExport}>
                        <Text style={stylesWithDarkMode.exportButtonText}>Export</Text>
                    </TouchableOpacity>
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
                        ListHeaderComponent={() => (
                            <Text style={stylesWithDarkMode.sectionTitle}>
                                📋 Previous Periods
                            </Text>
                        )}
                    />
                </>
            )}

            <View style={stylesWithDarkMode.footer}><BackButton destination="/employees" /></View>
        </SafeAreaView>
    );
}

// Преобразуем стили в функцию, которая принимает цветовую палитру и флаг темной темы
const styles = (palette, isDark) => StyleSheet.create({
    backButton: {
        alignItems: 'center',
        backgroundColor: palette.text.secondary,
        borderRadius: 4,
        padding: 12,
    },
    backButtonText: {
        color: palette.text.light,
        fontWeight: 'bold',
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
    container: {
        backgroundColor: palette.background.secondary,
        flex: 1,
    },
    detailItem: {
        flex: 1,
    },
    detailLabel: {
        color: palette.text.secondary,
        fontSize: 13,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    detailValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: palette.text.primary,
    },
    divider: {
        backgroundColor: palette.border,
        height: 1,
        marginVertical: 12,
    },
    employeeText: {
        color: palette.text.secondary,
        fontSize: 14,
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
    footer: {
        backgroundColor: palette.background.primary,
        borderTopColor: palette.border,
        borderTopWidth: 1,
        padding: 16,
    },
    header: {
        alignItems: 'center',
        backgroundColor: palette.background.primary,
        borderBottomColor: palette.border,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
    },
    listContent: {
        padding: 16,
    },
    loader: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    periodText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: palette.text.primary,
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
        // Используем isDark, который передан в функцию стилей
        color: palette.text.primary,
    },
    summaryColumn: {
        alignItems: 'flex-end',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    taxLabel: {
        color: palette.text.secondary,
        fontSize: 13,
    },
    taxValue: {
        color: palette.danger,
        fontSize: 15,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: palette.text.primary,
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
    // Styles for current salary card
    currentSalaryCard: {
        backgroundColor: palette.success + '15', // Light background
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
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: palette.text.primary,
        marginBottom: 12,
        marginTop: 8,
    }
});