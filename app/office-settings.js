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
     Alert,
     ScrollView,
     SafeAreaView,
     ActivityIndicator,
     Modal
   } from 'react-native';
   import { router } from 'expo-router';
   import * as Location from 'expo-location';
   
   import { useUser, ROLES } from '../src/contexts/UserContext';
   import { useOffice } from '../src/contexts/OfficeContext';
   import useColors from '../hooks/useColors';
   
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
   
     /* ------------- Local state ------------------------------------- */
     const [locationStr, setLocationStr] = useState('');
     const [radiusStr, setRadiusStr]     = useState('');
     const [policy, setPolicy]           = useState('hybrid');
     const [gettingLocation, setGettingLocation] = useState(false);
     const [saving, setSaving]           = useState(false);
     const [showPolicyModal, setShowPolicyModal] = useState(false);
   
     /* ------------- Populate form when context ready ---------------- */
     useEffect(() => {
       if (!officeLoading && officeSettings) {
         const { latitude, longitude } = officeSettings.location ?? {};
         if (latitude != null && longitude != null) {
           setLocationStr(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
         }
         setRadiusStr(String(officeSettings.checkRadius ?? ''));
         setPolicy(officeSettings.remotePolicy ?? 'hybrid');
       }
     }, [officeLoading, officeSettings]);
   
     /* ------------- Guard – non-admins are bounced ------------------ */
     useEffect(() => {
       if (!user || !hasAccess(ROLES.ADMIN)) {
         Alert.alert('Access Denied', 'You do not have permission to access office settings');
         router.replace('/employees');
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
   
     /* ----------------------------------------------------------------
        Get current device location
     ---------------------------------------------------------------- */
     const handleGetLocation = async () => {
       setGettingLocation(true);
       console.log('🌍 Requesting location permissions…');
       const { status } = await Location.requestForegroundPermissionsAsync();
   
       if (status !== 'granted') {
         Alert.alert('Permission Required', 'Please allow location access in your device settings');
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
   
         Alert.alert(
           'Location Retrieved',
           `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\nAccuracy: ${accuracy.toFixed(0)} m`,
           [
             { text: 'Cancel', style: 'cancel' },
             {
               text: 'Set as Office Location',
               onPress: async () => {
                 try {
                   await updateOfficeLocation({ latitude, longitude });
                   setLocationStr(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                 } catch (err) {
                   console.error('Save location failed:', err);
                   Alert.alert('Error', 'Could not save office location');
                 }
               }
             }
           ]
         );
       } catch (error) {
         console.error('Location error:', error);
         Alert.alert('Error', 'Failed to retrieve current location');
       } finally {
         setGettingLocation(false);
       }
     };
   
     /* ----------------------------------------------------------------
        Save updated settings
     ---------------------------------------------------------------- */
     const handleSave = async () => {
       /* ---- Validate coordinates ----------------------------------- */
       const coords = splitCoords(locationStr);
       if (!coords) {
         Alert.alert('Error', 'Enter coordinates as "latitude, longitude"');
         return;
       }
   
       /* ---- Validate radius ---------------------------------------- */
       const rad = parseFloat(radiusStr.replace(',', '.'));
       if (Number.isNaN(rad) || rad <= 0) {
         Alert.alert('Error', 'Radius must be a positive number');
         return;
       }
   
       /* ---- Call API / Context ------------------------------------- */
       setSaving(true);
       try {
         await updateOfficeLocation(coords);
         await updateCheckRadius(rad);
         await updateRemotePolicy(policy);
   
         Alert.alert('Success', 'Office settings have been saved');
       } catch (err) {
         console.error('Save failed:', err);
         Alert.alert('Error', 'Failed to save one or more settings');
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
             <TextInput
               style={styles(palette).input}
               placeholder="100"
               value={radiusStr}
               onChangeText={setRadiusStr}
               keyboardType="numeric"
               placeholderTextColor={palette.text.secondary}
             />
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
               onPress={() => setShowPolicyModal(true)}
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
   
         {/* Policy Modal */}
         <Modal
           transparent
           visible={showPolicyModal}
           animationType="slide"
           onRequestClose={() => setShowPolicyModal(false)}
         >
           <View style={styles(palette).modalOverlay}>
             <View style={styles(palette).modalContent}>
               <Text style={styles(palette).modalTitle}>Select Work Policy</Text>
   
               {[
                 {
                   id: 'office-only',
                   title: '🏢 Office Only',
                   desc: 'All employees must work from the office. Location verification required.'
                 },
                 {
                   id: 'remote-only',
                   title: '🏠 Remote Only',
                   desc: 'All employees work remotely. Location verification not required.'
                 },
                 {
                   id: 'hybrid',
                   title: '🔄 Hybrid',
                   desc: 'Flexible: employees can work from the office or remotely.'
                 }
               ].map(opt => (
                 <TouchableOpacity
                   key={opt.id}
                   style={[
                     styles(palette).policyOption,
                     policy === opt.id && styles(palette).selectedOption
                   ]}
                   onPress={() => {
                     setPolicy(opt.id);
                     setShowPolicyModal(false);
                   }}
                 >
                   <Text style={styles(palette).policyOptionText}>{opt.title}</Text>
                   <Text style={styles(palette).policyOptionDesc}>{opt.desc}</Text>
                 </TouchableOpacity>
               ))}
   
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
       /* Modal */
       modalOverlay: {
         flex: 1,
         justifyContent: 'center',
         alignItems: 'center',
         backgroundColor: 'rgba(0,0,0,0.5)'
       },
       modalContent: {
         width: '90%',
         maxWidth: 400,
         backgroundColor: p.background.primary,
         borderRadius: 12,
         padding: 24,
         elevation: 5,
         shadowColor: p.shadow,
         shadowOffset: { width: 0, height: 2 },
         shadowOpacity: 0.25,
         shadowRadius: 4
       },
       modalTitle: {
         fontSize: 20,
         fontWeight: 'bold',
         marginBottom: 20,
         textAlign: 'center',
         color: p.text.primary
       },
       policyOption: {
         backgroundColor: p.background.secondary,
         borderColor: p.border,
         borderWidth: 1,
         borderRadius: 8,
         padding: 16,
         marginBottom: 12,
         alignItems: 'center'
       },
       selectedOption: {
         backgroundColor: p.primary,
         borderColor: p.primary
       },
       policyOptionText: {
         fontSize: 16,
         fontWeight: 'bold',
         color: p.text.primary,
         marginBottom: 8
       },
       policyOptionDesc: {
         fontSize: 12,
         color: p.text.secondary,
         textAlign: 'center',
         lineHeight: 16
       },
       cancelButton: {
         backgroundColor: p.background.secondary,
         borderColor: p.border,
         borderWidth: 1,
         marginTop: 12,
         padding: 12,
         borderRadius: 8,
         alignItems: 'center'
       },
       cancelButtonText: {
         color: p.text.secondary,
         fontWeight: 'bold'
       }
     });