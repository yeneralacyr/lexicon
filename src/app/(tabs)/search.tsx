import { MaterialIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FullscreenScrollScene } from '@/components/layout/fullscreen-scroll-scene';
import { ScreenHero } from '@/components/ui/screen-hero';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, radii, spacing, type AppPalette } from '@/constants/theme';
import { searchWords } from '@/modules/words/words.service';
import { useAppTheme } from '@/theme/app-theme-provider';
import type { WordListItem } from '@/types/word';

export default function SearchScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    <FullscreenScrollScene
      dotOpacity={0.1}
      withTabInset
      keyboardShouldPersistTaps="handled"
      topSlot={
        <ScreenHero eyebrow="Hızlı arama" title="Kelime ara" />
      }>
      <View style={styles.inputSection}>
        <View style={styles.inputShell}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            onChangeText={setQuery}
            placeholder="Kelime veya Türkçesini ara"
            placeholderTextColor={colors.mutedSoft}
            style={styles.input}
            value={query}
          />
          <MaterialIcons color={colors.primary} name="keyboard-return" size={24} />
        </View>
      </View>

      <View style={styles.resultsHeader}>
        <TechnicalLabel>Anında eşleşmeler</TechnicalLabel>
        <Text style={styles.resultsCount}>{results.length} sonuç</Text>
      </View>

      <View style={styles.resultsList}>
        {query.trim().length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>İngilizce ya da Türkçe yaz. Sonuçlar çevrimdışı sözlükten anında gelir.</Text>
          </View>
        ) : null}

        {query.trim().length > 0 && results.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>Bu arama için doğrudan eşleşme bulunamadı.</Text>
          </View>
        ) : null}

        {results.map((word, index) => (
          <Link key={word.id} href={`/word/${word.id}`} asChild>
            <Pressable style={({ pressed }) => StyleSheet.flatten([styles.resultCard, pressed && styles.resultPressed])}>
              <View style={styles.resultCopy}>
                <TechnicalLabel color={colors.muted} style={styles.resultIndex}>
                  {String(index + 1).padStart(3, '0')}
                </TechnicalLabel>
                <View style={styles.resultTitleRow}>
                  <Text adjustsFontSizeToFit minimumFontScale={0.74} numberOfLines={2} style={styles.resultWord}>
                    {word.english}
                  </Text>
                  <Text numberOfLines={2} style={styles.resultMeaning}>
                    ({word.turkish})
                  </Text>
                </View>
              </View>
              <View style={styles.resultRight}>
                <View style={styles.resultTag}>
                  <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={styles.resultTagText}>
                    {mapSearchTag(word)}
                  </Text>
                </View>
                <MaterialIcons color={colors.outline} name="chevron-right" size={24} />
              </View>
            </Pressable>
          </Link>
        ))}
      </View>

      <View style={styles.metaFooter}>
        <View style={styles.metaItem}>
          <View style={styles.metaDot} />
          <TechnicalLabel color={colors.mutedSoft} style={styles.metaLabel}>
            Sonuç: {results.length}
          </TechnicalLabel>
        </View>
        <TechnicalLabel color={colors.mutedSoft} style={styles.metaLabel}>
          Sorgu: {query.trim().length} karakter
        </TechnicalLabel>
      </View>
    </FullscreenScrollScene>
  );
}

function mapSearchTag(word: WordListItem) {
  if (word.isFavorite) {
    return 'Favori';
  }
  if (word.status === 'mastered') {
    return 'Ustalaştı';
  }
  const statusMap: Record<string, string> = {
    new: 'Yeni',
    learning: 'Öğreniliyor',
    review: 'Tekrar',
  };
  return (statusMap[word.status ?? 'new'] ?? 'Yeni').toUpperCase();
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    inputSection: {
      marginBottom: spacing.xxl,
    },
    inputShell: {
      minHeight: 74,
      backgroundColor: colors.surfaceContainerLow,
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    input: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamilies.displayMedium,
      fontSize: 30,
      lineHeight: 36,
      letterSpacing: -1.2,
      color: colors.primary,
    },
    resultsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      flexWrap: 'wrap',
      gap: spacing.sm,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: spacing.lg,
    },
    resultsCount: {
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 11,
      lineHeight: 16,
      color: colors.outline,
    },
    resultsList: {
      gap: spacing.md,
    },
    resultCard: {
      backgroundColor: colors.surfaceContainerLowest,
      padding: spacing.lg,
      minHeight: 104,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    resultPressed: {
      opacity: 0.72,
    },
    resultCopy: {
      flex: 1,
      minWidth: 0,
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
      minWidth: 0,
    },
    resultWord: {
      fontFamily: fontFamilies.displayBold,
      fontSize: 34,
      lineHeight: 34,
      color: colors.primary,
      flexShrink: 1,
    },
    resultMeaning: {
      fontFamily: fontFamilies.bodyRegular,
      fontSize: 20,
      lineHeight: 26,
      color: colors.outline,
      flexShrink: 1,
    },
    resultRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginLeft: spacing.md,
      minWidth: 0,
    },
    resultTag: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      borderRadius: radii.sm,
      backgroundColor: colors.chip,
      maxWidth: 104,
    },
    resultTagText: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 10,
      lineHeight: 12,
      textTransform: 'uppercase',
      color: colors.ink,
      textAlign: 'center',
    },
    metaFooter: {
      marginTop: spacing.xxxxl,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
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
      backgroundColor: colors.outline,
    },
    metaLabel: {
      letterSpacing: 1.8,
    },
    emptyRow: {
      minHeight: 120,
      justifyContent: 'center',
      backgroundColor: colors.surfaceContainerLowest,
      paddingHorizontal: spacing.lg,
    },
    emptyText: {
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 16,
      lineHeight: 24,
      color: colors.muted,
    },
  });
}
