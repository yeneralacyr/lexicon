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
  const metrics = useMemo(() => getResponsiveMetrics(children, variant), [children, variant]);
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
  variant: ResponsiveDisplayVariant
) {
  const config = variantConfig[variant];
  const normalizedText = text.trim();
  const length = normalizedText.length;
  const tokens = normalizedText.split(/\s+/).filter(Boolean);
  const longestTokenLength = tokens.reduce((longest, token) => Math.max(longest, token.length), 0);
  const isSingleWord = tokens.length <= 1;

  if (variant === 'word' && isSingleWord) {
    if (longestTokenLength <= 8) {
      return {
        fontSize: config.baseSize,
        lineHeight: config.baseLineHeight,
        letterSpacing: config.baseLetterSpacing,
      };
    }

    if (longestTokenLength <= 10) {
      return {
        fontSize: 58,
        lineHeight: 60,
        letterSpacing: -2.6,
      };
    }

    if (longestTokenLength <= 12) {
      return {
        fontSize: 52,
        lineHeight: 54,
        letterSpacing: -2.2,
      };
    }

    if (longestTokenLength <= 15) {
      return {
        fontSize: 46,
        lineHeight: 48,
        letterSpacing: -1.8,
      };
    }

    return {
      fontSize: 40,
      lineHeight: 42,
      letterSpacing: -1.4,
    };
  }

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
