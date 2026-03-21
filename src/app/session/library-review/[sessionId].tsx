import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  type SharedValue,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { ResponsiveDisplayText } from '@/components/ui/responsive-display-text';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, layout, radii, spacing, type AppPalette } from '@/constants/theme';
import { applyLibraryReviewDecision } from '@/modules/review/review.engine';
import { resolveSessionRoute } from '@/modules/sessions/session-routing';
import { getSessionDetail } from '@/modules/sessions/sessions.service';
import { useSessionStore } from '@/store/sessionStore';
import { useAppTheme } from '@/theme/app-theme-provider';
import type { LibraryReviewDecision, SessionDetail, SessionQueueItem } from '@/types/session';

const HORIZONTAL_THRESHOLD = 108;
const EXIT_DURATION = 210;

export default function LibraryReviewScreen() {
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const setActiveSessionId = useSessionStore((state) => state.setActiveSessionId);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemStartedAt, setItemStartedAt] = useState(() => Date.now());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!sessionId) {
        router.replace('/library');
        return;
      }

      const nextSession = await getSessionDetail(sessionId);

      if (!nextSession) {
        router.replace('/library');
        return;
      }

      if (nextSession.sessionType !== 'library_review') {
        router.replace(
          resolveSessionRoute({
            id: nextSession.id,
            phase: nextSession.phase,
            sessionType: nextSession.sessionType,
          })
        );
        return;
      }

      if (nextSession.status === 'completed') {
        router.replace('/library');
        return;
      }

      if (active) {
        setSession(nextSession);
        setCurrentIndex(resolveNextUnratedIndex(nextSession));
        setActiveSessionId(nextSession.id);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [router, sessionId, setActiveSessionId]);

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
    setSubmitError(null);
  }, [activeItem?.id]);

  async function reloadSession() {
    if (!sessionId) {
      return null;
    }

    const nextSession = await getSessionDetail(sessionId);

    if (!nextSession) {
      throw new Error('Review oturumu yüklenemedi.');
    }

    setSession(nextSession);
    setCurrentIndex(resolveNextUnratedIndex(nextSession));
    return nextSession;
  }

  async function handleClose() {
    setActiveSessionId(null);
    router.replace('/library');
  }

  async function handleDecision(decision: LibraryReviewDecision) {
    if (!session || !activeItem || !sessionId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await applyLibraryReviewDecision({
        sessionId,
        sessionItemId: activeItem.id,
        wordId: activeItem.wordId,
        decision,
        durationMs: Math.max(0, Date.now() - itemStartedAt),
      });

      if (!result) {
        setSubmitError('Bu kart zaten işlendi. Deste yeniden hizalandı.');
        setResetKey((value) => value + 1);
        return;
      }

      if (result.completed) {
        setActiveSessionId(null);
        router.replace('/library');
        return;
      }

      await reloadSession();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Bu karar kaydedilemedi.');
      setResetKey((value) => value + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    if (!session || hasRedirectedRef.current) {
      return;
    }

    if (session.items.length > 0 && session.items.every((item) => item.resultRating)) {
      hasRedirectedRef.current = true;
      setActiveSessionId(null);
      router.replace('/library');
    }
  }, [router, session, setActiveSessionId]);

  const progressValue =
    session && session.totalItems > 0
      ? `${Math.min(currentIndex + 1, session.totalItems)} / ${session.totalItems}`
      : '0 / 0';
  const progressWidth =
    session && session.totalItems > 0 ? (Math.min(currentIndex + 1, session.totalItems) / session.totalItems) * 100 : 0;
  const isWide = width >= 768;
  const stackWidth = Math.min(width - spacing.lg * 2, isWide ? 560 : 392);
  const stackHeight = Math.min(Math.max(520, stackWidth * 1.18), 620);

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
              {activeItem ? `Review ${String((activeItem.orderIndex ?? 0) + 1).padStart(2, '0')}` : 'Review hazırlanıyor'}
            </TechnicalLabel>
          </View>

          <LibraryReviewCardStack
            activeItem={activeItem}
            height={stackHeight}
            isSubmitting={isSubmitting}
            nextItem={nextItem}
            onDecide={handleDecision}
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
              <TechnicalLabel color={colors.muted}>Hızlı review turu</TechnicalLabel>
              <TechnicalLabel color={colors.primary}>Sola devam et · sağa ustalaştı</TechnicalLabel>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function LibraryReviewCardStack({
  activeItem,
  height,
  isSubmitting,
  nextItem,
  onDecide,
  resetKey,
  width,
}: {
  activeItem: SessionQueueItem | null;
  nextItem: SessionQueueItem | null;
  width: number;
  height: number;
  isSubmitting: boolean;
  resetKey: number;
  onDecide: (decision: LibraryReviewDecision) => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasActiveItem = Boolean(activeItem);
  const hasNextItem = Boolean(nextItem);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const entryScale = useSharedValue(1);
  const keepReviewingProgress = useDerivedValue(() =>
    Math.min(1, Math.max(0, -translateX.value) / HORIZONTAL_THRESHOLD)
  );
  const masteredProgress = useDerivedValue(() =>
    Math.min(1, Math.max(0, translateX.value) / HORIZONTAL_THRESHOLD)
  );

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    entryScale.value = 0.97;
    entryScale.value = withTiming(1, { duration: 220 });
  }, [activeItem?.id, entryScale, translateX, translateY]);

  useEffect(() => {
    translateX.value = withSpring(0, { damping: 20, stiffness: 220 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
  }, [resetKey, translateX, translateY]);

  const panGesture = Gesture.Pan()
    .enabled(hasActiveItem && !isSubmitting)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.06;
    })
    .onEnd((event) => {
      const decision = resolveLibraryReviewDecision(event.translationX, event.translationY, event.velocityX);

      if (!decision) {
        translateX.value = withSpring(0, { damping: 20, stiffness: 220 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
        return;
      }

      const exitTarget = resolveLibraryReviewExitTarget(decision, width, height);
      translateX.value = withTiming(exitTarget.x, { duration: EXIT_DURATION });
      translateY.value = withTiming(exitTarget.y, { duration: EXIT_DURATION }, (finished) => {
        if (finished) {
          runOnJS(onDecide)(decision);
        }
      });
    });

  const activeCardAnimatedStyle = useCardMotionStyle(entryScale, translateX, translateY, width);

  const previewCardAnimatedStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, Math.abs(translateX.value) / HORIZONTAL_THRESHOLD);

    return {
      opacity: hasNextItem ? interpolate(progress, [0, 1], [0.56, 0.9], Extrapolation.CLAMP) : 0,
      transform: [
        { scale: interpolate(progress, [0, 1], [0.95, 0.985], Extrapolation.CLAMP) },
        { translateY: interpolate(progress, [0, 1], [18, 8], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <View style={[styles.stack, { width }]}>
      <View style={[styles.cardArea, { height: height + spacing.xl }]}>
        <Animated.View style={[styles.basePlate, { width: width - 24, height: height - 12 }]} />

        {nextItem ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.previewCard,
              { width: width - 12, height: height - 6 },
              previewCardAnimatedStyle,
            ]}>
            <TechnicalLabel color={colors.muted}>Sıradaki</TechnicalLabel>
            <Text adjustsFontSizeToFit minimumFontScale={0.76} numberOfLines={2} style={styles.previewWord}>
              {nextItem.english}
            </Text>
          </Animated.View>
        ) : null}

        {activeItem ? (
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.activeCardWrap, activeCardAnimatedStyle]}>
              <LibraryReviewCard height={height} item={activeItem} width={width} />
              <SwipeGlow direction="left" label="Devam et" progress={keepReviewingProgress} />
              <SwipeGlow direction="right" label="Ustalaştı" progress={masteredProgress} />
            </Animated.View>
          </GestureDetector>
        ) : (
          <View style={[styles.loadingShell, { width, height }]}>
            <TechnicalLabel color={colors.muted}>Review kartı yükleniyor</TechnicalLabel>
          </View>
        )}
      </View>

      <TechnicalLabel color={colors.mutedSoft} style={styles.cueRail}>
        {'\u2190 Devam et    Ustalaştı \u2192'}
      </TechnicalLabel>
    </View>
  );
}

function LibraryReviewCard({
  height,
  item,
  width,
}: {
  item: SessionQueueItem;
  width: number;
  height: number;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const examples = item.sentences.slice(0, 2);
  const englishLineLimit = item.english.trim().includes(' ') ? 2 : 1;

  return (
    <View style={[styles.cardShell, { width, height }]}>
      <View style={styles.cardTopRow}>
        <TechnicalLabel color={colors.muted}>{`Kart ${String(item.orderIndex + 1).padStart(2, '0')}`}</TechnicalLabel>
        <TechnicalLabel color={colors.mutedSoft}>Library review</TechnicalLabel>
      </View>

      <View style={styles.cardCenter}>
        <ResponsiveDisplayText numberOfLines={englishLineLimit} style={styles.word} variant="word">
          {item.english}
        </ResponsiveDisplayText>

        <ResponsiveDisplayText numberOfLines={3} style={styles.meaning} variant="section">
          {item.turkish}
        </ResponsiveDisplayText>

        {examples.length > 0 ? (
          <View style={styles.examplesBlock}>
            <TechnicalLabel color={colors.muted}>Örnek cümleler</TechnicalLabel>
            {examples.map((sentence, index) => (
              <Text key={`${item.id}-${index}`} numberOfLines={3} style={styles.exampleText}>
                {sentence}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function SwipeGlow({
  direction,
  label,
  progress,
}: {
  direction: 'left' | 'right';
  label: string;
  progress: SharedValue<number>;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isRight = direction === 'right';

  const wrapperAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.08, 1], [0, 0.16, 1], Extrapolation.CLAMP),
  }));

  const washAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.88], Extrapolation.CLAMP),
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [isRight ? 28 : -28, 0],
          Extrapolation.CLAMP
        ),
      },
      { scaleX: interpolate(progress.value, [0, 1], [0.72, 1.02], Extrapolation.CLAMP) },
    ],
  }));

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.18, 1], [0, 0.2, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [isRight ? 16 : -16, 0],
          Extrapolation.CLAMP
        ),
      },
      { scale: interpolate(progress.value, [0, 1], [0.94, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.glowLayer, wrapperAnimatedStyle]}>
      <Animated.View
        style={[
          styles.glowWash,
          isRight ? styles.glowWashRight : styles.glowWashLeft,
          washAnimatedStyle,
        ]}>
        <LinearGradient
          colors={
            isRight
              ? ['rgba(76,196,112,0.46)', 'rgba(76,196,112,0.16)', 'rgba(76,196,112,0)']
              : ['rgba(201,104,88,0.42)', 'rgba(201,104,88,0.14)', 'rgba(201,104,88,0)']
          }
          end={isRight ? { x: 0, y: 0.5 } : { x: 1, y: 0.5 }}
          start={isRight ? { x: 1, y: 0.5 } : { x: 0, y: 0.5 }}
          style={styles.glowFill}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.glowBadge,
          isRight ? styles.glowBadgeRight : styles.glowBadgeLeft,
          {
            backgroundColor: isRight ? 'rgba(76,196,112,0.12)' : 'rgba(201,104,88,0.12)',
            borderColor: isRight ? 'rgba(76,196,112,0.34)' : 'rgba(201,104,88,0.34)',
          },
          badgeAnimatedStyle,
        ]}>
        <Text style={[styles.glowLabel, { color: isRight ? '#49B36A' : '#C96858' }]}>{label}</Text>
      </Animated.View>
    </Animated.View>
  );
}

function resolveLibraryReviewDecision(
  translationX: number,
  translationY: number,
  velocityX: number
): LibraryReviewDecision | null {
  'worklet';

  const horizontalIntent = Math.abs(translationX) >= Math.abs(translationY) * 0.9;
  const horizontalCommit = Math.abs(translationX) > HORIZONTAL_THRESHOLD || Math.abs(velocityX) > 840;

  if (horizontalIntent && horizontalCommit) {
    return translationX > 0 ? 'mastered' : 'keep_reviewing';
  }

  return null;
}

function resolveLibraryReviewExitTarget(decision: LibraryReviewDecision, width: number, height: number) {
  'worklet';

  if (decision === 'mastered') {
    return { x: width * 1.34, y: height * 0.04 };
  }

  return { x: -width * 1.34, y: height * 0.04 };
}

function useCardMotionStyle(
  entryScale: SharedValue<number>,
  translateX: SharedValue<number>,
  translateY: SharedValue<number>,
  width: number
) {
  return useAnimatedStyle(() => {
    const horizontalProgress = Math.min(1, Math.abs(translateX.value) / HORIZONTAL_THRESHOLD);
    const rotate = interpolate(translateX.value, [-width, 0, width], [-8, 0, 8], Extrapolation.CLAMP);

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale: interpolate(horizontalProgress, [0, 1], [entryScale.value, 0.98], Extrapolation.CLAMP) },
      ],
    };
  });
}

function resolveNextUnratedIndex(session: SessionDetail) {
  const firstUnratedIndex = session.items.findIndex((item) => !item.resultRating);
  return firstUnratedIndex === -1 ? Math.max(0, session.items.length - 1) : firstUnratedIndex;
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
    stack: {
      alignItems: 'center',
      gap: spacing.md,
    },
    cardArea: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    activeCardWrap: {
      borderRadius: radii.xl,
    },
    basePlate: {
      position: 'absolute',
      bottom: spacing.xs,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceContainerLow,
    },
    previewCard: {
      position: 'absolute',
      bottom: spacing.md,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceContainerLow,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
    },
    previewWord: {
      fontFamily: fontFamilies.displayBold,
      fontSize: 28,
      lineHeight: 30,
      letterSpacing: -1,
      color: colors.muted,
      textAlign: 'center',
    },
    loadingShell: {
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceContainerLowest,
    },
    cueRail: {
      textAlign: 'center',
    },
    cardShell: {
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceContainerLowest,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xl,
      justifyContent: 'space-between',
      overflow: 'hidden',
    },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
    },
    cardCenter: {
      flex: 1,
      justifyContent: 'center',
      gap: spacing.lg,
      minWidth: 0,
    },
    word: {
      textAlign: 'center',
      alignSelf: 'stretch',
      minWidth: 0,
    },
    meaning: {
      textAlign: 'center',
      alignSelf: 'stretch',
      minWidth: 0,
      color: colors.ink,
    },
    examplesBlock: {
      gap: spacing.sm,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceContainerLow,
    },
    exampleText: {
      fontFamily: fontFamilies.bodyRegular,
      fontSize: 15,
      lineHeight: 24,
      color: colors.ink,
    },
    glowLayer: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radii.xl,
      overflow: 'hidden',
    },
    glowWash: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: '72%',
    },
    glowWashLeft: {
      left: 0,
    },
    glowWashRight: {
      right: 0,
    },
    glowFill: {
      flex: 1,
    },
    glowBadge: {
      position: 'absolute',
      top: spacing.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.pill,
      borderWidth: 1,
    },
    glowBadgeLeft: {
      left: spacing.lg,
    },
    glowBadgeRight: {
      right: spacing.lg,
    },
    glowLabel: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
