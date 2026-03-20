import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/navigation/top-bar';
import { ActionButton } from '@/components/ui/action-button';
import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { ResponsiveDisplayText } from '@/components/ui/responsive-display-text';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, spacing, type AppPalette } from '@/constants/theme';
import { useFloatingTabInset } from '@/hooks/use-floating-tab-inset';
import { buildDailySession, type SessionMode, getDashboardSnapshot } from '@/modules/review/review.engine';
import { useSessionStore } from '@/store/sessionStore';
import { useAppTheme } from '@/theme/app-theme-provider';
import type { DashboardSnapshot } from '@/types/db';

export default function TodayScreen() {
  const isFocused = useIsFocused();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const bottomInset = useFloatingTabInset();
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
      router.push(session.phase === 'quiz' ? `/session/quiz/${session.id}` : `/session/${session.id}`);
    } finally {
      setStartingMode(null);
    }
  }

  const recommendedCount = snapshot?.recommendedCount ?? 0;
  const plannedNewCount = Math.max(0, recommendedCount - (snapshot?.dueToday ?? 0));
  const hasActiveSession = Boolean(snapshot?.activeSessionId);
  const activeSessionPhase = snapshot?.activeSessionPhase ?? null;
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
  const greeting = activeSessionPhase === 'quiz'
    ? `Final quiz seni bekliyor. ${activeSessionRemaining} kelime kaldı.`
    : hasActiveSession
    ? `Yarım kalan oturumuna devam et. ${activeSessionRemaining} kart kaldı.`
    : recommendedCount > 0
      ? `Bugün ${recommendedCount} kartlık kısa bir tekrar turu hazır.`
      : 'Bugün için planlanan kart kalmadı.';
  const primaryLabel = activeSessionPhase === 'quiz'
    ? startingMode
      ? 'Quiz açılıyor...'
      : "Quiz'e Devam Et"
    : hasActiveSession
    ? startingMode
      ? 'Oturum açılıyor...'
      : 'Kaldığın Yerden Devam Et'
    : queueEmpty
      ? 'Bugünlük Tamam'
      : startingMode === 'daily'
        ? 'Oturum hazırlanıyor...'
        : 'Bugünkü Oturumu Başlat';

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <TopBar align="center" />
      <View style={styles.container}>
        <DotMatrixBackground opacity={0.12} />

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.headerBlock}>
            <TechnicalLabel style={styles.centeredLabel}>Durum raporu</TechnicalLabel>
            <ResponsiveDisplayText numberOfLines={3} style={styles.greeting} variant="section">
              {greeting}
            </ResponsiveDisplayText>
          </View>

          <View style={styles.heroCard}>
            <TechnicalLabel color={colors.muted} style={styles.heroTag}>
              Günlük döngü
            </TechnicalLabel>
            <Text adjustsFontSizeToFit minimumFontScale={0.68} numberOfLines={1} style={styles.heroNumber}>
              {hasActiveSession ? activeSessionRemaining : recommendedCount}
            </Text>
            <TechnicalLabel style={styles.heroCaption}>
              {activeSessionPhase === 'quiz' ? 'Kalan quiz kelimeleri' : hasActiveSession ? 'Kalan kartlar' : "Bugünün ana turu"}
            </TechnicalLabel>

            <View style={styles.heroMeta}>
              <View style={styles.heroMetaRow}>
                <Text numberOfLines={1} style={styles.heroMetaText}>
                  {activeSessionPhase === 'quiz'
                    ? `${activeSessionCompletedItems} doğrulandı`
                    : hasActiveSession
                      ? `${activeSessionCompletedItems} tamamlandı`
                      : `${plannedNewCount} yeni kart`}
                </Text>
                <Text numberOfLines={1} style={styles.heroMetaText}>
                  {activeSessionPhase === 'quiz'
                    ? `~${Math.max(1, Math.ceil(activeSessionRemaining / 4))} dk`
                    : hasActiveSession
                    ? `~${Math.max(1, snapshot?.estimatedMinutes ?? 0)} dk kaldı`
                    : `~${snapshot?.estimatedMinutes ?? 0} dk`}
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
                label="Sadece tekrar"
                onPress={() => {
                  void handleStartSession('review_only');
                }}
              />
              <ModeLink
                disabled={!hasActiveSession && (snapshot?.newWords ?? 0) === 0}
                label="Sadece yeni"
                onPress={() => {
                  void handleStartSession('new_only');
                }}
              />
            </View>
            {queueEmpty ? (
              <TechnicalLabel color={colors.muted} style={styles.queueNote}>
                Tekrar kuyruğun şu an boş. Yarın yeni kartlar hazırlandığında kaldığın yerden devam edeceksin.
              </TechnicalLabel>
            ) : (
              <TechnicalLabel color={colors.mutedSoft} style={styles.queueNote}>
                {activeSessionPhase === 'quiz'
                  ? 'Quiz sonucu hangi kelimenin gerçekten öğrenildiğini belirler.'
                  : 'Karta dokun, 5 saniye bekle, sonra sola tekrar, yukarı zaten biliyordum, sağa ezberledim.'}
              </TechnicalLabel>
            )}
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCell}>
              <TechnicalLabel color={colors.muted}>Seri</TechnicalLabel>
              <View style={styles.metricValueRow}>
                <MaterialIcons color={colors.primary} name="bolt" size={14} />
                <Text numberOfLines={1} style={styles.metricValue}>{snapshot?.streakDays ?? 0} gün</Text>
              </View>
            </View>
            <View style={styles.metricCell}>
              <TechnicalLabel color={colors.muted}>Öğrenilen</TechnicalLabel>
              <View style={styles.metricValueRow}>
                <MaterialIcons color={colors.primary} name="verified" size={14} />
                <Text numberOfLines={1} style={styles.metricValue}>{snapshot?.studiedWords ?? 0} kelime</Text>
              </View>
            </View>
          </View>

          <TechnicalLabel color={colors.mutedSoft} style={styles.footerNote}>
            Bugün tamamlanan: {completedToday}
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
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.modePressed, disabled && styles.modeDisabled]}>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        numberOfLines={1}
        style={[styles.modeLink, disabled && styles.modeLinkDisabled]}>
        {label}
      </Text>
    </Pressable>
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
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
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
      color: colors.ink,
    },
    heroCard: {
      width: '100%',
      maxWidth: 620,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.primary,
      textAlign: 'center',
      minWidth: 0,
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
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    heroMetaText: {
      flexShrink: 1,
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 11,
      lineHeight: 16,
      letterSpacing: 1.2,
      color: colors.muted,
      textTransform: 'uppercase',
    },
    progressTrack: {
      height: 2,
      backgroundColor: colors.surfaceContainer,
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
    },
    ctaBlock: {
      width: '100%',
      maxWidth: 620,
      gap: spacing.lg,
    },
    queueNote: {
      textAlign: 'center',
      maxWidth: 320,
      alignSelf: 'center',
    },
    modeRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: spacing.xl,
    },
    modeLink: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 2.2,
      color: colors.muted,
      textTransform: 'uppercase',
      minWidth: 0,
    },
    modePressed: {
      opacity: 0.6,
    },
    modeDisabled: {
      opacity: 0.45,
    },
    modeLinkDisabled: {
      color: colors.mutedSoft,
    },
    metricsGrid: {
      width: '100%',
      maxWidth: 620,
      flexDirection: 'row',
      marginTop: spacing.xxxl,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
      color: colors.ink,
    },
    footerNote: {
      marginTop: spacing.xxl,
      opacity: 0.4,
    },
  });
}
