/* eslint-disable react/prop-types */
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
  textStyle = {},
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
    <TouchableOpacity style={[styles(palette).container, style]} onPress={handlePress}>
      <Ionicons
        name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
        size={24}
        color="#FFFFFF"
        style={styles(palette).icon}
      />
      <Text style={[styles(palette).text, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = _palette =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      paddingLeft: 8, // 8dp from left edge
      marginBottom: 16,
      minHeight: 44, // Minimum touch target
      minWidth: 44,
    },
    icon: {
      marginRight: 8,
    },
    text: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '500',
    },
  });
