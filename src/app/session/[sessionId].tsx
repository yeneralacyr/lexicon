import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cancelAnimation, Easing, runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';

import type { StudyCardPhase } from '@/components/session/study-card';
import { StudyCardStack } from '@/components/session/study-card-stack';
import { ActionButton } from '@/components/ui/action-button';
import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, layout, spacing, type AppPalette } from '@/constants/theme';
import { getSettings } from '@/modules/progress/progress.service';
import { applySessionDecision, beginSessionQuiz } from '@/modules/review/review.engine';
import { resolveSessionRoute } from '@/modules/sessions/session-routing';
import { getSessionDetail } from '@/modules/sessions/sessions.service';
import { useSessionStore } from '@/store/sessionStore';
import { useAppTheme } from '@/theme/app-theme-provider';
import type { SessionDecision, SessionDetail, SessionQueueItem } from '@/types/session';

export default function SessionScreen() {
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const setActiveSessionId = useSessionStore((state) => state.setActiveSessionId);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardPhase, setCardPhase] = useState<StudyCardPhase>('word_only');
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [meaningRevealSeconds, setMeaningRevealSeconds] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemStartedAt, setItemStartedAt] = useState(() => Date.now());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const isTransitioningRef = useRef(false);
  const countdownDeadlineRef = useRef<number | null>(null);
  const countdownProgress = useSharedValue(0);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!sessionId) {
        router.replace('/today');
        return;
      }

      try {
        const [nextSession, settings] = await Promise.all([getSessionDetail(sessionId), getSettings()]);

        if (!nextSession) {
          router.replace('/today');
          return;
        }

        if (nextSession.status === 'cancelled') {
          router.replace('/today');
          return;
        }

        if (nextSession.status === 'completed') {
          router.replace(`/session/complete?sessionId=${nextSession.id}`);
          return;
        }

        if (nextSession.sessionType === 'library_review') {
          router.replace(resolveSessionRoute({
            id: nextSession.id,
            phase: nextSession.phase,
            sessionType: nextSession.sessionType,
          }));
          return;
        }

        if (active) {
          setSession(nextSession);
          setMeaningRevealSeconds(settings.meaningRevealSeconds);
          setCurrentIndex(resolveNextUnratedIndex(nextSession));
          setLoadError(null);
        }
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Oturum yüklenemedi.');
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [loadAttempt, router, sessionId]);

  const activeItem = useMemo<SessionQueueItem | null>(() => {
    if (!session) {
      return null;
    }

    return session.items[currentIndex] ?? null;
  }, [currentIndex, session]);

  const nextItem = useMemo<SessionQueueItem | null>(() => {
    if (!session) {
      return null;
    }

    return session.items[currentIndex + 1] ?? null;
  }, [currentIndex, session]);

  useEffect(() => {
    if (!activeItem?.id) {
      return;
    }

    setItemStartedAt(Date.now());
    setCardPhase('word_only');
    setCountdownRemaining(null);
    setSubmitError(null);
    countdownDeadlineRef.current = null;
    cancelAnimation(countdownProgress);
    countdownProgress.value = 0;
  }, [activeItem?.id, countdownProgress]);

  const handleCountdownExpired = useCallback(() => {
    countdownDeadlineRef.current = null;
    setCountdownRemaining(null);
    setCardPhase((currentPhase) => (currentPhase === 'meaning_reveal' ? 'word_with_sentence' : currentPhase));
  }, []);

  useEffect(() => {
    if (cardPhase !== 'meaning_reveal') {
      countdownDeadlineRef.current = null;
      cancelAnimation(countdownProgress);
      countdownProgress.value = 0;
      return;
    }

    const durationMs = meaningRevealSeconds * 1000;
    countdownDeadlineRef.current = Date.now() + durationMs;
    setCountdownRemaining(meaningRevealSeconds);
    countdownProgress.value = 1;
    countdownProgress.value = withTiming(0, { duration: durationMs, easing: Easing.linear }, (finished) => {
      if (finished) {
        runOnJS(handleCountdownExpired)();
      }
    });

    const interval = setInterval(() => {
      if (!countdownDeadlineRef.current) {
        return;
      }

      const remainingMs = countdownDeadlineRef.current - Date.now();

      if (remainingMs <= 0) {
        setCountdownRemaining(1);
        return;
      }

      const nextRemaining = Math.max(1, Math.ceil(remainingMs / 1000));
      setCountdownRemaining((currentValue) => (currentValue === nextRemaining ? currentValue : nextRemaining));
    }, 250);

    return () => {
      clearInterval(interval);
      cancelAnimation(countdownProgress);
    };
  }, [cardPhase, countdownProgress, handleCountdownExpired, meaningRevealSeconds]);

  function handleClose() {
    Alert.alert(
      'Oturumdan çık',
      'Bu oturumu bırakıp ana sayfaya dönmek istediğine emin misin? İlerleme kaydedilmiş olarak kalır.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çık',
          style: 'destructive',
          onPress: () => {
            setActiveSessionId(null);
            router.replace('/today');
          },
        },
      ]
    );
  }

  const handleTransitionToQuiz = useCallback(async () => {
    if (!sessionId || isTransitioningRef.current) {
      return;
    }

    isTransitioningRef.current = true;

    try {
      await beginSessionQuiz(sessionId);
      setActiveSessionId(sessionId);
      router.replace(`/session/quiz/${sessionId}`);
    } finally {
      isTransitioningRef.current = false;
    }
  }, [router, sessionId, setActiveSessionId]);

  useEffect(() => {
    if (!session || !sessionId) {
      return;
    }

    if (session.status === 'quiz') {
      setActiveSessionId(session.id);
      router.replace(`/session/quiz/${session.id}`);
      return;
    }

    if (session.status === 'active' && session.totalItems > 0 && session.items.every((item) => item.resultRating)) {
      void handleTransitionToQuiz();
    }
  }, [handleTransitionToQuiz, router, session, sessionId, setActiveSessionId]);

  async function handleDecision(decision: SessionDecision) {
    if (!session || !activeItem || !sessionId || isSubmitting) {
      return;
    }

    if (cardPhase === 'meaning_reveal') {
      countdownDeadlineRef.current = null;
      setCountdownRemaining(null);
      cancelAnimation(countdownProgress);
      countdownProgress.value = 0;
      setCardPhase('word_with_sentence');
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const durationMs = Math.max(0, Date.now() - itemStartedAt);
      const result = await applySessionDecision({
        sessionId,
        sessionItemId: activeItem.id,
        wordId: activeItem.wordId,
        decision,
        durationMs,
        currentOrderIndex: activeItem.orderIndex,
        selectedSentenceIndex: activeItem.selectedSentenceIndex,
      });

      if (!result) {
        setSubmitError('Bu kart zaten işlendi. Deste tekrar hizalandı.');
        setResetKey((value) => value + 1);
        return;
      }

      const nextSession = applyDecisionLocally(session, activeItem, result, durationMs);
      setSession(nextSession);
      setCurrentIndex(resolveNextUnratedIndex(nextSession));

      if (nextSession && nextSession.items.every((item) => item.resultRating)) {
        await handleTransitionToQuiz();
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Bu karar kaydedilemedi.');
      setResetKey((value) => value + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReveal() {
    if (cardPhase !== 'word_only') {
      return;
    }

    setCardPhase('meaning_reveal');
  }

  const progressValue =
    session && session.totalItems > 0
      ? `${Math.min(currentIndex + 1, session.totalItems)} / ${session.totalItems}`
      : '0 / 0';
  const progressWidth =
    session && session.totalItems > 0 ? (Math.min(currentIndex + 1, session.totalItems) / session.totalItems) * 100 : 0;
  const isWide = width >= 768;
  const stackWidth = Math.min(width - spacing.lg * 2, isWide ? 540 : 388);
  const stackHeight = Math.min(Math.max(486, stackWidth * 1.3), 610);

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <DotMatrixBackground opacity={0.03} />
          <View style={styles.loadingState}>
            <TechnicalLabel>{loadError ? 'Oturum yuklenemedi' : 'Oturum hazirlaniyor'}</TechnicalLabel>
            {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
            {loadError ? (
              <ActionButton
                label="Tekrar dene"
                onPress={() => {
                  setLoadError(null);
                  setLoadAttempt((current) => current + 1);
                }}
                style={styles.retryButton}
                variant="secondary"
              />
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            disabled={isSubmitting}
            onPress={() => {
              void handleClose();
            }}
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.pressed,
              isSubmitting && styles.headerButtonDisabled,
            ]}>
            <MaterialIcons color={colors.primary} name="close" size={24} />
          </Pressable>

          <View style={styles.progressLabelWrap}>
            <Text style={styles.progressLabel}>{progressValue}</Text>
          </View>

          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressWidth}%` }]} />
        </View>
      </View>

      <View style={styles.container}>
        <DotMatrixBackground opacity={0.03} />

        <View style={styles.content}>
          <View style={styles.labelBlock}>
            <TechnicalLabel color={colors.muted}>
              {activeItem ? `Kart ${String((activeItem.orderIndex ?? 0) + 1).padStart(2, '0')}` : 'Kart hazırlanıyor'}
            </TechnicalLabel>
          </View>

          <StudyCardStack
            activeItem={activeItem}
            countdownProgress={countdownProgress}
            countdownRemaining={countdownRemaining}
            height={stackHeight}
            isSubmitting={isSubmitting}
            nextItem={nextItem}
            onDecide={handleDecision}
            onReveal={handleReveal}
            phase={cardPhase}
            resetKey={resetKey}
            width={stackWidth}
          />

          {submitError ? (
            <View style={styles.metaBlock}>
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          ) : null}
        </View>

        {isWide ? (
          <View style={styles.leftAnchor}>
            <View style={styles.leftAnchorRule} />
            <View style={styles.leftAnchorCopy}>
              <TechnicalLabel color={colors.muted}>Dokun, bekle ya da yukarı kaydır</TechnicalLabel>
              <TechnicalLabel color={colors.primary}>Sola tekrar · yukarı zaten biliyordum · sağa ezberledim</TechnicalLabel>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function resolveNextUnratedIndex(session: SessionDetail) {
  const firstUnratedIndex = session.items.findIndex((item) => !item.resultRating);
  return firstUnratedIndex;
}

function applyDecisionLocally(
  session: SessionDetail,
  activeItem: SessionQueueItem,
  result: {
    rating: SessionQueueItem['resultRating'];
    completedItems: number;
    totalItems: number;
    replay: false | { insertAt: number; insertedId: number } | null;
  },
  durationMs: number
) {
  const ratedItems = session.items.map((item) =>
    item.id === activeItem.id
      ? {
          ...item,
          resultRating: result.rating,
          durationMs,
        }
      : item
  );

  if (!result.replay) {
    return {
      ...session,
      completedItems: result.completedItems,
      totalItems: result.totalItems,
      items: ratedItems,
    };
  }

  const replay = result.replay;
  const replayItem: SessionQueueItem = {
    ...activeItem,
    id: replay.insertedId,
    orderIndex: replay.insertAt,
    resultRating: null,
    durationMs: null,
  };

  const itemsWithReplay = ratedItems
    .map((item) =>
      item.id === replayItem.id || item.orderIndex < replay.insertAt
        ? item
        : { ...item, orderIndex: item.orderIndex + 1 }
    )
    .concat(replayItem)
    .sort((left, right) => left.orderIndex - right.orderIndex || left.id - right.id);

  return {
    ...session,
    completedItems: result.completedItems,
    totalItems: result.totalItems,
    items: itemsWithReplay,
  };
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.background,
    },
    headerRow: {
      height: 64,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
    },
    headerButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerButtonDisabled: {
      opacity: 0.45,
    },
    progressLabelWrap: {
      flex: 1,
      alignItems: 'center',
    },
    progressLabel: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 12,
      lineHeight: 14,
      letterSpacing: 2.4,
      textTransform: 'uppercase',
      color: colors.primary,
    },
    headerPlaceholder: {
      width: 40,
      height: 40,
    },
    progressTrack: {
      height: 2,
      backgroundColor: colors.surfaceContainer,
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    content: {
      width: '100%',
      maxWidth: layout.maxWidth,
      alignSelf: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
      alignItems: 'center',
      gap: spacing.lg,
    },
    loadingState: {
      width: '100%',
      maxWidth: layout.maxWidth,
      alignSelf: 'center',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    retryButton: {
      width: '100%',
      maxWidth: 280,
    },
    labelBlock: {
      minHeight: 24,
      alignItems: 'center',
    },
    metaBlock: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      maxWidth: 420,
    },
    errorText: {
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 14,
      lineHeight: 20,
      color: colors.error,
      textAlign: 'center',
    },
    leftAnchor: {
      position: 'absolute',
      left: spacing.xl,
      bottom: spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    leftAnchorRule: {
      width: 48,
      height: 1,
      backgroundColor: colors.primary,
    },
    leftAnchorCopy: {
      gap: spacing.xxs,
      minWidth: 0,
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
