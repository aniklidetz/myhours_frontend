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
    TextInput,
    Modal,
    Switch,
    ScrollView
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useUser, ROLES } from '../src/contexts/UserContext';
import { useOffice } from '../src/contexts/OfficeContext';
import useColors from '../hooks/useColors';

export default function AdminScreen() {
    const [loading, setLoading] = useState(false);
    
    const { user, hasAccess } = useUser();
    const { palette } = useColors();
    const {
        officeSettings,
        loading: officeLoading,
        updateOfficeLocation,
        updateAllSettings,
        reloadSettings
    } = useOffice();

    // Office settings state
    const [locationStr, setLocationStr] = useState('');
    const [radiusStr, setRadiusStr] = useState('');
    const [policy, setPolicy] = useState('hybrid');
    const [gettingLocation, setGettingLocation] = useState(false);
    const [showPolicyModal, setShowPolicyModal] = useState(false);

    // Строгая проверка прав доступа
    useEffect(() => {
        if (!user || !hasAccess(ROLES.ADMIN)) {
            Alert.alert('Access Denied', 'You do not have permission to access this screen');
            router.replace('/employees');
            return;
        }
    }, [user, hasAccess]);

    // Load office settings
    useEffect(() => {
        if (!officeLoading && officeSettings) {
            const { latitude, longitude } = officeSettings.location;
            setLocationStr(
                latitude != null && longitude != null
                    ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                    : ''
            );
            setRadiusStr(officeSettings.checkRadius.toString());
            setPolicy(officeSettings.remotePolicy);
        }
    }, [officeLoading, officeSettings]);


    // Office settings functions
    const handleGetLocation = async () => {
        setGettingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow location access in your device settings');
                return;
            }
            
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest,
            });
            const { latitude, longitude } = loc.coords;
            const coordString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setLocationStr(coordString);
            
            Alert.alert(
                'Location Retrieved',
                `Current coordinates:\n${coordString}\n\nWould you like to set this as your office location?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                        text: 'Set as Office Location', 
                        onPress: async () => {
                            const success = await updateOfficeLocation({ latitude, longitude });
                            if (success) {
                                Alert.alert('Success', 'Office location updated successfully!');
                            } else {
                                Alert.alert('Error', 'Failed to save office location');
                            }
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Location error:', error);
            Alert.alert('Error', 'Failed to retrieve current location. Please try again.');
        } finally {
            setGettingLocation(false);
        }
    };

    const handleSaveOfficeSettings = async () => {
        // Validate location
        const parts = locationStr.split(',').map(s => s.trim());
        if (parts.length !== 2) {
            Alert.alert('Invalid Location', 'Please enter coordinates as: latitude, longitude\nExample: 32.0853, 34.7818');
            return;
        }
        
        const [lat, lon] = parts.map(Number);
        if (isNaN(lat) || isNaN(lon)) {
            Alert.alert('Invalid Coordinates', 'Coordinates must be valid numbers');
            return;
        }
        
        if (lat < -90 || lat > 90) {
            Alert.alert('Invalid Latitude', 'Latitude must be between -90 and 90');
            return;
        }
        
        if (lon < -180 || lon > 180) {
            Alert.alert('Invalid Longitude', 'Longitude must be between -180 and 180');
            return;
        }
        
        // Validate radius
        const rad = parseInt(radiusStr, 10);
        if (isNaN(rad) || rad <= 0) {
            Alert.alert('Invalid Radius', 'Radius must be a positive number (minimum 10 meters)');
            return;
        }
        
        if (rad < 10) {
            Alert.alert('Radius Too Small', 'Minimum radius is 10 meters for practical use');
            return;
        }
        
        if (rad > 10000) {
            Alert.alert('Radius Too Large', 'Maximum radius is 10,000 meters (10km)');
            return;
        }
        
        try {
            // Log current state before saving
            console.log('Current state before save:', {
                locationStr,
                radiusStr,
                policy,
                parsedLat: lat,
                parsedLon: lon,
                parsedRadius: rad
            });

            // Save all settings in one batch to prevent conflicts
            const newSettings = {
                location: { latitude: lat, longitude: lon },
                checkRadius: rad,
                remotePolicy: policy
            };
            
            console.log('Saving all settings at once:', newSettings);
            const success = await updateAllSettings(newSettings);
            
            if (success) {
                // Reload settings to get the updated values
                await reloadSettings();
                Alert.alert('Success', '✅ All office settings have been saved successfully!');
            } else {
                console.error('Failed to save settings - updateAllSettings returned false');
                Alert.alert('Error', '❌ Failed to save office settings. Please try again.');
            }
        } catch (error) {
            console.error('Save settings error:', error);
            Alert.alert('Error', `Failed to save office settings: ${error.message || 'Unknown error'}`);
        }
    };


    const renderOfficeTab = () => (
        <View style={styles(palette).tabContent}>
            <View style={styles(palette).header}>
                <Text style={styles(palette).title}>Office Settings</Text>
            </View>
            <ScrollView contentContainerStyle={styles(palette).scrollContent}>
                {/* Office Location */}
                <View style={styles(palette).section}>
                    <Text style={styles(palette).sectionTitle}>📍 Office Location</Text>
                    <Text style={styles(palette).sectionDescription}>
                        Set the GPS coordinates of your office for location-based check-ins
                    </Text>
                    <TextInput
                        style={styles(palette).input}
                        placeholder="latitude, longitude (e.g., 32.0853, 34.7818)"
                        value={locationStr}
                        onChangeText={setLocationStr}
                        keyboardType="decimal-pad"
                        placeholderTextColor={palette.text.secondary}
                    />
                    <TouchableOpacity
                        style={styles(palette).locationButton}
                        onPress={handleGetLocation}
                        disabled={gettingLocation}
                    >
                        <Text style={styles(palette).buttonText}>
                            {gettingLocation ? '📍 Getting Location...' : '📱 Use Current Location'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Check Radius */}
                <View style={styles(palette).section}>
                    <Text style={styles(palette).sectionTitle}>📏 Check-in Radius</Text>
                    <Text style={styles(palette).sectionDescription}>
                        Maximum distance (in meters) from office to allow office check-ins
                    </Text>
                    <TextInput
                        style={styles(palette).input}
                        placeholder="100"
                        value={radiusStr}
                        onChangeText={setRadiusStr}
                        keyboardType="numeric"
                        placeholderTextColor={palette.text.secondary}
                    />
                </View>

                {/* Work Policy */}
                <View style={styles(palette).section}>
                    <Text style={styles(palette).sectionTitle}>🏢 Work Policy</Text>
                    <Text style={styles(palette).sectionDescription}>
                        Choose your company's remote work policy
                    </Text>
                    <TouchableOpacity 
                        style={styles(palette).policySelector}
                        onPress={() => setShowPolicyModal(true)}
                    >
                        <Text style={styles(palette).policySelectorText}>
                            {policy === 'office-only' ? '🏢 Office Only' : 
                             policy === 'remote-only' ? '🏠 Remote Only' : '🔄 Hybrid'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Current Settings Summary */}
                <View style={styles(palette).summarySection}>
                    <Text style={styles(palette).summaryTitle}>📋 Current Settings</Text>
                    <View style={styles(palette).summaryItem}>
                        <Text style={styles(palette).summaryLabel}>Office Location:</Text>
                        <Text style={styles(palette).summaryValue}>
                            {locationStr || 'Not configured'}
                        </Text>
                    </View>
                    <View style={styles(palette).summaryItem}>
                        <Text style={styles(palette).summaryLabel}>Check Radius:</Text>
                        <Text style={styles(palette).summaryValue}>{radiusStr || '100'} meters</Text>
                    </View>
                    <View style={styles(palette).summaryItem}>
                        <Text style={styles(palette).summaryLabel}>Work Policy:</Text>
                        <Text style={styles(palette).summaryValue}>
                            {policy === 'office-only' ? 'Office Only' : 
                             policy === 'remote-only' ? 'Remote Only' : 'Hybrid'}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity style={styles(palette).saveButton} onPress={handleSaveOfficeSettings}>
                    <Text style={styles(palette).saveButtonText}>💾 Save Office Settings</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );

    if (!user || !hasAccess(ROLES.ADMIN)) {
        return null;
    }

    return (
        <SafeAreaView style={styles(palette).container}>
            {/* Header */}
            <View style={styles(palette).header}>
                <Text style={styles(palette).headerTitle}>🏢 Office Settings</Text>
                <Text style={styles(palette).headerSubtitle}>Configure office location and work policies</Text>
            </View>

            {/* Office Settings Content */}
            {renderOfficeTab()}

            {/* Policy Selection Modal */}
            <Modal
                transparent={true}
                visible={showPolicyModal}
                animationType="slide"
                onRequestClose={() => setShowPolicyModal(false)}
            >
                <View style={styles(palette).modalOverlay}>
                    <View style={styles(palette).modalContent}>
                        <Text style={styles(palette).modalTitle}>Select Work Policy</Text>
                        
                        <TouchableOpacity 
                            style={[styles(palette).policyOption, policy === 'office-only' && styles(palette).selectedOption]}
                            onPress={() => {
                                setPolicy('office-only');
                                setShowPolicyModal(false);
                            }}
                        >
                            <Text style={styles(palette).policyOptionText}>🏢 Office Only</Text>
                            <Text style={styles(palette).policyOptionDesc}>Employees must work from office</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles(palette).policyOption, policy === 'remote-only' && styles(palette).selectedOption]}
                            onPress={() => {
                                setPolicy('remote-only');
                                setShowPolicyModal(false);
                            }}
                        >
                            <Text style={styles(palette).policyOptionText}>🏠 Remote Only</Text>
                            <Text style={styles(palette).policyOptionDesc}>Employees work remotely</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles(palette).policyOption, policy === 'hybrid' && styles(palette).selectedOption]}
                            onPress={() => {
                                setPolicy('hybrid');
                                setShowPolicyModal(false);
                            }}
                        >
                            <Text style={styles(palette).policyOptionText}>🔄 Hybrid</Text>
                            <Text style={styles(palette).policyOptionDesc}>Mix of office and remote work</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={styles(palette).cancelButton}
                            onPress={() => setShowPolicyModal(false)}
                        >
                            <Text style={styles(palette).cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = (palette) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: palette.background.secondary,
    },
    header: {
        backgroundColor: palette.background.primary,
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: palette.text.primary,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: palette.text.secondary,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: palette.background.primary,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: palette.primary,
    },
    tabText: {
        fontSize: 16,
        color: palette.text.secondary,
    },
    activeTabText: {
        color: palette.primary,
        fontWeight: 'bold',
    },
    tabContent: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: palette.background.primary,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: palette.text.primary,
    },
    addButton: {
        backgroundColor: palette.success,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    addButtonText: {
        color: palette.text.light,
        fontWeight: 'bold',
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: palette.background.primary,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    inactiveCard: {
        opacity: 0.6,
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: palette.text.primary,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: palette.text.secondary,
        marginBottom: 8,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    adminBadge: {
        backgroundColor: palette.danger,
    },
    accountantBadge: {
        backgroundColor: palette.primary,
    },
    employeeBadge: {
        backgroundColor: palette.success,
    },
    roleText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: palette.text.light,
    },
    cardActions: {
        alignItems: 'flex-end',
    },
    inactiveLabel: {
        fontSize: 12,
        color: palette.danger,
        marginBottom: 8,
    },
    editButton: {
        backgroundColor: palette.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    editButtonText: {
        color: palette.text.light,
        fontWeight: 'bold',
        fontSize: 12,
    },
    
    // Office Settings Styles
    scrollContent: {
        padding: 16,
    },
    section: {
        backgroundColor: palette.background.primary,
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        elevation: 2,
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: palette.text.primary,
        marginBottom: 8,
    },
    sectionDescription: {
        fontSize: 14,
        color: palette.text.secondary,
        marginBottom: 16,
        lineHeight: 20,
    },
    input: {
        backgroundColor: palette.background.secondary,
        borderColor: palette.border,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: palette.text.primary,
        marginBottom: 12,
    },
    locationButton: {
        backgroundColor: palette.primary,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: palette.text.light,
        fontWeight: 'bold',
        fontSize: 16,
    },
    policySelector: {
        backgroundColor: palette.background.secondary,
        borderColor: palette.border,
        borderWidth: 1,
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    policySelectorText: {
        fontSize: 16,
        color: palette.text.primary,
        fontWeight: '500',
    },
    summarySection: {
        backgroundColor: palette.background.primary,
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        borderWidth: 2,
        borderColor: palette.primary,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: palette.primary,
        marginBottom: 16,
    },
    summaryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 14,
        color: palette.text.secondary,
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: 14,
        color: palette.text.primary,
        fontWeight: 'bold',
    },
    saveButton: {
        backgroundColor: palette.success,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 3,
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    saveButtonText: {
        color: palette.text.light,
        fontWeight: 'bold',
        fontSize: 18,
    },
    
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '90%',
        maxWidth: 400,
        backgroundColor: palette.background.primary,
        borderRadius: 12,
        padding: 24,
        elevation: 5,
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: palette.text.primary,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        color: palette.text.secondary,
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '500',
    },
    textInput: {
        backgroundColor: palette.background.secondary,
        borderColor: palette.border,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: palette.text.primary,
    },
    roleSelectors: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    roleSelector: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: palette.background.secondary,
        borderColor: palette.border,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginHorizontal: 2,
    },
    selectedRole: {
        backgroundColor: palette.primary,
        borderColor: palette.primary,
    },
    roleSelectorText: {
        fontSize: 12,
        color: palette.text.primary,
        fontWeight: '500',
    },
    statusToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    statusText: {
        color: palette.text.primary,
        fontSize: 14,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 24,
    },
    modalButton: {
        flex: 1,
        alignItems: 'center',
        borderRadius: 8,
        marginHorizontal: 4,
        padding: 12,
    },
    cancelButton: {
        backgroundColor: palette.background.secondary,
        borderColor: palette.border,
        borderWidth: 1,
        marginTop: 12,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: palette.text.secondary,
        fontWeight: 'bold',
    },
    saveModalButton: {
        backgroundColor: palette.success,
    },
    saveModalButtonText: {
        color: palette.text.light,
        fontWeight: 'bold',
    },
    
    // Policy Modal Styles
    policyOption: {
        backgroundColor: palette.background.secondary,
        borderColor: palette.border,
        borderWidth: 1,
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
    },
    selectedOption: {
        backgroundColor: palette.primary,
        borderColor: palette.primary,
    },
    policyOptionText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: palette.text.primary,
        marginBottom: 4,
    },
    policyOptionDesc: {
        fontSize: 12,
        color: palette.text.secondary,
        textAlign: 'center',
    },
});