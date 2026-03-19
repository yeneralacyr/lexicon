import type { Theme } from '@react-navigation/native';

export const palette = {
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
} as const;

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
  topBarHeight: 64,
} as const;

export const appTheme: Theme = {
  dark: false,
  colors: {
    primary: palette.primary,
    background: palette.background,
    card: palette.surfaceContainerLowest,
    text: palette.ink,
    border: palette.border,
    notification: palette.primary,
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
