import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/navigation/top-bar';
import { ActionButton } from '@/components/ui/action-button';
import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, layout, palette, spacing } from '@/constants/theme';
import { buildDailySession, getSessionSummarySnapshot } from '@/modules/review/review.engine';
import { useSessionStore } from '@/store/sessionStore';
import type { SessionSummary } from '@/types/session';

export default function SessionCompleteScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const setActiveSessionId = useSessionStore((state) => state.setActiveSessionId);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [isStartingReview, setIsStartingReview] = useState(false);

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
      router.replace(`/session/${session.id}`);
    } finally {
      setIsStartingReview(false);
    }
  }

  const isWide = width >= 820;

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopBar
        align="left"
        leftAction={{ icon: 'arrow-back', onPress: () => router.replace('/today') }}
        rightAction={{ icon: 'settings', onPress: () => router.push('/settings') }}
      />

      <View style={styles.container}>
        <DotMatrixBackground opacity={0.15} />

        <View style={styles.content}>
          <View style={styles.serialBlock}>
            <TechnicalLabel color="rgba(71,71,71,0.9)">
              Session ID: {summary?.id ?? sessionId ?? 'UNKNOWN'}
            </TechnicalLabel>
            <View style={styles.serialRule} />
          </View>

          <View style={styles.heroBlock}>
            <Text style={styles.heroTitle}>{summary?.completedItems ?? 0} words completed</Text>
            <Text style={styles.heroSubtitle}>Daily objective reached</Text>
          </View>

          <View style={[styles.metricsGrid, isWide && styles.metricsGridWide]}>
            <MetricTile
              icon="history"
              label="Reviews"
              tone="low"
              value={summary?.reviewItems ?? 0}
            />
            <MetricTile
              icon="add-circle-outline"
              label="New"
              tone="default"
              value={summary?.newItems ?? 0}
            />
            <MetricTile
              icon="event-available"
              label="Words scheduled for tomorrow"
              tone="high"
              value={summary?.tomorrowCount ?? 0}
            />
          </View>

          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <TechnicalLabel color="rgba(119,119,119,0.8)" style={styles.separatorLabel}>
              End of Sequence
            </TechnicalLabel>
            <View style={styles.separatorLine} />
          </View>

          <View style={[styles.actionRow, isWide && styles.actionRowWide]}>
            <ActionButton
              label="Finish Today"
              onPress={() => {
                setActiveSessionId(null);
                router.replace('/today');
              }}
              style={styles.primaryAction}
            />
            <ActionButton
              label={isStartingReview ? 'Preparing review...' : 'Start Review Session'}
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
  return (
    <View
      style={[
        styles.metricTile,
        tone === 'low' && styles.metricTileLow,
        tone === 'default' && styles.metricTileDefault,
        tone === 'high' && styles.metricTileHigh,
      ]}>
      <MaterialIcons color={palette.outline} name={icon} size={20} />
      <View style={styles.metricTextBlock}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
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
  serialBlock: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  serialRule: {
    width: 48,
    height: 2,
    backgroundColor: palette.primary,
    marginTop: spacing.sm,
  },
  heroBlock: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  heroTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 64,
    lineHeight: 64,
    letterSpacing: -3.2,
    color: palette.primary,
    textAlign: 'center',
    maxWidth: 760,
  },
  heroSubtitle: {
    marginTop: spacing.sm,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: palette.muted,
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
    backgroundColor: palette.surfaceContainerLow,
  },
  metricTileDefault: {
    backgroundColor: palette.surfaceContainer,
  },
  metricTileHigh: {
    backgroundColor: palette.surfaceContainerHigh,
  },
  metricTextBlock: {
    alignItems: 'flex-start',
  },
  metricValue: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 36,
    lineHeight: 36,
    color: palette.primary,
  },
  metricLabel: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: palette.muted,
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
    backgroundColor: 'rgba(198,198,198,0.5)',
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
});
