import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { Fragment, useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/navigation/top-bar';
import { ActionButton } from '@/components/ui/action-button';
import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, layout, palette, radii, spacing } from '@/constants/theme';
import { pushWordToReview, toggleFavorite, toggleSuspended } from '@/modules/progress/progress.service';
import { getWordDetail } from '@/modules/words/words.service';
import { formatRelativeStudyDate } from '@/utils/dates';
import type { WordDetail } from '@/types/word';

export default function WordDetailScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ wordId?: string | string[] }>();
  const wordIdValue = Array.isArray(params.wordId) ? params.wordId[0] : params.wordId;
  const [word, setWord] = useState<WordDetail | null>(null);
  const [isBusy, setIsBusy] = useState<'review' | 'favorite' | 'suspend' | null>(null);

  const loadWord = useCallback(async () => {
    if (!wordIdValue) {
      router.replace('/library');
      return;
    }

    const nextWord = await getWordDetail(Number(wordIdValue));
    if (!nextWord) {
      router.replace('/library');
      return;
    }

    setWord(nextWord);
  }, [router, wordIdValue]);

  useFocusEffect(
    useCallback(() => {
      void loadWord();
    }, [loadWord])
  );

  async function runAction(action: 'review' | 'favorite' | 'suspend') {
    if (!wordIdValue || isBusy) {
      return;
    }

    setIsBusy(action);

    try {
      if (action === 'review') {
        await pushWordToReview(Number(wordIdValue));
      }

      if (action === 'favorite') {
        await toggleFavorite(Number(wordIdValue));
      }

      if (action === 'suspend') {
        await toggleSuspended(Number(wordIdValue));
      }

      await loadWord();
    } finally {
      setIsBusy(null);
    }
  }

  const isWide = width >= 900;

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopBar
        align="left"
        leftAction={{ icon: 'menu', onPress: () => router.back() }}
        rightAction={{ icon: 'search', onPress: () => router.push('/search') }}
      />

      <View style={styles.container}>
        <DotMatrixBackground opacity={0.1} />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.heroSection}>
            <View style={styles.heroCopy}>
              <TechnicalLabel color="rgba(119,119,119,0.8)">
                Entry ID: {word ? `${String(word.id).padStart(4, '0')}-VL` : '----'}
              </TechnicalLabel>
              <Text style={styles.heroWord}>{word?.english ?? 'Word'}</Text>
              <Text style={styles.heroMeaning}>{word?.turkish ?? 'Loading entry...'}</Text>
            </View>

            <Pressable
              onPress={() => {
                void runAction('favorite');
              }}
              style={({ pressed }) => [styles.favoriteButton, pressed && styles.pressed]}>
              <MaterialIcons
                color={palette.primary}
                name={word?.isFavorite ? 'favorite' : 'favorite-border'}
                size={24}
              />
            </Pressable>
          </View>

          <View style={[styles.statusGrid, isWide && styles.statusGridWide]}>
            <StatusCard label="Status" value={String(word?.status ?? 'new').toUpperCase()} tone="lowest" />
            <StatusCard label="Last Seen" value={formatRelativeStudyDate(word?.lastSeenAt)} />
            <StatusCard label="Next Review" value={formatRelativeStudyDate(word?.nextDueAt)} emphasized />
          </View>

          <View style={styles.usageHeader}>
            <Text style={styles.usageTitle}>Contextual Usage</Text>
            <View style={styles.usageLine} />
            <TechnicalLabel color="rgba(119,119,119,0.8)">
              {(word?.sentences ?? []).length} samples
            </TechnicalLabel>
          </View>

          <View style={styles.examplesList}>
            {(word?.sentences ?? []).map((sentence, index) => (
              <View
                key={`${word?.id ?? 'word'}-${index}`}
                style={[styles.exampleCard, index === 0 ? styles.exampleCardActive : styles.exampleCardMuted]}>
                <Text style={styles.exampleText}>
                  <HighlightedSentence sentence={sentence} word={word?.english ?? ''} />
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.visualShell}>
            <View style={styles.visualOverlay} />
            <View style={styles.visualContent}>
              <TechnicalLabel color="rgba(255,255,255,0.72)">Visual Reference // Locality</TechnicalLabel>
              <Text style={styles.visualWord}>{word?.english?.toUpperCase() ?? 'LEXICON'}</Text>
              <Text style={styles.visualCaption}>Offline archive representation</Text>
            </View>
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footerSafe}>
          <View style={styles.footer}>
            <View style={styles.footerActions}>
              <ActionButton
                label={isBusy === 'review' ? 'Updating...' : 'Add To Review List'}
                onPress={() => {
                  void runAction('review');
                }}
                style={styles.footerPrimary}
              />
              <ActionButton
                label={word?.isSuspended ? 'Reactivate' : 'Deactivate'}
                onPress={() => {
                  void runAction('suspend');
                }}
                variant="secondary"
                style={styles.footerSecondary}
              />
            </View>

            <Pressable
              onPress={() => {
                void runAction('favorite');
              }}
              style={({ pressed }) => [styles.footerFavorite, pressed && styles.pressed]}>
              <Text style={styles.footerFavoriteText}>
                {word?.isFavorite ? 'Saved' : 'Favorite'}
              </Text>
              <MaterialIcons
                color={palette.primary}
                name={word?.isFavorite ? 'bookmark' : 'bookmark-border'}
                size={18}
              />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

function HighlightedSentence({ sentence, word }: { sentence: string; word: string }) {
  if (!word.trim()) {
    return <>{sentence}</>;
  }

  const parts = sentence.split(new RegExp(`(${escapeForRegExp(word)})`, 'ig'));

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = part.toLowerCase() === word.toLowerCase();

        if (!isMatch) {
          return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
        }

        return (
          <Text key={`${part}-${index}`} style={styles.highlightedWord}>
            {part}
          </Text>
        );
      })}
    </>
  );
}

function StatusCard({
  emphasized = false,
  label,
  tone = 'default',
  value,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  tone?: 'lowest' | 'default';
}) {
  return (
    <View style={[styles.statusCard, tone === 'lowest' ? styles.statusCardLowest : styles.statusCardDefault]}>
      <TechnicalLabel color="rgba(119,119,119,0.85)">{label}</TechnicalLabel>
      <Text style={[styles.statusValue, emphasized && styles.statusValueEmphasized]}>{value}</Text>
    </View>
  );
}

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 168,
  },
  heroSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.lg,
    marginBottom: spacing.xxxl,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  heroWord: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.displayBold,
    fontSize: 72,
    lineHeight: 72,
    letterSpacing: -3.2,
    color: palette.primary,
  },
  heroMeaning: {
    fontFamily: fontFamilies.displayRegular,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.8,
    color: palette.outline,
  },
  favoriteButton: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: palette.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusGrid: {
    gap: 1,
    marginBottom: spacing.xxxl,
    backgroundColor: 'rgba(198,198,198,0.18)',
  },
  statusGridWide: {
    flexDirection: 'row',
  },
  statusCard: {
    flex: 1,
    minHeight: 112,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    justifyContent: 'space-between',
  },
  statusCardLowest: {
    backgroundColor: palette.surfaceContainerLowest,
  },
  statusCardDefault: {
    backgroundColor: palette.surfaceContainer,
  },
  statusValue: {
    marginTop: spacing.md,
    fontFamily: fontFamilies.displayBold,
    fontSize: 20,
    lineHeight: 24,
    color: palette.primary,
    textTransform: 'uppercase',
  },
  statusValueEmphasized: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  usageTitle: {
    fontFamily: fontFamilies.displayBold,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    color: palette.primary,
  },
  usageLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(198,198,198,0.35)',
  },
  examplesList: {
    gap: spacing.md,
  },
  exampleCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    backgroundColor: palette.surfaceContainerLow,
    borderLeftWidth: 4,
  },
  exampleCardActive: {
    borderLeftColor: palette.primary,
  },
  exampleCardMuted: {
    borderLeftColor: palette.border,
  },
  exampleText: {
    fontFamily: fontFamilies.bodyRegular,
    fontSize: 18,
    lineHeight: 30,
    color: palette.muted,
    fontStyle: 'italic',
  },
  highlightedWord: {
    color: palette.primary,
    fontFamily: fontFamilies.bodyBold,
    fontStyle: 'normal',
  },
  visualShell: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.xl,
    minHeight: 220,
    borderRadius: radii.lg,
    backgroundColor: palette.surfaceContainerHighest,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  visualOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.24)',
  },
  visualContent: {
    padding: spacing.xl,
  },
  visualWord: {
    marginTop: spacing.md,
    fontFamily: fontFamilies.displayBold,
    fontSize: 40,
    lineHeight: 40,
    letterSpacing: -1.6,
    color: palette.surfaceContainerLowest,
  },
  visualCaption: {
    marginTop: spacing.sm,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.72)',
  },
  footerSafe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: 'rgba(198,198,198,0.5)',
  },
  footer: {
    minHeight: 96,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerPrimary: {
    flex: 1,
  },
  footerSecondary: {
    minWidth: 132,
  },
  footerFavorite: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: spacing.xs,
  },
  footerFavoriteText: {
    fontFamily: fontFamilies.bodyBold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: palette.primary,
  },
  pressed: {
    opacity: 0.74,
  },
});
