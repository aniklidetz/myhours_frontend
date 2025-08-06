/* Full screen for managing office GPS, radius and remote-work policy.
   All labels/buttons are in English. */

   import React, { useState, useEffect } from 'react';
   import {
     View,
     Text,
     StyleSheet,
     TextInput,
     TouchableOpacity,
     ScrollView,
     ActivityIndicator,
     Platform
   } from 'react-native';
   import { SafeAreaView } from 'react-native-safe-area-context';
   import { router } from 'expo-router';
   import * as Location from 'expo-location';
   
   import { useUser, ROLES } from '../src/contexts/UserContext';
   import { useOffice } from '../src/contexts/OfficeContext';
   import useColors from '../hooks/useColors';
   import GlassModal from '../components/GlassModal';
   import useGlassModal from '../hooks/useGlassModal';
   import LiquidGlassLayout from '../components/LiquidGlassLayout';
   import LiquidGlassScreenLayout from '../components/LiquidGlassScreenLayout';
   import LiquidGlassCard from '../components/LiquidGlassCard';
   import LiquidGlassButton from '../components/LiquidGlassButton';
   import useLiquidGlassTheme from '../hooks/useLiquidGlassTheme';
   import LogoutButton from '../src/components/LogoutButton';
import { maskCoordinates } from '../src/utils/safeLogging';
   // FIX: Import shared styles
   import { commonStyles, COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/CommonStyles';
   
   /* ---------------------------------------------------------------- */
   /*  Screen Component                                                */
   /* ---------------------------------------------------------------- */
   export default function AdvancedOfficeSettingsScreen() {
     /* ------------- Context / hooks --------------------------------- */
     const { user, hasAccess } = useUser();
     const {
       officeSettings,
       loading: officeLoading,
       updateOfficeLocation,
       updateCheckRadius,
       updateRemotePolicy
     } = useOffice();
     const { palette } = useColors();
     const theme = useLiquidGlassTheme();
     const { modalState, showModal, showConfirm, showAlert, showError, hideModal } = useGlassModal();
   
     /* ------------- Local state ------------------------------------- */
     const [locationStr, setLocationStr] = useState('');
     const [radiusStr, setRadiusStr]     = useState('');
     const [policy, setPolicy]           = useState('hybrid');
     const [gettingLocation, setGettingLocation] = useState(false);
     const [saving, setSaving]           = useState(false);
    
    // Confirmation state for number inputs
    const [locationInput, setLocationInput] = useState('');
    const [locationConfirmed, setLocationConfirmed] = useState(false);
    const [radiusInput, setRadiusInput] = useState('');
    const [radiusConfirmed, setRadiusConfirmed] = useState(false);
   
     /* ------------- Populate form when context ready ---------------- */
     useEffect(() => {
       if (!officeLoading && officeSettings) {
         const { latitude, longitude } = officeSettings.location ?? {};
         if (latitude != null && longitude != null) {
           const locationValue = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
           setLocationStr(locationValue);
           setLocationInput(locationValue);
           setLocationConfirmed(true);
         }
         const radiusValue = String(officeSettings.checkRadius ?? '');
        setRadiusStr(radiusValue);
        setRadiusInput(radiusValue);
        setRadiusConfirmed(!!radiusValue);
         setPolicy(officeSettings.remotePolicy ?? 'hybrid');
       }
     }, [officeLoading, officeSettings]);
   
     /* ------------- Guard – non-admins are bounced ------------------ */
     useEffect(() => {
       // Don't show access denied during logout process or when user is null
      if (user && !hasAccess(ROLES.ADMIN)) {
         showAlert({
           title: 'Access Denied',
           message: 'You do not have permission to access office settings',
           onPress: () => router.replace('/dashboard')
         });
       }
     }, [user]);
   
     /* ----------------------------------------------------------------
        Helpers
     ---------------------------------------------------------------- */
     /** Split "lat, lon" into numbers; tolerate comma/point formats. */
     const splitCoords = (str) => {
       const parts = str.split(',').map(s => s.trim().replace(',', '.'));
       if (parts.length !== 2) return null;
       const [lat, lon] = parts.map(Number);
       return Number.isNaN(lat) || Number.isNaN(lon)
         ? null
         : { latitude: lat, longitude: lon };
     };
   
     /** Confirm location coordinates */
     const handleLocationConfirm = () => {
       if (locationInput.trim() === '') {
         showError({ message: 'Please enter location coordinates' });
         return;
       }
       
       const coords = splitCoords(locationInput);
       if (!coords) {
         showError({ message: 'Enter coordinates as "latitude, longitude"' });
         return;
       }
       
       setLocationStr(locationInput);
       setLocationConfirmed(true);
     };
   
     /** Edit location coordinates */
     const handleLocationEdit = () => {
       setLocationConfirmed(false);
       setLocationInput(locationStr);
     };
   
     /** Confirm radius */
     const handleRadiusConfirm = () => {
       if (radiusInput.trim() === '') {
         showError({ message: 'Please enter a radius value' });
         return;
       }
       
       const rad = parseFloat(radiusInput.replace(',', '.'));
       if (Number.isNaN(rad) || rad <= 0) {
         showError({ message: 'Radius must be a positive number' });
         return;
       }
       
       setRadiusStr(radiusInput);
       setRadiusConfirmed(true);
     };
   
     /** Edit radius */
     const handleRadiusEdit = () => {
       setRadiusConfirmed(false);
       setRadiusInput(radiusStr);
     };
   
     /* ----------------------------------------------------------------
        Get current device location
     ---------------------------------------------------------------- */
     const handleGetLocation = async () => {
       setGettingLocation(true);
       console.log('🌍 Requesting location permissions…');
       const { status } = await Location.requestForegroundPermissionsAsync();
   
       if (status !== 'granted') {
         showAlert({
           title: 'Permission Required',
           message: 'Please allow location access in your device settings'
         });
         setGettingLocation(false);
         return;
       }
   
       try {
         console.log('📍 Getting current location…');
         const loc = await Location.getCurrentPositionAsync({
           accuracy: Location.Accuracy.High
         });
         const { latitude, longitude, accuracy } = loc.coords;
   
         console.log(`📍 Location obtained: ${maskCoordinates(latitude, longitude)}, accuracy=${accuracy}m`);
   
         showConfirm({
           title: 'Location Retrieved',
           message: `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\nAccuracy: ${accuracy.toFixed(0)} m`,
           confirmText: 'Set as Office Location',
           onConfirm: async () => {
             try {
               await updateOfficeLocation({ latitude, longitude });
               setLocationStr(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
               setLocationInput(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
               setLocationConfirmed(true);
             } catch (err) {
               console.error('Save location failed:', err);
               showError({ message: 'Could not save office location' });
             }
           }
         });
       } catch (error) {
         console.error('Location error:', error);
         showError({ message: 'Failed to retrieve current location' });
       } finally {
         setGettingLocation(false);
       }
     };
   
     /* ----------------------------------------------------------------
        Save updated settings
     ---------------------------------------------------------------- */
     const handleSave = async () => {
       /* ---- Validate confirmations --------------------------------- */
       if (!locationConfirmed) {
         showError({ message: 'Please confirm the location coordinates' });
         return;
       }
       
       if (!radiusConfirmed) {
         showError({ message: 'Please confirm the check-in radius' });
         return;
       }
       
       /* ---- Validate coordinates ----------------------------------- */
       const coords = splitCoords(locationStr);
       if (!coords) {
         showError({ message: 'Enter coordinates as "latitude, longitude"' });
         return;
       }
   
       /* ---- Validate radius ---------------------------------------- */
       const rad = parseFloat(radiusStr.replace(',', '.'));
       if (Number.isNaN(rad) || rad <= 0) {
         showError({ message: 'Radius must be a positive number' });
         return;
       }
   
       /* ---- Call API / Context ------------------------------------- */
       setSaving(true);
       try {
         await updateOfficeLocation(coords);
         await updateCheckRadius(rad);
         await updateRemotePolicy(policy);
   
         showAlert({
           title: 'Success',
           message: 'Office settings have been saved'
         });
       } catch (err) {
         console.error('Save failed:', err);
         showError({ message: 'Failed to save one or more settings' });
       } finally {
         setSaving(false);
       }
     };
   
     /* ----------------------------------------------------------------
        Render
     ---------------------------------------------------------------- */
     if (officeLoading || !theme) {
       return (
         <LiquidGlassLayout>
           <View style={commonStyles.loader}>
             <ActivityIndicator size="large" color="#FFFFFF" />
           </View>
         </LiquidGlassLayout>
       );
     }
   
     return (
       <LiquidGlassScreenLayout.WithGlassHeader
         title="Administration"
         backDestination="/dashboard"
         showLogout={true}
         scrollable={true}
       >
   
           {/* Office Location */}
           <View style={commonStyles.sectionCard}>
             <View style={commonStyles.sectionTitleContainer}>
               <Text style={commonStyles.sectionTitleIcon}>📍</Text>
               <Text style={commonStyles.sectionTitle}>Office Location</Text>
             </View>
             <Text style={commonStyles.sectionDescription}>
               Set the GPS coordinates of your office for location-based check-ins
             </Text>
   
             {!locationConfirmed ? (
               <View style={commonStyles.inputWithButton}>
                 <TextInput
                   style={[commonStyles.input, commonStyles.inputWithButtonText]}
                   placeholder="latitude, longitude (e.g., 32.0853, 34.7818)"
                   value={locationInput}
                   onChangeText={setLocationInput}
                   keyboardType="decimal-pad"
                   placeholderTextColor={COLORS.textSecondary}
                 />
                 <LiquidGlassButton
                   title="✓"
                   onPress={handleLocationConfirm}
                   variant="primary"
                   style={commonStyles.confirmButton}
                 />
               </View>
             ) : (
               <View style={commonStyles.confirmedInput}>
                 <Text style={commonStyles.confirmedText}>{locationStr}</Text>
                 <TouchableOpacity
                   style={commonStyles.editButton}
                   onPress={handleLocationEdit}
                 >
                   <Text style={styles(theme).editButtonText}>Edit</Text>
                 </TouchableOpacity>
               </View>
             )}
   
             <LiquidGlassButton
               title={gettingLocation ? '📍 Getting Location…' : '📱 Use Current Location'}
               onPress={handleGetLocation}
               disabled={gettingLocation}
               variant="primary"
               style={{ marginTop: SPACING.md }}
             />
           </View>
   
           {/* Check Radius */}
           <View style={commonStyles.sectionCard}>
             <View style={commonStyles.sectionTitleContainer}>
               <Text style={commonStyles.sectionTitleIcon}>📏</Text>
               <Text style={commonStyles.sectionTitle}>Check-in Radius</Text>
             </View>
             <Text style={commonStyles.sectionDescription}>
               Maximum distance (in meters) from office to allow office check-ins
             </Text>
             
             {!radiusConfirmed ? (
               <View style={commonStyles.inputWithButton}>
                 <TextInput
                   style={[commonStyles.input, commonStyles.inputWithButtonText]}
                   placeholder="100"
                   value={radiusInput}
                   onChangeText={setRadiusInput}
                   keyboardType="numeric"
                   placeholderTextColor={COLORS.textSecondary}
                 />
                 <LiquidGlassButton
                   title="✓"
                   onPress={handleRadiusConfirm}
                   variant="primary"
                   style={commonStyles.confirmButton}
                 />
               </View>
             ) : (
               <View style={commonStyles.confirmedInput}>
                 <Text style={commonStyles.confirmedText}>{radiusStr} m</Text>
                 <TouchableOpacity
                   style={commonStyles.editButton}
                   onPress={handleRadiusEdit}
                 >
                   <Text style={styles(theme).editButtonText}>Edit</Text>
                 </TouchableOpacity>
               </View>
             )}
             
             <Text style={styles(theme).helpText}>
               💡 Recommended: 50-200 m depending on your building
             </Text>
           </View>
   
           {/* Work Policy */}
           <View style={commonStyles.sectionCard}>
             <View style={commonStyles.sectionTitleContainer}>
               <Text style={commonStyles.sectionTitleIcon}>🔄</Text>
               <Text style={commonStyles.sectionTitle}>Work Policy</Text>
             </View>
             <Text style={[commonStyles.sectionDescription, { marginBottom: SPACING.md }]}>
               Choose your company's remote-work policy
             </Text>
             
             <TouchableOpacity
               style={styles(theme).policySelector}
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
               <Text style={styles(theme).policySelectorText}>
                 {policy === 'office-only'
                   ? '🏢 Office Only'
                   : policy === 'remote-only'
                   ? '🏠 Remote Only'
                   : '🔄 Hybrid'}
               </Text>
               <Text style={styles(theme).policySelectorSubtext}>
                 {policy === 'office-only'
                   ? 'Employees must work from office'
                   : policy === 'remote-only'
                   ? 'Employees work remotely'
                   : 'Mix of office and remote work'}
               </Text>
             </TouchableOpacity>
           </View>
   
           {/* Summary */}
           <View style={commonStyles.sectionCard}>
             <View style={commonStyles.sectionTitleContainer}>
               <Text style={commonStyles.sectionTitleIcon}>📋</Text>
               <Text style={commonStyles.sectionTitle}>Current Configuration</Text>
             </View>
             <View style={styles(theme).summaryItem}>
               <Text style={styles(theme).summaryLabel}>Office Location:</Text>
               <Text style={styles(theme).summaryValue}>{locationStr || 'Not configured'}</Text>
             </View>
             <View style={styles(theme).summaryItem}>
               <Text style={styles(theme).summaryLabel}>Check Radius:</Text>
               <Text style={styles(theme).summaryValue}>{radiusStr || '100'} m</Text>
             </View>
             <View style={styles(theme).summaryItem}>
               <Text style={styles(theme).summaryLabel}>Work Policy:</Text>
               <Text style={styles(theme).summaryValue}>
                 {policy === 'office-only'
                   ? 'Office Only'
                   : policy === 'remote-only'
                   ? 'Remote Only'
                   : 'Hybrid'}
               </Text>
             </View>
           </View>
   
           {/* Save Button */}
           <LiquidGlassButton
             title={saving ? '' : '💾 Save Office Settings'}
             onPress={handleSave}
             disabled={saving}
             variant="primary"
             style={{ marginBottom: SPACING.xxl }}
           >
             {saving && <ActivityIndicator color="#FFFFFF" />}
           </LiquidGlassButton>
   
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
       </LiquidGlassScreenLayout.WithGlassHeader>
     );
   }
   
   /* ---------------------------------------------------------------- */
   /*  Styles – function so we can consume theme                      */
   /* ---------------------------------------------------------------- */
   const styles = (theme) => {
     if (!theme) return StyleSheet.create({});
     
     return StyleSheet.create({
       scrollView: {
         flex: 1,
         backgroundColor: 'transparent',
       },
       scrollContent: {
         padding: SPACING.lg,
         paddingBottom: Platform.OS === 'ios' ? 120 : 100, // Extra space for tab bar
       },
       /* Header */
       header: {
         alignItems: 'center',
         marginBottom: SPACING.xl,
       },
       headerTitleContainer: {
         flexDirection: 'row',
         alignItems: 'center',
         marginBottom: SPACING.xs,
       },
       headerTitleIcon: {
         fontSize: TYPOGRAPHY.title.fontSize * 0.7,
         marginRight: SPACING.sm,
       },
       headerTitle: {
         fontSize: TYPOGRAPHY.title.fontSize * 0.7,
         fontWeight: TYPOGRAPHY.title.fontWeight,
         color: COLORS.textPrimary,
         textShadowColor: 'rgba(0, 0, 0, 0.6)',
         textShadowOffset: { width: 0, height: 1 },
         textShadowRadius: 3,
       },
       /* Edit button text styling */
       editButtonText: {
         fontSize: TYPOGRAPHY.caption.fontSize,
         fontWeight: '600',
         color: COLORS.textPrimary,
         textAlign: 'center',
       },
       helpText: {
         fontSize: TYPOGRAPHY.caption.fontSize,
         color: COLORS.textSecondary,
         fontStyle: 'italic',
         marginTop: SPACING.sm
       },
       /* Work Policy selector */
       policySelector: {
         backgroundColor: COLORS.glassLight,
         borderColor: COLORS.glassBorder,
         borderWidth: 1,
         borderRadius: BORDER_RADIUS.xl,
         padding: SPACING.lg,
         alignItems: 'center'
       },
       policySelectorText: {
         fontSize: TYPOGRAPHY.body.fontSize,
         color: COLORS.textPrimary,
         fontWeight: 'bold',
         marginBottom: SPACING.xs,
       },
       policySelectorSubtext: {
         fontSize: TYPOGRAPHY.caption.fontSize,
         color: COLORS.textSecondary,
         textAlign: 'center'
       },
       
       /* Summary section styles */
       summaryItem: {
         flexDirection: 'row',
         justifyContent: 'space-between',
         marginBottom: 4,
       },
       summaryLabel: {
         fontSize: TYPOGRAPHY.body.fontSize,
         color: COLORS.textSecondary,
         fontWeight: '500',
         flex: 1,
       },
       summaryValue: {
         fontSize: TYPOGRAPHY.body.fontSize,
         color: COLORS.textPrimary,
         fontWeight: 'bold',
         flex: 1,
         textAlign: 'right',
       },
     });
   };