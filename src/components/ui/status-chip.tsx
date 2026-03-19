import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { fontFamilies, palette, radii, spacing } from '@/constants/theme';

type StatusChipProps = {
  label: string;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function StatusChip({ active = false, label, style }: StatusChipProps) {
  return (
    <View style={[styles.chip, active ? styles.activeChip : styles.inactiveChip, style]}>
      <Text style={[styles.text, active ? styles.activeText : styles.inactiveText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
  },
  activeChip: {
    backgroundColor: palette.chip,
  },
  inactiveChip: {
    backgroundColor: palette.surfaceContainerLow,
    borderWidth: 1,
    borderColor: palette.border,
  },
  text: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  activeText: {
    color: palette.ink,
  },
  inactiveText: {
    color: palette.muted,
  },
});
