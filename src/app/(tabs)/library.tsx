import { useIsFocused } from '@react-navigation/native';
import { Link, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FullscreenScrollScene } from '@/components/layout/fullscreen-scroll-scene';
import { ActionButton } from '@/components/ui/action-button';
import { ScreenHero } from '@/components/ui/screen-hero';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { statusLabels } from '@/constants/status-labels';
import { fontFamilies, radii, spacing, type AppPalette } from '@/constants/theme';
import { buildLibraryReviewSession } from '@/modules/review/review.engine';
import { resolveSessionRoute } from '@/modules/sessions/session-routing';
import { getActiveLibraryReviewSession } from '@/modules/sessions/sessions.service';
import { getLibraryWords } from '@/modules/words/words.service';
import { useSessionStore } from '@/store/sessionStore';
import { useAppTheme } from '@/theme/app-theme-provider';
import type { ActiveSession } from '@/types/session';
import type { LibraryFilter, LibraryPage, WordListItem } from '@/types/word';

const filterLabels: Record<LibraryFilter, string> = {
  learned: 'Öğrenilen',
  learning: 'Öğreniliyor',
  review: 'Tekrar',
  mastered: 'Ustalaştı',
  favorites: 'Favoriler',
};

export default function LibraryScreen() {
  const isFocused = useIsFocused();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const setActiveSessionId = useSessionStore((state) => state.setActiveSessionId);
  const [filter, setFilter] = useState<LibraryFilter>('learned');
  const [page, setPage] = useState<LibraryPage | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isStartingReview, setIsStartingReview] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [nextWords, nextActiveSession] = await Promise.all([
        getLibraryWords({
          filter,
          offset: 0,
          limit: 40,
        }),
        getActiveLibraryReviewSession(),
      ]);

      setPage(nextWords);
      setActiveSession(nextActiveSession);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Kitaplık yüklenemedi.');
    }
  }, [filter]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [nextWords, nextActiveSession] = await Promise.all([
          getLibraryWords({
            filter,
            offset: 0,
            limit: 40,
          }),
          getActiveLibraryReviewSession(),
        ]);

        if (active) {
          setPage(nextWords);
          setActiveSession(nextActiveSession);
          setLoadError(null);
        }
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : 'Kitaplık yüklenemedi.');
        }
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
    if (!page?.nextOffset || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const nextPage = await getLibraryWords({
        filter,
        offset: page.nextOffset,
        limit: 40,
      });

      setPage((current) => {
        if (!current) {
          return nextPage;
        }

        const existingIds = new Set(current.items.map((item) => item.id));
        return {
          ...nextPage,
          items: [...current.items, ...nextPage.items.filter((item) => !existingIds.has(item.id))],
        };
      });
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Daha fazla kayıt yüklenemedi.');
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleStartReview() {
    if (isStartingReview) {
      return;
    }

    setIsStartingReview(true);

    try {
      if (activeLibraryReview) {
        setActiveSessionId(activeLibraryReview.id);
        router.push(resolveSessionRoute(activeLibraryReview));
        return;
      }

      const session = await buildLibraryReviewSession();

      if (!session) {
        return;
      }

      setActiveSessionId(session.id);
      router.push(resolveSessionRoute(session));
    } catch (error) {
      Alert.alert('Review oturumu açılamadı', error instanceof Error ? error.message : 'Kitaplık review hazırlanamadı.');
    } finally {
      setIsStartingReview(false);
    }
  }

  const reviewCandidateCount = (page?.reviewCount ?? 0) + (page?.learningCount ?? 0);
  const activeLibraryReview = activeSession;
  const activeRemaining = activeLibraryReview
    ? Math.max(0, activeLibraryReview.totalItems - activeLibraryReview.completedItems)
    : 0;
  const shouldShowReviewCard = Boolean(activeLibraryReview || reviewCandidateCount > 0);
  const reviewTitle = activeLibraryReview
    ? 'Review turuna kaldığın yerden devam et'
    : 'Kitaplık review turu hazır';
  const reviewCopy = activeLibraryReview
    ? `${activeRemaining} kelime kaldı. Bu bağımsız tur bugünün akışından ayrı ilerler ve en fazla 20 kelime sürer.`
    : `${page?.reviewCount ?? 0} tekrar • ${page?.learningCount ?? 0} öğreniliyor. En fazla 20 kelimelik bu hızlı turda sağa kaydırdıkların ustalaştıya geçer.`;
  const reviewButtonLabel = activeLibraryReview
    ? "Review'a Devam Et"
    : isStartingReview
      ? 'Review hazırlanıyor...'
      : "Review'a Başla";

  return (
    <FullscreenScrollScene
      dotOpacity={0.03}
      topSlot={
        <ScreenHero
          eyebrow="Arşiv görünümü"
          subtitle={`${page?.totalCount ?? 0} kayıt • ${page?.reviewCount ?? 0} tekrar • ${page?.learningCount ?? 0} öğreniliyor`}
          title="Kitaplık"
        />
      }
      withTabInset>
      <View style={styles.content}>
        {loadError ? (
          <View style={styles.inlineErrorCard}>
            <TechnicalLabel color={colors.error}>Kitaplık yüklenemedi</TechnicalLabel>
            <Text style={styles.inlineErrorText}>{loadError}</Text>
            <ActionButton
              label="Tekrar dene"
              onPress={() => {
                void refresh();
              }}
              variant="secondary"
            />
          </View>
        ) : null}

        {shouldShowReviewCard ? (
          <View style={styles.reviewCard}>
            <View style={styles.reviewCopy}>
              <Text style={styles.reviewTitle}>{reviewTitle}</Text>
              <Text style={styles.reviewText}>{reviewCopy}</Text>
            </View>
            <ActionButton
              disabled={isStartingReview}
              label={reviewButtonLabel}
              onPress={() => {
                void handleStartReview();
              }}
            />
          </View>
        ) : null}

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
                Kitaplık yalnızca öğrenmeye başladığın kelimeleri gösterir. Birkaç oturum tamamladıktan sonra burası dolmaya başlar.
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
              disabled={isLoadingMore}
              label={isLoadingMore ? 'Yükleniyor...' : 'Daha Fazla Kayıt Yükle'}
              variant="secondary"
              onPress={() => {
                void handleLoadMore();
              }}
            />
          </View>
        ) : null}
      </View>
    </FullscreenScrollScene>
  );
}

function StatusBadge({ word }: { word: WordListItem }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const label = word.isFavorite
    ? 'Favori'
    : (statusLabels[word.status ?? 'new'] ?? 'Yeni');

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeLabel}>{label}</Text>
    </View>
  );
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    content: {
      gap: spacing.xl,
    },
    inlineErrorCard: {
      gap: spacing.md,
      padding: spacing.lg,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inlineErrorText: {
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 14,
      lineHeight: 22,
      color: colors.muted,
    },
    reviewCard: {
      gap: spacing.lg,
      padding: spacing.lg,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reviewCopy: {
      gap: spacing.xs,
    },
    reviewTitle: {
      fontFamily: fontFamilies.displayBold,
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -1,
      color: colors.primary,
    },
    reviewText: {
      fontFamily: fontFamilies.bodyRegular,
      fontSize: 15,
      lineHeight: 24,
      color: colors.muted,
      maxWidth: 420,
    },
    filterRow: {
      gap: spacing.sm,
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
    },
    filterChip: {
      minHeight: 36,
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
      gap: spacing.sm,
    },
    emptyRow: {
      minHeight: 160,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyText: {
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 16,
      lineHeight: 24,
      color: colors.muted,
      maxWidth: 340,
    },
    row: {
      minHeight: 98,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md,
      backgroundColor: colors.surfaceContainerLowest,
    },
    rowPressed: {
      opacity: 0.7,
    },
    rowCopy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xxs,
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
      fontFamily: fontFamilies.bodyRegular,
      fontSize: 14,
      lineHeight: 20,
      color: colors.muted,
      flexShrink: 1,
    },
    rowRight: {
      alignItems: 'flex-end',
      minWidth: 96,
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
      marginTop: spacing.md,
    },
  });
}
