import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, palette, spacing } from '@/constants/theme';
import { getSettings } from '@/modules/progress/progress.service';

export default function Index() {
  useEffect(() => {
    let active = true;

    async function routeNext() {
      const [settings] = await Promise.all([
        getSettings(),
        new Promise((resolve) => setTimeout(resolve, 900)),
      ]);

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
          <TechnicalLabel style={styles.serial}>System.v1.0.4 • Minimal.Kernel</TechnicalLabel>
          <View style={styles.logoBlock}>
            <Text style={styles.logo}>LEXICON</Text>
            <View style={styles.underline} />
          </View>
          <TechnicalLabel style={styles.motto}>Learn slowly, remember longer</TechnicalLabel>
        </View>

        <View style={styles.footer}>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <View style={styles.progressMeta}>
            <TechnicalLabel color="rgba(71,71,71,0.6)" style={styles.progressText}>
              Loading modules
            </TechnicalLabel>
            <TechnicalLabel color="rgba(71,71,71,0.6)" style={styles.progressText}>
              34%
            </TechnicalLabel>
          </View>
          <TechnicalLabel color="rgba(71,71,71,0.35)" style={styles.footnote}>
            © 2024 Industrial Monolith Design
          </TechnicalLabel>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
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
    color: palette.primary,
  },
  underline: {
    width: 52,
    height: 2,
    backgroundColor: palette.primary,
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
    backgroundColor: 'rgba(198,198,198,0.55)',
  },
  progressFill: {
    width: '34%',
    height: '100%',
    backgroundColor: palette.primary,
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
