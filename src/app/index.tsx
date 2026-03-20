import { router } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, spacing, type AppPalette } from '@/constants/theme';
import { getSettings } from '@/modules/progress/progress.service';
import { useAppTheme } from '@/theme/app-theme-provider';

export default function Index() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    let active = true;

    async function routeNext() {
      const [settings] = await Promise.all([getSettings(), new Promise((resolve) => setTimeout(resolve, 900))]);

      if (!active) {
        return;
      }

      router.replace(settings.onboardingCompleted ? '/today' : '/onboarding');
    }

    void routeNext();

    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <DotMatrixBackground opacity={0.1} />

        <View style={styles.centerBlock}>
          <TechnicalLabel style={styles.serial}>SQLite on yukleme • Yerel oncelikli cekirdek</TechnicalLabel>
          <View style={styles.logoBlock}>
            <Text style={styles.logo}>LEXICON</Text>
            <View style={styles.underline} />
          </View>
          <TechnicalLabel style={styles.motto}>Yavas ogren, daha uzun sure hatirla</TechnicalLabel>
        </View>

        <View style={styles.footer}>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <View style={styles.progressMeta}>
            <TechnicalLabel color={colors.muted} style={styles.progressText}>
              Yerel depolama hazir
            </TechnicalLabel>
            <TechnicalLabel color={colors.muted} style={styles.progressText}>
              Yonlendiriliyor
            </TechnicalLabel>
          </View>
          <TechnicalLabel color={colors.mutedSoft} style={styles.footnote}>
            Sadece yerel kalici depolama
          </TechnicalLabel>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: spacing.xl,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: spacing.xxxxl,
      paddingBottom: spacing.xxl,
    },
    centerBlock: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    serial: {
      opacity: 0.6,
      textAlign: 'center',
      marginBottom: spacing.xxxl,
    },
    logoBlock: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    logo: {
      fontFamily: fontFamilies.displayBold,
      fontSize: 72,
      lineHeight: 72,
      letterSpacing: -4,
      color: colors.primary,
    },
    underline: {
      width: 52,
      height: 2,
      backgroundColor: colors.primary,
    },
    motto: {
      marginTop: spacing.xl,
      textAlign: 'center',
    },
    footer: {
      width: '100%',
      maxWidth: 280,
      gap: spacing.sm,
    },
    progressTrack: {
      height: 1,
      backgroundColor: colors.border,
    },
    progressFill: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.primary,
    },
    progressMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    progressText: {
      letterSpacing: 1.6,
    },
    footnote: {
      textAlign: 'center',
      marginTop: spacing.xl,
      fontSize: 8,
      letterSpacing: 4,
    },
  });
}
