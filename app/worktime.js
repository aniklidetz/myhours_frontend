import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    ScrollView,
    Platform,
    Alert
} from 'react-native';
import { useUser, ROLES } from '../src/contexts/UserContext';
import useColors from '../hooks/useColors';
import ApiService from '../src/api/apiService';
import { API_ENDPOINTS, API_URL, APP_CONFIG } from '../src/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LiquidGlassScreenLayout from '../components/LiquidGlassScreenLayout';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import { commonStyles, COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants/CommonStyles';

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
    const [selectedTimeFilter, setSelectedTimeFilter] = useState('7_DAYS');
    const [isTableView, setIsTableView] = useState(false);
    const [displayCount, setDisplayCount] = useState(10); // Initially show 10 items
    const [isExpanded, setIsExpanded] = useState(false); // Track expansion state
    const abortControllerRef = React.useRef(null); // For cancelling requests
    const { user, hasAccess } = useUser();
    const { palette } = useColors();
    const theme = useLiquidGlassTheme();
    const canViewAll = hasAccess(ROLES.ACCOUNTANT);

    // Ensure theme is loaded before using it
    if (!theme) {
        return (
            <LiquidGlassScreenLayout scrollable={false}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
            </LiquidGlassScreenLayout>
        );
    }

    // Create styles after theme is loaded using CommonStyles
    const styles = StyleSheet.create({
        container: commonStyles.container,
        // Remove excessive padding in header
        header: {
            backgroundColor: 'transparent',
            paddingHorizontal: SPACING.lg, // Only side padding
            paddingTop: SPACING.md, // Minimal top padding
            paddingBottom: SPACING.sm, // Minimal bottom padding
        },
        title: {
            fontSize: TYPOGRAPHY.title.fontSize * 0.7,
            fontWeight: TYPOGRAPHY.title.fontWeight,
            color: COLORS.textPrimary,
            textShadowColor: theme.shadows.text.color,
            textShadowOffset: theme.shadows.text.offset,
            textShadowRadius: theme.shadows.text.radius,
        },
        loader: commonStyles.loader,
        // Reduce bottom padding
        listContent: {
            padding: SPACING.lg,
            paddingBottom: Platform.OS === 'ios' ? 100 : 80, // Reduced from 120/100
        },
        
        // Compact filter section organization
        filterSection: {
            marginBottom: SPACING.md, // Reduce spacing between sections
        },
        timeFilterSection: {
            marginBottom: SPACING.md, // Unified spacing
        },
        viewToggleSection: {
            marginBottom: SPACING.md, // Unified spacing
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        
        // Compact filter labels
        selectorLabel: {
            fontSize: TYPOGRAPHY.body.fontSize * 0.9, // Slightly smaller
            color: COLORS.textSecondary,
            marginBottom: SPACING.xs, // Reduced bottom margin
            fontWeight: '600',
            minWidth: 80, // Reduced minimum width
        },
        
        selectorScroll: {
            flexGrow: 0,
            flexShrink: 0,
        },
        selectorScrollContent: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: SPACING.xs,
            gap: SPACING.xs, // Use gap instead of marginRight
        },
        
        // Compact filter buttons
        selectorButton: {
            paddingHorizontal: SPACING.sm, // Reduced padding
            paddingVertical: SPACING.xs, // Reduced padding
            borderRadius: BORDER_RADIUS.md, // Smaller radius
            borderWidth: 1,
            borderColor: COLORS.glassBorder,
            backgroundColor: COLORS.glassLight,
            alignSelf: 'flex-start',
            flexShrink: 0,
            minWidth: 60, // Reduced minimum width
            height: 36, // Reduced height
            justifyContent: 'center',
            alignItems: 'center',
        },
        selectorButtonActive: {
            backgroundColor: COLORS.primary,
            borderColor: 'rgba(255, 255, 255, 0.25)',
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4,
        },
        selectorButtonText: {
            fontSize: TYPOGRAPHY.caption.fontSize, // Reduced text size
            color: COLORS.textPrimary,
            fontWeight: '500',
            textAlign: 'center',
        },
        selectorButtonTextActive: {
            color: '#FFFFFF',
            fontWeight: '600',
        },
        
        // Compact view toggle
        viewToggle: {
            flexDirection: 'row',
            backgroundColor: COLORS.glassLight,
            borderRadius: BORDER_RADIUS.sm, // Smaller radius
            padding: 2,
            borderWidth: 1,
            borderColor: COLORS.glassBorder,
            flexShrink: 1,
            minWidth: 100, // Reduced minimum width
        },
        toggleButton: {
            flex: 1,
            paddingVertical: SPACING.xs, // Reduced padding
            paddingHorizontal: SPACING.sm,
            borderRadius: BORDER_RADIUS.xs, // Smaller radius
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 50, // Reduced minimum width
        },
        toggleButtonActive: {
            backgroundColor: COLORS.primary,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.3,
            shadowRadius: 2,
        },
        toggleButtonText: {
            fontSize: TYPOGRAPHY.caption.fontSize, // Reduced size
            color: COLORS.textPrimary,
            fontWeight: '500',
            textAlign: 'center',
        },
        toggleButtonTextActive: {
            color: '#FFFFFF',
            fontWeight: '600',
        },
        viewToggleDisabled: {
            opacity: 0.5,
        },
        toggleButtonDisabled: {
            opacity: 0.6,
        },
        toggleButtonTextDisabled: {
            opacity: 0.5,
        },
        
        emptyState: commonStyles.emptyState,
        emptyStateTitle: {
            ...commonStyles.emptyStateTitle,
            fontSize: TYPOGRAPHY.title.fontSize * 0.8,
        },
        emptyStateText: commonStyles.emptyStateText,
        emptyStateHint: {
            fontSize: TYPOGRAPHY.caption.fontSize,
            color: COLORS.textSecondary,
            textAlign: 'center',
            marginTop: SPACING.lg,
            fontStyle: 'italic',
            opacity: 0.8,
        },
        
        // Compact show more button
        showMoreContainer: {
            padding: SPACING.md, // Reduced padding
            alignItems: 'center',
            backgroundColor: 'transparent',
        },
        showMoreButton: {
            backgroundColor: COLORS.glassMedium,
            paddingHorizontal: SPACING.lg,
            paddingVertical: SPACING.sm, // Reduced padding
            borderRadius: BORDER_RADIUS.md,
            borderWidth: 1,
            borderColor: COLORS.glassBorder,
        },
        showMoreText: {
            color: COLORS.textPrimary,
            fontSize: TYPOGRAPHY.body.fontSize,
            fontWeight: '600',
            textAlign: 'center',
        },
        
        // Table styles remain unchanged
        tableContainer: {
            flex: 1,
            padding: SPACING.lg,
            paddingBottom: Platform.OS === 'ios' ? 100 : 80, // Reduced
        },
        table: {
            backgroundColor: COLORS.glassLight,
            borderRadius: BORDER_RADIUS.md,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: COLORS.glassBorder,
        },
        tableHeader: {
            flexDirection: 'row',
            backgroundColor: COLORS.glassMedium,
            paddingVertical: SPACING.md,
            paddingHorizontal: SPACING.sm,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.glassBorder,
        },
        tableHeaderText: {
            fontSize: TYPOGRAPHY.caption.fontSize,
            fontWeight: 'bold',
            color: COLORS.textPrimary,
            textAlign: 'center',
        },
        tableRow: {
            flexDirection: 'row',
            paddingVertical: SPACING.sm,
            paddingHorizontal: SPACING.sm,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.glassBorder,
        },
        tableRowEven: {
            backgroundColor: COLORS.glassLight,
        },
        tableCellText: {
            fontSize: TYPOGRAPHY.caption.fontSize,
            color: COLORS.textPrimary,
            textAlign: 'center',
        },
        colDate: {
            flex: 2,
        },
        colEmployee: {
            flex: 2,
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

        // Cancel previous request if still pending
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Reset display count when filters change
        setDisplayCount(10);
        setIsExpanded(false);

        const debounceTimer = setTimeout(() => {
            fetchWorktimeData();
        }, 300);

        return () => {
            clearTimeout(debounceTimer);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [selectedEmployee, selectedTimeFilter]);

    const fetchWorktimeData = async () => {
        try {
            setLoading(true);

            // Create new AbortController for this request
            abortControllerRef.current = new AbortController();

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
            // Optimize page_size based on whether filtering by employee
            const pageSize = selectedEmployee && canViewAll ? '100' : '500';
            const apiParams = {
                date_from: startDateStr,
                date_to: endDateStr,
                page_size: pageSize,
                ordering: '-check_in'
            };

            // Add employee filter if selected
            if (selectedEmployee && canViewAll) {
                apiParams.employee = selectedEmployee.id;
            }

            console.log('Starting worktime API request:', {
                params: apiParams,
                selectedEmployee: selectedEmployee?.name || 'All Employees',
                requestTime: new Date().toISOString(),
                expectedTimeout: selectedEmployee ? '45s (extended for employee filter)' : '30s (standard)'
            });

            const startTime = Date.now();
            let responseData = await ApiService.worktime.getLogs(apiParams, {
                signal: abortControllerRef.current.signal
            });
            const endTime = Date.now();
            const requestDuration = endTime - startTime;

            console.log('Worktime API request completed:', {
                duration: `${requestDuration}ms`,
                dataLength: responseData?.results?.length || responseData?.length || 0,
                selectedEmployee: selectedEmployee?.name || 'All Employees'
            });

            if (requestDuration > 10000) {
                console.warn('Slow worktime API request detected:', {
                    duration: `${requestDuration}ms`,
                    employee: selectedEmployee?.name || 'All Employees',
                    timeFilter: selectedTimeFilter
                });
            }
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
            console.log(`Server returned ${transformedData.length} records already filtered by date`);
            let filtered = transformedData;

            // Filter by user role
            if (!canViewAll) {
                filtered = filtered.filter(item =>
                    item.employee.id === user.id ||
                    item.employee.email === user.email ||
                    item.employee.name.includes(user.first_name || '') ||
                    item.employee.name.includes(user.last_name || '')
                );
                console.log(`After user filtering: ${filtered.length} records`);
            } else if (selectedEmployee) {
                filtered = filtered.filter(item => item.employee.id === selectedEmployee.id);
                console.log(`After employee filtering: ${filtered.length} records`);
            }

            // Sort by date (newest first)
            filtered.sort((a, b) => {
                if (!a.dateRaw || !b.dateRaw) return 0;
                return b.dateRaw - a.dateRaw;
            });

            console.log(`Final worktime data: ${filtered.length} records for display`);
            console.log('Sample records:', filtered.slice(0, 3).map(item => ({
                id: item.id,
                date: item.dateShort,
                employee: canViewAll ? item.employee.name : 'Current User',
                hours: item.totalHours
            })));
            
            setWorktimeData(filtered);

        } catch (error) {
            // Don't handle errors for aborted requests
            if (error.name === 'AbortError' || error.message?.includes('aborted')) {
                console.log('Worktime request was cancelled');
                return;
            }
            
            if (error.message?.includes('Network Error')) {
                console.warn('Worktime API unavailable, using offline mode');
                setWorktimeData([]);
            } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                console.error('Worktime API timeout - server taking too long to respond:', {
                    selectedEmployee: selectedEmployee?.name || 'All Employees',
                    timeFilter: selectedTimeFilter,
                    timeout: error.timeout || (selectedEmployee ? '45000ms' : '30000ms'),
                    likelyNPlusOneProblem: !!selectedEmployee
                });
                console.warn('This might be caused by:');
                console.warn('   - Heavy database queries (N+1 problem on server)');
                console.warn('   - Large dataset for selected employee/period');
                console.warn('   - Server performance issues');
                
                // Show user-friendly message
                Alert.alert(
                    'Loading Taking Too Long',
                    `The server is taking longer than expected to load worktime data${selectedEmployee ? ` for ${selectedEmployee.name}` : ''}.\n\nThis might be due to:\n• Large amount of data to process\n• Server performance issues\n\nPlease try:\n• Selecting a shorter time period\n• Refreshing the page\n• Contacting support if the issue persists`,
                    [
                        { 
                            text: 'Try Shorter Period', 
                            onPress: () => setSelectedTimeFilter('7_DAYS')
                        },
                        { 
                            text: 'Refresh', 
                            onPress: () => {
                                setWorktimeData([]);
                                setTimeout(() => fetchWorktimeData(), 1000);
                            }
                        },
                        { text: 'OK' }
                    ]
                );
                setWorktimeData([]);
            } else {
                console.error('Error fetching worktime data:', error);
                setWorktimeData([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        if (!canViewAll) return;

        try {
            console.log('Fetching employees list...');
            const response = await ApiService.employees.getAll();

            if (response && response.results) {
                const employeeList = response.results.map(emp => ({
                    id: emp.id,
                    name: `${emp.first_name} ${emp.last_name}`,
                    email: emp.email
                }));
                setEmployees(employeeList);
                console.log('Fetched', employeeList.length, 'employees');
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
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
            <Text style={styles.emptyStateTitle}>No Work Records</Text>
            <Text style={styles.emptyStateText}>
                {canViewAll
                    ? "No work records found for the selected period.\nEmployees need to check in/out to create records."
                    : "You haven't checked in yet.\nGo to Dashboard and check in to start tracking your time."}
            </Text>
            {!canViewAll && (
                <Text style={styles.emptyStateHint}>
                    Tip: Use the biometric check-in for accurate time tracking
                </Text>
            )}
        </View>
    );


    return (
        <LiquidGlassScreenLayout.WithGlassHeader
            title="Worktime Tracking"
            backDestination="/employees"
            showLogout={true}
            scrollable={true}
        >
            <View style={{ flex: 1 }}>
                <View style={styles.header}>
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
                    <View style={styles.viewToggleSection}>
                        <Text style={styles.selectorLabel}>View:</Text>
                        <View style={[styles.viewToggle, worktimeData.length === 0 && styles.viewToggleDisabled]}>
                            <TouchableOpacity
                                style={[
                                    styles.toggleButton,
                                    !isTableView && styles.toggleButtonActive,
                                    worktimeData.length === 0 && styles.toggleButtonDisabled
                                ]}
                                onPress={() => worktimeData.length > 0 && setIsTableView(false)}
                                disabled={worktimeData.length === 0}
                            >
                                <Text style={[
                                    styles.toggleButtonText,
                                    !isTableView && styles.toggleButtonTextActive,
                                    worktimeData.length === 0 && styles.toggleButtonTextDisabled
                                ]}>
                                    Cards
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.toggleButton,
                                    isTableView && styles.toggleButtonActive,
                                    worktimeData.length === 0 && styles.toggleButtonDisabled
                                ]}
                                onPress={() => worktimeData.length > 0 && setIsTableView(true)}
                                disabled={worktimeData.length === 0}
                            >
                                <Text style={[
                                    styles.toggleButtonText,
                                    isTableView && styles.toggleButtonTextActive,
                                    worktimeData.length === 0 && styles.toggleButtonTextDisabled
                                ]}>
                                    Table
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Employee Filter for admins */}
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
                ) : worktimeData.length === 0 ? (
                    renderEmptyComponent()
                ) : (
                    <>
                        {isTableView ? (
                    <View style={styles.tableContainer}>
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
                        {worktimeData.length > 10 && (
                            <View style={styles.showMoreContainer}>
                                <LiquidGlassButton
                                    title={isExpanded ? 'Hide' : 'Show more'}
                                    onPress={handleShowMore}
                                    variant="ghost"
                                    style={{ width: 'auto' }}
                                />
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.listContent}>
                        {worktimeData.slice(0, displayCount).map((item) => (
                            <View key={item.id}>
                                {renderItem({ item })}
                            </View>
                        ))}
                        {!loading && worktimeData.length > 10 && (
                            <View style={styles.showMoreContainer}>
                                <LiquidGlassButton
                                    title={isExpanded ? 'Hide' : 'Show more'}
                                    onPress={handleShowMore}
                                    variant="ghost"
                                    style={{ width: 'auto' }}
                                />
                            </View>
                        )}
                    </View>
                        )}
                    </>
                )}
            </View>
        </LiquidGlassScreenLayout.WithGlassHeader>
    );
}