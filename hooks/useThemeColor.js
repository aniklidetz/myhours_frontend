import { useColorScheme } from 'react-native';
import Colors from '../constants/Colors';

/**
 * Хук для получения цвета в зависимости от текущей темы
 */
export function useThemeColor(props, colorName) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const palette = isDark ? Colors.darkTheme : Colors;
  
  // Если в props указаны конкретные цвета для темной/светлой темы, используем их
  const colorFromProps = isDark ? props.dark : props.light;
  if (colorFromProps) {
    return colorFromProps;
  }
  
  // Для простых имен цветов
  if (colorName && !colorName.includes('.')) {
    return palette[colorName] || (isDark ? '#000' : '#fff');
  }
  
  // Если указано имя цвета с точкой (например 'text.primary'), разберем его
  if (colorName && colorName.includes('.')) {
    const parts = colorName.split('.');
    let color = palette;
    for (const part of parts) {
      if (color?.[part] === undefined) {
        console.warn(`Цвет "${colorName}" не найден в палитре`);
        return isDark ? '#000' : '#fff';
      }
      color = color[part];
    }
    return color;
  }
  
  return isDark ? '#000' : '#fff';
}

export default useThemeColor;