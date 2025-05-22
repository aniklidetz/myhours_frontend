import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import useColors from '../hooks/useColors';

/**
 * Экран 404 - Страница не найдена
 * Отображается, когда пользователь пытается перейти по несуществующему маршруту
 */
export default function NotFoundScreen() {
  const { palette, isDark } = useColors();

  return (
    <View style={styles(palette).container}>
      <Text style={styles(palette).title}>Эта страница не существует</Text>
      <Text style={styles(palette).message}>
        Возможно, вы перешли по неверной ссылке или страница была удалена.
      </Text>
      <TouchableOpacity 
        style={styles(palette).button}
        onPress={() => router.navigate('/employees')}
      >
        <Text style={styles(palette).buttonText}>Вернуться на главную</Text>
      </TouchableOpacity>
    </View>
  );
}

// Стили с поддержкой темной темы
const styles = (palette) => StyleSheet.create({
  button: {
    backgroundColor: palette.primary,
    borderRadius: 5,
    marginTop: 20,
    padding: 15,
    width: '70%',
    alignItems: 'center',
  },
  buttonText: {
    color: palette.text.light,
    fontSize: 16,
    fontWeight: 'bold',
  },
  container: {
    alignItems: 'center',
    backgroundColor: palette.background.primary,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  message: {
    color: palette.text.secondary,
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
    marginBottom: 20,
  },
  title: {
    color: palette.text.primary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
});