import React, { PropsWithChildren, useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/theme/app-theme-provider';

type SurfaceCardProps = PropsWithChildren<{
  tone?: 'lowest' | 'low' | 'default' | 'high';
  style?: StyleProp<ViewStyle>;
}>;

export function SurfaceCard({ children, style, tone = 'lowest' }: SurfaceCardProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(), []);
  const toneStyles = useMemo(() => createToneStyles(colors), [colors]);

  return <View style={[styles.base, toneStyles[tone], style]}>{children}</View>;
}

function createStyles() {
  return StyleSheet.create({
    base: {
      padding: spacing.lg,
      borderRadius: radii.lg,
    },
  });
}

function createToneStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    lowest: {
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.border,
    },
    low: {
      backgroundColor: colors.surfaceContainerLow,
    },
    default: {
      backgroundColor: colors.surfaceContainer,
    },
    high: {
      backgroundColor: colors.surfaceContainerHigh,
    },
  });
}
