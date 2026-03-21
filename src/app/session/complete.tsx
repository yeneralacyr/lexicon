import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/action-button';
import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { ResponsiveDisplayText } from '@/components/ui/responsive-display-text';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, layout, spacing, type AppPalette } from '@/constants/theme';
import { maybeShowSessionCompleteInterstitial } from '@/ads/service';
import { buildDailySession, getSessionSummarySnapshot } from '@/modules/review/review.engine';
import { useSessionStore } from '@/store/sessionStore';
import { useAppTheme } from '@/theme/app-theme-provider';
import type { SessionSummary } from '@/types/session';

export default function SessionCompleteScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const setActiveSessionId = useSessionStore((state) => state.setActiveSessionId);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [isStartingReview, setIsStartingReview] = useState(false);
  const [isFinishingSession, setIsFinishingSession] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!sessionId) {
        router.replace('/today');
        return;
      }

      const nextSummary = await getSessionSummarySnapshot(sessionId);

      if (!nextSummary) {
        router.replace('/today');
        return;
      }

      if (active) {
        setSummary(nextSummary);
        setActiveSessionId(null);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [router, sessionId, setActiveSessionId]);

  async function handleRereview() {
    setIsStartingReview(true);

    try {
      const session = await buildDailySession('review_only');

      if (!session) {
        router.replace('/today');
        return;
      }

      setActiveSessionId(session.id);
      router.replace(session.phase === 'quiz' ? `/session/quiz/${session.id}` : `/session/${session.id}`);
    } finally {
      setIsStartingReview(false);
    }
  }

  async function handleFinishDay() {
    if (isFinishingSession) {
      return;
    }

    setIsFinishingSession(true);

    try {
      await maybeShowSessionCompleteInterstitial(summary);
    } finally {
      setActiveSessionId(null);
      router.replace('/today');
      setIsFinishingSession(false);
    }
  }

  const isWide = width >= 820;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <DotMatrixBackground opacity={0.15} />

        <View style={styles.content}>
          <View style={styles.edgeControls}>
            <EdgeIconButton icon="arrow-back" onPress={() => router.replace('/today')} />
            <EdgeIconButton icon="settings" onPress={() => router.push('/settings')} />
          </View>

          <View style={styles.serialBlock}>
            <TechnicalLabel color={colors.muted}>
              Oturum ID: {summary?.id ?? sessionId ?? 'BİLİNMİYOR'}
            </TechnicalLabel>
            <View style={styles.serialRule} />
          </View>

          <View style={styles.heroBlock}>
            <ResponsiveDisplayText numberOfLines={2} style={styles.heroTitle} variant="hero">
              {`${summary?.uniqueWords ?? 0} kelime doğrulandı`}
            </ResponsiveDisplayText>
            <Text style={styles.heroSubtitle}>
              {`${summary?.completedItems ?? 0} kart işlendi • ${summary?.newItems ?? 0} yeni • ${summary?.reviewItems ?? 0} tekrar`}
            </Text>
          </View>

          <View style={[styles.metricsGrid, isWide && styles.metricsGridWide]}>
            <MetricTile
              icon="history"
              label="Çevrilen kartlar"
              tone="low"
              value={summary?.completedItems ?? 0}
            />
            <MetricTile
              icon="verified"
              label="Benzersiz kelimeler"
              tone="default"
              value={summary?.uniqueWords ?? 0}
            />
            <MetricTile
              icon="event-available"
              label="Yarın için planlanan kelimeler"
              tone="high"
              value={summary?.tomorrowCount ?? 0}
            />
          </View>

          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <TechnicalLabel color={colors.muted} style={styles.separatorLabel}>
              Seri Sonu
            </TechnicalLabel>
            <View style={styles.separatorLine} />
          </View>

          <View style={[styles.actionRow, isWide && styles.actionRowWide]}>
            <ActionButton
              disabled={isFinishingSession || isStartingReview}
              label={isFinishingSession ? 'Kapanıyor...' : 'Günü Bitir'}
              onPress={() => {
                void handleFinishDay();
              }}
              style={styles.primaryAction}
            />
            <ActionButton
              disabled={isStartingReview || isFinishingSession}
              label={isStartingReview ? 'Tekrar hazırlanıyor...' : 'Tekrar Oturumuna Başla'}
              onPress={() => {
                void handleRereview();
              }}
              style={styles.secondaryAction}
              variant="secondary"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function EdgeIconButton({
  icon,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.edgeButton, pressed && styles.pressed]}>
      <MaterialIcons color={colors.primary} name={icon} size={22} />
    </Pressable>
  );
}

function MetricTile({
  icon,
  label,
  tone,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  tone: 'low' | 'default' | 'high';
  value: number;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      style={[
        styles.metricTile,
        tone === 'low' && styles.metricTileLow,
        tone === 'default' && styles.metricTileDefault,
        tone === 'high' && styles.metricTileHigh,
      ]}>
      <MaterialIcons color={colors.outline} name={icon} size={20} />
      <View style={styles.metricTextBlock}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
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
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  edgeControls: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  edgeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  serialBlock: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  serialRule: {
    width: 48,
    height: 2,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
  heroBlock: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  heroTitle: {
    textAlign: 'center',
    maxWidth: 760,
    alignSelf: 'center',
  },
  heroSubtitle: {
    marginTop: spacing.sm,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: colors.muted,
    textAlign: 'center',
  },
  metricsGrid: {
    width: '100%',
    gap: spacing.xs,
  },
  metricsGridWide: {
    flexDirection: 'row',
  },
  metricTile: {
    flex: 1,
    minHeight: 148,
    padding: spacing.xl,
    justifyContent: 'space-between',
  },
  metricTileLow: {
    backgroundColor: colors.surfaceContainerLow,
  },
  metricTileDefault: {
    backgroundColor: colors.surfaceContainer,
  },
  metricTileHigh: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  metricTextBlock: {
    alignItems: 'flex-start',
  },
  metricValue: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 36,
    lineHeight: 36,
    color: colors.primary,
  },
  metricLabel: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.muted,
    flexShrink: 1,
  },
  separator: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xxxl,
    marginBottom: spacing.xxl,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  separatorLabel: {
    letterSpacing: 1.6,
  },
  actionRow: {
    width: '100%',
    gap: spacing.md,
  },
  actionRowWide: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  primaryAction: {
    flex: 1,
  },
  secondaryAction: {
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
  });
}
