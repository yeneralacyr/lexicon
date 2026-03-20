import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontFamilies, layout, radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/theme/app-theme-provider';

const tabMeta: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; label: string; href: Href }> = {
  today: { icon: 'calendar-today', label: 'Bugün', href: '/today' },
  library: { icon: 'menu-book', label: 'Kitaplık', href: '/library' },
  search: { icon: 'search', label: 'Arama', href: '/search' },
  settings: { icon: 'tune', label: 'Ayarlar', href: '/settings' },
};

export function MainTabBar({ state }: BottomTabBarProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View style={[styles.floatingBar, { bottom: insets.bottom + spacing.md }]}>
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
                  color={isFocused ? colors.surfaceContainerLowest : colors.outline}
                  name={meta.icon}
                  size={22}
                />
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                  numberOfLines={1}
                  style={[styles.label, isFocused ? styles.activeLabel : styles.inactiveLabel]}>
                  {meta.label}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      pointerEvents: 'box-none',
    },
    floatingBar: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      minHeight: layout.floatingTabBarHeight,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 28,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000000',
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: {
        width: 0,
        height: 10,
      },
      elevation: 8,
    },
    item: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.sm,
      borderRadius: radii.pill,
    },
    activeItem: {
      backgroundColor: colors.primary,
    },
    label: {
      marginTop: 4,
      fontFamily: fontFamilies.bodyBold,
      fontSize: 9,
      lineHeight: 12,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    activeLabel: {
      color: colors.surfaceContainerLowest,
    },
    inactiveLabel: {
      color: colors.outline,
    },
  });
}
