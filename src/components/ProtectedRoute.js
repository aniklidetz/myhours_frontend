import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { useUser } from '../contexts/UserContext';
import { router } from 'expo-router';
import Colors from '../constants/Colors';

export default function ProtectedRoute({ requiredRole, children }) {
  const { user, hasAccess, loading } = useUser();

  // useEffect must be called unconditionally
  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading]);

  // Check if user data is still loading
  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // If the user is not authenticated, show nothing while redirecting
  if (!user) {
    return null;
  }

  // Check access and redirect if needed
  React.useEffect(() => {
    if (!loading && user && !hasAccess(requiredRole)) {
      router.replace('/');
    }
  }, [user, loading, hasAccess, requiredRole]);

  // If the user doesn't have the required role, show nothing while redirecting
  if (!hasAccess(requiredRole)) {
    return null;
  }

  // If everything is fine, render the children
  return children;
}

ProtectedRoute.propTypes = {
  requiredRole: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired
};

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