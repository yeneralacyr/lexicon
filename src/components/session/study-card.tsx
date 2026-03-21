import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { CountdownRing } from '@/components/session/countdown-ring';
import { ResponsiveDisplayText } from '@/components/ui/responsive-display-text';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, radii, spacing, type AppPalette } from '@/constants/theme';
import { useAppTheme } from '@/theme/app-theme-provider';
import type { SessionQueueItem } from '@/types/session';

export type StudyCardPhase = 'word_only' | 'meaning_reveal' | 'word_with_sentence';

type StudyCardProps = {
  item: SessionQueueItem;
  phase: StudyCardPhase;
  countdownRemaining: number | null;
  countdownProgress: number | null;
  shellAnimatedStyle?: any;
  width: number;
  height: number;
};

const FLIP_DURATION = 260;

export function StudyCard({
  countdownRemaining,
  countdownProgress,
  height,
  item,
  phase,
  shellAnimatedStyle,
  width,
}: StudyCardProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const flipProgress = useSharedValue(phase === 'meaning_reveal' ? 1 : 0);
  const exampleSentence = item.sentence ?? item.sentences[0] ?? null;

  useEffect(() => {
    flipProgress.value = withTiming(phase === 'meaning_reveal' ? 1 : 0, { duration: FLIP_DURATION });
  }, [flipProgress, phase, item.id]);

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [0, 180], Extrapolation.CLAMP);
    const opacity = interpolate(flipProgress.value, [0, 0.48, 0.5, 1], [1, 1, 0, 0], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ perspective: 1400 }, { rotateY: `${rotateY}deg` }],
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [180, 360], Extrapolation.CLAMP);
    const opacity = interpolate(flipProgress.value, [0, 0.5, 0.52, 1], [0, 0, 1, 1], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ perspective: 1400 }, { rotateY: `${rotateY}deg` }],
    };
  });

  return (
    <Animated.View style={[styles.shell, { width, height }, shellAnimatedStyle]}>
      <Animated.View style={[styles.face, styles.frontFace, frontAnimatedStyle]}>
        <View style={styles.topRow}>
          <TechnicalLabel color={colors.muted}>{`Kart ${String(item.orderIndex + 1).padStart(2, '0')}`}</TechnicalLabel>
        </View>

        <View style={styles.frontCenter}>
          <ResponsiveDisplayText numberOfLines={3} style={styles.word} variant="word">
            {item.english}
          </ResponsiveDisplayText>

          {phase === 'word_with_sentence' ? (
            <View style={styles.sentenceBlock}>
              <TechnicalLabel color={colors.muted}>Örnek cümle</TechnicalLabel>
              <Text style={[styles.sentenceText, !exampleSentence && styles.sentencePlaceholder]}>
                {exampleSentence ?? 'Bu kelime için örnek cümle bulunmuyor.'}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.bottomRow}>
          <TechnicalLabel color={colors.muted}>
            {phase === 'word_with_sentence'
              ? 'Kararını kaydırarak ver.'
              : 'Anlamı görmek için karta dokun.'}
          </TechnicalLabel>
        </View>
      </Animated.View>

      <Animated.View style={[styles.face, styles.backFace, backAnimatedStyle]}>
        <View style={styles.topRow}>
          <TechnicalLabel color={colors.muted}>Türkçe anlam</TechnicalLabel>
          {countdownRemaining !== null && countdownProgress !== null ? (
            <CountdownRing progress={countdownProgress} secondsRemaining={countdownRemaining} />
          ) : null}
        </View>

        <View style={styles.backCenter}>
          <ResponsiveDisplayText numberOfLines={4} style={styles.meaning} variant="section">
            {item.turkish}
          </ResponsiveDisplayText>
        </View>

        <View style={styles.bottomRow}>
          <TechnicalLabel color={colors.mutedSoft}>Sayaç bitince cümle gelir. Biliyorsan yukarı kaydır.</TechnicalLabel>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    shell: {
      borderRadius: radii.xl,
    },
    face: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xl,
      justifyContent: 'space-between',
      backfaceVisibility: 'hidden',
      minWidth: 0,
    },
    frontFace: {
      backgroundColor: colors.surfaceContainerLowest,
    },
    backFace: {
      backgroundColor: colors.surfaceContainerLow,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      minWidth: 0,
    },
    frontCenter: {
      flex: 1,
      justifyContent: 'center',
      gap: spacing.xl,
      minWidth: 0,
    },
    word: {
      alignSelf: 'stretch',
      textAlign: 'center',
      minWidth: 0,
    },
    sentenceBlock: {
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 0,
    },
    sentenceText: {
      fontFamily: fontFamilies.bodyRegular,
      fontSize: 16,
      lineHeight: 24,
      color: colors.ink,
    },
    sentencePlaceholder: {
      color: colors.muted,
    },
    bottomRow: {
      alignItems: 'center',
      gap: spacing.sm,
      minWidth: 0,
    },
    backCenter: {
      flex: 1,
      justifyContent: 'center',
      minWidth: 0,
    },
    meaning: {
      alignSelf: 'stretch',
      textAlign: 'center',
      minWidth: 0,
    },
  });
}
