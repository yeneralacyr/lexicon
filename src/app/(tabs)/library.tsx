import { useIsFocused } from '@react-navigation/native';
import { Link, router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/navigation/top-bar';
import { ActionButton } from '@/components/ui/action-button';
import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, layout, palette, radii, spacing } from '@/constants/theme';
import { getLibraryWords } from '@/modules/words/words.service';
import type { WordListItem } from '@/types/word';

type LibraryFilter = 'all' | 'new' | 'learning' | 'review' | 'strong' | 'favorites';

const filterLabels: Record<LibraryFilter, string> = {
  all: 'All',
  new: 'New',
  learning: 'Learning',
  review: 'Review',
  strong: 'Strong',
  favorites: 'Favorites',
};

export default function LibraryScreen() {
  const isFocused = useIsFocused();
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [visibleCount, setVisibleCount] = useState(20);
  const [words, setWords] = useState<WordListItem[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      const nextWords = await getLibraryWords(240);
      if (active) {
        setWords(nextWords);
      }
    }

    if (isFocused) {
      void load();
    }

    return () => {
      active = false;
    };
  }, [isFocused]);

  const filteredWords = useMemo(() => {
    return words.filter((word) => {
      if (filter === 'all') {
        return true;
      }
      if (filter === 'favorites') {
        return Boolean(word.isFavorite);
      }
      if (filter === 'strong') {
        return word.status === 'mastered';
      }
      return (word.status ?? 'new') === filter;
    });
  }, [filter, words]);

  const visibleWords = filteredWords.slice(0, visibleCount);
  const learnedCount = words.filter((word) => word.status && word.status !== 'new').length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <TopBar
        align="left"
        bordered
        leftAction={{ icon: 'menu' }}
        rightAction={{ icon: 'search', onPress: () => router.push('/search') }}
      />
      <View style={styles.container}>
        <DotMatrixBackground opacity={0.03} />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.hero}>
            <Text style={styles.title}>LIBRARY</Text>
            <TechnicalLabel color="rgba(71,71,71,0.65)">
              {words.length} words • {learnedCount} learned
            </TechnicalLabel>
          </View>

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
                  <Text style={[styles.filterLabel, active && styles.activeFilterLabel]}>
                    {filterLabels[key]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.list}>
            {visibleWords.map((word) => (
              <Link key={word.id} href={`/word/${word.id}`} asChild>
                <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                  <View>
                    <Text style={styles.rowEnglish}>{word.english.toUpperCase()}</Text>
                    <Text style={styles.rowTurkish}>{word.turkish}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <StatusBadge word={word} />
                  </View>
                </Pressable>
              </Link>
            ))}
          </View>

          {filteredWords.length > visibleCount ? (
            <View style={styles.loadMore}>
              <ActionButton
                label="Load More Entries"
                variant="secondary"
                onPress={() => setVisibleCount((current) => current + 20)}
              />
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function StatusBadge({ word }: { word: WordListItem }) {
  const label = word.isFavorite
    ? 'Favorite'
    : word.status === 'mastered'
      ? 'Strong'
      : (word.status ?? 'new');

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: layout.bottomTabHeight + spacing.xxl,
    maxWidth: layout.maxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 68,
    lineHeight: 68,
    letterSpacing: -3,
    color: palette.primary,
    marginBottom: spacing.xs,
  },
  filterRow: {
    gap: spacing.xs,
    paddingBottom: spacing.lg,
  },
  filterChip: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(198,198,198,0.6)',
    borderRadius: radii.sm,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  activeFilterChip: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  filterLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: palette.muted,
  },
  activeFilterLabel: {
    color: palette.surfaceContainerLowest,
  },
  list: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(198,198,198,0.45)',
  },
  row: {
    minHeight: 92,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,198,198,0.45)',
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowEnglish: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 32,
    lineHeight: 32,
    letterSpacing: -1.2,
    color: palette.primary,
  },
  rowTurkish: {
    marginTop: spacing.xxs,
    fontFamily: fontFamilies.bodyRegular,
    fontSize: 14,
    lineHeight: 18,
    color: palette.muted,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(198,198,198,0.6)',
    borderRadius: radii.sm,
    backgroundColor: palette.surfaceContainerLow,
  },
  badgeLabel: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 9,
    lineHeight: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.muted,
  },
  loadMore: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
});
