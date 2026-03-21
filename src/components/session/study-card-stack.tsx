import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { StudyCard, type StudyCardPhase } from '@/components/session/study-card';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, radii, spacing, type AppPalette } from '@/constants/theme';
import { useAppTheme } from '@/theme/app-theme-provider';
import type { SessionDecision, SessionQueueItem } from '@/types/session';

type StudyCardStackProps = {
  activeItem: SessionQueueItem | null;
  nextItem: SessionQueueItem | null;
  phase: StudyCardPhase;
  countdownRemaining: number | null;
  countdownProgress: SharedValue<number>;
  isSubmitting: boolean;
  resetKey: number;
  width: number;
  height: number;
  onReveal: () => void;
  onDecide: (decision: SessionDecision) => void;
};

const HORIZONTAL_THRESHOLD = 108;
const UP_THRESHOLD = 96;
const EXIT_DURATION = 220;

type LightDirection = 'left' | 'right' | 'up';
type LightTone = 'memorized' | 'showAgain' | 'alreadyKnew';

type BeamSpec = {
  key: string;
  slotStyle: ViewStyle;
  opacity: number;
  travel: number;
};

export function StudyCardStack({
  activeItem,
  countdownProgress,
  countdownRemaining,
  height,
  isSubmitting,
  nextItem,
  onDecide,
  onReveal,
  phase,
  resetKey,
  width,
}: StudyCardStackProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasActiveItem = Boolean(activeItem);
  const hasNextItem = Boolean(nextItem);
  const canReveal = phase === 'word_only';
  const canSwipe = (phase === 'meaning_reveal' || phase === 'word_with_sentence') && !isSubmitting;
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const entryScale = useSharedValue(1);
  const showAgainProgress = useDerivedValue(() =>
    Math.min(1, Math.max(0, -translateX.value) / HORIZONTAL_THRESHOLD)
  );
  const memorizedProgress = useDerivedValue(() =>
    Math.min(1, Math.max(0, translateX.value) / HORIZONTAL_THRESHOLD)
  );
  const alreadyKnewProgress = useDerivedValue(() =>
    Math.min(1, Math.max(0, -translateY.value) / UP_THRESHOLD)
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
    .enabled(hasActiveItem && canSwipe)
    .onUpdate((event) => {
      if (phase === 'meaning_reveal') {
        translateX.value = 0;
        translateY.value = Math.min(0, event.translationY);
        return;
      }

      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const decision =
        phase === 'meaning_reveal'
          ? resolveMeaningRevealDecision(event.translationY, event.velocityY)
          : resolveDecisionFromDrag(event.translationX, event.translationY, event.velocityX, event.velocityY);

      if (!decision) {
        translateX.value = withSpring(0, { damping: 20, stiffness: 220 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
        return;
      }

      const exitTarget = resolveExitTarget(decision, width, height);
      translateX.value = withTiming(exitTarget.x, { duration: EXIT_DURATION });
      translateY.value = withTiming(exitTarget.y, { duration: EXIT_DURATION }, (finished) => {
        if (finished) {
          runOnJS(onDecide)(decision);
        }
      });
    });

  const tapGesture = Gesture.Tap()
    .enabled(hasActiveItem && canReveal && !isSubmitting)
    .maxDistance(8)
    .onEnd((_event, success) => {
      if (success) {
        runOnJS(onReveal)();
      }
    });

  const activeCardAnimatedStyle = useCardMotionStyle(entryScale, translateX, translateY, width);
  const activeOverlayAnimatedStyle = useCardMotionStyle(entryScale, translateX, translateY, width);

  const previewCardAnimatedStyle = useAnimatedStyle(() => {
    const progress = Math.max(
      Math.min(1, Math.abs(translateX.value) / HORIZONTAL_THRESHOLD),
      Math.min(1, Math.max(0, -translateY.value) / UP_THRESHOLD)
    );

    return {
      opacity: hasNextItem ? interpolate(progress, [0, 1], [0.58, 0.9], Extrapolation.CLAMP) : 0,
      transform: [
        { scale: interpolate(progress, [0, 1], [0.94, 0.985], Extrapolation.CLAMP) },
        { translateY: interpolate(progress, [0, 1], [18, 8], Extrapolation.CLAMP) },
      ],
    };
  });

  const card = activeItem ? (
    <Animated.View style={styles.activeCardWrap}>
      <StudyCard
        countdownProgress={countdownProgress}
        countdownRemaining={countdownRemaining}
        height={height}
        item={activeItem}
        phase={phase}
        shellAnimatedStyle={activeCardAnimatedStyle}
        width={width}
      />
    </Animated.View>
  ) : (
    <View style={[styles.loadingShell, { width, height }]}>
      <TechnicalLabel color={colors.muted}>Oturum kartı yükleniyor</TechnicalLabel>
    </View>
  );

  const renderedCard = canSwipe ? (
    <GestureDetector gesture={panGesture}>{card}</GestureDetector>
  ) : canReveal ? (
    <GestureDetector gesture={tapGesture}>{card}</GestureDetector>
  ) : (
    card
  );

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

        {renderedCard}

        {activeItem ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.feedbackOverlay, { width, height }, activeOverlayAnimatedStyle]}>
            <DirectionalLightField
              direction="left"
              label="Sonra tekrar"
              progress={showAgainProgress}
              styles={styles}
              tone="showAgain"
            />
            <DirectionalLightField
              direction="right"
              label="Ezberledim"
              progress={memorizedProgress}
              styles={styles}
              tone="memorized"
            />
            <DirectionalLightField
              direction="up"
              label="Zaten biliyordum"
              progress={alreadyKnewProgress}
              styles={styles}
              tone="alreadyKnew"
            />
          </Animated.View>
        ) : null}
      </View>

      <TechnicalLabel color={colors.mutedSoft} style={styles.cueRail}>
        {phase === 'word_only'
          ? 'Dokun, anlamı aç.'
          : phase === 'meaning_reveal'
            ? 'Sayaç bitince cümle gelir. Biliyorsan yukarı kaydır.'
            : '\u2190 Sonra tekrar    \u2191 Zaten biliyordum    Ezberledim \u2192'}
      </TechnicalLabel>
    </View>
  );
}

function DirectionalLightField({
  direction,
  label,
  progress,
  styles,
  tone,
}: {
  direction: LightDirection;
  label: string;
  progress: SharedValue<number>;
  styles: ReturnType<typeof createStyles>;
  tone: LightTone;
}) {
  const { colors } = useAppTheme();
  const isDark = colors.background === '#000000';
  const config = useMemo(() => getLightConfig(tone, isDark), [isDark, tone]);
  const beamSpecs = useMemo(() => getBeamSpecs(direction), [direction]);
  const ambientPlacement = useMemo(() => getAmbientPlacement(direction), [direction]);
  const hotspotPlacement = useMemo(() => getHotspotPlacement(direction), [direction]);
  const stripPlacement = useMemo(() => getStripPlacement(direction), [direction]);
  const badgePlacement = useMemo(() => getBadgePlacement(direction), [direction]);
  const ambientGradient = useMemo(() => getGradientProps(direction, 'ambient', config), [config, direction]);
  const hotspotGradient = useMemo(() => getGradientProps(direction, 'hotspot', config), [config, direction]);
  const stripGradient = useMemo(() => getGradientProps(direction, 'strip', config), [config, direction]);
  const beamGradient = useMemo(() => getGradientProps(direction, 'beam', config), [config, direction]);

  const wrapperAnimatedStyle = useAnimatedStyle(() => {
    const value = progress.value;
    return {
      opacity: interpolate(value, [0, 0.06, 1], [0, 0.2, 1], Extrapolation.CLAMP),
    };
  });

  const ambientAnimatedStyle = useAnimatedStyle(() => {
    const value = progress.value;

    if (direction === 'up') {
      return {
        opacity: interpolate(value, [0, 1], [0, 0.96], Extrapolation.CLAMP),
        transform: [
          { translateY: interpolate(value, [0, 1], [-24, 0], Extrapolation.CLAMP) },
          { scaleY: interpolate(value, [0, 1], [0.74, 1.04], Extrapolation.CLAMP) },
          { scale: interpolate(value, [0, 1], [0.96, 1], Extrapolation.CLAMP) },
        ],
      };
    }

    const fromSource = direction === 'left' ? -26 : 26;

    return {
      opacity: interpolate(value, [0, 1], [0, 0.92], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(value, [0, 1], [fromSource, 0], Extrapolation.CLAMP) },
        { scaleX: interpolate(value, [0, 1], [0.74, 1.05], Extrapolation.CLAMP) },
        { scale: interpolate(value, [0, 1], [0.96, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  const hotspotAnimatedStyle = useAnimatedStyle(() => {
    const value = progress.value;

    if (direction === 'up') {
      return {
        opacity: interpolate(value, [0, 1], [0, 1], Extrapolation.CLAMP),
        transform: [
          { translateY: interpolate(value, [0, 1], [-18, 0], Extrapolation.CLAMP) },
          { scale: interpolate(value, [0, 1], [0.78, 1.06], Extrapolation.CLAMP) },
        ],
      };
    }

    const fromSource = direction === 'left' ? -18 : 18;

    return {
      opacity: interpolate(value, [0, 1], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(value, [0, 1], [fromSource, 0], Extrapolation.CLAMP) },
        { scaleX: interpolate(value, [0, 1], [0.76, 1.08], Extrapolation.CLAMP) },
        { scaleY: interpolate(value, [0, 1], [0.88, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  const stripAnimatedStyle = useAnimatedStyle(() => {
    const value = progress.value;

    if (direction === 'up') {
      return {
        opacity: interpolate(value, [0, 1], [0, 1], Extrapolation.CLAMP),
        transform: [{ scaleX: interpolate(value, [0, 1], [0.62, 1], Extrapolation.CLAMP) }],
      };
    }

    return {
      opacity: interpolate(value, [0, 1], [0, 1], Extrapolation.CLAMP),
      transform: [{ scaleY: interpolate(value, [0, 1], [0.62, 1], Extrapolation.CLAMP) }],
    };
  });

  const badgeAnimatedStyle = useAnimatedStyle(() => {
    const value = progress.value;

    if (direction === 'up') {
      return {
        opacity: interpolate(value, [0, 0.22, 1], [0, 0.18, 1], Extrapolation.CLAMP),
        transform: [
          { translateY: interpolate(value, [0, 1], [-12, 0], Extrapolation.CLAMP) },
          { scale: interpolate(value, [0, 1], [0.94, 1], Extrapolation.CLAMP) },
        ],
      };
    }

    const fromSource = direction === 'left' ? -16 : 16;

    return {
      opacity: interpolate(value, [0, 0.22, 1], [0, 0.16, 1], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(value, [0, 1], [fromSource, 0], Extrapolation.CLAMP) },
        { scale: interpolate(value, [0, 1], [0.94, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.lightField, wrapperAnimatedStyle]}>
      <Animated.View style={[styles.ambientLayer, ambientPlacement, ambientAnimatedStyle]}>
        <LinearGradient {...ambientGradient} style={styles.lightFill} />
      </Animated.View>

      <Animated.View style={[styles.sourceHotspot, hotspotPlacement, hotspotAnimatedStyle]}>
        <LinearGradient {...hotspotGradient} style={styles.lightFill} />
      </Animated.View>

      {beamSpecs.map((beam) => (
        <RayBeam
          key={beam.key}
          beam={beam}
          direction={direction}
          gradient={beamGradient}
          progress={progress}
          styles={styles}
        />
      ))}

      <Animated.View style={[styles.edgeStrip, stripPlacement, stripAnimatedStyle]}>
        <LinearGradient {...stripGradient} style={styles.lightFill} />
      </Animated.View>

      <Animated.View
        style={[
          styles.glowBadge,
          badgePlacement,
          badgeAnimatedStyle,
          {
            backgroundColor: config.badgeBackground,
            borderColor: config.badgeBorder,
          },
        ]}>
        <Text numberOfLines={1} style={[styles.glowLabel, { color: config.label }]}>
          {label}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

function RayBeam({
  beam,
  direction,
  gradient,
  progress,
  styles,
}: {
  beam: BeamSpec;
  direction: LightDirection;
  gradient: ReturnType<typeof getGradientProps>;
  progress: SharedValue<number>;
  styles: ReturnType<typeof createStyles>;
}) {
  const beamAnimatedStyle = useAnimatedStyle(() => {
    const value = progress.value;

    if (direction === 'up') {
      return {
        opacity: interpolate(value, [0, 1], [0, beam.opacity], Extrapolation.CLAMP),
        transform: [
          { translateY: interpolate(value, [0, 1], [-beam.travel, 0], Extrapolation.CLAMP) },
          { scaleY: interpolate(value, [0, 1], [0.8, 1.03], Extrapolation.CLAMP) },
          { scaleX: interpolate(value, [0, 1], [0.94, 1], Extrapolation.CLAMP) },
        ],
      };
    }

    const originOffset = direction === 'left' ? -beam.travel : beam.travel;

    return {
      opacity: interpolate(value, [0, 1], [0, beam.opacity], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(value, [0, 1], [originOffset, 0], Extrapolation.CLAMP) },
        { scaleX: interpolate(value, [0, 1], [0.78, 1.04], Extrapolation.CLAMP) },
        { scaleY: interpolate(value, [0, 1], [0.94, 1], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <View pointerEvents="none" style={[styles.rayBeamSlot, beam.slotStyle]}>
      <Animated.View style={[styles.rayBeamSurface, beamAnimatedStyle]}>
        <LinearGradient {...gradient} style={styles.lightFill} />
      </Animated.View>
    </View>
  );
}

function resolveDecisionFromDrag(
  translationX: number,
  translationY: number,
  velocityX: number,
  velocityY: number
): SessionDecision | null {
  'worklet';

  const upIntent = translationY < -18 && Math.abs(translationY) > Math.abs(translationX) * 1.05;

  if ((-translationY > UP_THRESHOLD || velocityY < -900) && upIntent) {
    return 'already_knew';
  }

  const horizontalIntent = Math.abs(translationX) >= Math.abs(translationY) * 0.75;
  const horizontalCommit = Math.abs(translationX) > HORIZONTAL_THRESHOLD || Math.abs(velocityX) > 840;

  if (horizontalIntent && horizontalCommit) {
    return translationX > 0 ? 'memorized_now' : 'show_again';
  }

  return null;
}

function resolveMeaningRevealDecision(translationY: number, velocityY: number): SessionDecision | null {
  'worklet';

  if (-translationY > UP_THRESHOLD || velocityY < -900) {
    return 'already_knew';
  }

  return null;
}

function resolveExitTarget(decision: SessionDecision, width: number, height: number) {
  'worklet';

  switch (decision) {
    case 'memorized_now':
      return { x: width * 1.36, y: height * 0.04 };
    case 'already_knew':
      return { x: 0, y: -height * 1.22 };
    case 'show_again':
    default:
      return { x: -width * 1.36, y: height * 0.04 };
  }
}

function useCardMotionStyle(
  entryScale: SharedValue<number>,
  translateX: SharedValue<number>,
  translateY: SharedValue<number>,
  width: number
) {
  return useAnimatedStyle(() => {
    const horizontalProgress = Math.min(1, Math.abs(translateX.value) / HORIZONTAL_THRESHOLD);
    const upProgress = Math.min(1, Math.max(0, -translateY.value) / UP_THRESHOLD);
    const rotate = interpolate(
      translateX.value,
      [-width, 0, width],
      [-9, 0, 9],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${rotate}deg` },
        { scale: entryScale.value - Math.max(horizontalProgress, upProgress) * 0.02 },
      ],
    };
  });
}

function getLightConfig(tone: LightTone, isDark: boolean) {
  switch (tone) {
    case 'showAgain':
      return {
        ambientCore: isDark ? 'rgba(255, 72, 72, 0.3)' : 'rgba(212, 34, 34, 0.24)',
        ambientSoft: isDark ? 'rgba(255, 72, 72, 0.18)' : 'rgba(212, 34, 34, 0.14)',
        hotspotCore: isDark ? 'rgba(255, 156, 156, 0.6)' : 'rgba(255, 118, 118, 0.46)',
        hotspotSoft: isDark ? 'rgba(255, 72, 72, 0.24)' : 'rgba(212, 34, 34, 0.18)',
        stripCore: isDark ? 'rgba(255, 232, 232, 0.54)' : 'rgba(255, 214, 214, 0.48)',
        stripSoft: isDark ? 'rgba(255, 72, 72, 0.26)' : 'rgba(212, 34, 34, 0.18)',
        beamCore: isDark ? 'rgba(255, 132, 132, 0.34)' : 'rgba(255, 94, 94, 0.26)',
        beamSoft: isDark ? 'rgba(255, 72, 72, 0.2)' : 'rgba(212, 34, 34, 0.16)',
        badgeBackground: isDark ? 'rgba(52, 8, 8, 0.68)' : 'rgba(255, 241, 241, 0.92)',
        badgeBorder: isDark ? 'rgba(255, 116, 116, 0.58)' : 'rgba(212, 34, 34, 0.3)',
        label: isDark ? '#FFC0C0' : '#B82626',
        transparent: 'rgba(255,255,255,0)',
      };
    case 'alreadyKnew':
      return {
        ambientCore: isDark ? 'rgba(152, 255, 229, 0.28)' : 'rgba(17, 168, 144, 0.18)',
        ambientSoft: isDark ? 'rgba(152, 255, 229, 0.14)' : 'rgba(17, 168, 144, 0.1)',
        hotspotCore: isDark ? 'rgba(225, 255, 248, 0.56)' : 'rgba(157, 255, 232, 0.34)',
        hotspotSoft: isDark ? 'rgba(122, 255, 219, 0.22)' : 'rgba(17, 168, 144, 0.14)',
        stripCore: isDark ? 'rgba(229, 255, 248, 0.56)' : 'rgba(187, 255, 236, 0.48)',
        stripSoft: isDark ? 'rgba(122, 255, 219, 0.28)' : 'rgba(17, 168, 144, 0.16)',
        beamCore: isDark ? 'rgba(199, 255, 243, 0.34)' : 'rgba(137, 247, 219, 0.24)',
        beamSoft: isDark ? 'rgba(122, 255, 219, 0.16)' : 'rgba(17, 168, 144, 0.1)',
        badgeBackground: isDark ? 'rgba(8, 34, 30, 0.56)' : 'rgba(242, 255, 251, 0.88)',
        badgeBorder: isDark ? 'rgba(152, 255, 229, 0.42)' : 'rgba(17, 168, 144, 0.2)',
        label: isDark ? '#CCFFF2' : '#0E8573',
        transparent: 'rgba(255,255,255,0)',
      };
    case 'memorized':
    default:
      return {
        ambientCore: isDark ? 'rgba(98, 248, 168, 0.24)' : 'rgba(24, 160, 92, 0.18)',
        ambientSoft: isDark ? 'rgba(98, 248, 168, 0.16)' : 'rgba(24, 160, 92, 0.12)',
        hotspotCore: isDark ? 'rgba(194, 255, 223, 0.54)' : 'rgba(126, 246, 181, 0.34)',
        hotspotSoft: isDark ? 'rgba(98, 248, 168, 0.2)' : 'rgba(24, 160, 92, 0.14)',
        stripCore: isDark ? 'rgba(225, 255, 238, 0.52)' : 'rgba(190, 255, 217, 0.46)',
        stripSoft: isDark ? 'rgba(98, 248, 168, 0.24)' : 'rgba(24, 160, 92, 0.16)',
        beamCore: isDark ? 'rgba(184, 255, 214, 0.3)' : 'rgba(120, 240, 173, 0.22)',
        beamSoft: isDark ? 'rgba(98, 248, 168, 0.18)' : 'rgba(24, 160, 92, 0.12)',
        badgeBackground: isDark ? 'rgba(10, 30, 18, 0.54)' : 'rgba(244, 255, 248, 0.88)',
        badgeBorder: isDark ? 'rgba(98, 248, 168, 0.38)' : 'rgba(24, 160, 92, 0.18)',
        label: isDark ? '#BFFFF0' : '#197A4A',
        transparent: 'rgba(255,255,255,0)',
      };
  }
}

function getGradientProps(
  direction: LightDirection,
  kind: 'ambient' | 'hotspot' | 'strip' | 'beam',
  config: ReturnType<typeof getLightConfig>
) {
  if (kind === 'ambient') {
    if (direction === 'up') {
      return {
        colors: [config.ambientCore, config.ambientSoft, config.transparent] as const,
        start: { x: 0.5, y: 0 },
        end: { x: 0.5, y: 1 },
        locations: [0, 0.36, 1] as const,
      };
    }

    return {
      colors:
        direction === 'left'
          ? ([config.ambientCore, config.ambientSoft, config.ambientSoft, config.transparent] as const)
          : ([config.ambientCore, config.ambientSoft, config.ambientSoft, config.transparent] as const),
      start: direction === 'left' ? { x: 0, y: 0.5 } : { x: 1, y: 0.5 },
      end: direction === 'left' ? { x: 1, y: 0.5 } : { x: 0, y: 0.5 },
      locations: [0, 0.18, 0.56, 1] as const,
    };
  }

  if (kind === 'hotspot') {
    if (direction === 'up') {
      return {
        colors: [config.hotspotCore, config.hotspotSoft, config.transparent] as const,
        start: { x: 0.5, y: 0 },
        end: { x: 0.5, y: 1 },
        locations: [0, 0.42, 1] as const,
      };
    }

    return {
      colors: [config.hotspotCore, config.hotspotSoft, config.hotspotSoft, config.transparent] as const,
      start: direction === 'left' ? { x: 0, y: 0.5 } : { x: 1, y: 0.5 },
      end: direction === 'left' ? { x: 1, y: 0.5 } : { x: 0, y: 0.5 },
      locations: [0, 0.26, 0.58, 1] as const,
    };
  }

  if (kind === 'strip') {
    if (direction === 'up') {
      return {
        colors: [config.transparent, config.stripCore, config.transparent] as const,
        start: { x: 0, y: 0.5 },
        end: { x: 1, y: 0.5 },
        locations: [0, 0.5, 1] as const,
      };
    }

    return {
      colors: [
        config.transparent,
        config.stripSoft,
        config.stripCore,
        config.stripSoft,
        config.transparent,
      ] as const,
      start: { x: 0.5, y: 0 },
      end: { x: 0.5, y: 1 },
      locations: [0, 0.18, 0.5, 0.82, 1] as const,
    };
  }

  if (direction === 'up') {
    return {
      colors: [config.beamCore, config.beamSoft, config.transparent] as const,
      start: { x: 0.5, y: 0 },
      end: { x: 0.5, y: 1 },
      locations: [0, 0.3, 1] as const,
    };
  }

  return {
    colors: [config.beamCore, config.beamSoft, config.beamSoft, config.transparent] as const,
    start: direction === 'left' ? { x: 0, y: 0.5 } : { x: 1, y: 0.5 },
    end: direction === 'left' ? { x: 1, y: 0.5 } : { x: 0, y: 0.5 },
    locations: [0, 0.24, 0.6, 1] as const,
  };
}

function getAmbientPlacement(direction: LightDirection): ViewStyle {
  if (direction === 'up') {
    return {
      top: 0,
      left: '8%',
      right: '8%',
      height: '74%',
    };
  }

  return direction === 'left'
    ? {
        left: '-2%',
        top: 0,
        bottom: 0,
        width: '102%',
      }
    : {
        right: '-2%',
        top: 0,
        bottom: 0,
        width: '102%',
      };
}

function getHotspotPlacement(direction: LightDirection): ViewStyle {
  if (direction === 'up') {
    return {
      top: '-12%',
      left: '16%',
      width: '68%',
      height: '34%',
    };
  }

  return direction === 'left'
    ? {
        left: '2%',
        top: '6%',
        width: '58%',
        height: '84%',
      }
    : {
        right: '2%',
        top: '6%',
        width: '58%',
        height: '84%',
      };
}

function getStripPlacement(direction: LightDirection): ViewStyle {
  if (direction === 'up') {
    return {
      top: 0,
      left: '14%',
      right: '14%',
      height: 10,
    };
  }

    return direction === 'left'
    ? {
        left: 0,
        top: '10%',
        bottom: '10%',
        width: 6,
      }
    : {
        right: 0,
        top: '10%',
        bottom: '10%',
        width: 6,
      };
}

function getBadgePlacement(direction: LightDirection): ViewStyle {
  if (direction === 'up') {
    return {
      top: spacing.md,
      alignSelf: 'center',
    };
  }

  return direction === 'left'
    ? {
        left: spacing.md,
        top: '40%',
      }
    : {
        right: spacing.md,
        top: '40%',
      };
}

function getBeamSpecs(direction: LightDirection): BeamSpec[] {
  if (direction === 'up') {
    return [
      {
        key: 'up-left',
        slotStyle: {
          top: '-8%',
          left: '18%',
          width: '16%',
          height: '92%',
          transform: [{ rotate: '-12deg' }],
        },
        opacity: 0.26,
        travel: 18,
      },
      {
        key: 'up-center',
        slotStyle: {
          top: '-12%',
          left: '42%',
          width: '16%',
          height: '98%',
          transform: [{ rotate: '0deg' }],
        },
        opacity: 0.36,
        travel: 14,
      },
      {
        key: 'up-right',
        slotStyle: {
          top: '-8%',
          right: '18%',
          width: '16%',
          height: '92%',
          transform: [{ rotate: '12deg' }],
        },
        opacity: 0.26,
        travel: 18,
      },
    ];
  }

  if (direction === 'left') {
    return [
      {
        key: 'left-primary',
        slotStyle: {
          left: '2%',
          top: '14%',
          width: '84%',
          height: 74,
          transform: [{ rotate: '-7deg' }],
        },
        opacity: 0.22,
        travel: 14,
      },
      {
        key: 'left-secondary',
        slotStyle: {
          left: '6%',
          top: '42%',
          width: '78%',
          height: 60,
          transform: [{ rotate: '1deg' }],
        },
        opacity: 0.16,
        travel: 12,
      },
      {
        key: 'left-tertiary',
        slotStyle: {
          left: '10%',
          top: '64%',
          width: '70%',
          height: 46,
          transform: [{ rotate: '6deg' }],
        },
        opacity: 0.1,
        travel: 10,
      },
    ];
  }

  return [
    {
      key: 'right-primary',
      slotStyle: {
        right: '2%',
        top: '14%',
        width: '84%',
        height: 74,
        transform: [{ rotate: '7deg' }],
      },
      opacity: 0.22,
      travel: 14,
    },
    {
      key: 'right-secondary',
      slotStyle: {
        right: '6%',
        top: '42%',
        width: '78%',
        height: 60,
        transform: [{ rotate: '-1deg' }],
      },
      opacity: 0.16,
      travel: 12,
    },
    {
      key: 'right-tertiary',
      slotStyle: {
        right: '10%',
        top: '64%',
        width: '70%',
        height: 46,
        transform: [{ rotate: '-6deg' }],
      },
      opacity: 0.1,
      travel: 10,
    },
  ];
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    stack: {
      alignItems: 'center',
      gap: spacing.lg,
    },
    cardArea: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    basePlate: {
      position: 'absolute',
      bottom: spacing.xs,
      borderRadius: radii.xl,
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.border,
    },
    feedbackOverlay: {
      position: 'absolute',
      zIndex: 3,
      borderRadius: radii.xl,
      overflow: 'hidden',
    },
    lightField: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radii.xl,
      overflow: 'hidden',
    },
    ambientLayer: {
      position: 'absolute',
      borderRadius: radii.xl,
      overflow: 'hidden',
    },
    sourceHotspot: {
      position: 'absolute',
      borderRadius: radii.xl * 1.6,
      overflow: 'hidden',
    },
    edgeStrip: {
      position: 'absolute',
      borderRadius: radii.pill,
      overflow: 'hidden',
    },
    rayBeamSlot: {
      position: 'absolute',
      borderRadius: radii.pill,
      overflow: 'hidden',
    },
    rayBeamSurface: {
      flex: 1,
    },
    glowBadge: {
      position: 'absolute',
      minHeight: 34,
      maxWidth: '48%',
      borderRadius: radii.pill,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    glowLabel: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 12,
      lineHeight: 14,
      letterSpacing: 1.25,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    lightFill: {
      flex: 1,
    },
    previewCard: {
      position: 'absolute',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderRadius: radii.xl,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.border,
    },
    previewWord: {
      fontFamily: fontFamilies.displayBold,
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -1.1,
      color: colors.primary,
      minWidth: 0,
    },
    activeCardWrap: {
      zIndex: 2,
    },
    loadingShell: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.xl,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cueRail: {
      textAlign: 'center',
      letterSpacing: 1.1,
      minHeight: 34,
    },
  });
}
