import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/action-button';
import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, palette, spacing } from '@/constants/theme';
import { getSettings, updateSettings } from '@/modules/progress/progress.service';

const options = [5, 10, 15];

export default function OnboardingScreen() {
  const [selected, setSelected] = useState(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const settings = await getSettings();
      if (active) {
        setSelected(settings.dailyNewLimit);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  async function handleBegin() {
    setSaving(true);
    try {
      await updateSettings({
        dailyNewLimit: selected,
        onboardingCompleted: true,
      });
      router.replace('/today');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <DotMatrixBackground opacity={0.15} />

        <View style={styles.progressRow}>
          <View style={styles.progressInactive} />
          <View style={styles.progressInactive} />
          <View style={styles.progressActive} />
        </View>

        <View style={styles.content}>
          <View>
            <TechnicalLabel style={styles.stepLabel}>Step 03 — Finalize</TechnicalLabel>
            <Text style={styles.title}>Ready to start?</Text>
          </View>

          <Text style={styles.subtitle}>Choose your daily goal: 5, 10, or 15 new words.</Text>

          <View style={styles.options}>
            {options.map((value) => {
              const active = value === selected;
              return (
                <Pressable
                  key={value}
                  onPress={() => setSelected(value)}
                  style={[styles.optionCard, active && styles.optionCardActive]}>
                  <View>
                    <Text style={[styles.optionNumber, active && styles.optionNumberActive]}>{value}</Text>
                    <TechnicalLabel
                      color={active ? 'rgba(255,255,255,0.65)' : palette.muted}
                      style={styles.optionLabel}>
                      Words / Day
                    </TechnicalLabel>
                  </View>
                  <View style={[styles.optionCircle, active && styles.optionCircleActive]}>
                    {active ? <View style={styles.optionCircleDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <ActionButton
            label={saving ? 'Saving...' : "Let's Begin →"}
            onPress={() => {
              void handleBegin();
            }}
          />
          <TechnicalLabel color="rgba(119,119,119,0.45)" style={styles.footerText}>
            Local-first study setup
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    justifyContent: 'space-between',
    backgroundColor: palette.background,
  },
  progressRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  progressInactive: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(198,198,198,0.9)',
  },
  progressActive: {
    flex: 1,
    height: 3,
    backgroundColor: palette.primary,
  },
  content: {
    gap: spacing.xxl,
  },
  stepLabel: {
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 64,
    lineHeight: 64,
    letterSpacing: -2.4,
    color: palette.primary,
    maxWidth: 280,
  },
  subtitle: {
    maxWidth: 280,
    fontFamily: fontFamilies.bodyRegular,
    fontSize: 19,
    lineHeight: 30,
    color: palette.muted,
  },
  options: {
    gap: spacing.md,
  },
  optionCard: {
    minHeight: 102,
    backgroundColor: palette.surfaceContainerLowest,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionCardActive: {
    backgroundColor: palette.primary,
  },
  optionNumber: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 54,
    lineHeight: 54,
    letterSpacing: -2,
    color: palette.primary,
  },
  optionNumberActive: {
    color: palette.surfaceContainerLowest,
  },
  optionLabel: {
    marginTop: spacing.xxs,
  },
  optionCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(198,198,198,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCircleActive: {
    backgroundColor: palette.surfaceContainerLowest,
    borderColor: palette.surfaceContainerLowest,
  },
  optionCircleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.primary,
  },
  footer: {
    gap: spacing.lg,
  },
  footerText: {
    textAlign: 'center',
  },
});
