type ThemeProps = {
  light?: string;
  dark?: string;
};

export function useThemeColor(props: ThemeProps, colorName: string): string;
export default function useThemeColor(props: ThemeProps, colorName: string): string;    
