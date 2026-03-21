import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';

import { fontFamilies, type AppPalette } from '@/constants/theme';
import { useAppTheme } from '@/theme/app-theme-provider';

type CountdownRingProps = {
  progress: SharedValue<number>;
  secondsRemaining: number;
};

const SIZE = 66;
const STROKE_WIDTH = 6;
const CENTER = SIZE / 2;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function CountdownRing({ progress, secondsRemaining }: CountdownRingProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const animatedProps = useAnimatedProps(() => {
    const clampedProgress = Math.max(0, Math.min(1, progress.value));

    return {
      strokeDashoffset: CIRCUMFERENCE * (1 - clampedProgress),
    };
  });

  return (
    <View style={styles.container}>
      <Svg height={SIZE} style={styles.svg} width={SIZE}>
        <Circle
          cx={CENTER}
          cy={CENTER}
          fill="none"
          r={RADIUS}
          stroke={colors.surfaceContainerHighest}
          strokeWidth={STROKE_WIDTH}
        />
        <AnimatedCircle
          animatedProps={animatedProps}
          cx={CENTER}
          cy={CENTER}
          fill="none"
          r={RADIUS}
          rotation="-90"
          originX={CENTER}
          originY={CENTER}
          stroke={colors.primary}
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeLinecap="round"
          strokeWidth={STROKE_WIDTH}
        />
      </Svg>

      <View pointerEvents="none" style={styles.copy}>
        <Text style={styles.seconds}>{String(Math.max(1, Math.ceil(secondsRemaining))).padStart(2, '0')}</Text>
        <Text style={styles.label}>SN</Text>
      </View>
    </View>
  );
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    container: {
      width: SIZE,
      height: SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    svg: {
      position: 'absolute',
    },
    copy: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
    },
    seconds: {
      fontFamily: fontFamilies.displayBold,
      fontSize: 16,
      lineHeight: 18,
      color: colors.primary,
      letterSpacing: -0.4,
    },
    label: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 9,
      lineHeight: 10,
      letterSpacing: 1.2,
      color: colors.muted,
      textTransform: 'uppercase',
    },
  });
}
