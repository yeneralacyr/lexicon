import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fontFamilies, layout, palette, spacing } from '@/constants/theme';

type TopBarAction = {
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress?: () => void;
};

type TopBarProps = {
  leftAction?: TopBarAction;
  rightAction?: TopBarAction;
  align?: 'center' | 'left';
  bordered?: boolean;
};

export function TopBar({
  align = 'left',
  bordered = false,
  leftAction,
  rightAction,
}: TopBarProps) {
  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, bordered && styles.bordered]}>
      <View style={styles.row}>
        <View style={[styles.side, align === 'center' && styles.sideCenter]}>
          {leftAction ? (
            <IconButton icon={leftAction.icon} onPress={leftAction.onPress} />
          ) : (
            <View style={styles.placeholder} />
          )}
          {align === 'left' ? <Brand /> : null}
        </View>

        {align === 'center' ? <Brand centered /> : <View style={styles.centerSpacer} />}

        <View style={[styles.side, styles.sideRight]}>
          {rightAction ? (
            <IconButton icon={rightAction.icon} onPress={rightAction.onPress} />
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function Brand({ centered = false }: { centered?: boolean }) {
  return (
    <Text style={[styles.brand, centered && styles.brandCentered]}>
      LEXICON
    </Text>
  );
}

function IconButton({ icon, onPress }: TopBarAction) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <MaterialIcons color={palette.primary} name={icon} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: palette.background,
  },
  bordered: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,198,198,0.2)',
  },
  row: {
    height: layout.topBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 72,
    gap: spacing.sm,
  },
  sideCenter: {
    minWidth: 44,
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  centerSpacer: {
    flex: 1,
  },
  brand: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 28,
    lineHeight: 28,
    letterSpacing: -1.2,
    textTransform: 'uppercase',
    color: palette.primary,
  },
  brandCentered: {
    fontSize: 22,
    letterSpacing: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 40,
    height: 40,
  },
  pressed: {
    opacity: 0.72,
  },
});
