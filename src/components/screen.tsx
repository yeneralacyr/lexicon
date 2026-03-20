import React, { PropsWithChildren, ReactNode, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { useAppTheme } from '@/theme/app-theme-provider';

type AppScreenProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
  accessory?: ReactNode;
}>;

export function AppScreen({ accessory, children, eyebrow, subtitle, title }: AppScreenProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          {accessory}
        </View>

        <View style={styles.body}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxxl,
      gap: spacing.lg,
    },
    header: {
      gap: spacing.md,
    },
    headerText: {
      gap: spacing.sm,
    },
    eyebrow: {
      color: colors.muted,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1.4,
    },
    title: {
      color: colors.ink,
      fontSize: 42,
      lineHeight: 46,
      fontWeight: '800',
    },
    subtitle: {
      color: colors.muted,
      fontSize: 16,
      lineHeight: 24,
      maxWidth: 520,
    },
    body: {
      gap: spacing.md,
    },
  });
}
