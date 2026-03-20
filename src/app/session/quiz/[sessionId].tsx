import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  correctMeaning: string;
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
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answerStartedAt, setAnswerStartedAt] = useState(() => Date.now());
  const isFinalizingRef = useRef(false);

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
    if (!quiz || quiz.items.length === 0) {
      return;
    }

    if (quiz.items.every((item) => item.answeredAt)) {
      void handleFinalize();
    }
  }, [quiz]);

  useEffect(() => {
    if (!quiz?.items[currentIndex]) {
      return;
    }

    setAnswer('');
    setFeedback(null);
    setError(null);
    setAnswerStartedAt(Date.now());
  }, [currentIndex, quiz?.items]);

  const currentItem = quiz?.items[currentIndex] ?? null;
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

  async function handleFinalize() {
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
  }

  async function handleSubmit() {
    if (!sessionId || !currentItem || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitSessionQuizAnswer({
        sessionId,
        wordId: currentItem.wordId,
        answer,
        expectedNormalizedMeaning: currentItem.normalizedTurkish,
        durationMs: Math.max(0, Date.now() - answerStartedAt),
      });

      setFeedback({
        isCorrect: result.isCorrect,
        correctMeaning: currentItem.turkish,
      });

      const nextQuiz = await reloadQuiz();

      await delay(850);

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
            <Text style={styles.subtitle}>İngilizce kelimenin Türkçe karşılığını yaz.</Text>
          </View>

          <View style={styles.answerCard}>
            <TextInput
              autoCapitalize="sentences"
              autoCorrect={false}
              editable={!isSubmitting && !feedback}
              onChangeText={setAnswer}
              onSubmitEditing={() => {
                void handleSubmit();
              }}
              placeholder="Türkçe anlam"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              selectionColor={colors.primary}
              style={styles.input}
              value={answer}
            />

            {feedback ? (
              <View style={[styles.feedbackCard, feedback.isCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}>
                <TechnicalLabel color={feedback.isCorrect ? colors.primary : colors.surfaceContainerLowest}>
                  {feedback.isCorrect ? 'Doğru' : 'Yanlış'}
                </TechnicalLabel>
                <Text style={[styles.feedbackText, !feedback.isCorrect && styles.feedbackTextOnDark]}>
                  {feedback.isCorrect ? 'Bu kelime öğrenildi olarak sayılacak.' : `Doğru cevap: ${feedback.correctMeaning}`}
                </Text>
              </View>
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <TechnicalLabel color={colors.mutedSoft} style={styles.helperText}>
                Quiz sonucu bu kelimenin sonraki oturumdaki durumunu belirler.
              </TechnicalLabel>
            )}
          </View>

          <ActionButton
            label={isSubmitting ? 'Kaydediliyor...' : 'Yanıtı Gönder'}
            onPress={() => {
              void handleSubmit();
            }}
            style={styles.submitButton}
          />
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
    input: {
      minHeight: 64,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 20,
      lineHeight: 28,
      color: colors.ink,
      backgroundColor: colors.background,
    },
    helperText: {
      textAlign: 'center',
    },
    feedbackCard: {
      gap: spacing.sm,
      padding: spacing.lg,
      borderRadius: radii.lg,
    },
    feedbackCorrect: {
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    feedbackWrong: {
      backgroundColor: colors.primary,
    },
    feedbackText: {
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 15,
      lineHeight: 22,
      color: colors.ink,
    },
    feedbackTextOnDark: {
      color: colors.surfaceContainerLowest,
    },
    errorText: {
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 14,
      lineHeight: 20,
      color: '#C84C4C',
      textAlign: 'center',
    },
    submitButton: {
      alignSelf: 'stretch',
    },
    pressed: {
      opacity: 0.72,
    },
  });
}
