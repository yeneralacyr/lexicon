import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/navigation/top-bar';
import { ActionButton } from '@/components/ui/action-button';
import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, layout, palette, spacing } from '@/constants/theme';
import { buildDailySession, type SessionMode, getDashboardSnapshot } from '@/modules/review/review.engine';
import { useSessionStore } from '@/store/sessionStore';
import type { DashboardSnapshot } from '@/types/db';

export default function TodayScreen() {
  const isFocused = useIsFocused();
  const setActiveSessionId = useSessionStore((state) => state.setActiveSessionId);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [startingMode, setStartingMode] = useState<SessionMode | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const nextSnapshot = await getDashboardSnapshot();
      if (active) {
        setSnapshot(nextSnapshot);
      }
    }

    if (isFocused) {
      void load();
    }

    return () => {
      active = false;
    };
  }, [isFocused]);

  async function handleStartSession(mode: SessionMode) {
    setStartingMode(mode);

    try {
      const session = await buildDailySession(mode);

      if (!session) {
        return;
      }

      setActiveSessionId(session.id);
      router.push(`/session/${session.id}`);
    } finally {
      setStartingMode(null);
    }
  }

  const recommendedCount = snapshot?.recommendedCount ?? 0;
  const plannedNewCount = Math.max(0, recommendedCount - (snapshot?.dueToday ?? 0));
  const hasActiveSession = Boolean(snapshot?.activeSessionId);
  const completedToday = snapshot?.completedToday ?? 0;
  const activeSessionCompletedItems = snapshot?.activeSessionCompletedItems ?? 0;
  const activeSessionTotalItems = snapshot?.activeSessionTotalItems ?? 0;
  const activeSessionRemaining = Math.max(0, activeSessionTotalItems - activeSessionCompletedItems);
  const queueEmpty = !hasActiveSession && recommendedCount === 0;
  const progressPercent = hasActiveSession
    ? activeSessionTotalItems > 0
      ? (activeSessionCompletedItems / activeSessionTotalItems) * 100
      : 0
    : recommendedCount > 0
      ? (completedToday / recommendedCount) * 100
      : 0;
  const greeting = hasActiveSession
    ? `Resume your in-progress session. ${activeSessionRemaining} cards remaining.`
    : recommendedCount > 0
      ? `Good morning. ${recommendedCount} words waiting for you today.`
      : 'Good morning. No words are scheduled right now.';
  const primaryLabel = hasActiveSession
    ? startingMode
      ? 'Opening session...'
      : 'Resume Session →'
    : queueEmpty
      ? 'Nothing Scheduled'
      : startingMode === 'daily'
        ? 'Starting session...'
        : 'Start Session →';

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <TopBar
        align="center"
        rightAction={{ icon: 'settings', onPress: () => router.push('/settings') }}
      />
      <View style={styles.container}>
        <DotMatrixBackground opacity={0.12} />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.headerBlock}>
            <TechnicalLabel style={styles.centeredLabel}>Status report</TechnicalLabel>
            <Text style={styles.greeting}>{greeting}</Text>
          </View>

          <View style={styles.heroCard}>
            <TechnicalLabel color="rgba(119,119,119,0.75)" style={styles.heroTag}>
              Module 04-A
            </TechnicalLabel>
            <Text style={styles.heroNumber}>{hasActiveSession ? activeSessionRemaining : recommendedCount}</Text>
            <TechnicalLabel style={styles.heroCaption}>
              {hasActiveSession ? 'Items remaining' : "Today&apos;s review"}
            </TechnicalLabel>

            <View style={styles.heroMeta}>
              <View style={styles.heroMetaRow}>
                <Text style={styles.heroMetaText}>
                  {hasActiveSession
                    ? `${activeSessionCompletedItems} completed`
                    : `${plannedNewCount} new words`}
                </Text>
                <Text style={styles.heroMetaText}>
                  {hasActiveSession
                    ? `~${Math.max(1, snapshot?.estimatedMinutes ?? 0)} min left`
                    : `~${snapshot?.estimatedMinutes ?? 0} min`}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, progressPercent))}%` }]} />
              </View>
            </View>
          </View>

          <View style={styles.ctaBlock}>
            <ActionButton
              disabled={queueEmpty}
              label={primaryLabel}
              onPress={() => {
                void handleStartSession('daily');
              }}
            />

            <View style={styles.modeRow}>
              <ModeLink
                disabled={!hasActiveSession && (snapshot?.dueToday ?? 0) === 0}
                label="Review only"
                onPress={() => {
                  void handleStartSession('review_only');
                }}
              />
              <ModeLink
                disabled={!hasActiveSession && (snapshot?.newWords ?? 0) === 0}
                label="New words only"
                onPress={() => {
                  void handleStartSession('new_only');
                }}
              />
            </View>
            {queueEmpty ? (
              <TechnicalLabel color="rgba(119,119,119,0.62)" style={styles.queueNote}>
                No due or new cards are waiting. Come back after your next review window opens.
              </TechnicalLabel>
            ) : null}
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCell}>
              <TechnicalLabel color="rgba(119,119,119,0.8)">Streak</TechnicalLabel>
              <View style={styles.metricValueRow}>
                <MaterialIcons color={palette.primary} name="bolt" size={14} />
                <Text style={styles.metricValue}>{snapshot?.streakDays ?? 0} days</Text>
              </View>
            </View>
            <View style={styles.metricCell}>
              <TechnicalLabel color="rgba(119,119,119,0.8)">Learned</TechnicalLabel>
              <View style={styles.metricValueRow}>
                <MaterialIcons color={palette.primary} name="verified" size={14} />
                <Text style={styles.metricValue}>{snapshot?.studiedWords ?? 0} words</Text>
              </View>
            </View>
          </View>

          <TechnicalLabel color="rgba(119,119,119,0.45)" style={styles.footerNote}>
            Completed today: {completedToday}
          </TechnicalLabel>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function ModeLink({
  disabled = false,
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.modePressed, disabled && styles.modeDisabled]}>
      <Text style={[styles.modeLink, disabled && styles.modeLinkDisabled]}>{label}</Text>
    </Pressable>
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
    paddingTop: spacing.lg,
    paddingBottom: layout.bottomTabHeight + spacing.xxxl,
    alignItems: 'center',
  },
  headerBlock: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  centeredLabel: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  greeting: {
    maxWidth: 320,
    fontFamily: fontFamilies.displayMedium,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.8,
    color: palette.ink,
    textAlign: 'center',
  },
  heroCard: {
    width: '100%',
    maxWidth: layout.narrowWidth,
    backgroundColor: palette.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(198,198,198,0.3)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    marginBottom: spacing.xxl,
  },
  heroTag: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.md,
    letterSpacing: 1.6,
  },
  heroNumber: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 112,
    lineHeight: 112,
    letterSpacing: -5,
    color: palette.primary,
    textAlign: 'center',
  },
  heroCaption: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  heroMeta: {
    marginTop: spacing.xxl,
  },
  heroMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  heroMetaText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.2,
    color: palette.muted,
    textTransform: 'uppercase',
  },
  progressTrack: {
    height: 2,
    backgroundColor: palette.surfaceContainer,
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.primary,
  },
  ctaBlock: {
    width: '100%',
    maxWidth: layout.narrowWidth,
    gap: spacing.lg,
  },
  queueNote: {
    textAlign: 'center',
    maxWidth: 280,
    alignSelf: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  modeLink: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2.2,
    color: palette.muted,
    textTransform: 'uppercase',
  },
  modePressed: {
    opacity: 0.6,
  },
  modeDisabled: {
    opacity: 0.45,
  },
  modeLinkDisabled: {
    color: 'rgba(119,119,119,0.6)',
  },
  metricsGrid: {
    width: '100%',
    maxWidth: layout.narrowWidth,
    flexDirection: 'row',
    marginTop: spacing.xxxl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(198,198,198,0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,198,198,0.3)',
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricValue: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1,
    color: palette.ink,
  },
  footerNote: {
    marginTop: spacing.xxl,
    opacity: 0.4,
  },
});
