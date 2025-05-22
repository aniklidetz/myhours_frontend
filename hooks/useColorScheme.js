import { useColorScheme as useExpoColorScheme } from 'react-native';

/**
 * Хук useColorScheme для определения темной/светлой темы
 * Создан для совместимости с кодом, который использует "@/hooks/useColorScheme"
 * 
 * @returns {string} 'dark' или 'light' в зависимости от настроек системы
 */
export default function useColorScheme() {
  return useExpoColorScheme();
}