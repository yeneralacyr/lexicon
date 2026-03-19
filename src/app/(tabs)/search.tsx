import { MaterialIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useDeferredValue, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/navigation/top-bar';
import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, layout, palette, radii, spacing } from '@/constants/theme';
import { searchWords } from '@/modules/words/words.service';
import type { WordListItem } from '@/types/word';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<WordListItem[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!deferredQuery.trim()) {
        setResults([]);
        return;
      }

      const nextResults = await searchWords(deferredQuery, 20);
      if (active) {
        setResults(nextResults);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [deferredQuery]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <TopBar align="left" leftAction={{ icon: 'menu' }} rightAction={{ icon: 'search' }} />
      <View style={styles.container}>
        <DotMatrixBackground opacity={0.1} />
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.inputSection}>
            <TechnicalLabel style={styles.quickLookup}>Quick lookup</TechnicalLabel>
            <View style={styles.inputShell}>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                onChangeText={setQuery}
                placeholder="SEARCH WORD OR TURKISH"
                placeholderTextColor="#9D9D9D"
                style={styles.input}
                value={query}
              />
              <MaterialIcons color={palette.primary} name="keyboard-return" size={28} />
            </View>
          </View>

          <View style={styles.resultsHeader}>
            <TechnicalLabel>Instant matches</TechnicalLabel>
            <Text style={styles.resultsCount}>{results.length} Results Found</Text>
          </View>

          <View style={styles.resultsList}>
            {query.trim().length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>Start typing to search the local vocabulary set.</Text>
              </View>
            ) : null}

            {query.trim().length > 0 && results.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No direct matches found for this query.</Text>
              </View>
            ) : null}

            {results.map((word, index) => (
              <Link key={word.id} href={`/word/${word.id}`} asChild>
                <Pressable style={({ pressed }) => [styles.resultCard, pressed && styles.resultPressed]}>
                  <View>
                    <TechnicalLabel color="rgba(119,119,119,0.8)" style={styles.resultIndex}>
                      {String(index + 1).padStart(3, '0')}
                    </TechnicalLabel>
                    <View style={styles.resultTitleRow}>
                      <Text style={styles.resultWord}>{word.english}</Text>
                      <Text style={styles.resultMeaning}>({word.turkish})</Text>
                    </View>
                  </View>
                  <View style={styles.resultRight}>
                    <View style={styles.resultTag}>
                      <Text style={styles.resultTagText}>{mapSearchTag(word)}</Text>
                    </View>
                    <MaterialIcons color={palette.outline} name="chevron-right" size={24} />
                  </View>
                </Pressable>
              </Link>
            ))}
          </View>

          <View style={styles.metaFooter}>
            <View style={styles.metaItem}>
              <View style={styles.metaDot} />
              <TechnicalLabel color="rgba(71,71,71,0.5)" style={styles.metaLabel}>
                Engine Status: Ready
              </TechnicalLabel>
            </View>
            <TechnicalLabel color="rgba(71,71,71,0.5)" style={styles.metaLabel}>
              v1.0.4-search
            </TechnicalLabel>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function mapSearchTag(word: WordListItem) {
  if (word.isFavorite) {
    return 'Favorite';
  }
  if (word.status === 'mastered') {
    return 'Strong';
  }
  return (word.status ?? 'new').toUpperCase();
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
  inputSection: {
    marginBottom: spacing.xxxl,
  },
  quickLookup: {
    marginBottom: spacing.sm,
  },
  inputShell: {
    minHeight: 74,
    backgroundColor: palette.surfaceContainerLow,
    borderBottomWidth: 2,
    borderBottomColor: '#2C6BFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    justifyContent: 'space-between',
  },
  input: {
    flex: 1,
    fontFamily: fontFamilies.displayMedium,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1.2,
    color: palette.primary,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(198,198,198,0.25)',
    marginBottom: spacing.lg,
  },
  resultsCount: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    lineHeight: 16,
    color: palette.outline,
  },
  resultsList: {
    gap: spacing.md,
  },
  resultCard: {
    backgroundColor: palette.surfaceContainerLowest,
    padding: spacing.lg,
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultPressed: {
    opacity: 0.72,
  },
  resultIndex: {
    marginBottom: spacing.xs,
    letterSpacing: 1.4,
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  resultWord: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 34,
    lineHeight: 34,
    color: palette.primary,
  },
  resultMeaning: {
    fontFamily: fontFamilies.bodyRegular,
    fontSize: 22,
    lineHeight: 28,
    color: '#888888',
  },
  resultRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginLeft: spacing.md,
  },
  resultTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.sm,
    backgroundColor: palette.chip,
  },
  resultTagText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 10,
    lineHeight: 12,
    textTransform: 'uppercase',
    color: palette.ink,
  },
  metaFooter: {
    marginTop: spacing.xxxxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.outline,
  },
  metaLabel: {
    letterSpacing: 1.8,
  },
  emptyRow: {
    minHeight: 120,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 16,
    lineHeight: 24,
    color: palette.muted,
  },
});
