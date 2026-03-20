import React, { useMemo } from 'react';
import { ScrollView, StyleProp, StyleSheet, type ScrollViewProps, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { layout, spacing } from '@/constants/theme';
import { useFloatingTabInset } from '@/hooks/use-floating-tab-inset';
import { useAppTheme } from '@/theme/app-theme-provider';
import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';

type FullscreenScrollSceneProps = {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  topSlot?: React.ReactNode;
  withTabInset?: boolean;
  dotOpacity?: number;
  maxWidth?: number;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
};

export function FullscreenScrollScene({
  children,
  contentContainerStyle,
  dotOpacity = 0.08,
  keyboardShouldPersistTaps,
  maxWidth = layout.maxWidth,
  topSlot,
  withTabInset = false,
}: FullscreenScrollSceneProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors.background), [colors.background]);
  const bottomInset = useFloatingTabInset();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <DotMatrixBackground opacity={dotOpacity} />
        <ScrollView
          bounces={false}
          contentContainerStyle={[
            styles.content,
            {
              maxWidth,
              paddingBottom: withTabInset ? bottomInset : spacing.xxxl,
            },
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={false}>
          {topSlot}
          {children}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function createStyles(backgroundColor: string) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor,
    },
    container: {
      flex: 1,
      backgroundColor,
    },
    content: {
      width: '100%',
      alignSelf: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
    },
  });
}
