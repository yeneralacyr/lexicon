import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fontFamilies, spacing } from '@/constants/theme';
import { useAppTheme } from '@/theme/app-theme-provider';

type MetricPanelProps = {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  tone?: 'low' | 'default' | 'high';
};

export function MetricPanel({ icon, label, tone = 'low', value }: MetricPanelProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const toneStyles = useMemo(() => createToneStyles(colors), [colors]);

  return (
    <View style={[styles.panel, toneStyles[tone]]}>
      {icon}
      <View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    panel: {
      minHeight: 140,
      padding: spacing.lg,
      justifyContent: 'space-between',
    },
    value: {
      fontFamily: fontFamilies.displayBold,
      fontSize: 34,
      color: colors.ink,
    },
    label: {
      marginTop: spacing.xs,
      fontFamily: fontFamilies.bodyBold,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 1.8,
      textTransform: 'uppercase',
      color: colors.muted,
    },
  });
}

function createToneStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
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
