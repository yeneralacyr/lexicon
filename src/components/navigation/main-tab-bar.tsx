import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fontFamilies, layout, palette, radii, spacing } from '@/constants/theme';

const tabMeta: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; label: string; href: Href }> = {
  today: { icon: 'calendar-today', label: 'Today', href: '/today' },
  library: { icon: 'menu-book', label: 'Library', href: '/library' },
  search: { icon: 'search', label: 'Search', href: '/search' },
};

export function MainTabBar({ state }: BottomTabBarProps) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const meta = tabMeta[route.name];
          const itemStyle = StyleSheet.flatten([styles.item, isFocused && styles.activeItem]);

          if (!meta) {
            return null;
          }

          return (
            <Link key={route.key} href={meta.href} asChild>
              <Pressable style={itemStyle}>
                <MaterialIcons
                  color={isFocused ? palette.surfaceContainerLowest : palette.outline}
                  name={meta.icon}
                  size={22}
                />
                <Text style={[styles.label, isFocused ? styles.activeLabel : styles.inactiveLabel]}>
                  {meta.label}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: palette.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: 'rgba(198,198,198,0.35)',
  },
  row: {
    minHeight: layout.bottomTabHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  item: {
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  activeItem: {
    backgroundColor: palette.primary,
  },
  label: {
    marginTop: 4,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  activeLabel: {
    color: palette.surfaceContainerLowest,
  },
  inactiveLabel: {
    color: palette.outline,
  },
});
