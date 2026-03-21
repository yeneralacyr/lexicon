import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { bootstrapAds, maybeShowExtraNewWordsRewardedAd } from '@/ads/service';
import { TopBar } from '@/components/navigation/top-bar';
import { ActionButton } from '@/components/ui/action-button';
import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { ResponsiveDisplayText } from '@/components/ui/responsive-display-text';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, spacing, type AppPalette } from '@/constants/theme';
import { useFloatingTabInset } from '@/hooks/use-floating-tab-inset';
import { buildDailySession, type SessionMode, getDashboardSnapshot } from '@/modules/review/review.engine';
import { resolveSessionRoute } from '@/modules/sessions/session-routing';
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startingMode, setStartingMode] = useState<SessionMode | null>(null);
  const [isUnlockingExtraNewWords, setIsUnlockingExtraNewWords] = useState(false);
  const startLockRef = useRef(false);

  const refreshSnapshot = useCallback(async () => {
    setLoadError(null);

    try {
      const nextSnapshot = await getDashboardSnapshot();
      setSnapshot(nextSnapshot);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Bugünkü akış yüklenemedi.');
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const nextSnapshot = await getDashboardSnapshot();

        if (active) {
          setSnapshot(nextSnapshot);
          setLoadError(null);
        }
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Bugünkü akış yüklenemedi.');
        }
      }
    }

    if (isFocused) {
      void load();
    }

    return () => {
      active = false;
    };
  }, [isFocused]);

  useEffect(() => {
    if (!isFocused || !snapshot) {
      return;
    }

    const needsRewardContext =
      Boolean(snapshot.canUnlockExtraNewWords) || (snapshot.todayRewardedNewUnlocked ?? 0) > 0;

    if (!needsRewardContext) {
      return;
    }

    void bootstrapAds();
  }, [isFocused, snapshot]);

  async function handleStartSession(mode: SessionMode) {
    if (startLockRef.current || startingMode) {
      return;
    }

    startLockRef.current = true;
    setStartingMode(mode);

    try {
      const session = await buildDailySession(mode);

      if (!session) {
        return;
      }

      setActiveSessionId(session.id);
      router.push(resolveSessionRoute(session));
    } catch (error) {
      Alert.alert('Oturum açılamadı', error instanceof Error ? error.message : 'Bugünkü oturum hazırlanamadı.');
    } finally {
      startLockRef.current = false;
      setStartingMode(null);
    }
  }

  async function handleUnlockExtraNewWords() {
    if (isUnlockingExtraNewWords) {
      return;
    }

    setIsUnlockingExtraNewWords(true);

    try {
      const rewarded = await maybeShowExtraNewWordsRewardedAd(5);

      if (!rewarded) {
        Alert.alert(
          'Ekstra yeni kelime açılamadı',
          'Şu anda ödüllü reklam yüklenemedi veya tamamlanmadı. Biraz sonra tekrar deneyebilirsin.'
        );
        return;
      }

      await refreshSnapshot();
    } catch (error) {
      Alert.alert(
        'Ekstra yeni kelime açılamadı',
        error instanceof Error ? error.message : 'Ödüllü reklam şu anda başlatılamadı.'
      );
    } finally {
      setIsUnlockingExtraNewWords(false);
    }
  }

  const recommendedCount = snapshot?.recommendedCount ?? 0;
  const availableUnlockedNewWords = Math.max(
    0,
    Math.min(snapshot?.newWords ?? 0, (snapshot?.todayRemainingFreeNew ?? 0) + (snapshot?.todayRewardedNewUnlocked ?? 0))
  );
  const plannedNewCount = availableUnlockedNewWords;
  const hasActiveSession = Boolean(snapshot?.activeSessionId);
  const activeSessionPhase = snapshot?.activeSessionPhase ?? null;
  const completedToday = snapshot?.completedToday ?? 0;
  const activeSessionCompletedItems = snapshot?.activeSessionCompletedItems ?? 0;
  const activeSessionTotalItems = snapshot?.activeSessionTotalItems ?? 0;
  const activeSessionRemaining = Math.max(0, activeSessionTotalItems - activeSessionCompletedItems);
  const activeSessionRemainingMinutes = Math.max(1, Math.ceil(activeSessionRemaining / 4));
  const dueToday = snapshot?.dueToday ?? 0;
  const hasReviewQueue = dueToday > 0;
  const needsRewardUnlock =
    !hasActiveSession && Boolean(snapshot?.canUnlockExtraNewWords) && (snapshot?.todayRewardedNewUnlocked ?? 0) === 0;
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
    : needsRewardUnlock
      ? hasReviewQueue
        ? 'Ücretsiz yeni kelime hakkın doldu. Tekrar kartların hazır; istersen reklam izleyip +5 yeni kelime daha açabilirsin.'
        : 'Bugünkü ücretsiz yeni kelime hakkın doldu. İstersen reklam izleyip +5 yeni kelime açabilirsin.'
      : (snapshot?.todayRewardedNewUnlocked ?? 0) > 0
        ? `Bugün reklamla açtığın ${snapshot?.todayRewardedNewUnlocked ?? 0} ekstra yeni kelime hazır.`
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
    : needsRewardUnlock
      ? hasReviewQueue
        ? startingMode === 'daily'
          ? 'Oturum hazırlanıyor...'
          : 'Tekrar Oturumunu Başlat'
        : 'Ücretsiz kota doldu'
      : queueEmpty
        ? 'Bugünlük Tamam'
        : startingMode === 'daily'
          ? 'Oturum hazırlanıyor...'
          : 'Bugünkü Oturumu Başlat';

  if (!snapshot) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <TopBar align="center" />
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          {loadError ? (
            <View style={styles.loadState}>
              <TechnicalLabel>Today yüklenemedi</TechnicalLabel>
              <Text style={styles.loadErrorText}>{loadError}</Text>
              <ActionButton
                label="Tekrar dene"
                onPress={() => {
                  void refreshSnapshot();
                }}
                style={styles.retryButton}
              />
            </View>
          ) : (
            <TechnicalLabel>Yükleniyor...</TechnicalLabel>
          )}
        </View>
      </SafeAreaView>
    );
  }

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
              {activeSessionPhase === 'quiz' ? 'Final quiz' : hasActiveSession ? 'Aktif oturum' : 'Bugünkü sıra'}
            </TechnicalLabel>
            <Text adjustsFontSizeToFit minimumFontScale={0.68} numberOfLines={1} style={styles.heroNumber}>
              {hasActiveSession ? activeSessionRemaining : recommendedCount}
            </Text>
            <TechnicalLabel style={styles.heroCaption}>
              {activeSessionPhase === 'quiz'
                ? 'Quizde kalan kelime'
                : hasActiveSession
                  ? 'Bu oturumda kalan kart'
                  : 'Bugün çalışılacak toplam kart'}
            </TechnicalLabel>

            <View style={styles.heroMeta}>
              <View style={styles.heroMetaRow}>
                <Text numberOfLines={1} style={styles.heroMetaText}>
                  {activeSessionPhase === 'quiz'
                    ? `${activeSessionCompletedItems} doğrulandı`
                    : hasActiveSession
                      ? `${activeSessionCompletedItems} tamamlandı`
                      : `${snapshot?.dueToday ?? 0} tekrar • ${plannedNewCount} yeni`}
                </Text>
                <Text numberOfLines={1} style={styles.heroMetaText}>
                  {activeSessionPhase === 'quiz'
                    ? `~${activeSessionRemainingMinutes} dk`
                    : hasActiveSession
                    ? `~${activeSessionRemainingMinutes} dk kaldı`
                    : `~${snapshot?.estimatedMinutes ?? 0} dk`}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, progressPercent))}%` }]} />
              </View>
            </View>

            {!hasActiveSession && (needsRewardUnlock || (snapshot?.todayRewardedNewUnlocked ?? 0) > 0) ? (
              <View style={styles.heroRewardSection}>
                <TechnicalLabel color={colors.muted}>
                  {needsRewardUnlock ? 'Ekstra yeni kelime' : 'Ekstra haklar'}
                </TechnicalLabel>
                <Text style={styles.heroRewardText}>
                  {needsRewardUnlock
                    ? hasReviewQueue
                      ? 'Tekrar kartların hazır. İstersen bir reklam izleyip +5 yeni kelime daha açabilirsin.'
                      : 'Ücretsiz yeni kelime hakkın doldu. İstersen bir reklam izleyip +5 yeni kelime açabilirsin.'
                    : `${snapshot?.todayRewardedNewUnlocked ?? 0} ekstra yeni kelime hakkın hazır. İstersen şimdi kullanabilirsin.`}
                </Text>
                {needsRewardUnlock ? (
                  <ActionButton
                    disabled={isUnlockingExtraNewWords}
                    label={isUnlockingExtraNewWords ? 'Reklam hazırlanıyor...' : 'Reklam izle, +5 yeni kelime aç'}
                    onPress={() => {
                      void handleUnlockExtraNewWords();
                    }}
                    style={styles.heroRewardButton}
                    variant="secondary"
                  />
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.ctaBlock}>
            <ActionButton
              disabled={queueEmpty || Boolean(startingMode)}
              label={primaryLabel}
              onPress={() => {
                void handleStartSession('daily');
              }}
            />

            {!hasActiveSession ? (
              <View style={styles.modeRow}>
                <ModeLink
                  disabled={(snapshot?.dueToday ?? 0) === 0 || Boolean(startingMode)}
                  label="Sadece tekrar"
                  onPress={() => {
                    void handleStartSession('review_only');
                  }}
                />
                <ModeLink
                  disabled={availableUnlockedNewWords === 0 || Boolean(startingMode)}
                  label="Sadece yeni"
                  onPress={() => {
                    void handleStartSession('new_only');
                  }}
                />
              </View>
            ) : null}
            {hasActiveSession ? (
              <TechnicalLabel color={colors.mutedSoft} style={styles.queueNote}>
                {activeSessionPhase === 'quiz'
                  ? 'Önce final quiz tamamlanmalı. Yeni oturum modu bundan sonra seçilebilir.'
                  : 'Aktif oturum açıkken mod değişmez. Önce kaldığın yerden devam et.'}
              </TechnicalLabel>
            ) : needsRewardUnlock ? (
              <TechnicalLabel color={colors.mutedSoft} style={styles.queueNote}>
                Tekrar kartların ücretsizdir. Ekstra yeni kelime yalnızca istersen ödüllü reklamla açılır.
              </TechnicalLabel>
            ) : queueEmpty ? (
              <TechnicalLabel color={colors.muted} style={styles.queueNote}>
                {needsRewardUnlock
                  ? 'Bugün ücretsiz yeni hakkın bitti. İstersen reklam izleyip +5 yeni kelime daha açabilirsin.'
                  : 'Tekrar kuyruğun şu an boş. Yarın yeni kartlar hazırlandığında kaldığın yerden devam edeceksin.'}
              </TechnicalLabel>
            ) : (
              <TechnicalLabel color={colors.mutedSoft} style={styles.queueNote}>
                {activeSessionPhase === 'quiz'
                  ? 'Quiz sonucu hangi kelimenin gerçekten öğrenildiğini belirler.'
                  : (snapshot?.todayRewardedNewUnlocked ?? 0) > 0
                    ? `${snapshot?.todayRemainingFreeNew ?? 0} ücretsiz yeni hak • ${snapshot?.todayRewardedNewUnlocked ?? 0} ekstra açık hak`
                    : `${snapshot?.todayRemainingFreeNew ?? 0} ücretsiz yeni hak kaldı • tekrar kartları ücretsiz`}
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
              <TechnicalLabel color={colors.mutedSoft} style={styles.metricHint}>
                Üst üste aktif gün
              </TechnicalLabel>
            </View>
            <View style={styles.metricCell}>
              <TechnicalLabel color={colors.muted}>Öğrenilen</TechnicalLabel>
              <View style={styles.metricValueRow}>
                <MaterialIcons color={colors.primary} name="verified" size={14} />
                <Text numberOfLines={1} style={styles.metricValue}>{snapshot?.masteredWords ?? 0} kelime</Text>
              </View>
              <TechnicalLabel color={colors.mutedSoft} style={styles.metricHint}>
                Kalıcı duruma geçen toplam
              </TechnicalLabel>
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
    loadState: {
      width: '100%',
      maxWidth: 320,
      alignItems: 'center',
      gap: spacing.md,
    },
    loadErrorText: {
      textAlign: 'center',
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 14,
      lineHeight: 22,
      color: colors.muted,
    },
    retryButton: {
      width: '100%',
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
    heroRewardSection: {
      marginTop: spacing.xl,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: spacing.sm,
      alignItems: 'center',
    },
    heroRewardText: {
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 14,
      lineHeight: 22,
      color: colors.muted,
      textAlign: 'center',
      maxWidth: 420,
    },
    heroRewardButton: {
      alignSelf: 'stretch',
      marginTop: spacing.xs,
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
    metricHint: {
      textAlign: 'center',
      minHeight: 28,
      maxWidth: 150,
    },
    footerNote: {
      marginTop: spacing.xxl,
      opacity: 0.4,
    },
  });
}
