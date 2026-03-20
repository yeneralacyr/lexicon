import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TextProps, TextStyle } from 'react-native';

import { fontFamilies } from '@/constants/theme';
import { useAppTheme } from '@/theme/app-theme-provider';

type ResponsiveDisplayVariant = 'hero' | 'word' | 'section';

type ResponsiveDisplayTextProps = TextProps & {
  children: string;
  variant?: ResponsiveDisplayVariant;
  style?: StyleProp<TextStyle>;
};

const variantConfig: Record<
  ResponsiveDisplayVariant,
  {
    baseSize: number;
    minSize: number;
    baseLineHeight: number;
    minLineHeight: number;
    baseLetterSpacing: number;
  }
> = {
  hero: {
    baseSize: 64,
    minSize: 36,
    baseLineHeight: 64,
    minLineHeight: 40,
    baseLetterSpacing: -2.4,
  },
  word: {
    baseSize: 72,
    minSize: 34,
    baseLineHeight: 72,
    minLineHeight: 38,
    baseLetterSpacing: -3.2,
  },
  section: {
    baseSize: 34,
    minSize: 24,
    baseLineHeight: 36,
    minLineHeight: 28,
    baseLetterSpacing: -1.2,
  },
};

export function ResponsiveDisplayText({
  children,
  numberOfLines = 2,
  style,
  variant = 'hero',
  ...props
}: ResponsiveDisplayTextProps) {
  const { colors } = useAppTheme();
  const metrics = useMemo(() => getResponsiveMetrics(children, variantConfig[variant]), [children, variant]);
  const styles = useMemo(() => createStyles(colors.primary), [colors.primary]);

  return (
    <Text
      adjustsFontSizeToFit
      minimumFontScale={Math.max(0.56, metrics.fontSize / variantConfig[variant].baseSize)}
      numberOfLines={numberOfLines}
      style={[
        styles.base,
        {
          fontSize: metrics.fontSize,
          lineHeight: metrics.lineHeight,
          letterSpacing: metrics.letterSpacing,
        },
        style,
      ]}
      {...props}>
      {children}
    </Text>
  );
}

function getResponsiveMetrics(
  text: string,
  config: (typeof variantConfig)[ResponsiveDisplayVariant]
) {
  const length = text.trim().length;

  if (length <= 10) {
    return {
      fontSize: config.baseSize,
      lineHeight: config.baseLineHeight,
      letterSpacing: config.baseLetterSpacing,
    };
  }

  if (length <= 18) {
    return {
      fontSize: Math.max(config.minSize, config.baseSize - 6),
      lineHeight: Math.max(config.minLineHeight, config.baseLineHeight - 6),
      letterSpacing: config.baseLetterSpacing + 0.4,
    };
  }

  if (length <= 28) {
    return {
      fontSize: Math.max(config.minSize, config.baseSize - 12),
      lineHeight: Math.max(config.minLineHeight, config.baseLineHeight - 12),
      letterSpacing: config.baseLetterSpacing + 0.9,
    };
  }

  return {
    fontSize: config.minSize,
    lineHeight: config.minLineHeight,
    letterSpacing: config.baseLetterSpacing + 1.2,
  };
}

function createStyles(color: string) {
  return StyleSheet.create({
    base: {
      fontFamily: fontFamilies.displayBold,
      color,
      textAlign: 'center',
      flexShrink: 1,
    },
  });
}
