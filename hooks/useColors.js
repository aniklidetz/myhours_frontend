import { useColorScheme } from 'react-native';
import Colors from '../constants/Colors';

/**
 * Returns the active color palette and a flag indicating Dark Mode.
 */
export default function useColors() {
  const scheme = useColorScheme(); // 'light' | 'dark' | null
  const isDark = scheme === 'dark';
  const palette = isDark ? Colors.darkTheme : Colors;
  return { palette, isDark };
}
