import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

import { fontFamilies, palette } from '@/constants/theme';

type TechnicalLabelProps = {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  color?: string;
};

export function TechnicalLabel({ children, color = palette.muted, style }: TechnicalLabelProps) {
  return <Text style={[styles.label, { color }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
});
