import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { StudyCardPhase } from '@/components/session/study-card';
import { StudyCardStack } from '@/components/session/study-card-stack';
import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, layout, spacing, type AppPalette } from '@/constants/theme';
import { getSettings } from '@/modules/progress/progress.service';
import { applySessionDecision, beginSessionQuiz } from '@/modules/review/review.engine';
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardPhase, setCardPhase] = useState<StudyCardPhase>('word_only');
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [countdownProgress, setCountdownProgress] = useState<number | null>(null);
  const [meaningRevealSeconds, setMeaningRevealSeconds] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemStartedAt, setItemStartedAt] = useState(() => Date.now());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const isTransitioningRef = useRef(false);
  const countdownDeadlineRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!sessionId) {
        router.replace('/today');
        return;
      }

      const [nextSession, settings] = await Promise.all([getSessionDetail(sessionId), getSettings()]);

      if (!nextSession) {
        router.replace('/today');
        return;
      }

      if (active) {
        setSession(nextSession);
        setMeaningRevealSeconds(settings.meaningRevealSeconds);
        setCurrentIndex(resolveNextUnratedIndex(nextSession));
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [router, sessionId]);

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
    setCountdownProgress(null);
    setSubmitError(null);
    countdownDeadlineRef.current = null;
  }, [activeItem?.id]);

  useEffect(() => {
    if (cardPhase !== 'meaning_reveal') {
      countdownDeadlineRef.current = null;
      return;
    }

    countdownDeadlineRef.current = Date.now() + meaningRevealSeconds * 1000;
    setCountdownRemaining(meaningRevealSeconds);
    setCountdownProgress(1);

    const interval = setInterval(() => {
      if (!countdownDeadlineRef.current) {
        return;
      }

      const remainingMs = countdownDeadlineRef.current - Date.now();

      if (remainingMs <= 0) {
        setCardPhase('word_with_sentence');
        setCountdownRemaining(null);
        setCountdownProgress(null);
        countdownDeadlineRef.current = null;
        clearInterval(interval);
        return;
      }

      setCountdownRemaining(Math.max(1, Math.ceil(remainingMs / 1000)));
      setCountdownProgress(Math.max(0, remainingMs / (meaningRevealSeconds * 1000)));
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [cardPhase, meaningRevealSeconds]);

  async function reloadSession() {
    if (!sessionId) {
      return null;
    }

    const nextSession = await getSessionDetail(sessionId);

    if (!nextSession) {
      throw new Error('Oturum yüklenemedi.');
    }

    setSession(nextSession);
    setCurrentIndex(resolveNextUnratedIndex(nextSession));
    return nextSession;
  }

  async function handleClose() {
    setActiveSessionId(null);
    router.replace('/today');
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
      setCountdownProgress(null);
      setCardPhase('word_with_sentence');
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await applySessionDecision({
        sessionId,
        sessionItemId: activeItem.id,
        wordId: activeItem.wordId,
        decision,
        durationMs: Math.max(0, Date.now() - itemStartedAt),
        currentOrderIndex: activeItem.orderIndex,
        selectedSentenceIndex: activeItem.selectedSentenceIndex,
      });

      if (!result) {
        setSubmitError('Bu kart zaten işlendi. Deste tekrar hizalandı.');
        setResetKey((value) => value + 1);
        return;
      }

      const nextSession = await reloadSession();

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

          <View style={styles.metaBlock}>
            {submitError ? (
              <Text style={styles.errorText}>{submitError}</Text>
            ) : (
              <TechnicalLabel color={colors.muted} style={styles.metaText}>
                {getGuidanceText({ cardPhase, isSubmitting, countdownRemaining })}
              </TechnicalLabel>
            )}
          </View>
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
  return firstUnratedIndex === -1 ? Math.max(0, session.items.length - 1) : firstUnratedIndex;
}

function getGuidanceText({
  cardPhase,
  countdownRemaining,
  isSubmitting,
}: {
  cardPhase: StudyCardPhase;
  countdownRemaining: number | null;
  isSubmitting: boolean;
}) {
  if (isSubmitting) {
    return 'Kararın bu oturum için kaydediliyor...';
  }

  if (cardPhase === 'word_only') {
    return 'Kelimeyi gör, anlamı hatırla ve karta dokun.';
  }

  if (cardPhase === 'meaning_reveal') {
    return `${countdownRemaining ?? 0} saniye sonra cümle açılacak. Biliyorsan yukarı kaydır.`;
  }

  return '\u2190 Sonra tekrar    \u2191 Zaten biliyordum    Ezberledim \u2192';
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
    metaText: {
      textAlign: 'center',
      lineHeight: 22,
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
