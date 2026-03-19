import React, { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { palette, radii, spacing } from '@/constants/theme';

type SurfaceCardProps = PropsWithChildren<{
  tone?: 'lowest' | 'low' | 'default' | 'high';
  style?: StyleProp<ViewStyle>;
}>;

export function SurfaceCard({ children, style, tone = 'lowest' }: SurfaceCardProps) {
  return <View style={[styles.base, toneStyles[tone], style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    padding: spacing.lg,
    borderRadius: radii.lg,
  },
});

const toneStyles = StyleSheet.create({
  lowest: {
    backgroundColor: palette.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(198,198,198,0.3)',
  },
  low: {
    backgroundColor: palette.surfaceContainerLow,
  },
  default: {
    backgroundColor: palette.surfaceContainer,
  },
  high: {
    backgroundColor: palette.surfaceContainerHigh,
  },
});
