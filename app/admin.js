import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    ScrollView,
    ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useUser, ROLES } from '../src/contexts/UserContext';
import { useOffice } from '../src/contexts/OfficeContext';
import useColors from '../hooks/useColors';
import LiquidGlassLayout from '../components/LiquidGlassLayout';
import LiquidGlassCard from '../components/LiquidGlassCard';
import LiquidGlassButton from '../components/LiquidGlassButton';
import LiquidGlassInput from '../components/LiquidGlassInput';
import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
import GlassModal from '../components/GlassModal';
import useGlassModal from '../hooks/useGlassModal';

export default function AdminScreen() {
    
    const { user, hasAccess } = useUser();
    const { palette } = useColors();
    const theme = useLiquidGlassTheme();
    const { modalState, showModal, showConfirm, showAlert, showError, hideModal } = useGlassModal();
    const {
        officeSettings,
        loading: officeLoading,
        updateOfficeLocation,
        updateAllSettings,
        reloadSettings
    } = useOffice();

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

    // Create liquid glass styles after theme is loaded
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
        headerTitle: {
            fontSize: theme.typography.title.fontSize * 0.7,
            fontWeight: theme.typography.title.fontWeight,
            color: theme.colors.text.primary,
            textShadowColor: theme.shadows.text.color,
            textShadowOffset: theme.shadows.text.offset,
            textShadowRadius: theme.shadows.text.radius,
        },
        headerSubtitle: {
            fontSize: theme.typography.subtitle.fontSize * 0.8,
            color: theme.colors.text.secondary,
            marginTop: theme.spacing.xs,
            textAlign: 'center',
        },
        content: {
            flex: 1,
            padding: theme.spacing.lg,
        },
        settingsCard: {
            marginBottom: theme.spacing.md,
        },
        sectionTitle: {
            fontSize: theme.typography.body.fontSize,
            fontWeight: 'bold',
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.sm,
        },
        inputContainer: {
            marginBottom: theme.spacing.md,
        },
        inputLabel: {
            fontSize: theme.typography.body.fontSize,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.sm,
        },
        inputRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: theme.spacing.sm,
        },
        input: {
            flex: 1,
            marginRight: theme.spacing.sm,
        },
        confirmButton: {
            minWidth: 80,
        },
        statusText: {
            fontSize: theme.typography.caption.fontSize,
            color: theme.colors.text.secondary,
            marginTop: theme.spacing.xs,
        },
        successText: {
            color: theme.colors.status.success[0],
        },
        errorText: {
            color: theme.colors.status.error[0],
        },
        currentLocationText: {
            fontSize: theme.typography.caption.fontSize,
            color: theme.colors.text.secondary,
            marginTop: theme.spacing.xs,
        },
        policyContainer: {
            marginBottom: theme.spacing.md,
        },
        policyButton: {
            backgroundColor: theme.colors.glass.medium,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
            borderWidth: 1,
            borderColor: theme.colors.glass.border,
        },
        policyText: {
            fontSize: theme.typography.body.fontSize,
            color: theme.colors.text.primary,
            textAlign: 'center',
        },
        actionButtons: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: theme.spacing.lg,
        },
        actionButton: {
            flex: 1,
            marginHorizontal: theme.spacing.xs,
        },
    });

    // Office settings state
    const [locationStr, setLocationStr] = useState('');
    const [radiusStr, setRadiusStr] = useState('');
    const [policy, setPolicy] = useState('hybrid');
    const [gettingLocation, setGettingLocation] = useState(false);
    
    // Confirmation state for number inputs
    const [locationInput, setLocationInput] = useState('');
    const [locationConfirmed, setLocationConfirmed] = useState(false);
    const [radiusInput, setRadiusInput] = useState('');
    const [radiusConfirmed, setRadiusConfirmed] = useState(false);

    // Строгая проверка прав доступа
    useEffect(() => {
        if (!user || !hasAccess(ROLES.ADMIN)) {
            showAlert({
                title: 'Access Denied',
                message: 'You do not have permission to access this screen',
                onPress: () => router.replace('/employees')
            });
            return;
        }
    }, [user, hasAccess]);

    // Load office settings
    useEffect(() => {
        if (!officeLoading && officeSettings) {
            const { latitude, longitude } = officeSettings.location;
            const locationValue = latitude != null && longitude != null
                ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                : '';
            setLocationStr(locationValue);
            setLocationInput(locationValue);
            setLocationConfirmed(!!locationValue);
            
            const radiusValue = officeSettings.checkRadius.toString();
            setRadiusStr(radiusValue);
            setRadiusInput(radiusValue);
            setRadiusConfirmed(!!radiusValue);
            
            setPolicy(officeSettings.remotePolicy);
        }
    }, [officeLoading, officeSettings]);


    // Office settings functions
    const handleGetLocation = async () => {
        setGettingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                showAlert({
                    title: 'Permission Required',
                    message: 'Please allow location access in your device settings'
                });
                return;
            }
            
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest,
            });
            const { latitude, longitude } = loc.coords;
            const coordString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setLocationStr(coordString);
            
            showConfirm({
                title: 'Location Retrieved',
                message: `Current coordinates:\n${coordString}\n\nWould you like to set this as your office location?`,
                confirmText: 'Set as Office Location',
                onConfirm: async () => {
                    const success = await updateOfficeLocation({ latitude, longitude });
                    if (success) {
                        showAlert({
                            title: 'Success',
                            message: 'Office location updated successfully!'
                        });
                    } else {
                        showError({
                            message: 'Failed to save office location'
                        });
                    }
                }
            });
        } catch (error) {
            console.error('Location error:', error);
            showError({
                message: 'Failed to retrieve current location. Please try again.'
            });
        } finally {
            setGettingLocation(false);
        }
    };

    // Helper functions for confirmation
    const handleLocationConfirm = () => {
        if (locationInput.trim() === '') {
            showError({ message: 'Please enter location coordinates' });
            return;
        }
        
        const parts = locationInput.split(',').map(s => s.trim());
        if (parts.length !== 2) {
            showError({ message: 'Enter coordinates as "latitude, longitude"' });
            return;
        }
        
        const [lat, lon] = parts.map(Number);
        if (isNaN(lat) || isNaN(lon)) {
            showError({ message: 'Coordinates must be valid numbers' });
            return;
        }
        
        if (lat < -90 || lat > 90) {
            showError({ message: 'Latitude must be between -90 and 90' });
            return;
        }
        
        if (lon < -180 || lon > 180) {
            showError({ message: 'Longitude must be between -180 and 180' });
            return;
        }
        
        setLocationStr(locationInput);
        setLocationConfirmed(true);
    };

    const handleLocationEdit = () => {
        setLocationConfirmed(false);
        setLocationInput(locationStr);
    };

    const handleRadiusConfirm = () => {
        if (radiusInput.trim() === '') {
            showError({ message: 'Please enter a radius value' });
            return;
        }
        
        const rad = parseInt(radiusInput, 10);
        if (isNaN(rad) || rad <= 0) {
            showError({ message: 'Radius must be a positive number' });
            return;
        }
        
        if (rad < 10) {
            showError({ message: 'Minimum radius is 10 meters for practical use' });
            return;
        }
        
        if (rad > 10000) {
            showError({ message: 'Maximum radius is 10,000 meters (10km)' });
            return;
        }
        
        setRadiusStr(radiusInput);
        setRadiusConfirmed(true);
    };

    const handleRadiusEdit = () => {
        setRadiusConfirmed(false);
        setRadiusInput(radiusStr);
    };

    const handleSaveOfficeSettings = async () => {
        // Validate confirmations
        if (!locationConfirmed) {
            showError({ message: 'Please confirm the location coordinates' });
            return;
        }
        
        if (!radiusConfirmed) {
            showError({ message: 'Please confirm the check-in radius' });
            return;
        }
        
        // Validate location
        const parts = locationStr.split(',').map(s => s.trim());
        if (parts.length !== 2) {
            showError({
                title: 'Invalid Location',
                message: 'Please enter coordinates as: latitude, longitude\nExample: 32.0853, 34.7818'
            });
            return;
        }
        
        const [lat, lon] = parts.map(Number);
        if (isNaN(lat) || isNaN(lon)) {
            showError({
                title: 'Invalid Coordinates',
                message: 'Coordinates must be valid numbers'
            });
            return;
        }
        
        if (lat < -90 || lat > 90) {
            showError({
                title: 'Invalid Latitude',
                message: 'Latitude must be between -90 and 90'
            });
            return;
        }
        
        if (lon < -180 || lon > 180) {
            showError({
                title: 'Invalid Longitude',
                message: 'Longitude must be between -180 and 180'
            });
            return;
        }
        
        // Validate radius
        const rad = parseInt(radiusStr, 10);
        if (isNaN(rad) || rad <= 0) {
            showError({
                title: 'Invalid Radius',
                message: 'Radius must be a positive number (minimum 10 meters)'
            });
            return;
        }
        
        if (rad < 10) {
            showError({
                title: 'Radius Too Small',
                message: 'Minimum radius is 10 meters for practical use'
            });
            return;
        }
        
        if (rad > 10000) {
            showError({
                title: 'Radius Too Large',
                message: 'Maximum radius is 10,000 meters (10km)'
            });
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
                showAlert({
                    title: 'Success',
                    message: '✅ All office settings have been saved successfully!'
                });
            } else {
                console.error('Failed to save settings - updateAllSettings returned false');
                showError({
                    message: '❌ Failed to save office settings. Please try again.'
                });
            }
        } catch (error) {
            console.error('Save settings error:', error);
            showError({
                message: `Failed to save office settings: ${error.message || 'Unknown error'}`
            });
        }
    };


    const renderOfficeTab = () => (
        <ScrollView style={styles.content}>
            {/* Office Location */}
            <LiquidGlassCard variant="elevated" padding="lg" style={styles.settingsCard}>
                <Text style={styles.sectionTitle}>📍 Office Location</Text>
                <Text style={styles.headerSubtitle}>
                    Set the GPS coordinates of your office for location-based check-ins
                </Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Coordinates (latitude, longitude)</Text>
                    {!locationConfirmed ? (
                        <View style={styles.inputRow}>
                            <LiquidGlassInput
                                style={styles.input}
                                placeholder="32.0853, 34.7818"
                                value={locationInput}
                                onChangeText={setLocationInput}
                                keyboardType="decimal-pad"
                            />
                            <LiquidGlassButton
                                title="✓"
                                onPress={handleLocationConfirm}
                                variant="primary"
                                style={styles.confirmButton}
                            />
                        </View>
                    ) : (
                        <View style={styles.inputRow}>
                            <Text style={styles.statusText}>{locationStr}</Text>
                            <LiquidGlassButton
                                title="Edit"
                                onPress={handleLocationEdit}
                                variant="ghost"
                                style={styles.confirmButton}
                            />
                        </View>
                    )}
                    <Text style={[styles.currentLocationText, styles.successText]}>
                        {locationStr ? 'Location configured' : 'No location set'}
                    </Text>
                </View>
                <LiquidGlassButton
                    title={gettingLocation ? '📍 Getting Location...' : '📱 Use Current Location'}
                    onPress={handleGetLocation}
                    disabled={gettingLocation}
                    variant="secondary"
                />
            </LiquidGlassCard>

            {/* Check Radius */}
            <LiquidGlassCard variant="elevated" padding="lg" style={styles.settingsCard}>
                <Text style={styles.sectionTitle}>📏 Check-in Radius</Text>
                <Text style={styles.headerSubtitle}>
                    Maximum distance (in meters) from office to allow office check-ins
                </Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Radius (meters)</Text>
                    {!radiusConfirmed ? (
                        <View style={styles.inputRow}>
                            <LiquidGlassInput
                                style={styles.input}
                                placeholder="100"
                                value={radiusInput}
                                onChangeText={setRadiusInput}
                                keyboardType="numeric"
                            />
                            <LiquidGlassButton
                                title="✓"
                                onPress={handleRadiusConfirm}
                                variant="primary"
                                style={styles.confirmButton}
                            />
                        </View>
                    ) : (
                        <View style={styles.inputRow}>
                            <Text style={styles.statusText}>{radiusStr} meters</Text>
                            <LiquidGlassButton
                                title="Edit"
                                onPress={handleRadiusEdit}
                                variant="ghost"
                                style={styles.confirmButton}
                            />
                        </View>
                    )}
                </View>
            </LiquidGlassCard>

            {/* Work Policy */}
            <LiquidGlassCard variant="elevated" padding="lg" style={styles.settingsCard}>
                <Text style={styles.sectionTitle}>🏢 Work Policy</Text>
                <Text style={styles.headerSubtitle}>
                    Choose your company's remote work policy
                </Text>
                <View style={styles.policyContainer}>
                    <TouchableOpacity 
                        style={styles.policyButton}
                        onPress={() => {
                            showModal({
                                title: 'Select Work Policy',
                                message: 'Choose your company\'s remote work policy:',
                                buttons: [
                                    {
                                        label: 'Cancel',
                                        type: 'secondary',
                                        onPress: () => hideModal()
                                    },
                                    {
                                        label: '🏢 Office Only',
                                        type: policy === 'office-only' ? 'primary' : 'secondary',
                                        onPress: () => {
                                            setPolicy('office-only');
                                            hideModal();
                                        }
                                    },
                                    {
                                        label: '🏠 Remote Only',
                                        type: policy === 'remote-only' ? 'primary' : 'secondary',
                                        onPress: () => {
                                            setPolicy('remote-only');
                                            hideModal();
                                        }
                                    },
                                    {
                                        label: '🔄 Hybrid',
                                        type: policy === 'hybrid' ? 'primary' : 'secondary',
                                        onPress: () => {
                                            setPolicy('hybrid');
                                            hideModal();
                                        }
                                    }
                                ]
                            });
                        }}
                    >
                        <Text style={styles.policyText}>
                            {policy === 'office-only' ? '🏢 Office Only' : 
                             policy === 'remote-only' ? '🏠 Remote Only' : '🔄 Hybrid'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </LiquidGlassCard>

            {/* Current Settings Summary */}
            <LiquidGlassCard variant="bordered" padding="lg" style={styles.settingsCard}>
                <Text style={styles.sectionTitle}>📋 Current Settings</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Office Location:</Text>
                    <Text style={styles.statusText}>
                        {locationStr || 'Not configured'}
                    </Text>
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Check Radius:</Text>
                    <Text style={styles.statusText}>{radiusStr || '100'} meters</Text>
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Work Policy:</Text>
                    <Text style={styles.statusText}>
                        {policy === 'office-only' ? 'Office Only' : 
                         policy === 'remote-only' ? 'Remote Only' : 'Hybrid'}
                    </Text>
                </View>
            </LiquidGlassCard>

            <LiquidGlassButton
                title="💾 Save Office Settings"
                onPress={handleSaveOfficeSettings}
                variant="primary"
                style={{ marginTop: theme.spacing.lg }}
            />
        </ScrollView>
    );

    if (!user || !hasAccess(ROLES.ADMIN)) {
        return null;
    }

    return (
        <LiquidGlassLayout>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🏢 Office Settings</Text>
                <Text style={styles.headerSubtitle}>Configure office location and work policies</Text>
            </View>

            {/* Office Settings Content */}
            {renderOfficeTab()}

            {/* Glass Modal */}
            <GlassModal
                visible={modalState.visible}
                title={modalState.title}
                message={modalState.message}
                buttons={modalState.buttons}
                onClose={modalState.onClose}
                closeOnBackdrop={modalState.closeOnBackdrop}
                closeOnBackButton={modalState.closeOnBackButton}
            />
        </LiquidGlassLayout>
    );
}

