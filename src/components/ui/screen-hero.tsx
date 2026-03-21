import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ResponsiveDisplayText } from '@/components/ui/responsive-display-text';
import { fontFamilies, spacing, type AppPalette } from '@/constants/theme';
import { useAppTheme } from '@/theme/app-theme-provider';

type ScreenHeroProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
};

export function ScreenHero({ eyebrow, title, subtitle }: ScreenHeroProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <ResponsiveDisplayText numberOfLines={2} style={styles.title} variant="hero">
        {title}
      </ResponsiveDisplayText>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    hero: {
      marginBottom: spacing.xxl,
      gap: spacing.sm,
      width: '100%',
    },
    eyebrow: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 1.8,
      textTransform: 'uppercase',
      color: colors.muted,
      textAlign: 'left',
    },
    title: {
      textAlign: 'left',
      alignSelf: 'flex-start',
      maxWidth: 360,
    },
    subtitle: {
      maxWidth: 440,
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 15,
      lineHeight: 24,
      color: colors.muted,
      textAlign: 'left',
    },
  });
}
