import { useColorScheme as useExpoColorScheme } from 'react-native';

/**
 * useColorScheme hook to determine dark/light theme
 * Created for compatibility with code that uses "@/hooks/useColorScheme"
 *
 * @returns {string} 'dark' or 'light' depending on system settings
 */
export default function useColorScheme() {
  return useExpoColorScheme();
}
