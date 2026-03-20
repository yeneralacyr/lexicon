import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/theme/app-theme-provider';

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
};

export function PrimaryButton({ label, onPress }: PrimaryButtonProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    button: {
      backgroundColor: colors.ink,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.85,
    },
    label: {
      color: colors.surfaceContainerLowest,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
  });
}
