import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, spacing, type AppPalette } from '@/constants/theme';
import { getSettings } from '@/modules/progress/progress.service';
import { useAppTheme } from '@/theme/app-theme-provider';

export default function Index() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    async function routeNext() {
      try {
        const settings = await getSettings();

        if (!active) {
          return;
        }

        setRouteError(null);
        router.replace(settings.onboardingCompleted ? '/today' : '/onboarding');
      } catch (error) {
        if (active) {
          setRouteError(error instanceof Error ? error.message : 'Uygulama başlangıç akışı hazırlanamadı.');
        }
      }
    }

    void routeNext();

    return () => {
      active = false;
    };
  }, [attempt]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <DotMatrixBackground opacity={0.1} />

        <View style={styles.centerBlock}>
          <TechnicalLabel style={styles.serial}>SQLite ön yükleme • Yerel öncelikli çekirdek</TechnicalLabel>
          <View style={styles.logoBlock}>
            <Text style={styles.logo}>LEXICON</Text>
            <View style={styles.underline} />
          </View>
          <TechnicalLabel style={styles.motto}>Yavaş öğren, daha uzun süre hatırla</TechnicalLabel>
        </View>

        <View style={styles.footer}>
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} size="small" />
          </View>
          <View style={styles.progressMeta}>
            <TechnicalLabel color={colors.muted} style={styles.progressText}>
              Yerel depolama hazır
            </TechnicalLabel>
            <TechnicalLabel color={colors.muted} style={styles.progressText}>
              Yönlendiriliyor
            </TechnicalLabel>
          </View>
          <TechnicalLabel color={colors.mutedSoft} style={styles.footnote}>
            Sadece yerel kalıcı depolama
          </TechnicalLabel>
          {routeError ? (
            <View style={styles.errorState}>
              <TechnicalLabel color={colors.error}>Başlangıç tamamlanamadı</TechnicalLabel>
              <Text style={styles.errorText}>{routeError}</Text>
              <Pressable
                onPress={() => {
                  setRouteError(null);
                  setAttempt((current) => current + 1);
                }}
                style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}>
                <Text style={styles.retryButtonText}>Tekrar dene</Text>
              </Pressable>
            </View>
          ) : null}
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
    loadingRow: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 20,
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
    errorState: {
      marginTop: spacing.lg,
      alignItems: 'center',
      gap: spacing.sm,
    },
    errorText: {
      textAlign: 'center',
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 13,
      lineHeight: 20,
      color: colors.muted,
    },
    retryButton: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    retryButtonPressed: {
      opacity: 0.8,
    },
    retryButtonText: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 12,
      color: colors.primary,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
  });
}
