import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/navigation/top-bar';
import { ActionButton } from '@/components/ui/action-button';
import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, layout, palette, spacing } from '@/constants/theme';
import { getAppOverview, getSettings, updateSettings } from '@/modules/progress/progress.service';
import type { AppOverview, StudySettings } from '@/types/db';

const newWordOptions = [5, 10, 15];

export default function SettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<StudySettings | null>(null);
  const [overview, setOverview] = useState<AppOverview | null>(null);

  const refresh = useCallback(async () => {
    const [nextSettings, nextOverview] = await Promise.all([getSettings(), getAppOverview()]);
    setSettings(nextSettings);
    setOverview(nextOverview);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  async function patchSettings(updates: Partial<StudySettings>) {
    const next = await updateSettings(updates);
    setSettings(next);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopBar
        align="left"
        leftAction={{ icon: 'arrow-back', onPress: () => router.back() }}
        rightAction={{ icon: 'settings' }}
      />
      <View style={styles.container}>
        <DotMatrixBackground opacity={0.03} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroRule} />
            <View style={styles.heroText}>
              <TechnicalLabel style={styles.heroLabel}>System Configuration</TechnicalLabel>
              <Text style={styles.heroTitle}>SETTINGS</Text>
              <Text style={styles.heroSubtitle}>
                Refine your cognitive intake parameters and system interface preferences.
              </Text>
            </View>
          </View>

          <View style={styles.grid}>
            <View style={styles.primaryColumn}>
              <View style={styles.block}>
                <TechnicalLabel style={styles.blockLabel}>Inspiration Frequency</TechnicalLabel>
                <Text style={styles.blockTitle}>Daily New Words</Text>
                <View style={styles.segmentRow}>
                  {newWordOptions.map((option) => {
                    const active = settings?.dailyNewLimit === option;

                    return (
                      <Pressable
                        key={option}
                        onPress={() => {
                          void patchSettings({ dailyNewLimit: option });
                        }}
                        style={[styles.segment, active && styles.segmentActive]}>
                        <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                          {String(option).padStart(2, '0')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.block}>
                <TechnicalLabel style={styles.blockLabel}>Retention Buffer</TechnicalLabel>
                <Text style={styles.blockTitle}>Daily Review Limit</Text>
                <View style={styles.capacityCard}>
                  <Text style={styles.capacityLabel}>Active Capacity</Text>
                  <View style={styles.capacityRight}>
                    <Text style={styles.capacityValue}>{settings?.dailyReviewLimit ?? 0}</Text>
                    <View style={styles.capacityButtons}>
                      <Pressable
                        onPress={() => {
                          void patchSettings({
                            dailyReviewLimit: Math.min(100, (settings?.dailyReviewLimit ?? 20) + 5),
                          });
                        }}>
                        <MaterialIcons color={palette.primary} name="add" size={16} />
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          void patchSettings({
                            dailyReviewLimit: Math.max(5, (settings?.dailyReviewLimit ?? 20) - 5),
                          });
                        }}>
                        <MaterialIcons color={palette.primary} name="remove" size={16} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.sideColumn}>
              <View style={styles.sideCard}>
                <View style={styles.preferenceRow}>
                  <View>
                    <Text style={styles.preferenceTitle}>Notifications</Text>
                    <TechnicalLabel color="rgba(71,71,71,0.75)">Alert Signals</TechnicalLabel>
                  </View>
                  <Switch
                    onValueChange={(value) => {
                      void patchSettings({ notificationsEnabled: value });
                    }}
                    thumbColor={palette.surfaceContainerLowest}
                    trackColor={{ false: palette.border, true: palette.primary }}
                    value={settings?.notificationsEnabled ?? false}
                  />
                </View>

                <View style={styles.preferenceRow}>
                  <View>
                    <Text style={styles.preferenceTitle}>Interface Theme</Text>
                    <TechnicalLabel color="rgba(71,71,71,0.75)">Chroma Profile</TechnicalLabel>
                  </View>
                  <View style={styles.themeSwitch}>
                    <View style={styles.themeActive}>
                      <Text style={styles.themeActiveText}>Light</Text>
                    </View>
                    <View style={styles.themeInactive}>
                      <Text style={styles.themeInactiveText}>Dark</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.actionStack}>
                <ActionButton label="Export Progress" variant="secondary" />
                <ActionButton label="Data Reset" variant="secondary" style={styles.dangerButton} />
              </View>
            </View>
          </View>

          <View style={styles.footerStats}>
            <FooterStat label="Build Version" value={`${overview?.dbVersion ?? '0'}.4-STABLE`} />
            <FooterStat label="Storage Util" value={`${Math.max(1, Math.round((overview?.wordCount ?? 0) / 211))} MB`} />
            <FooterStat label="Last Sync" value="LOCAL ONLY" />
            <FooterStat label="Legal" value="PRIVACY POLICY" align="right" />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function FooterStat({
  align = 'left',
  label,
  value,
}: {
  label: string;
  value: string;
  align?: 'left' | 'right';
}) {
  return (
    <View style={align === 'right' ? styles.footerStatRight : styles.footerStat}>
      <TechnicalLabel color="rgba(71,71,71,0.8)">{label}</TechnicalLabel>
      <Text style={[styles.footerValue, align === 'right' && styles.footerValueRight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    maxWidth: layout.maxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  heroRule: {
    width: 4,
    backgroundColor: palette.primary,
  },
  heroText: {
    flex: 1,
  },
  heroLabel: {
    marginBottom: spacing.xs,
  },
  heroTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 64,
    lineHeight: 64,
    letterSpacing: -2.4,
    color: palette.primary,
  },
  heroSubtitle: {
    marginTop: spacing.md,
    maxWidth: 420,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 15,
    lineHeight: 24,
    color: palette.muted,
  },
  grid: {
    gap: spacing.xl,
  },
  primaryColumn: {
    gap: spacing.xxxl,
  },
  block: {
    gap: spacing.lg,
  },
  blockLabel: {
    marginBottom: spacing.xxs,
  },
  blockTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 30,
    lineHeight: 34,
    color: palette.primary,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,198,198,0.35)',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceContainer,
  },
  segmentActive: {
    backgroundColor: palette.primary,
  },
  segmentText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 16,
    color: palette.primary,
  },
  segmentTextActive: {
    color: palette.surfaceContainerLowest,
  },
  capacityCard: {
    minHeight: 118,
    backgroundColor: palette.surfaceContainerLow,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
    color: palette.ink,
    textTransform: 'uppercase',
  },
  capacityRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  capacityValue: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 42,
    color: palette.primary,
  },
  capacityButtons: {
    gap: spacing.sm,
  },
  sideColumn: {
    gap: spacing.xl,
  },
  sideCard: {
    padding: spacing.lg,
    backgroundColor: palette.surfaceContainer,
    borderLeftWidth: 2,
    borderLeftColor: palette.primary,
    gap: spacing.xl,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  preferenceTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 16,
    lineHeight: 20,
    color: palette.primary,
    textTransform: 'uppercase',
  },
  themeSwitch: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  themeActive: {
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  themeInactive: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  themeActiveText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    textTransform: 'uppercase',
    color: palette.surfaceContainerLowest,
  },
  themeInactiveText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    textTransform: 'uppercase',
    color: palette.primary,
  },
  actionStack: {
    gap: spacing.md,
  },
  dangerButton: {
    backgroundColor: 'rgba(255,218,214,0.45)',
    borderColor: 'rgba(186,26,26,0.15)',
  },
  footerStats: {
    marginTop: spacing.xxxxl,
    paddingTop: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(198,198,198,0.25)',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xl,
  },
  footerStat: {
    minWidth: 120,
    gap: spacing.xs,
  },
  footerStatRight: {
    minWidth: 120,
    gap: spacing.xs,
    marginLeft: 'auto',
    alignItems: 'flex-end',
  },
  footerValue: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    lineHeight: 16,
    color: palette.primary,
  },
  footerValueRight: {
    textDecorationLine: 'underline',
  },
});
