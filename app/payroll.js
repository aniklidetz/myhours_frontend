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

export default function PayrollScreen() {
    const [payrollData, setPayrollData] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user, hasAccess } = useUser();
    const { palette, isDark } = useColors(); // используем хук для получения текущей цветовой палитры
    const canViewAllEmployees = hasAccess(ROLES.ACCOUNTANT);
    const canExportAndConfirm = hasAccess(ROLES.ACCOUNTANT);

    useEffect(() => {
        fetchPayrollData();
    }, []);

    const fetchPayrollData = async () => {
        try {
            setLoading(true);
            const mockData = generateMockData();
            const filteredData = canViewAllEmployees
                ? mockData
                : mockData.filter(item => item.employee.id === user.id);
            setPayrollData(filteredData);
        } catch (error) {
            console.error('Error fetching payroll data:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateMockData = () => {
        const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return [
            { id: 1, period: currentMonth, employee: { id: user.id, name: user.name }, baseSalary: 50000, hoursWorked: 160, overtime: 8, bonuses: 5000, taxes: 7150, totalPayout: 52850, status: 'Draft' },
            { id: 2, period: currentMonth, employee: { id: 5, name: 'John Smith' }, baseSalary: 60000, hoursWorked: 168, overtime: 16, bonuses: 8000, taxes: 9200, totalPayout: 66800, status: 'Confirmed' },
            { id: 3, period: currentMonth, employee: { id: 6, name: 'Emily Johnson' }, baseSalary: 55000, hoursWorked: 152, overtime: 0, bonuses: 0, taxes: 7150, totalPayout: 47850, status: 'Pending' }
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
                <View style={stylesWithDarkMode.summaryColumn}><Text style={stylesWithDarkMode.taxLabel}>Taxes:</Text><Text style={stylesWithDarkMode.taxValue}>-{item.taxes} ₪</Text></View>
                <View style={stylesWithDarkMode.summaryColumn}><Text style={stylesWithDarkMode.totalLabel}>To be paid:</Text><Text style={stylesWithDarkMode.totalValue}>{item.totalPayout} ₪</Text></View>
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
                <FlatList
                    data={payrollData}
                    renderItem={renderPayrollItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={stylesWithDarkMode.listContent}
                />
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
    }
});