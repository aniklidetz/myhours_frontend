/* office-settings.js
   Full screen for managing office GPS, radius and remote-work policy.
   All labels/buttons are in English. */

   import React, { useState, useEffect } from 'react';
   import {
     View,
     Text,
     StyleSheet,
     TextInput,
     TouchableOpacity,
     ScrollView,
     SafeAreaView,
     ActivityIndicator
   } from 'react-native';
   import { router } from 'expo-router';
   import * as Location from 'expo-location';
   
   import { useUser, ROLES } from '../src/contexts/UserContext';
   import { useOffice } from '../src/contexts/OfficeContext';
   import useColors from '../hooks/useColors';
   import GlassModal from '../components/GlassModal';
   import useGlassModal from '../hooks/useGlassModal';
   
   /* ---------------------------------------------------------------- */
   /*  Screen Component                                                */
   /* ---------------------------------------------------------------- */
   export default function OfficeSettingsScreen() {
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
       if (!user || !hasAccess(ROLES.ADMIN)) {
         showAlert({
           title: 'Access Denied',
           message: 'You do not have permission to access office settings',
           onPress: () => router.replace('/employees')
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
   
         console.log(`📍 Location obtained: lat=${latitude}, lon=${longitude}, accuracy=${accuracy}m`);
   
         showConfirm({
           title: 'Location Retrieved',
           message: `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\nAccuracy: ${accuracy.toFixed(0)} m`,
           confirmText: 'Set as Office Location',
           onConfirm: async () => {
             try {
               await updateOfficeLocation({ latitude, longitude });
               setLocationStr(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
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
     if (officeLoading) {
       return (
         <SafeAreaView style={styles(palette).centered}>
           <ActivityIndicator size="large" color={palette.primary} />
         </SafeAreaView>
       );
     }
   
     return (
       <SafeAreaView style={styles(palette).container}>
         <ScrollView contentContainerStyle={styles(palette).scrollContent}>
           {/* Header */}
           <View style={styles(palette).header}>
             <Text style={styles(palette).headerTitle}>🏢 Office Settings</Text>
             <Text style={styles(palette).headerSubtitle}>
               Configure your office location and work policies
             </Text>
           </View>
   
           {/* Office Location */}
           <View style={styles(palette).section}>
             <Text style={styles(palette).sectionTitle}>📍 Office Location</Text>
             <Text style={styles(palette).sectionDescription}>
               Set the GPS coordinates of your office for location-based check-ins
             </Text>
   
             {!locationConfirmed ? (
               <View style={styles(palette).inputWithButton}>
                 <TextInput
                   style={[styles(palette).input, styles(palette).inputWithButtonText]}
                   placeholder="latitude, longitude (e.g., 32.0853, 34.7818)"
                   value={locationInput}
                   onChangeText={setLocationInput}
                   keyboardType="decimal-pad"
                   placeholderTextColor={palette.text.secondary}
                 />
                 <TouchableOpacity
                   style={styles(palette).confirmButton}
                   onPress={handleLocationConfirm}
                 >
                   <Text style={styles(palette).confirmButtonText}>✓</Text>
                 </TouchableOpacity>
               </View>
             ) : (
               <View style={styles(palette).confirmedInput}>
                 <Text style={styles(palette).confirmedText}>{locationStr}</Text>
                 <TouchableOpacity
                   style={styles(palette).editButton}
                   onPress={handleLocationEdit}
                 >
                   <Text style={styles(palette).editButtonText}>Edit</Text>
                 </TouchableOpacity>
               </View>
             )}
   
             <TouchableOpacity
               style={styles(palette).locationButton}
               onPress={handleGetLocation}
               disabled={gettingLocation}
             >
               <Text style={styles(palette).locationButtonText}>
                 {gettingLocation ? '📍 Getting Location…' : '📱 Use Current Location'}
               </Text>
             </TouchableOpacity>
           </View>
   
           {/* Check Radius */}
           <View style={styles(palette).section}>
             <Text style={styles(palette).sectionTitle}>📏 Check-in Radius</Text>
             <Text style={styles(palette).sectionDescription}>
               Maximum distance (in meters) from office to allow office check-ins
             </Text>
             {!radiusConfirmed ? (
               <View style={styles(palette).inputWithButton}>
                 <TextInput
                   style={[styles(palette).input, styles(palette).inputWithButtonText]}
                   placeholder="100"
                   value={radiusInput}
                   onChangeText={setRadiusInput}
                   keyboardType="numeric"
                   placeholderTextColor={palette.text.secondary}
                 />
                 <TouchableOpacity
                   style={styles(palette).confirmButton}
                   onPress={handleRadiusConfirm}
                 >
                   <Text style={styles(palette).confirmButtonText}>✓</Text>
                 </TouchableOpacity>
               </View>
             ) : (
               <View style={styles(palette).confirmedInput}>
                 <Text style={styles(palette).confirmedText}>{radiusStr} m</Text>
                 <TouchableOpacity
                   style={styles(palette).editButton}
                   onPress={handleRadiusEdit}
                 >
                   <Text style={styles(palette).editButtonText}>Edit</Text>
                 </TouchableOpacity>
               </View>
             )}
             <Text style={styles(palette).helpText}>
               💡 Recommended: 50-200 m depending on your building
             </Text>
           </View>
   
           {/* Work Policy */}
           <View style={styles(palette).section}>
             <Text style={styles(palette).sectionTitle}>🔄 Work Policy</Text>
             <Text style={styles(palette).sectionDescription}>
               Choose your company’s remote-work policy
             </Text>
             <TouchableOpacity
               style={styles(palette).policySelector}
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
               <Text style={styles(palette).policySelectorText}>
                 {policy === 'office-only'
                   ? '🏢 Office Only'
                   : policy === 'remote-only'
                   ? '🏠 Remote Only'
                   : '🔄 Hybrid'}
               </Text>
               <Text style={styles(palette).policySelectorSubtext}>
                 {policy === 'office-only'
                   ? 'Employees must work from office'
                   : policy === 'remote-only'
                   ? 'Employees work remotely'
                   : 'Mix of office and remote work'}
               </Text>
             </TouchableOpacity>
           </View>
   
           {/* Summary */}
           <View style={styles(palette).summarySection}>
             <Text style={styles(palette).summaryTitle}>📋 Current Configuration</Text>
             <View style={styles(palette).summaryItem}>
               <Text style={styles(palette).summaryLabel}>Office Location:</Text>
               <Text style={styles(palette).summaryValue}>{locationStr || 'Not configured'}</Text>
             </View>
             <View style={styles(palette).summaryItem}>
               <Text style={styles(palette).summaryLabel}>Check Radius:</Text>
               <Text style={styles(palette).summaryValue}>{radiusStr || '100'} m</Text>
             </View>
             <View style={styles(palette).summaryItem}>
               <Text style={styles(palette).summaryLabel}>Work Policy:</Text>
               <Text style={styles(palette).summaryValue}>
                 {policy === 'office-only'
                   ? 'Office Only'
                   : policy === 'remote-only'
                   ? 'Remote Only'
                   : 'Hybrid'}
               </Text>
             </View>
           </View>
   
           {/* Save Button */}
           <TouchableOpacity
             style={styles(palette).saveButton}
             onPress={handleSave}
             disabled={saving}
           >
             {saving ? (
               <ActivityIndicator color={palette.text.light} />
             ) : (
               <Text style={styles(palette).saveButtonText}>💾 Save Settings</Text>
             )}
           </TouchableOpacity>
   
           {/* Back Button */}
           <TouchableOpacity
             style={styles(palette).backButton}
             onPress={() => router.back()}
           >
             <Text style={styles(palette).backButtonText}>← Back to Admin</Text>
           </TouchableOpacity>
         </ScrollView>
   
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
       </SafeAreaView>
     );
   }
   
   /* ---------------------------------------------------------------- */
   /*  Styles – function so we can consume palette                     */
   /* ---------------------------------------------------------------- */
   const styles = (p) =>
     StyleSheet.create({
       container: {
         flex: 1,
         backgroundColor: p.background.secondary
       },
       centered: {
         flex: 1,
         justifyContent: 'center',
         alignItems: 'center',
         backgroundColor: p.background.secondary
       },
       scrollContent: {
         padding: 16
       },
       /* Header */
       header: {
         backgroundColor: p.background.primary,
         borderRadius: 12,
         padding: 20,
         marginBottom: 20,
         alignItems: 'center',
         elevation: 2,
         shadowColor: p.shadow,
         shadowOffset: { width: 0, height: 2 },
         shadowOpacity: 0.1,
         shadowRadius: 4
       },
       headerTitle: {
         fontSize: 24,
         fontWeight: 'bold',
         color: p.primary,
         marginBottom: 8
       },
       headerSubtitle: {
         fontSize: 14,
         color: p.text.secondary,
         textAlign: 'center'
       },
       /* Generic section card */
       section: {
         backgroundColor: p.background.primary,
         borderRadius: 12,
         padding: 20,
         marginBottom: 16,
         elevation: 2,
         shadowColor: p.shadow,
         shadowOffset: { width: 0, height: 2 },
         shadowOpacity: 0.1,
         shadowRadius: 4
       },
       sectionTitle: {
         fontSize: 18,
         fontWeight: 'bold',
         color: p.text.primary,
         marginBottom: 8
       },
       sectionDescription: {
         fontSize: 14,
         color: p.text.secondary,
         marginBottom: 16,
         lineHeight: 20
       },
       /* Inputs / buttons */
       input: {
         backgroundColor: p.background.secondary,
         borderColor: p.border,
         borderWidth: 1,
         borderRadius: 8,
         padding: 12,
         fontSize: 16,
         color: p.text.primary,
         marginBottom: 12
       },
       helpText: {
         fontSize: 12,
         color: p.text.secondary,
         fontStyle: 'italic'
       },
       locationButton: {
         backgroundColor: p.primary,
         padding: 12,
         borderRadius: 8,
         alignItems: 'center'
       },
       locationButtonText: {
         color: p.text.light,
         fontWeight: 'bold',
         fontSize: 16
       },
       policySelector: {
         backgroundColor: p.background.secondary,
         borderColor: p.border,
         borderWidth: 1,
         borderRadius: 8,
         padding: 16,
         alignItems: 'center'
       },
       policySelectorText: {
         fontSize: 16,
         color: p.text.primary,
         fontWeight: 'bold',
         marginBottom: 4
       },
       policySelectorSubtext: {
         fontSize: 12,
         color: p.text.secondary,
         textAlign: 'center'
       },
       /* Summary */
       summarySection: {
         backgroundColor: p.background.primary,
         borderRadius: 12,
         padding: 20,
         marginBottom: 24,
         borderWidth: 2,
         borderColor: p.primary
       },
       summaryTitle: {
         fontSize: 18,
         fontWeight: 'bold',
         color: p.primary,
         marginBottom: 16
       },
       summaryItem: {
         flexDirection: 'row',
         justifyContent: 'space-between',
         marginBottom: 12
       },
       summaryLabel: {
         fontSize: 14,
         color: p.text.secondary,
         fontWeight: '500',
         flex: 1
       },
       summaryValue: {
         fontSize: 14,
         color: p.text.primary,
         fontWeight: 'bold',
         flex: 1,
         textAlign: 'right'
       },
       /* Save & back buttons */
       saveButton: {
         backgroundColor: p.success,
         padding: 16,
         borderRadius: 12,
         alignItems: 'center',
         marginBottom: 16,
         elevation: 3,
         shadowColor: p.shadow,
         shadowOffset: { width: 0, height: 3 },
         shadowOpacity: 0.2,
         shadowRadius: 5
       },
       saveButtonText: {
         color: p.text.light,
         fontWeight: 'bold',
         fontSize: 18
       },
       backButton: {
         backgroundColor: p.text.secondary,
         padding: 12,
         borderRadius: 8,
         alignItems: 'center'
       },
       backButtonText: {
         color: p.text.light,
         fontWeight: 'bold'
       },
       /* Confirmation UI styles */
       inputWithButton: {
         flexDirection: 'row',
         alignItems: 'center',
       },
       inputWithButtonText: {
         flex: 1,
         marginRight: 8,
       },
       confirmButton: {
         backgroundColor: p.primary,
         padding: 12,
         borderRadius: 8,
         alignItems: 'center',
         justifyContent: 'center',
         width: 44,
         height: 44,
       },
       confirmButtonText: {
         color: p.text.light,
         fontSize: 18,
         fontWeight: 'bold',
       },
       confirmedInput: {
         flexDirection: 'row',
         alignItems: 'center',
         justifyContent: 'space-between',
         padding: 12,
         borderWidth: 1,
         borderColor: p.success || p.primary,
         borderRadius: 8,
         backgroundColor: p.background.secondary,
       },
       confirmedText: {
         fontSize: 16,
         color: p.text.primary,
         fontWeight: '500',
       },
       editButton: {
         backgroundColor: 'transparent',
         borderWidth: 1,
         borderColor: p.primary,
         padding: 8,
         borderRadius: 6,
       },
       editButtonText: {
         color: p.primary,
         fontSize: 14,
         fontWeight: '500',
       }
     });