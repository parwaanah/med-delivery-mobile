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
  // Global font scale for the whole mobile app UI.
  // Keep weights the same; only sizes/line-heights are scaled.
  scale: 0.92,
  family: {
    regular: 'ProximaNova_400Regular',
    medium: 'ProximaNova_500Medium',
    semibold: 'ProximaNova_600SemiBold',
    bold: 'ProximaNova_700Bold',
  },
  title: { size: Math.round(30 * 0.92), lineHeight: Math.round(36 * 0.92), weight: '700' as const },
  subtitle: { size: Math.round(22 * 0.92), lineHeight: Math.round(28 * 0.92), weight: '600' as const },
  body: { size: Math.round(16 * 0.92), lineHeight: Math.round(24 * 0.92), weight: '400' as const },
  caption: { size: Math.round(13 * 0.92), lineHeight: Math.round(18 * 0.92), weight: '400' as const },
  label: { size: Math.round(12 * 0.92), lineHeight: Math.round(16 * 0.92), weight: '600' as const },
};

export const layout = {
  tabBarHeight: 72,
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}
