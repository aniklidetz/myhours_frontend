import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUser } from '../contexts/UserContext';
import { router } from 'expo-router';

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
    // In expo-router, redirects work a bit differently
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 10,
  }
});