import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUser } from '../contexts/UserContext';
import { router } from 'expo-router';
import Colors from '../constants/Colors';

export default function ProtectedRoute({ requiredRole, children }) {
  const { user, hasAccess, loading } = useUser();

  // Check if user data is still loading
  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // If the user is not authenticated, redirect to the login page
  if (!user) {
    React.useEffect(() => {
      router.replace('/');
    }, []);
    return null;
  }

  // If the user doesn't have the required role, show an access denied message
  if (!hasAccess(requiredRole)) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Access Denied</Text>
        <Text>You don't have permission to access this page.</Text>
      </View>
    );
  }

  // If everything is fine, render the children
  return children;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.background.secondary,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});