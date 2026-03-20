import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/action-button';
import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { ResponsiveDisplayText } from '@/components/ui/responsive-display-text';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, layout, radii, spacing, type AppPalette } from '@/constants/theme';
import { pushWordToReview, toggleFavorite, toggleSuspended } from '@/modules/progress/progress.service';
import { getWordDetail } from '@/modules/words/words.service';
import { useAppTheme } from '@/theme/app-theme-provider';
import { formatRelativeStudyDate } from '@/utils/dates';
import type { WordDetail } from '@/types/word';

export default function WordDetailScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
      <View style={styles.container}>
        <DotMatrixBackground opacity={0.1} />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.edgeControls}>
            <EdgeIconButton icon="arrow-back" onPress={() => router.back()} />
            <EdgeIconButton icon="search" onPress={() => router.push('/search')} />
          </View>

          <View style={styles.heroSection}>
            <View style={styles.heroCopy}>
              <TechnicalLabel color={colors.muted}>
                Kayıt ID: {word ? `${String(word.id).padStart(4, '0')}-VL` : '----'}
              </TechnicalLabel>
              <ResponsiveDisplayText numberOfLines={2} style={styles.heroWord} variant="word">
                {word?.english ?? 'Kelime'}
              </ResponsiveDisplayText>
              <Text numberOfLines={3} style={styles.heroMeaning}>
                {word?.turkish ?? 'Kayıt yükleniyor...'}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                void runAction('favorite');
              }}
              style={({ pressed }) => [styles.favoriteButton, pressed && styles.pressed]}>
              <MaterialIcons
                color={colors.primary}
                name={word?.isFavorite ? 'favorite' : 'favorite-border'}
                size={24}
              />
            </Pressable>
          </View>

          <View style={[styles.statusGrid, isWide && styles.statusGridWide]}>
            <StatusCard label="Durum" value={String(word?.status === 'new' ? 'yeni' : word?.status === 'learning' ? 'öğreniliyor' : word?.status === 'review' ? 'tekrar' : word?.status === 'mastered' ? 'ustalaştı' : word?.status ?? 'yeni').toUpperCase()} tone="lowest" />
            <StatusCard label="Son Görülme" value={formatRelativeStudyDate(word?.lastSeenAt)} />
            <StatusCard label="Sonraki Tekrar" value={formatRelativeStudyDate(word?.nextDueAt)} emphasized />
          </View>

          <View style={styles.usageHeader}>
            <Text style={styles.usageTitle}>Bağlamsal Kullanım</Text>
            <View style={styles.usageLine} />
            <TechnicalLabel color={colors.muted}>
              {(word?.sentences ?? []).length} örnek
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
              <TechnicalLabel color={colors.surfaceContainerLowest}>Görsel Referans // Konum</TechnicalLabel>
              <Text style={styles.visualWord}>{word?.english?.toUpperCase() ?? 'LEXICON'}</Text>
              <Text style={styles.visualCaption}>Çevrimdışı arşiv gösterimi</Text>
            </View>
          </View>
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.footerSafe}>
          <View style={styles.footer}>
            <View style={styles.footerActions}>
              <ActionButton
                label={isBusy === 'review' ? 'Güncelleniyor...' : 'Tekrar Listesine Ekle'}
                onPress={() => {
                  void runAction('review');
                }}
                style={styles.footerPrimary}
              />
              <ActionButton
                label={word?.isSuspended ? 'Yeniden Etkinleştir' : 'Devre Dışı Bırak'}
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
                {word?.isFavorite ? 'Kaydedildi' : 'Favori'}
              </Text>
              <MaterialIcons
                color={colors.primary}
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

function EdgeIconButton({
  icon,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.edgeButton, pressed && styles.pressed]}>
      <MaterialIcons color={colors.primary} name={icon} size={22} />
    </Pressable>
  );
}

function HighlightedSentence({ sentence, word }: { sentence: string; word: string }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.statusCard, tone === 'lowest' ? styles.statusCardLowest : styles.statusCardDefault]}>
      <TechnicalLabel color={colors.muted}>{label}</TechnicalLabel>
      <Text style={[styles.statusValue, emphasized && styles.statusValueEmphasized]}>{value}</Text>
    </View>
  );
}

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 184,
  },
  edgeControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  edgeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
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
    minWidth: 0,
    gap: spacing.xxs,
  },
  heroWord: {
    marginTop: spacing.xs,
    alignSelf: 'stretch',
    textAlign: 'left',
  },
  heroMeaning: {
    fontFamily: fontFamilies.displayRegular,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.8,
    color: colors.outline,
    flexShrink: 1,
  },
  favoriteButton: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusGrid: {
    gap: 1,
    marginBottom: spacing.xxxl,
    backgroundColor: colors.border,
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
    backgroundColor: colors.surfaceContainerLowest,
  },
  statusCardDefault: {
    backgroundColor: colors.surfaceContainer,
  },
  statusValue: {
    marginTop: spacing.md,
    fontFamily: fontFamilies.displayBold,
    fontSize: 20,
    lineHeight: 24,
    color: colors.primary,
    textTransform: 'uppercase',
    flexShrink: 1,
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
    color: colors.primary,
  },
  usageLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  examplesList: {
    gap: spacing.md,
  },
  exampleCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    backgroundColor: colors.surfaceContainerLow,
    borderLeftWidth: 4,
  },
  exampleCardActive: {
    borderLeftColor: colors.primary,
  },
  exampleCardMuted: {
    borderLeftColor: colors.border,
  },
  exampleText: {
    fontFamily: fontFamilies.bodyRegular,
    fontSize: 18,
    lineHeight: 30,
    color: colors.muted,
    fontStyle: 'italic',
    flexShrink: 1,
  },
  highlightedWord: {
    color: colors.primary,
    fontFamily: fontFamilies.bodyBold,
    fontStyle: 'normal',
  },
  visualShell: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.xl,
    minHeight: 220,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceContainerHighest,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  visualOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background === '#000000' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.24)',
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
    color: colors.surfaceContainerLowest,
    flexShrink: 1,
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
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footer: {
    minHeight: 96,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  footerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  footerPrimary: {
    flex: 1,
  },
  footerSecondary: {
    minWidth: 132,
    flex: 1,
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
    color: colors.primary,
  },
  pressed: {
    opacity: 0.74,
  },
  });
}
