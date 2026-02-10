import React from 'react';

export const radii = {
  card: 12,
  pill: 999,
  button: 12,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const colors = {
  primary: '#168E6A',
  primarySoft: '#E7F5F1',
  secondary: '#FBB03B',
  accent: '#D7D0FF',
  accentStrong: '#5F48E6',
  ink: '#292D32',
  inkStrong: '#1B1E22',
  inkMuted: '#7A8085',
  surface: '#F7F9FA',
  card: '#FFFFFF',
  border: '#E6E9EC',
  danger: '#E53935',
  success: '#168E6A',
};

export const typography = {
  family: {
    regular: 'ProximaNova_400Regular',
    medium: 'ProximaNova_500Medium',
    semibold: 'ProximaNova_600SemiBold',
    bold: 'ProximaNova_700Bold',
  },
  title: { size: 30, lineHeight: 36, weight: '700' as const },
  subtitle: { size: 22, lineHeight: 28, weight: '600' as const },
  body: { size: 16, lineHeight: 24, weight: '400' as const },
  caption: { size: 13, lineHeight: 18, weight: '400' as const },
  label: { size: 12, lineHeight: 16, weight: '600' as const },
};

export const layout = {
  tabBarHeight: 72,
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}
