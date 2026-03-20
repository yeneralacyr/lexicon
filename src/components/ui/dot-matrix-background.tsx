import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useAppTheme } from '@/theme/app-theme-provider';

type DotMatrixBackgroundProps = {
  opacity?: number;
  gap?: number;
};

export function DotMatrixBackground({
  gap = 24,
  opacity = 0.12,
}: DotMatrixBackgroundProps) {
  const { height, width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors.border), [colors.border]);
  const columns = Math.ceil(width / gap) + 1;
  const rows = Math.ceil(height / gap) + 1;

  return (
    <View pointerEvents="none" style={[styles.container, { opacity }]}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <View key={`row-${rowIndex}`} style={[styles.row, { top: rowIndex * gap }]}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <View
              key={`dot-${rowIndex}-${columnIndex}`}
              style={[
                styles.dot,
                {
                  left: columnIndex * gap,
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function createStyles(borderColor: string) {
  return StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
    },
    row: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 2,
    },
    dot: {
      position: 'absolute',
      width: 2,
      height: 2,
      borderRadius: 2,
      backgroundColor: borderColor,
    },
  });
}
