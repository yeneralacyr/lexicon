import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { fontFamilies, radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/theme/app-theme-provider';

type ActionButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: ViewStyle;
  disabled?: boolean;
};

export function ActionButton({
  disabled = false,
  label,
  onPress,
  style,
  variant = 'primary',
}: ActionButtonProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        numberOfLines={1}
        style={[
          styles.label,
          variant === 'primary' && styles.primaryLabel,
          variant !== 'primary' && styles.secondaryLabel,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    base: {
      minHeight: 56,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.sm,
      minWidth: 0,
    },
    primary: {
      backgroundColor: colors.primary,
    },
    secondary: {
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.outline,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    disabled: {
      opacity: 0.45,
    },
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }],
    },
    label: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 2.4,
      textTransform: 'uppercase',
      textAlign: 'center',
      width: '100%',
      flexShrink: 1,
    },
    primaryLabel: {
      color: colors.surfaceContainerLowest,
    },
    secondaryLabel: {
      color: colors.primary,
    },
  });
}
