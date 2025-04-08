// app/employees.js
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import { router } from 'expo-router';
import { useUser } from '../src/contexts/UserContext'; // Add this import

export default function EmployeeListScreen() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, hasAccess, logout } = useUser(); // Add this hook

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);

      // Mock data
      const mockEmployees = [
        { id: 1, first_name: 'John', last_name: 'Smith', email: 'john@example.com' },
        { id: 2, first_name: 'Emily', last_name: 'Johnson', email: 'emily@example.com' },
        { id: 3, first_name: 'Michael', last_name: 'Brown', email: 'michael@example.com' },
      ];

      // In a real app, fetch from API
      // const response = await api.get('/api/users/employees/');
      // const employees = response.data.results;

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
    await logout();
    router.replace('/');
  };

  const renderEmployeeItem = ({ item }) => (
    <View style={styles.employeeCard}>
      <View>
        <Text style={styles.employeeName}>{item.first_name} {item.last_name}</Text>
        <Text style={styles.employeeEmail}>{item.email}</Text>
      </View>
      <TouchableOpacity 
        style={styles.registerButton}
        onPress={() => handleBiometricRegistration(item)}
      >
        <Text style={styles.registerButtonText}>Register</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Debug panel with user info */}
      <View style={styles.userInfoPanel}>
        <View>
          <Text style={styles.userInfoText}>Logged in as: {user?.name} (Role: {user?.role})</Text>
          <Text style={styles.userInfoText}>Has Admin Access: {hasAccess('admin') ? 'Yes' : 'No'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
      ) : (
        <FlatList
          data={employees}
          renderItem={renderEmployeeItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.checkInButton]}
          onPress={() => router.push({
            pathname: '/biometric-check',
            params: { mode: 'check-in' }
          })}
        >
          <Text style={styles.buttonText}>Check-In</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.checkOutButton]}
          onPress={() => router.push({
            pathname: '/biometric-check',
            params: { mode: 'check-out' }
          })}
        >
          <Text style={styles.buttonText}>Check-Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  userInfoPanel: {
    backgroundColor: '#e3f2fd',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#bbdefb',
  },
  userInfoText: {
    fontSize: 12,
    color: '#1976d2',
  },
  logoutButton: {
    backgroundColor: '#f44336',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  employeeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  employeeEmail: {
    fontSize: 14,
    color: '#757575',
  },
  registerButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
  },
  registerButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: 'white',
    padding: 16,
  },
  button: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
    marginHorizontal: 5,
  },
  checkInButton: {
    backgroundColor: '#4CAF50',
  },
  checkOutButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});