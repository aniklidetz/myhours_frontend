/**
 * Color palette
 * - Light theme: top-level keys
 * - Dark theme: Colors.darkTheme
 */
const Colors = {
  /* ─── Light theme ─── */
  primary: '#2196F3',
  primaryDark: '#1976d2',
  primaryLight: '#bbdefb',
  primaryBackground: '#e3f2fd',

  success: '#4CAF50',
  successLight: '#c8e6c9',

  danger: '#F44336',
  dangerLight: '#ffcdd2',

  warning: '#ff9800',
  warningLight: '#ffecb3',

  text: {
    primary: '#212121',
    secondary: '#757575',
    accent: '#0a7ea4',
    light: '#FFFFFF',
  },

  background: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    dark: '#000000',
    darkSecondary: '#222222',
    transparent: 'transparent',
  },

  border: '#E0E0E0',

  overlay: {
    light: 'rgba(0,0,0,0.5)',
    dark: 'rgba(0,0,0,0.7)',
  },

  shadow: '#000000',

  /* ─── Dark theme ─── */
  darkTheme: {
    primary: '#90CAF9',
    primaryDark: '#64B5F6',
    primaryLight: '#E3F2FD',
    primaryBackground: '#121212',

    success: '#66BB6A',
    danger: '#EF5350',
    warning: '#FFB74D',

    text: {
      primary: '#FFFFFF',
      secondary: '#B3B3B3',
      accent: '#90CAF9',
      light: '#FFFFFF',
    },

    background: {
      primary: '#121212',
      secondary: '#1E1E1E',
      dark: '#000000',
      darkSecondary: '#272727',
      transparent: 'transparent',
    },

    border: '#272727',

    overlay: {
      light: 'rgba(255,255,255,0.10)',
      dark: 'rgba(0,0,0,0.60)',
    },

    shadow: '#000000',
  },

  /**
   * Converts hex to RGBA with opacity
   * @param {string} color  Hex code (#rrggbb)
   * @param {number} opacity 0–1
   * @returns {string} RGBA string
   */
  createBorderWithOpacity: (color, opacity) => {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  },
};

export default Colors;
