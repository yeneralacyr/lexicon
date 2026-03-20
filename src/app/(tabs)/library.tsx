import { useIsFocused } from '@react-navigation/native';
import { Link } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FullscreenScrollScene } from '@/components/layout/fullscreen-scroll-scene';
import { ActionButton } from '@/components/ui/action-button';
import { ResponsiveDisplayText } from '@/components/ui/responsive-display-text';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, radii, spacing, type AppPalette } from '@/constants/theme';
import { getLibraryWords } from '@/modules/words/words.service';
import { useAppTheme } from '@/theme/app-theme-provider';
import type { LibraryPage, WordListItem } from '@/types/word';

type LibraryFilter = 'all' | 'new' | 'learning' | 'review' | 'mastered' | 'favorites';

const filterLabels: Record<LibraryFilter, string> = {
  all: 'Tümü',
  new: 'Yeni',
  learning: 'Öğreniliyor',
  review: 'Tekrar',
  mastered: 'Ustalaştı',
  favorites: 'Favoriler',
};

export default function LibraryScreen() {
  const isFocused = useIsFocused();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [page, setPage] = useState<LibraryPage | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const nextWords = await getLibraryWords({
        filter,
        offset: 0,
        limit: 40,
      });
      if (active) {
        setPage(nextWords);
      }
    }

    if (isFocused) {
      void load();
    }

    return () => {
      active = false;
    };
  }, [filter, isFocused]);

  async function handleLoadMore() {
    if (!page?.nextOffset) {
      return;
    }

    const nextPage = await getLibraryWords({
      filter,
      offset: page.nextOffset,
      limit: 40,
    });

    setPage((current) => {
      if (!current) {
        return nextPage;
      }

      return {
        ...nextPage,
        items: [...current.items, ...nextPage.items],
      };
    });
  }

  return (
    <FullscreenScrollScene
      dotOpacity={0.03}
      topSlot={
        <View style={styles.hero}>
          <TechnicalLabel color={colors.muted}>Arşiv görünümü</TechnicalLabel>
          <ResponsiveDisplayText numberOfLines={2} style={styles.title} variant="hero">
            Kitaplık
          </ResponsiveDisplayText>
          <TechnicalLabel color={colors.muted}>
            {page?.totalWords ?? 0} kelime • {page?.learnedCount ?? 0} öğrenilen
          </TechnicalLabel>
        </View>
      }
      withTabInset>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {(Object.keys(filterLabels) as LibraryFilter[]).map((key) => {
          const active = filter === key;
          return (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={[styles.filterChip, active && styles.activeFilterChip]}>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                numberOfLines={1}
                style={[styles.filterLabel, active && styles.activeFilterLabel]}>
                {filterLabels[key]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.list}>
        {page && page.items.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>
              Bu filtrede kart görünmüyor. Farklı bir durum seçebilir ya da birkaç oturum tamamlayıp burayı doldurabilirsin.
            </Text>
          </View>
        ) : null}
        {(page?.items ?? []).map((word) => (
          <Link key={word.id} href={`/word/${word.id}`} asChild>
            <Pressable style={({ pressed }) => StyleSheet.flatten([styles.row, pressed && styles.rowPressed])}>
              <View style={styles.rowCopy}>
                <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={2} style={styles.rowEnglish}>
                  {word.english.toUpperCase()}
                </Text>
                <Text numberOfLines={2} style={styles.rowTurkish}>
                  {word.turkish}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <StatusBadge word={word} />
              </View>
            </Pressable>
          </Link>
        ))}
      </View>

      {page?.nextOffset !== null && page?.nextOffset !== undefined ? (
        <View style={styles.loadMore}>
          <ActionButton
            label="Daha Fazla Kayıt Yükle"
            variant="secondary"
            onPress={() => {
              void handleLoadMore();
            }}
          />
        </View>
      ) : null}
    </FullscreenScrollScene>
  );
}

function StatusBadge({ word }: { word: WordListItem }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusMap: Record<string, string> = {
    new: 'Yeni',
    learning: 'Öğreniliyor',
    review: 'Tekrar',
    mastered: 'Ustalaştı',
  };
  const label = word.isFavorite
    ? 'Favori'
    : word.status === 'mastered'
      ? 'Ustalaştı'
      : (statusMap[word.status ?? 'new'] ?? 'Yeni');

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeLabel}>{label}</Text>
    </View>
  );
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
  hero: {
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  title: {
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  filterRow: {
    gap: spacing.xs,
    paddingBottom: spacing.lg,
  },
  filterChip: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  activeFilterChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  activeFilterLabel: {
    color: colors.surfaceContainerLowest,
  },
  list: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  emptyRow: {
    minHeight: 140,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerLowest,
  },
  emptyText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
    maxWidth: 320,
  },
  row: {
    minHeight: 92,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowEnglish: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 32,
    lineHeight: 32,
    letterSpacing: -1.2,
    color: colors.primary,
    flexShrink: 1,
  },
  rowTurkish: {
    marginTop: spacing.xxs,
    fontFamily: fontFamilies.bodyRegular,
    fontSize: 14,
    lineHeight: 18,
    color: colors.muted,
    flexShrink: 1,
  },
  rowRight: {
    alignItems: 'flex-end',
    minWidth: 88,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainerLow,
  },
  badgeLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 9,
    lineHeight: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.muted,
    textAlign: 'center',
  },
  loadMore: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  });
}
