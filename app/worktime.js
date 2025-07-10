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

const TIME_FILTERS = {
    '3_DAYS': { label: '3 Days', days: 3 },
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
    const [selectedTimeFilter, setSelectedTimeFilter] = useState('3_DAYS');
    const [isTableView, setIsTableView] = useState(false);
    const [displayCount, setDisplayCount] = useState(10); // Initially show 10 items
    const [isExpanded, setIsExpanded] = useState(false); // Track expansion state
    const { user, hasAccess } = useUser();
    const { palette } = useColors();
    const canViewAll = hasAccess(ROLES.ACCOUNTANT);

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

            console.log('🔍 Fetching worktime data...');

            // Calculate date range based on selected filter
            const daysBack = TIME_FILTERS[selectedTimeFilter].days;
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysBack);

            // Format dates for API (YYYY-MM-DD)
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            console.log(`📅 Fetching worktime data from ${startDateStr} to ${endDateStr} (${daysBack} days)`);

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

            console.log('📥 Calling ApiService.worktime.getLogs with params:', apiParams);
            let responseData = await ApiService.worktime.getLogs(apiParams);
            console.log('📊 Worktime API data:', responseData);

            const apiData = responseData.results || responseData || [];
            console.log(`📊 Total records fetched: ${apiData.length}`);

            // Transform API data
            const transformedData = Array.isArray(apiData) ? apiData.map(worklog => {
                const checkInDate = worklog.check_in ? new Date(worklog.check_in) : null;
                const checkOutDate = worklog.check_out ? new Date(worklog.check_out) : null;

                const isValidCheckIn = checkInDate && !isNaN(checkInDate.getTime());
                const isValidCheckOut = checkOutDate && !isNaN(checkOutDate.getTime());


                // Enhanced employee data extraction
                const employeeData = worklog.employee || worklog.employee_data || {};
                
                console.log('🔍 Processing worklog item:', {
                    worklogId: worklog.id,
                    employeeField: worklog.employee,
                    employeeDataField: worklog.employee_data,
                    employeeNameField: worklog.employee_name,
                    mergedEmployeeData: employeeData
                });
                
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
                
                console.log('✅ Processed worklog item:', {
                    worklogId: worklog.id,
                    employeeId,
                    employeeName,
                    employeeEmail
                });

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
                console.log(`👤 After employee filtering (${selectedEmployee.name}): ${filtered.length} records`);
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
                employee: item.employee.name,
                hours: item.totalHours
            })));
            
            setWorktimeData(filtered);

        } catch (error) {
            console.error('❌ Error fetching worktime data:', error);
            setWorktimeData([]);
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
        <View style={styles(palette).card}>
            <View style={styles(palette).cardHeader}>
                <Text style={styles(palette).dateText}>{item.date}</Text>
                {canViewAll && <Text style={styles(palette).employeeText}>{item.employee.name}</Text>}
            </View>
            <View style={styles(palette).timeRow}>
                <View style={styles(palette).timeItem}>
                    <Text style={styles(palette).timeLabel}>Check-in:</Text>
                    <Text style={styles(palette).timeValue}>{item.checkIn}</Text>
                </View>
                <View style={styles(palette).timeItem}>
                    <Text style={styles(palette).timeLabel}>Check-out:</Text>
                    <Text style={styles(palette).timeValue}>{item.checkOut}</Text>
                </View>
            </View>
            <View style={styles(palette).summaryRow}>
                <View style={styles(palette).summaryItem}>
                    <Text style={styles(palette).summaryLabel}>Total Hours:</Text>
                    <Text style={styles(palette).summaryValue}>{item.totalHours}</Text>
                </View>
                <View style={styles(palette).summaryItem}>
                    <Text style={styles(palette).summaryLabel}>Work Mode:</Text>
                    <Text style={styles(palette).summaryValue}>{item.workMode}</Text>
                </View>
            </View>
        </View>
    );

    const renderEmptyComponent = () => (
        <View style={styles(palette).emptyState}>
            <Text style={styles(palette).emptyStateTitle}>📋 No Work Records</Text>
            <Text style={styles(palette).emptyStateText}>
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
            <ScrollView style={styles(palette).tableContainer}>
                <View style={styles(palette).table}>
                    {/* Table Header */}
                    <View style={styles(palette).tableHeader}>
                        <Text style={[styles(palette).tableHeaderText, styles(palette).colDate]}>Date</Text>
                        {canViewAll && <Text style={[styles(palette).tableHeaderText, styles(palette).colEmployee]}>Employee</Text>}
                        <Text style={[styles(palette).tableHeaderText, styles(palette).colTime]}>In</Text>
                        <Text style={[styles(palette).tableHeaderText, styles(palette).colTime]}>Out</Text>
                        <Text style={[styles(palette).tableHeaderText, styles(palette).colHours]}>Hours</Text>
                    </View>
                    
                    {/* Table Rows */}
                    {worktimeData.slice(0, displayCount).map((item, index) => (
                        <View 
                            key={item.id} 
                            style={[
                                styles(palette).tableRow,
                                index % 2 === 0 && styles(palette).tableRowEven
                            ]}
                        >
                            <Text style={[styles(palette).tableCellText, styles(palette).colDate]}>
                                {item.dateShort}
                            </Text>
                            {canViewAll && (
                                <Text style={[styles(palette).tableCellText, styles(palette).colEmployee]}>
                                    {item.employee.name.split(' ').map(n => n[0]).join('')}
                                </Text>
                            )}
                            <Text style={[styles(palette).tableCellText, styles(palette).colTime]}>
                                {item.checkIn}
                            </Text>
                            <Text style={[styles(palette).tableCellText, styles(palette).colTime]}>
                                {item.checkOut === 'Still working' ? '--' : item.checkOut}
                            </Text>
                            <Text style={[styles(palette).tableCellText, styles(palette).colHours]}>
                                {item.totalHours}
                            </Text>
                        </View>
                    ))}
                </View>
                
                {/* Show More/Less Button for Table View */}
                {worktimeData.length > 10 && (
                    <View style={styles(palette).showMoreContainer}>
                        <TouchableOpacity
                            style={styles(palette).showMoreButton}
                            onPress={handleShowMore}
                        >
                            <Text style={styles(palette).showMoreText}>
                                {isExpanded 
                                    ? `Show Less (${worktimeData.length} → 10)` 
                                    : `Show All (${displayCount} of ${worktimeData.length})`
                                }
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles(palette).container}>
            <HeaderBackButton destination="/employees" />
            <View style={styles(palette).header}>
                <Text style={styles(palette).title}>Worktime Tracking</Text>
                
                {/* Time Period Filter */}
                <View style={styles(palette).timeFilterSection}>
                    <Text style={styles(palette).selectorLabel}>Time Period:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles(palette).selectorScroll}>
                        {Object.entries(TIME_FILTERS).map(([key, filter]) => (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles(palette).selectorButton,
                                    selectedTimeFilter === key && styles(palette).selectorButtonActive
                                ]}
                                onPress={() => setSelectedTimeFilter(key)}
                            >
                                <Text style={[
                                    styles(palette).selectorButtonText,
                                    selectedTimeFilter === key && styles(palette).selectorButtonTextActive
                                ]}>
                                    {filter.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* View Toggle */}
                {worktimeData.length > 5 && (
                    <View style={styles(palette).viewToggleSection}>
                        <Text style={styles(palette).selectorLabel}>View:</Text>
                        <View style={styles(palette).viewToggle}>
                            <TouchableOpacity
                                style={[
                                    styles(palette).toggleButton,
                                    !isTableView && styles(palette).toggleButtonActive
                                ]}
                                onPress={() => setIsTableView(false)}
                            >
                                <Text style={[
                                    styles(palette).toggleButtonText,
                                    !isTableView && styles(palette).toggleButtonTextActive
                                ]}>
                                    Cards
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles(palette).toggleButton,
                                    isTableView && styles(palette).toggleButtonActive
                                ]}
                                onPress={() => setIsTableView(true)}
                            >
                                <Text style={[
                                    styles(palette).toggleButtonText,
                                    isTableView && styles(palette).toggleButtonTextActive
                                ]}>
                                    Table
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {canViewAll && employees.length > 0 && (
                    <View style={styles(palette).employeeSelector}>
                        <Text style={styles(palette).selectorLabel}>Employee:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles(palette).selectorScroll}>
                            <TouchableOpacity
                                style={[
                                    styles(palette).selectorButton,
                                    !selectedEmployee && styles(palette).selectorButtonActive
                                ]}
                                onPress={() => setSelectedEmployee(null)}
                            >
                                <Text style={[
                                    styles(palette).selectorButtonText,
                                    !selectedEmployee && styles(palette).selectorButtonTextActive
                                ]}>
                                    All Employees
                                </Text>
                            </TouchableOpacity>
                            {employees.map(emp => (
                                <TouchableOpacity
                                    key={emp.id}
                                    style={[
                                        styles(palette).selectorButton,
                                        selectedEmployee?.id === emp.id && styles(palette).selectorButtonActive
                                    ]}
                                    onPress={() => setSelectedEmployee(emp)}
                                >
                                    <Text style={[
                                        styles(palette).selectorButtonText,
                                        selectedEmployee?.id === emp.id && styles(palette).selectorButtonTextActive
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
                <ActivityIndicator size="large" color={palette.primary} style={styles(palette).loader} />
            ) : isTableView ? (
                renderTableView()
            ) : (
                <FlatList
                    data={worktimeData.slice(0, displayCount)}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles(palette).listContent}
                    ListEmptyComponent={renderEmptyComponent}
                />
            )}

            {/* Show More/Less Button */}
            {!loading && worktimeData.length > 10 && (
                <View style={styles(palette).showMoreContainer}>
                    <TouchableOpacity
                        style={styles(palette).showMoreButton}
                        onPress={handleShowMore}
                    >
                        <Text style={styles(palette).showMoreText}>
                            {isExpanded 
                                ? `Show Less (${worktimeData.length} → 10)` 
                                : `Show All (${displayCount} of ${worktimeData.length})`
                            }
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

        </SafeAreaView>
    );
}

const styles = palette => StyleSheet.create({
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
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: palette.text.primary,
    },
    employeeSelector: {
        marginTop: 16,
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
    listContent: {
        padding: 16,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: palette.background.primary,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: {
        borderBottomColor: palette.border,
        borderBottomWidth: 1,
        marginBottom: 8,
        paddingBottom: 8,
    },
    dateText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: palette.text.primary,
    },
    employeeText: {
        fontSize: 14,
        color: palette.text.secondary,
        marginTop: 4,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    timeItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeLabel: {
        color: palette.text.secondary,
        marginRight: 4,
    },
    timeValue: {
        fontWeight: 'bold',
        color: palette.text.primary,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopColor: palette.border,
        borderTopWidth: 1,
        paddingTop: 8,
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 12,
        color: palette.text.secondary,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: palette.text.primary,
    },
    footer: {
        backgroundColor: palette.background.primary,
        borderTopColor: palette.border,
        borderTopWidth: 1,
        padding: 16,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        minHeight: 400,
    },
    emptyStateTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: palette.text.primary,
        marginBottom: 16,
        textAlign: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: palette.text.secondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    timeFilterSection: {
        marginTop: 16,
    },
    viewToggleSection: {
        marginTop: 16,
    },
    viewToggle: {
        flexDirection: 'row',
        backgroundColor: palette.background.secondary,
        borderRadius: 8,
        padding: 2,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    toggleButtonActive: {
        backgroundColor: palette.primary,
    },
    toggleButtonText: {
        fontSize: 14,
        color: palette.text.primary,
        fontWeight: '500',
    },
    toggleButtonTextActive: {
        color: palette.text.light,
    },
    tableContainer: {
        flex: 1,
        padding: 16,
    },
    table: {
        backgroundColor: palette.background.primary,
        borderRadius: 8,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: palette.background.secondary,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
    },
    tableHeaderText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: palette.text.primary,
        textAlign: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
    },
    tableRowEven: {
        backgroundColor: palette.background.secondary,
    },
    tableCellText: {
        fontSize: 11,
        color: palette.text.primary,
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
    showMoreContainer: {
        padding: 16,
        alignItems: 'center',
        backgroundColor: palette.background.secondary,
    },
    showMoreButton: {
        backgroundColor: palette.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        elevation: 2,
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    showMoreText: {
        color: palette.text.light,
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
});