import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [answerStartedAt, setAnswerStartedAt] = useState(() => Date.now());
  const isFinalizingRef = useRef(false);
  const currentItem = quiz?.items[currentIndex] ?? null;
  const currentWordId = currentItem?.wordId ?? null;

  useEffect(() => {
    let active = true;

    async function load() {
      if (!sessionId) {
        router.replace('/today');
        return;
      }

      const nextQuiz = await getSessionQuizSnapshot(sessionId);

      if (!nextQuiz) {
        router.replace('/today');
        return;
      }

      if (nextQuiz.status === 'completed') {
        router.replace(`/session/complete?sessionId=${sessionId}`);
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

    setQuiz(nextQuiz);
    return nextQuiz;
  }

  const handleFinalize = useCallback(async () => {
    if (!sessionId || isFinalizingRef.current) {
      return;
    }

    isFinalizingRef.current = true;

    try {
      await finalizeQuizSession(sessionId);
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
    if (!sessionId || !currentItem || isSubmitting || feedback) {
      return;
    }

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

      setFeedback({
        isCorrect: result.isCorrect,
        selectedOption,
      });

      await delay(1500);

      const nextQuiz = await reloadQuiz();

      if (!nextQuiz) {
        return;
      }

      const nextIndex = resolveNextUnansweredIndex(nextQuiz);

      if (nextIndex === -1) {
        await handleFinalize();
        return;
      }

      setCurrentIndex(nextIndex);
    } catch (submissionError) {
      setPendingSelection(null);
      setError(submissionError instanceof Error ? submissionError.message : 'Yanıt kaydedilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClose() {
    setActiveSessionId(null);
    router.replace('/today');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => void handleClose()} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
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
                    disabled={isSubmitting || Boolean(feedback)}
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
                      pressed && !feedback && !pendingSelection && styles.optionPressed,
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

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
      borderColor: '#C84C4C',
      backgroundColor: '#C84C4C',
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
      color: '#C84C4C',
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
