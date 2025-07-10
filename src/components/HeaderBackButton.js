import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import useColors from '../../hooks/useColors';

/**
 * Standard header back button component for navigation
 * Supports iOS and Material Design guidelines
 */
export default function HeaderBackButton({ 
  title = 'Back', 
  destination = null,
  style = {},
  textStyle = {} 
}) {
  const { palette } = useColors();

  const handlePress = () => {
    if (destination) {
      router.push(destination);
    } else {
      router.back();
    }
  };

  return (
    <TouchableOpacity
      style={[styles(palette).container, style]}
      onPress={handlePress}
    >
      <Ionicons 
        name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} 
        size={24} 
        color={palette.text.primary}
        style={styles(palette).icon}
      />
      <Text style={[styles(palette).text, textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = (palette) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    color: palette.text.primary,
    fontWeight: '500',
  },
});