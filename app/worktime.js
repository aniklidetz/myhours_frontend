import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    ActivityIndicator,
    SafeAreaView,
    TouchableOpacity,
    ScrollView
} from 'react-native';
import { useUser, ROLES } from '../src/contexts/UserContext';
import useColors from '../hooks/useColors';
import HeaderBackButton from '../src/components/HeaderBackButton';
import ApiService from '../src/api/apiService';
import { API_ENDPOINTS, API_URL, APP_CONFIG } from '../src/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LiquidGlassLayout from '../components/LiquidGlassLayout';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';

const TIME_FILTERS = {
    'THIS_MONTH': { label: 'This Month', days: new Date().getDate() + 30 }, // Current month + buffer
    '7_DAYS': { label: '7 Days', days: 7 },
    '14_DAYS': { label: '14 Days', days: 14 },
    '1_MONTH': { label: '1 Month', days: 30 },
    '3_MONTHS': { label: '3 Months', days: 90 }
};

export default function WorktimeScreen() {
    const [worktimeData, setWorktimeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [selectedTimeFilter, setSelectedTimeFilter] = useState('THIS_MONTH');
    const [isTableView, setIsTableView] = useState(false);
    const [displayCount, setDisplayCount] = useState(10); // Initially show 10 items
    const [isExpanded, setIsExpanded] = useState(false); // Track expansion state
    const { user, hasAccess } = useUser();
    const { palette } = useColors();
    const theme = useLiquidGlassTheme();
    const canViewAll = hasAccess(ROLES.ACCOUNTANT);

    // Ensure theme is loaded before using it
    if (!theme) {
        return (
            <LiquidGlassLayout>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
            </LiquidGlassLayout>
        );
    }

    // Create styles after theme is loaded
    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: 'transparent',
        },
        header: {
            backgroundColor: 'transparent',
            padding: theme.spacing.lg,
            alignItems: 'center',
            marginBottom: theme.spacing.md,
        },
        title: {
            fontSize: theme.typography.title.fontSize * 0.7,
            fontWeight: theme.typography.title.fontWeight,
            color: theme.colors.text.primary,
            textShadowColor: theme.shadows.text.color,
            textShadowOffset: theme.shadows.text.offset,
            textShadowRadius: theme.shadows.text.radius,
        },
        loader: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        listContent: {
            padding: theme.spacing.lg,
        },
        timeFilterSection: {
            marginTop: theme.spacing.md,
        },
        viewToggleSection: {
            marginTop: theme.spacing.md,
        },
        selectorLabel: {
            fontSize: theme.typography.body.fontSize,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.sm,
        },
        selectorScroll: {
            flexGrow: 0,
            flexShrink: 0,
        },
        selectorScrollContent: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: theme.spacing.xs,
        },
        selectorButton: {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            borderRadius: theme.borderRadius.lg,
            borderWidth: 1,
            borderColor: theme.colors.glass.border,
            backgroundColor: theme.colors.glass.light,
            marginRight: theme.spacing.sm,
            alignSelf: 'flex-start',
            flexShrink: 0,
        },
        selectorButtonActive: {
            backgroundColor: theme.colors.glass.medium,
            borderColor: theme.colors.glass.border,
        },
        selectorButtonText: {
            fontSize: theme.typography.body.fontSize,
            color: theme.colors.text.primary,
            fontWeight: '500',
        },
        selectorButtonTextActive: {
            color: theme.colors.text.primary,
        },
        viewToggle: {
            flexDirection: 'row',
            backgroundColor: theme.colors.glass.light,
            borderRadius: theme.borderRadius.md,
            padding: 2,
        },
        toggleButton: {
            flex: 1,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.borderRadius.sm,
            alignItems: 'center',
        },
        toggleButtonActive: {
            backgroundColor: theme.colors.glass.medium,
        },
        toggleButtonText: {
            fontSize: theme.typography.body.fontSize,
            color: theme.colors.text.primary,
            fontWeight: '500',
        },
        toggleButtonTextActive: {
            color: theme.colors.text.primary,
        },
        emptyState: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.xl,
            minHeight: 400,
        },
        emptyStateTitle: {
            fontSize: theme.typography.title.fontSize * 0.8,
            fontWeight: theme.typography.title.fontWeight,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.md,
            textAlign: 'center',
        },
        emptyStateText: {
            fontSize: theme.typography.body.fontSize,
            color: theme.colors.text.secondary,
            textAlign: 'center',
            lineHeight: 24,
        },
        showMoreContainer: {
            padding: theme.spacing.lg,
            alignItems: 'center',
            backgroundColor: 'transparent',
        },
        showMoreButton: {
            backgroundColor: theme.colors.glass.medium,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            borderWidth: 1,
            borderColor: theme.colors.glass.border,
        },
        showMoreText: {
            color: theme.colors.text.primary,
            fontSize: theme.typography.body.fontSize,
            fontWeight: '600',
            textAlign: 'center',
        },
        // Table styles
        tableContainer: {
            flex: 1,
            padding: theme.spacing.lg,
        },
        table: {
            backgroundColor: theme.colors.glass.light,
            borderRadius: theme.borderRadius.md,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.colors.glass.border,
        },
        tableHeader: {
            flexDirection: 'row',
            backgroundColor: theme.colors.glass.medium,
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.glass.border,
        },
        tableHeaderText: {
            fontSize: theme.typography.caption.fontSize,
            fontWeight: 'bold',
            color: theme.colors.text.primary,
            textAlign: 'center',
        },
        tableRow: {
            flexDirection: 'row',
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.glass.border,
        },
        tableRowEven: {
            backgroundColor: theme.colors.glass.light,
        },
        tableCellText: {
            fontSize: theme.typography.caption.fontSize,
            color: theme.colors.text.primary,
            textAlign: 'center',
        },
        colDate: {
            flex: 2,
        },
        colEmployee: {
            flex: 1.5,
        },
        colTime: {
            flex: 1.2,
        },
        colHours: {
            flex: 1.3,
        },
    });

    useEffect(() => {
        if (canViewAll) {
            fetchEmployees();
        }

        // Reset display count when filters change
        setDisplayCount(10);
        setIsExpanded(false);

        const debounceTimer = setTimeout(() => {
            fetchWorktimeData();
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [selectedEmployee, selectedTimeFilter]);

    const fetchWorktimeData = async () => {
        try {
            setLoading(true);

            // Fetching worktime data

            // Calculate date range based on selected filter
            const daysBack = TIME_FILTERS[selectedTimeFilter].days;
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysBack);

            // Format dates for API (YYYY-MM-DD)
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            // Fetching worktime data from ${startDateStr} to ${endDateStr}

            // Build parameters object for ApiService
            const apiParams = {
                date_from: startDateStr,
                date_to: endDateStr,
                page_size: '500',
                ordering: '-check_in'
            };

            // Add employee filter if selected
            if (selectedEmployee && canViewAll) {
                apiParams.employee = selectedEmployee.id;
            }

            let responseData = await ApiService.worktime.getLogs(apiParams);
            const apiData = responseData.results || responseData || [];

            // Transform API data
            const transformedData = Array.isArray(apiData) ? apiData.map(worklog => {
                const checkInDate = worklog.check_in ? new Date(worklog.check_in) : null;
                const checkOutDate = worklog.check_out ? new Date(worklog.check_out) : null;

                const isValidCheckIn = checkInDate && !isNaN(checkInDate.getTime());
                const isValidCheckOut = checkOutDate && !isNaN(checkOutDate.getTime());


                // Enhanced employee data extraction
                const employeeData = worklog.employee || worklog.employee_data || {};
                
                // console.log('🔍 Processing worklog item:', {
                //     worklogId: worklog.id,
                //     employeeField: worklog.employee,
                //     employeeDataField: worklog.employee_data,
                //     employeeNameField: worklog.employee_name,
                //     mergedEmployeeData: employeeData
                // });
                
                const employeeName = (() => {
                    // Priority 1: Try employee object with name fields
                    if (employeeData.first_name && employeeData.last_name) {
                        return `${employeeData.first_name} ${employeeData.last_name}`.trim();
                    }
                    // Priority 2: Try employee_name field in employee object
                    if (employeeData.employee_name) {
                        return employeeData.employee_name;
                    }
                    // Priority 3: Try employee_name field directly on worklog
                    if (worklog.employee_name) {
                        return worklog.employee_name;
                    }
                    // Priority 4: Try name field
                    if (employeeData.name) {
                        return employeeData.name;
                    }
                    // Priority 5: Try get_full_name field
                    if (employeeData.get_full_name) {
                        return employeeData.get_full_name;
                    }
                    // Priority 6: Try full_name field
                    if (employeeData.full_name) {
                        return employeeData.full_name;
                    }
                    // Priority 7: Check if employee is just a string (name)
                    if (typeof worklog.employee === 'string') {
                        return worklog.employee;
                    }
                    // Priority 8: Try email
                    if (employeeData.email) {
                        return employeeData.email.split('@')[0]; // Use email username
                    }
                    // Fallback
                    return 'Unknown Employee';
                })();

                // Calculate total hours
                let totalHours = worklog.total_hours;
                if (totalHours === undefined && isValidCheckIn && isValidCheckOut) {
                    const diffMs = checkOutDate - checkInDate;
                    totalHours = diffMs / (1000 * 60 * 60);
                }

                // Extract employee ID with multiple fallbacks
                const employeeId = employeeData.id || worklog.employee_id || worklog.employee || user.id;
                const employeeEmail = employeeData.email || 'unknown@example.com';
                
                // console.log('✅ Processed worklog item:', {
                //     worklogId: worklog.id,
                //     employeeId,
                //     employeeName,
                //     employeeEmail
                // });

                return {
                    id: worklog.id || Math.random(),
                    employee: {
                        id: employeeId,
                        name: employeeName,
                        email: employeeEmail
                    },
                    // Store both formatted and raw date for different uses
                    date: isValidCheckIn ? checkInDate.toLocaleDateString('en-US', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    }) : 'Date not available',
                    dateShort: isValidCheckIn ? checkInDate.toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric'
                    }) : 'N/A',
                    dateRaw: isValidCheckIn ? checkInDate : null, // For sorting and filtering
                    checkIn: isValidCheckIn ? checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not recorded',
                    checkOut: isValidCheckOut ? checkOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Still working',
                    totalHours: totalHours !== null && totalHours !== undefined
                        ? `${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}m`
                        : 'In progress',
                    workMode: worklog.location_check_in ?
                        (worklog.location_check_in.includes('office') ? 'Office' : 'Remote') :
                        'Office'
                };
            }) : [];

            // Server already filtered by date, no need for client-side date filtering
            console.log(`📅 Server returned ${transformedData.length} records already filtered by date`);
            let filtered = transformedData;

            // Filter by user role
            if (!canViewAll) {
                filtered = filtered.filter(item =>
                    item.employee.id === user.id ||
                    item.employee.email === user.email ||
                    item.employee.name.includes(user.first_name || '') ||
                    item.employee.name.includes(user.last_name || '')
                );
                console.log(`👤 After user filtering: ${filtered.length} records`);
            } else if (selectedEmployee) {
                filtered = filtered.filter(item => item.employee.id === selectedEmployee.id);
                console.log(`👤 After employee filtering: ${filtered.length} records`);
            }

            // Sort by date (newest first)
            filtered.sort((a, b) => {
                if (!a.dateRaw || !b.dateRaw) return 0;
                return b.dateRaw - a.dateRaw;
            });

            console.log(`✅ Final worktime data: ${filtered.length} records for display`);
            console.log('📋 Sample records:', filtered.slice(0, 3).map(item => ({
                id: item.id,
                date: item.dateShort,
                employee: canViewAll ? item.employee.name : 'Current User',
                hours: item.totalHours
            })));
            
            setWorktimeData(filtered);

        } catch (error) {
            if (error.message?.includes('Network Error')) {
                console.warn('⚠️ Worktime API unavailable, using offline mode');
                setWorktimeData([]);
            } else {
                console.error('❌ Error fetching worktime data:', error);
                setWorktimeData([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        if (!canViewAll) return;

        try {
            console.log('🔍 Fetching employees list...');
            const response = await ApiService.employees.getAll();

            if (response && response.results) {
                const employeeList = response.results.map(emp => ({
                    id: emp.id,
                    name: `${emp.first_name} ${emp.last_name}`,
                    email: emp.email
                }));
                setEmployees(employeeList);
                console.log('✅ Fetched', employeeList.length, 'employees');
            }
        } catch (error) {
            console.error('❌ Error fetching employees:', error);
            setEmployees([{
                id: user.id,
                name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email,
                email: user.email
            }]);
        }
    };

    const handleShowMore = () => {
        if (isExpanded) {
            // Collapse - show only first 10 items
            setDisplayCount(10);
            setIsExpanded(false);
        } else {
            // Expand - show all items
            setDisplayCount(worktimeData.length);
            setIsExpanded(true);
        }
    };

    const renderItem = ({ item }) => (
        <LiquidGlassCard variant="bordered" padding="md" style={{ marginBottom: theme.spacing.md }}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.glass.border, marginBottom: theme.spacing.sm, paddingBottom: theme.spacing.sm }}>
                <Text style={{ fontSize: theme.typography.body.fontSize, fontWeight: 'bold', color: theme.colors.text.primary }}>
                    {item.date}
                </Text>
                {canViewAll && (
                    <Text style={{ fontSize: theme.typography.caption.fontSize, color: theme.colors.text.secondary, marginTop: theme.spacing.xs }}>
                        {item.employee.name}
                    </Text>
                )}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.text.secondary, marginRight: theme.spacing.xs }}>Check-in:</Text>
                    <Text style={{ fontWeight: 'bold', color: theme.colors.text.primary }}>{item.checkIn}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.text.secondary, marginRight: theme.spacing.xs }}>Check-out:</Text>
                    <Text style={{ fontWeight: 'bold', color: theme.colors.text.primary }}>{item.checkOut}</Text>
                </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.glass.border, paddingTop: theme.spacing.sm }}>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: theme.typography.caption.fontSize, color: theme.colors.text.secondary, marginBottom: theme.spacing.xs }}>Total Hours:</Text>
                    <Text style={{ fontSize: theme.typography.body.fontSize, fontWeight: 'bold', color: theme.colors.text.primary }}>{item.totalHours}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: theme.typography.caption.fontSize, color: theme.colors.text.secondary, marginBottom: theme.spacing.xs }}>Work Mode:</Text>
                    <Text style={{ fontSize: theme.typography.body.fontSize, fontWeight: 'bold', color: theme.colors.text.primary }}>{item.workMode}</Text>
                </View>
            </View>
        </LiquidGlassCard>
    );

    const renderEmptyComponent = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>📋 No Work Records</Text>
            <Text style={styles.emptyStateText}>
                {canViewAll
                    ? "No work records found. Employees need to check in/out to create records."
                    : "You haven't checked in yet.\nGo to Dashboard and check in to start tracking your time."}
            </Text>
        </View>
    );

    const renderTableView = () => {
        if (worktimeData.length === 0) {
            return renderEmptyComponent();
        }

        return (
            <ScrollView style={styles.tableContainer}>
                <View style={styles.table}>
                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, styles.colDate]}>Date</Text>
                        {canViewAll && <Text style={[styles.tableHeaderText, styles.colEmployee]}>Employee</Text>}
                        <Text style={[styles.tableHeaderText, styles.colTime]}>In</Text>
                        <Text style={[styles.tableHeaderText, styles.colTime]}>Out</Text>
                        <Text style={[styles.tableHeaderText, styles.colHours]}>Hours</Text>
                    </View>
                    
                    {/* Table Rows */}
                    {worktimeData.slice(0, displayCount).map((item, index) => (
                        <View 
                            key={item.id} 
                            style={[
                                styles.tableRow,
                                index % 2 === 0 && styles.tableRowEven
                            ]}
                        >
                            <Text style={[styles.tableCellText, styles.colDate]}>
                                {item.dateShort}
                            </Text>
                            {canViewAll && (
                                <Text style={[styles.tableCellText, styles.colEmployee]}>
                                    {item.employee.name.split(' ').map(n => n[0]).join('')}
                                </Text>
                            )}
                            <Text style={[styles.tableCellText, styles.colTime]}>
                                {item.checkIn}
                            </Text>
                            <Text style={[styles.tableCellText, styles.colTime]}>
                                {item.checkOut === 'Still working' ? '--' : item.checkOut}
                            </Text>
                            <Text style={[styles.tableCellText, styles.colHours]}>
                                {item.totalHours}
                            </Text>
                        </View>
                    ))}
                </View>
                
                {/* Show More/Less Button for Table View */}
                {worktimeData.length > 10 && (
                    <View style={styles.showMoreContainer}>
                        <TouchableOpacity
                            style={styles.showMoreButton}
                            onPress={handleShowMore}
                        >
                            <Text style={styles.showMoreText}>
                                {isExpanded 
                                    ? 'Hide' 
                                    : 'Show more'
                                }
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        );
    };

    return (
        <LiquidGlassLayout scrollable={false}>
            <HeaderBackButton destination="/employees" />
            <View style={styles.header}>
                <Text style={styles.title}>Worktime Tracking</Text>
                
                {/* Time Period Filter */}
                <View style={styles.timeFilterSection}>
                    <Text style={styles.selectorLabel}>Time Period:</Text>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        style={styles.selectorScroll}
                        contentContainerStyle={styles.selectorScrollContent}
                    >
                        {Object.entries(TIME_FILTERS).map(([key, filter]) => (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.selectorButton,
                                    selectedTimeFilter === key && styles.selectorButtonActive
                                ]}
                                onPress={() => setSelectedTimeFilter(key)}
                            >
                                <Text style={[
                                    styles.selectorButtonText,
                                    selectedTimeFilter === key && styles.selectorButtonTextActive
                                ]}>
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* View Toggle */}
                {worktimeData.length > 5 && (
                    <View style={styles.viewToggleSection}>
                        <Text style={styles.selectorLabel}>View:</Text>
                        <View style={styles.viewToggle}>
                            <TouchableOpacity
                                style={[
                                    styles.toggleButton,
                                    !isTableView && styles.toggleButtonActive
                                ]}
                                onPress={() => setIsTableView(false)}
                            >
                                <Text style={[
                                    styles.toggleButtonText,
                                    !isTableView && styles.toggleButtonTextActive
                                ]}>
                                    Cards
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.toggleButton,
                                    isTableView && styles.toggleButtonActive
                                ]}
                                onPress={() => setIsTableView(true)}
                            >
                                <Text style={[
                                    styles.toggleButtonText,
                                    isTableView && styles.toggleButtonTextActive
                                ]}>
                                    Table
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {canViewAll && employees.length > 0 && (
                    <View style={styles.timeFilterSection}>
                        <Text style={styles.selectorLabel}>Employee:</Text>
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            style={styles.selectorScroll}
                            contentContainerStyle={styles.selectorScrollContent}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.selectorButton,
                                    !selectedEmployee && styles.selectorButtonActive
                                ]}
                                onPress={() => setSelectedEmployee(null)}
                            >
                                <Text style={[
                                    styles.selectorButtonText,
                                    !selectedEmployee && styles.selectorButtonTextActive
                                ]}>
                                    All Employees
                                </Text>
                            </TouchableOpacity>
                            {employees.map(emp => (
                                <TouchableOpacity
                                    key={emp.id}
                                    style={[
                                        styles.selectorButton,
                                        selectedEmployee?.id === emp.id && styles.selectorButtonActive
                                    ]}
                                    onPress={() => setSelectedEmployee(emp)}
                                >
                                    <Text style={[
                                        styles.selectorButtonText,
                                        selectedEmployee?.id === emp.id && styles.selectorButtonTextActive
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
                <ActivityIndicator size="large" color={theme.colors.text.primary} style={styles.loader} />
            ) : isTableView ? (
                <FlatList
                    data={worktimeData.slice(0, displayCount)}
                    renderItem={({ item, index }) => (
                        <View 
                            style={[
                                styles.tableRow,
                                index % 2 === 0 && styles.tableRowEven
                            ]}
                        >
                            <Text style={[styles.tableCellText, styles.colDate]}>
                                {item.dateShort}
                            </Text>
                            {canViewAll && (
                                <Text style={[styles.tableCellText, styles.colEmployee]}>
                                    {item.employee.name.split(' ').map(n => n[0]).join('')}
                                </Text>
                            )}
                            <Text style={[styles.tableCellText, styles.colTime]}>
                                {item.checkIn}
                            </Text>
                            <Text style={[styles.tableCellText, styles.colTime]}>
                                {item.checkOut === 'Still working' ? '--' : item.checkOut}
                            </Text>
                            <Text style={[styles.tableCellText, styles.colHours]}>
                                {item.totalHours}
                            </Text>
                        </View>
                    )}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmptyComponent}
                    ListHeaderComponent={() => (
                        <View style={styles.table}>
                            {/* Table Header */}
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderText, styles.colDate]}>Date</Text>
                                {canViewAll && <Text style={[styles.tableHeaderText, styles.colEmployee]}>Employee</Text>}
                                <Text style={[styles.tableHeaderText, styles.colTime]}>In</Text>
                                <Text style={[styles.tableHeaderText, styles.colTime]}>Out</Text>
                                <Text style={[styles.tableHeaderText, styles.colHours]}>Hours</Text>
                            </View>
                        </View>
                    )}
                    ListFooterComponent={
                        worktimeData.length > 10 ? (
                            <View style={styles.showMoreContainer}>
                                <LiquidGlassButton
                                    title={isExpanded ? 'Hide' : 'Show more'}
                                    onPress={handleShowMore}
                                    variant="ghost"
                                    style={{ width: 'auto' }}
                                />
                            </View>
                        ) : null
                    }
                />
            ) : (
                <FlatList
                    data={worktimeData.slice(0, displayCount)}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmptyComponent}
                    ListFooterComponent={
                        !loading && worktimeData.length > 10 ? (
                            <View style={styles.showMoreContainer}>
                                <LiquidGlassButton
                                    title={isExpanded ? 'Hide' : 'Show more'}
                                    onPress={handleShowMore}
                                    variant="ghost"
                                    style={{ width: 'auto' }}
                                />
                            </View>
                        ) : null
                    }
                />
            )}

        </LiquidGlassLayout>
    );
}

