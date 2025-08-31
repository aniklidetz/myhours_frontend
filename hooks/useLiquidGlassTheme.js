import { useMemo } from 'react';

const useLiquidGlassTheme = () => {
  const theme = useMemo(() => {
    return {
      colors: {
        // Background gradients
        background: {
          primary: ['#1a1a2e', '#16213e', '#0f3460'],
          secondary: ['#0f3460', '#533483'],
          dark: ['#0a0a0f', '#1a1a2e'],
        },
        // Blob gradients
        blobs: {
          warm: ['#e94560', '#f27121'],
          cool: ['#721b65', '#b80d57'],
          neutral: ['#0f3460', '#533483'],
        },
        // Glass effects
        glass: {
          light: 'rgba(255,255,255,0.1)',
          medium: 'rgba(255,255,255,0.2)',
          heavy: 'rgba(255,255,255,0.3)',
          border: 'rgba(255,255,255,0.2)',
        },
        // Text colors
        text: {
          primary: '#FFFFFF',
          secondary: 'rgba(255,255,255,0.8)',
          muted: 'rgba(255,255,255,0.6)',
          disabled: 'rgba(255,255,255,0.4)',
        },
        // Status colors
        status: {
          success: ['#4ade80', '#22c55e'],
          warning: ['#fbbf24', '#f59e0b'],
          error: ['#f87171', '#ef4444'],
          info: ['#60a5fa', '#3b82f6'],
        },
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
      },
      borderRadius: {
        sm: 8,
        md: 15,
        lg: 20,
        xl: 25,
        full: 999,
      },
      blur: {
        light: 20,
        medium: 30,
        heavy: 50,
      },
      animation: {
        fast: 200,
        normal: 300,
        slow: 500,
        verySlow: 1000,
      },
      shadows: {
        text: {
          color: 'rgba(233,69,96,0.5)',
          offset: { width: 0, height: 2 },
          radius: 10,
        },
        box: {
          color: 'rgba(0,0,0,0.3)',
          offset: { width: 0, height: 4 },
          radius: 15,
          elevation: 5,
        },
        elevated: {
          shadowColor: 'rgba(0,0,0,0.4)',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.8,
          shadowRadius: 20,
          elevation: 10,
        },
      },
      typography: {
        title: {
          fontSize: 48,
          fontWeight: '800',
          letterSpacing: 0,
        },
        subtitle: {
          fontSize: 18,
          fontWeight: '400',
          letterSpacing: 1,
        },
        body: {
          fontSize: 16,
          fontWeight: '400',
          letterSpacing: 0.5,
        },
        button: {
          fontSize: 16,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
        caption: {
          fontSize: 14,
          fontWeight: '400',
          letterSpacing: 0.3,
        },
      },
    };
  }, []);

  return theme;
};

export default useLiquidGlassTheme;
