import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

import { fontFamilies } from '@/constants/theme';
import { useAppTheme } from '@/theme/app-theme-provider';

type TechnicalLabelProps = {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  color?: string;
};

export function TechnicalLabel({ children, color, style }: TechnicalLabelProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(), []);

  return <Text style={[styles.label, { color: color ?? colors.muted }, style]}>{children}</Text>;
}

function createStyles() {
  return StyleSheet.create({
    label: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 2.4,
      textTransform: 'uppercase',
    },
  });
}
