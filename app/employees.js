// ✅ Updated app/employees.js with dark theme support

import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  SafeAreaView,
  useColorScheme
} from 'react-native';
import { router } from 'expo-router';
import { useUser } from '../src/contexts/UserContext';
import useColors from '../hooks/useColors';

export default function EmployeeListScreen() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, hasAccess, logout } = useUser();
  const { palette, isDark } = useColors(); // используем хук для получения текущей цветовой палитры

  useEffect(() => {
    if (user) {
      fetchEmployees();
    }
  }, [user]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);

      const mockEmployees = [
        { id: 1, first_name: 'John', last_name: 'Smith', email: 'john@example.com' },
        { id: 2, first_name: 'Emily', last_name: 'Johnson', email: 'emily@example.com' },
        { id: 3, first_name: 'Michael', last_name: 'Brown', email: 'michael@example.com' },
      ];

      await new Promise(resolve => setTimeout(resolve, 500));
      setEmployees(mockEmployees);
    } catch (error) {
      console.error('Error loading employees:', error);
      Alert.alert('Error', 'Failed to load employee list');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricRegistration = (employee) => {
    router.push({
      pathname: '/biometric-registration',
      params: {
        employeeId: employee.id,
        employeeName: `${employee.first_name} ${employee.last_name}`
      }
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const renderEmployeeItem = ({ item }) => (
    <View style={styles(palette).employeeCard}>
      <View>
        <Text style={styles(palette).employeeName}>{item.first_name} {item.last_name}</Text>
        <Text style={styles(palette).employeeEmail}>{item.email}</Text>
      </View>
      <TouchableOpacity 
        style={styles(palette).registerButton}
        onPress={() => handleBiometricRegistration(item)}
      >
        <Text style={styles(palette).registerButtonText}>Register</Text>
      </TouchableOpacity>
    </View>
  );

  if (!user) {
    return (
      <View style={styles(palette).loader}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles(palette).container}>
      <View style={styles(palette).userInfoPanel}>
        <View>
          <Text style={styles(palette).userInfoText}>Logged in as: {user?.name} (Role: {user?.role})</Text>
          <Text style={styles(palette).userInfoText}>Has Admin Access: {hasAccess('admin') ? 'Yes' : 'No'}</Text>
        </View>
        <TouchableOpacity 
          style={styles(palette).logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles(palette).logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={palette.primary} style={styles(palette).loader} />
      ) : (
        <FlatList
          data={employees}
          renderItem={renderEmployeeItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles(palette).listContent}
        />
      )}

      <View style={styles(palette).buttonContainer}>
        <TouchableOpacity 
          style={[styles(palette).button, styles(palette).checkInButton]}
          onPress={() => router.push({ pathname: '/biometric-check', params: { mode: 'check-in' } })}
        >
          <Text style={styles(palette).buttonText}>Check-In</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles(palette).button, styles(palette).checkOutButton]}
          onPress={() => router.push({ pathname: '/biometric-check', params: { mode: 'check-out' } })}
        >
          <Text style={styles(palette).buttonText}>Check-Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Преобразуем стили в функцию, которая принимает цветовую палитру
const styles = (palette) => StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 5,
    flex: 1,
    height: 50,
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  buttonContainer: {
    backgroundColor: palette.background.primary,
    borderTopColor: palette.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    padding: 16,
  },
  buttonText: {
    color: palette.text.light,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkInButton: {
    backgroundColor: palette.success,
  },
  checkOutButton: {
    backgroundColor: palette.danger,
  },
  container: {
    backgroundColor: palette.background.secondary,
    flex: 1,
  },
  employeeCard: {
    alignItems: 'center',
    backgroundColor: palette.background.primary,
    borderRadius: 10,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 16,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  employeeEmail: {
    color: palette.text.secondary,
    fontSize: 14,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: palette.text.primary,
  },
  listContent: {
    padding: 16,
  },
  loader: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoutButton: {
    backgroundColor: palette.danger,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  logoutText: {
    color: palette.text.light,
    fontSize: 12,
    fontWeight: 'bold',
  },
  registerButton: {
    backgroundColor: palette.primary,
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  registerButtonText: {
    color: palette.text.light,
    fontWeight: 'bold',
  },
  userInfoPanel: {
    alignItems: 'center',
    backgroundColor: palette.primaryBackground,
    borderBottomColor: palette.primaryLight,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
  },
  userInfoText: {
    color: palette.primaryDark,
    fontSize: 12,
  },
});