import React from 'react';
import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import PropTypes from 'prop-types';
import useColors from '../../hooks/useColors';

/**
 * Компонент кнопки "Назад" для навигации в приложении
 * Поддерживает темную тему
 */
export default function BackButton({ destination, title = 'Back' }) {
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
      style={styles(palette).backButton}
      onPress={handlePress}
    >
      <Text style={styles(palette).backButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

BackButton.propTypes = {
  destination: PropTypes.string,
  title: PropTypes.string
};

BackButton.defaultProps = {
  destination: null,
  title: 'Back'
};

// Стили с поддержкой темной темы
const styles = (palette) => StyleSheet.create({
  backButton: {
    alignItems: 'center',
    backgroundColor: palette.text.secondary,
    borderRadius: 4,
    padding: 12,
  },
  backButtonText: {
    color: palette.text.light,
    fontWeight: 'bold',
  }
});