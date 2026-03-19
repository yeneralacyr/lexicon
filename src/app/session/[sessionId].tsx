import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { StatusChip } from '@/components/ui/status-chip';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, palette, spacing } from '@/constants/theme';
import { applySessionRating, finalizeSession } from '@/modules/review/review.engine';
import { getSessionDetail } from '@/modules/sessions/sessions.service';
import { useSessionStore } from '@/store/sessionStore';
import type { Rating } from '@/types/progress';
import type { SessionDetail, SessionQueueItem } from '@/types/session';

export default function SessionScreen() {
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const router = useRouter();
  const { width } = useWindowDimensions();
  const setActiveSessionId = useSessionStore((state) => state.setActiveSessionId);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!sessionId) {
        router.replace('/today');
        return;
      }

      const nextSession = await getSessionDetail(sessionId);

      if (!nextSession) {
        router.replace('/today');
        return;
      }

      if (active) {
        setSession(nextSession);
        const firstUnratedIndex = nextSession.items.findIndex((item) => !item.resultRating);
        setCurrentIndex(firstUnratedIndex === -1 ? Math.max(0, nextSession.items.length - 1) : firstUnratedIndex);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [router, sessionId]);

  useEffect(() => {
    if (!session || !sessionId) {
      return;
    }

    if (session.totalItems > 0 && session.items.every((item) => item.resultRating)) {
      void handleFinish();
    }
  }, [session, sessionId]);

  const activeItem = useMemo<SessionQueueItem | null>(() => {
    if (!session) {
      return null;
    }

    return session.items[currentIndex] ?? null;
  }, [currentIndex, session]);

  async function handleClose() {
    setActiveSessionId(null);
    router.replace('/today');
  }

  async function handleFinish() {
    if (!sessionId) {
      return;
    }

    await finalizeSession(sessionId);
    setActiveSessionId(null);
    router.replace(`/session/complete?sessionId=${sessionId}`);
  }

  async function handleRating(rating: Rating) {
    if (!session || !activeItem || !sessionId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    const nextCompletedItems = Math.min(session.totalItems, session.completedItems + 1);

    try {
      await applySessionRating({
        sessionId,
        sessionItemId: activeItem.id,
        wordId: activeItem.wordId,
        rating,
        completedItems: nextCompletedItems,
      });

      const nextItems = session.items.map((item) =>
        item.id === activeItem.id ? { ...item, resultRating: rating } : item
      );

      setSession({
        ...session,
        completedItems: nextCompletedItems,
        items: nextItems,
      });

      setRevealed(false);

      if (currentIndex >= session.totalItems - 1) {
        await handleFinish();
        return;
      }

      setCurrentIndex((value) => value + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  const progressValue =
    session && session.totalItems > 0 ? `${Math.min(currentIndex + 1, session.totalItems)} / ${session.totalItems}` : '0 / 0';
  const progressWidth =
    session && session.totalItems > 0 ? ((Math.min(currentIndex + 1, session.totalItems)) / session.totalItems) * 100 : 0;
  const isWide = width >= 768;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => void handleClose()} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
            <MaterialIcons color={palette.primary} name="close" size={24} />
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
            <TechnicalLabel color="rgba(119,119,119,0.9)">
              Active Unit: {activeItem ? `A2_${String(activeItem.orderIndex + 1).padStart(2, '0')}` : '----'}
            </TechnicalLabel>
          </View>

          <View style={styles.wordBlock}>
            <Text style={styles.word}>{activeItem?.english ?? '...'}</Text>
            <StatusChip
              active
              label={activeItem ? activeItem.promptType.replace('_', ' ') : 'loading'}
              style={styles.wordChip}
            />
          </View>

          {!revealed ? (
            <View style={styles.revealWrap}>
              <Pressable
                disabled={!activeItem}
                onPress={() => setRevealed(true)}
                style={({ pressed }) => [
                  styles.revealButton,
                  pressed && styles.pressed,
                  !activeItem && styles.revealButtonDisabled,
                ]}>
                <Text style={styles.revealButtonText}>Show meaning</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.answerWrap}>
              <TechnicalLabel color="rgba(119,119,119,0.75)" style={styles.answerLabel}>
                Translation
              </TechnicalLabel>
              <Text style={styles.meaning}>{activeItem?.turkish ?? 'Unavailable'}</Text>
              {activeItem?.sentence ? <Text style={styles.sentence}>{activeItem.sentence}</Text> : null}

              <View style={[styles.ratingGrid, isWide && styles.ratingGridWide]}>
                {ratings.map((ratingItem) => (
                  <Pressable
                    key={ratingItem.value}
                    disabled={isSubmitting}
                    onPress={() => {
                      void handleRating(ratingItem.value);
                    }}
                    style={({ pressed }) => [
                      styles.ratingButton,
                      ratingItem.tone === 'dark' && styles.ratingButtonDark,
                      pressed && styles.pressed,
                      isSubmitting && styles.ratingButtonDisabled,
                    ]}>
                    <Text
                      style={[
                        styles.ratingLabel,
                        ratingItem.tone === 'dark' ? styles.ratingLabelDark : styles.ratingLabelLight,
                      ]}>
                      {ratingItem.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {isWide ? (
          <>
            <View style={styles.leftAnchor}>
              <View style={styles.leftAnchorRule} />
              <View>
                <TechnicalLabel color="rgba(119,119,119,0.95)">Precision Learning</TechnicalLabel>
                <TechnicalLabel color={palette.primary}>Lexicon v.01</TechnicalLabel>
              </View>
            </View>

            <View style={styles.rightAnchor}>
              <TechnicalLabel color="rgba(119,119,119,0.6)">Press space to reveal</TechnicalLabel>
              <View style={styles.keyHint}>
                <Text style={styles.keyHintText}>SPC</Text>
              </View>
            </View>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const ratings: Array<{ value: Rating; label: string; tone: 'light' | 'dark' }> = [
  { value: 'again', label: 'Again', tone: 'light' },
  { value: 'hard', label: 'Hard', tone: 'light' },
  { value: 'good', label: 'Good', tone: 'dark' },
  { value: 'easy', label: 'Easy', tone: 'dark' },
];

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    backgroundColor: palette.background,
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
    color: palette.primary,
  },
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  progressTrack: {
    height: 2,
    backgroundColor: palette.surfaceContainer,
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.primary,
  },
  container: {
    flex: 1,
    backgroundColor: palette.background,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelBlock: {
    marginBottom: spacing.xxxl,
  },
  wordBlock: {
    alignItems: 'center',
  },
  word: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 88,
    lineHeight: 88,
    letterSpacing: -4,
    color: palette.primary,
    textAlign: 'center',
  },
  wordChip: {
    marginTop: spacing.sm,
  },
  revealWrap: {
    marginTop: spacing.xxxxl,
  },
  revealButton: {
    minHeight: 60,
    paddingHorizontal: spacing.xxxl,
    borderWidth: 1,
    borderColor: palette.outline,
    backgroundColor: palette.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  revealButtonDisabled: {
    opacity: 0.5,
  },
  revealButtonText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    color: palette.primary,
  },
  answerWrap: {
    width: '100%',
    maxWidth: 720,
    marginTop: spacing.xxxxl,
    alignItems: 'center',
  },
  answerLabel: {
    marginBottom: spacing.xs,
  },
  meaning: {
    fontFamily: fontFamilies.displayMedium,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1,
    color: palette.primary,
    textAlign: 'center',
  },
  sentence: {
    marginTop: spacing.lg,
    maxWidth: 520,
    fontFamily: fontFamilies.bodyRegular,
    fontSize: 17,
    lineHeight: 28,
    color: palette.muted,
    textAlign: 'center',
  },
  ratingGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.xxxl,
  },
  ratingGridWide: {
    gap: spacing.md,
  },
  ratingButton: {
    minWidth: 140,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.outline,
    backgroundColor: palette.surfaceContainerLowest,
  },
  ratingButtonDark: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  ratingButtonDisabled: {
    opacity: 0.6,
  },
  ratingLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  ratingLabelLight: {
    color: palette.primary,
  },
  ratingLabelDark: {
    color: palette.surfaceContainerLowest,
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
    width: 2,
    height: 34,
    backgroundColor: palette.primary,
  },
  rightAnchor: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  keyHint: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyHintText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: palette.primary,
  },
  pressed: {
    opacity: 0.72,
  },
});
