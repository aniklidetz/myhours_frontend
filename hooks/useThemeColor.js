import { useColorScheme } from 'react-native';
import Colors from '../constants/Colors';

/**
 * Hook to get color depending on current theme
 */
export function useThemeColor(props, colorName) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const palette = isDark ? Colors.darkTheme : Colors;

  // If specific colors for dark/light theme are specified in props, use them
  const colorFromProps = isDark ? props.dark : props.light;
  if (colorFromProps) {
    return colorFromProps;
  }

  // For simple color names
  if (colorName && !colorName.includes('.')) {
    return palette[colorName] || (isDark ? '#000' : '#fff');
  }

  // If color name with dot is specified (e.g. 'text.primary'), parse it
  if (colorName && colorName.includes('.')) {
    const parts = colorName.split('.');
    let color = palette;
    for (const part of parts) {
      if (color?.[part] === undefined) {
        console.warn(`Color "${colorName}" not found in palette`);
        return isDark ? '#000' : '#fff';
      }
      color = color[part];
    }
    return color;
  }

  return isDark ? '#000' : '#fff';
}

export default useThemeColor;
