import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/action-button';
import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { ResponsiveDisplayText } from '@/components/ui/responsive-display-text';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, layout, radii, spacing, type AppPalette } from '@/constants/theme';
import { finalizeQuizSession, getSessionQuizSnapshot, submitSessionQuizAnswer } from '@/modules/review/review.engine';
import { useSessionStore } from '@/store/sessionStore';
import { useAppTheme } from '@/theme/app-theme-provider';
import type { SessionQuizDetail } from '@/types/session';

type FeedbackState = {
  isCorrect: boolean;
  selectedOption: string;
};

export default function SessionQuizScreen() {
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const setActiveSessionId = useSessionStore((state) => state.setActiveSessionId);
  const [quiz, setQuiz] = useState<SessionQuizDetail | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answerStartedAt, setAnswerStartedAt] = useState(() => Date.now());
  const isFinalizingRef = useRef(false);
  const submitLockRef = useRef(false);
  const isMountedRef = useRef(true);
  const feedbackDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackDelayResolveRef = useRef<((completed: boolean) => void) | null>(null);
  const currentItem = quiz?.items[currentIndex] ?? null;
  const currentWordId = currentItem?.wordId ?? null;

  const isBusy = isSubmitting || Boolean(feedback);

  const cancelFeedbackDelay = useCallback(() => {
    if (feedbackDelayTimeoutRef.current) {
      clearTimeout(feedbackDelayTimeoutRef.current);
      feedbackDelayTimeoutRef.current = null;
    }

    if (feedbackDelayResolveRef.current) {
      feedbackDelayResolveRef.current(false);
      feedbackDelayResolveRef.current = null;
    }
  }, []);

  const waitForFeedbackDelay = useCallback((ms: number) => {
    cancelFeedbackDelay();

    return new Promise<boolean>((resolve) => {
      feedbackDelayResolveRef.current = resolve;
      feedbackDelayTimeoutRef.current = setTimeout(() => {
        feedbackDelayTimeoutRef.current = null;
        feedbackDelayResolveRef.current = null;
        resolve(true);
      }, ms);
    });
  }, [cancelFeedbackDelay]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      submitLockRef.current = false;
      cancelFeedbackDelay();
    };
  }, [cancelFeedbackDelay]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!sessionId) {
        router.replace('/today');
        return;
      }

      try {
        const nextQuiz = await getSessionQuizSnapshot(sessionId);

        if (!nextQuiz) {
          router.replace('/today');
          return;
        }

        if (nextQuiz.status === 'completed') {
          router.replace(`/session/complete?sessionId=${sessionId}`);
          return;
        }

        if (nextQuiz.status === 'cancelled') {
          router.replace('/today');
          return;
        }

        if (nextQuiz.status !== 'quiz') {
          router.replace(`/session/${sessionId}`);
          return;
        }

        if (active) {
          setQuiz(nextQuiz);
          setCurrentIndex(resolveNextUnansweredIndex(nextQuiz));
          setActiveSessionId(sessionId);
          setLoadError(null);
        }
      } catch (loadFailure) {
        if (active) {
          setLoadError(loadFailure instanceof Error ? loadFailure.message : 'Quiz yüklenemedi.');
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [router, sessionId, setActiveSessionId]);

  useEffect(() => {
    if (!currentWordId) {
      return;
    }

    setPendingSelection(null);
    setFeedback(null);
    setError(null);
    setAnswerStartedAt(Date.now());
  }, [currentIndex, currentWordId]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => isBusy);

      return () => {
        subscription.remove();
      };
    }, [isBusy])
  );

  const progressValue = quiz ? `${Math.min(currentIndex + 1, quiz.totalItems)} / ${quiz.totalItems}` : '0 / 0';
  const progressWidth = quiz && quiz.totalItems > 0 ? ((currentIndex + 1) / quiz.totalItems) * 100 : 0;

  async function reloadQuiz() {
    if (!sessionId) {
      return null;
    }

    const nextQuiz = await getSessionQuizSnapshot(sessionId);

    if (!nextQuiz) {
      throw new Error('Quiz yüklenemedi.');
    }

    if (nextQuiz.status === 'cancelled') {
      throw new Error('Bu oturum artık aktif değil.');
    }

    setQuiz(nextQuiz);
    return nextQuiz;
  }

  const handleFinalize = useCallback(async () => {
    if (!sessionId || isFinalizingRef.current || !isMountedRef.current) {
      return;
    }

    isFinalizingRef.current = true;

    try {
      await finalizeQuizSession(sessionId);
      if (!isMountedRef.current) {
        return;
      }
      setActiveSessionId(null);
      router.replace(`/session/complete?sessionId=${sessionId}`);
    } finally {
      isFinalizingRef.current = false;
    }
  }, [router, sessionId, setActiveSessionId]);

  useEffect(() => {
    if (!quiz || quiz.items.length === 0) {
      return;
    }

    if (quiz.items.every((item) => item.answeredAt)) {
      void handleFinalize();
    }
  }, [handleFinalize, quiz]);

  async function handleSubmit(selectedOption: string) {
    if (!sessionId || !currentItem || submitLockRef.current || isSubmitting || feedback) {
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setPendingSelection(selectedOption);
    setError(null);

    try {
      const result = await submitSessionQuizAnswer({
        sessionId,
        wordId: currentItem.wordId,
        answer: selectedOption,
        expectedNormalizedMeaning: currentItem.normalizedTurkish,
        durationMs: Math.max(0, Date.now() - answerStartedAt),
      });

      if (!result) {
        const nextQuiz = await reloadQuiz();

        if (!nextQuiz || !isMountedRef.current) {
          return;
        }

        const nextIndex = resolveNextUnansweredIndex(nextQuiz);

        if (nextIndex === -1) {
          await handleFinalize();
          return;
        }

        setCurrentIndex(nextIndex);
        return;
      }

      setFeedback({
        isCorrect: result.isCorrect,
        selectedOption,
      });

      const completedDelay = await waitForFeedbackDelay(1500);

      if (!completedDelay || !isMountedRef.current) {
        return;
      }

      const nextQuiz = await reloadQuiz();

      if (!nextQuiz || !isMountedRef.current) {
        return;
      }

      const nextIndex = resolveNextUnansweredIndex(nextQuiz);

      if (nextIndex === -1) {
        await handleFinalize();
        return;
      }

      setCurrentIndex(nextIndex);
    } catch (submissionError) {
      if (!isMountedRef.current) {
        return;
      }
      setPendingSelection(null);
      setError(submissionError instanceof Error ? submissionError.message : 'Yanıt kaydedilemedi.');
    } finally {
      submitLockRef.current = false;
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function handleClose() {
    if (isBusy) {
      return;
    }

    cancelFeedbackDelay();
    setActiveSessionId(null);
    router.replace('/today');
  }

  if (!quiz) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <DotMatrixBackground opacity={0.04} />
          <View style={styles.loadingState}>
            <TechnicalLabel>{loadError ? 'Quiz yüklenemedi' : 'Quiz hazırlanıyor'}</TechnicalLabel>
            {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
            {loadError ? (
              <ActionButton
                label="Tekrar dene"
                onPress={() => {
                  setLoadError(null);
                  if (sessionId) {
                    router.replace(`/session/quiz/${sessionId}`);
                  } else {
                    router.replace('/today');
                  }
                }}
                style={styles.retryButton}
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
            disabled={isBusy}
            onPress={() => void handleClose()}
            style={({ pressed }) => [styles.headerButton, (pressed || isBusy) && styles.pressed]}>
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
        <DotMatrixBackground opacity={0.04} />

        <View style={styles.content}>
          <View style={styles.copyBlock}>
            <TechnicalLabel color={colors.muted}>Final quiz</TechnicalLabel>
            <ResponsiveDisplayText numberOfLines={2} style={styles.title} variant="section">
              {currentItem?.english ?? 'Quiz hazırlanıyor'}
            </ResponsiveDisplayText>
            <Text style={styles.subtitle}>Doğru Türkçe anlamı seç.</Text>
          </View>

          <View style={styles.answerCard}>
            <View style={styles.optionsList}>
              {(currentItem?.options ?? []).map((option) => {
                const isSelected = feedback?.selectedOption === option || pendingSelection === option;
                const isCorrectOption = currentItem?.turkish === option;
                const showCorrect = Boolean(feedback) && isCorrectOption;
                const showWrong = Boolean(feedback) && isSelected && !feedback?.isCorrect;
                const showPending = !feedback && pendingSelection === option;

                return (
                  <Pressable
                    disabled={isBusy}
                    key={option}
                    onPress={() => {
                      void handleSubmit(option);
                    }}
                    style={({ pressed }) => [
                      styles.optionButton,
                      isSelected && styles.optionButtonSelected,
                      showPending && styles.optionButtonPending,
                      showCorrect && styles.optionButtonCorrect,
                      showWrong && styles.optionButtonWrong,
                      pressed && !feedback && !pendingSelection && !isSubmitting && styles.optionPressed,
                    ]}>
                    <View style={styles.optionInner}>
                      <Text
                        numberOfLines={3}
                        style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected,
                          (showCorrect || showWrong) && styles.optionTextOnAccent,
                        ]}>
                        {option}
                      </Text>
                      {showPending ? (
                        <TechnicalLabel color={colors.primary} style={styles.optionState}>
                          Kontrol ediliyor
                        </TechnicalLabel>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : !feedback ? (
              <TechnicalLabel color={colors.mutedSoft} style={styles.helperText}>
                Quiz sonucu bu kelimenin sonraki oturumdaki durumunu belirler. Bir seçeneğe dokunman yeterli.
              </TechnicalLabel>
            ) : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function resolveNextUnansweredIndex(quiz: SessionQuizDetail) {
  return quiz.items.findIndex((item) => !item.answeredAt);
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
      backgroundColor: colors.border,
      width: '100%',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
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
    content: {
      width: '100%',
      maxWidth: layout.maxWidth,
      alignSelf: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.xxl,
    },
    copyBlock: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    title: {
      textAlign: 'center',
      alignSelf: 'center',
      maxWidth: 680,
    },
    subtitle: {
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 16,
      lineHeight: 24,
      color: colors.muted,
      textAlign: 'center',
      maxWidth: 340,
    },
    answerCard: {
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xl,
      gap: spacing.lg,
    },
    optionsList: {
      gap: spacing.md,
    },
    optionButton: {
      minHeight: 68,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.background,
      justifyContent: 'center',
      minWidth: 0,
    },
    optionButtonSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceContainer,
    },
    optionButtonPending: {
      borderColor: colors.primary,
      backgroundColor: colors.surfaceContainer,
    },
    optionButtonCorrect: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    optionButtonWrong: {
      borderColor: colors.error,
      backgroundColor: colors.error,
    },
    optionInner: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    optionText: {
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 18,
      lineHeight: 26,
      color: colors.ink,
      textAlign: 'center',
    },
    optionTextSelected: {
      color: colors.primary,
    },
    optionTextOnAccent: {
      color: colors.surfaceContainerLowest,
    },
    optionState: {
      textAlign: 'center',
      minHeight: 16,
    },
    helperText: {
      textAlign: 'center',
    },
    errorText: {
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 14,
      lineHeight: 20,
      color: colors.error,
      textAlign: 'center',
    },
    optionPressed: {
      transform: [{ scale: 0.995 }],
    },
    pressed: {
      opacity: 0.72,
    },
  });
}
