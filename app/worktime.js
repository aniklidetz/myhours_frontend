import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    ActivityIndicator,
    SafeAreaView
} from 'react-native';
import { useUser, ROLES } from '../src/contexts/UserContext';
import useColors from '../hooks/useColors';
import BackButton from '../src/components/BackButton';

/**
 * Work time tracking screen
 */
export default function WorktimeScreen() {
    const [worktimeData, setWorktimeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user, hasAccess } = useUser();
    const { palette } = useColors();
    const canViewAll = hasAccess(ROLES.ACCOUNTANT);

    useEffect(() => {
        fetchWorktimeData();
    }, []);

    const fetchWorktimeData = async () => {
        try {
            setLoading(true);
            const mockData = generateMockData();
            const filtered = canViewAll
                ? mockData
                : mockData.filter(item => item.employee.id === user.id);
            setWorktimeData(filtered);
        } catch (error) {
            console.error('Error fetching worktime data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Generate sample data including work mode
    const generateMockData = () => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const formatDate = date => date.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        return [
            { id: 1, date: formatDate(today), employee: { id: user.id, name: user.name }, checkIn: '09:00', checkOut: '18:00', totalHours: 9, isRemote: false },
            { id: 2, date: formatDate(yesterday), employee: { id: user.id, name: user.name }, checkIn: '08:30', checkOut: '17:30', totalHours: 9, isRemote: true },
            { id: 3, date: formatDate(today), employee: { id: 5, name: 'John Smith' }, checkIn: '09:15', checkOut: '18:15', totalHours: 9, isRemote: false },
            { id: 4, date: formatDate(yesterday), employee: { id: 6, name: 'Emily Johnson' }, checkIn: '08:45', checkOut: '17:30', totalHours: 8.75, isRemote: true }
        ];
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
                    <Text style={styles(palette).summaryValue}>
                        {item.isRemote ? 'Remote' : 'Office'}
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles(palette).container}>
            <View style={styles(palette).header}>
                <Text style={styles(palette).title}>Worktime Tracking</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={palette.primary} style={styles(palette).loader} />
            ) : (
                <FlatList
                    data={worktimeData}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles(palette).listContent}
                />
            )}

            <View style={styles(palette).footer}>
                <BackButton destination="/employees" />
            </View>
        </SafeAreaView>
    );
}

// Styles generator based on current palette
const styles = palette => StyleSheet.create({
    container: {
        backgroundColor: palette.background.secondary,
        flex: 1,
    },
    header: {
        alignItems: 'center',
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
});