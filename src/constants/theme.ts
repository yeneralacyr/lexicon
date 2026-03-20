import type { Theme } from '@react-navigation/native';

export type AppPalette = {
  background: string;
  surface: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  border: string;
  outline: string;
  ink: string;
  muted: string;
  mutedSoft: string;
  chip: string;
  primary: string;
  primaryContainer: string;
  error: string;
  errorContainer: string;
};

export const lightPalette: AppPalette = {
  background: '#F9F9F9',
  surface: '#F9F9F9',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F3F3F3',
  surfaceContainer: '#EEEEEE',
  surfaceContainerHigh: '#E8E8E8',
  surfaceContainerHighest: '#E2E2E2',
  border: '#C6C6C6',
  outline: '#777777',
  ink: '#1A1C1C',
  muted: '#474747',
  mutedSoft: '#ACABAB',
  chip: '#D5D4D4',
  primary: '#000000',
  primaryContainer: '#3B3B3B',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
};

export const darkPalette: AppPalette = {
  background: '#000000',
  surface: '#000000',
  surfaceContainerLowest: '#101010',
  surfaceContainerLow: '#151515',
  surfaceContainer: '#1C1C1C',
  surfaceContainerHigh: '#262626',
  surfaceContainerHighest: '#303030',
  border: '#3E3E3E',
  outline: '#A4A4A4',
  ink: '#FFFFFF',
  muted: '#D0D0D0',
  mutedSoft: '#7A7A7A',
  chip: '#242424',
  primary: '#FFFFFF',
  primaryContainer: '#D9D9D9',
  error: '#FFB4AB',
  errorContainer: '#5A1B1B',
};

export type ResolvedThemeMode = 'light' | 'dark';
export type ThemeMode = 'system' | ResolvedThemeMode;

export const palette = lightPalette;

export const fontFamilies = {
  displayRegular: 'SpaceGrotesk-Regular',
  displayMedium: 'SpaceGrotesk-Medium',
  displayBold: 'SpaceGrotesk-Bold',
  bodyRegular: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemiBold: 'Inter-SemiBold',
  bodyBold: 'Inter-Bold',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 56,
  xxxxl: 72,
} as const;

export const radii = {
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
  pill: 999,
} as const;

export const layout = {
  maxWidth: 960,
  narrowWidth: 620,
  bottomTabHeight: 88,
  floatingTabBarHeight: 72,
  topBarHeight: 64,
} as const;

export function getPalette(mode: ResolvedThemeMode): AppPalette {
  return mode === 'dark' ? darkPalette : lightPalette;
}

export function createNavigationTheme(colors: AppPalette, mode: ResolvedThemeMode): Theme {
  return {
    dark: mode === 'dark',
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surfaceContainerLowest,
      text: colors.ink,
      border: colors.border,
      notification: colors.primary,
    },
    fonts: {
      regular: {
        fontFamily: fontFamilies.bodyRegular,
        fontWeight: '400',
      },
      medium: {
        fontFamily: fontFamilies.bodyMedium,
        fontWeight: '500',
      },
      bold: {
        fontFamily: fontFamilies.bodyBold,
        fontWeight: '700',
      },
      heavy: {
        fontFamily: fontFamilies.displayBold,
        fontWeight: '700',
      },
    },
  };
}
