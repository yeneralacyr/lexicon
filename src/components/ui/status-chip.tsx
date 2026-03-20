import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { fontFamilies, radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/theme/app-theme-provider';

type StatusChipProps = {
  label: string;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function StatusChip({ active = false, label, style }: StatusChipProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.chip, active ? styles.activeChip : styles.inactiveChip, style]}>
      <Text style={[styles.text, active ? styles.activeText : styles.inactiveText]}>{label}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    chip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs + 1,
      borderRadius: radii.sm,
      alignSelf: 'flex-start',
    },
    activeChip: {
      backgroundColor: colors.chip,
    },
    inactiveChip: {
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 10,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    activeText: {
      color: colors.ink,
    },
    inactiveText: {
      color: colors.muted,
    },
  });
}
