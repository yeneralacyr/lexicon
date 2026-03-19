import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fontFamilies, palette, spacing } from '@/constants/theme';

type MetricPanelProps = {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  tone?: 'low' | 'default' | 'high';
};

export function MetricPanel({ icon, label, tone = 'low', value }: MetricPanelProps) {
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

const styles = StyleSheet.create({
  panel: {
    minHeight: 140,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  value: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 34,
    color: palette.ink,
  },
  label: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: palette.muted,
  },
});

const toneStyles = StyleSheet.create({
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
