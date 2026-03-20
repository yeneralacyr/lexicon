import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/action-button';
import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { ResponsiveDisplayText } from '@/components/ui/responsive-display-text';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, radii, spacing, type AppPalette } from '@/constants/theme';
import { getSettings, updateSettings } from '@/modules/progress/progress.service';
import { useAppTheme } from '@/theme/app-theme-provider';

const options = [5, 10, 15];

const tutorialSlides = [
  {
    id: 'value',
    eyebrow: 'Adım 01 — Amaç',
    title: 'Kelimeyi sadece görme, geri çağır.',
    body: 'Lexicon kelimeyi doğru anda tekrar ettirir. Böylece pasif okumak yerine gerçekten hatırlamayı çalışırsın.',
    cards: ['Kısa oturumlar', 'Çevrimdışı çalışma', 'Tek kelime yerine tekrar döngüsü'],
  },
  {
    id: 'method',
    eyebrow: 'Adım 02 — Nasıl çalışır',
    title: 'Kelimeyi gör, anlamı aç, 5 saniye bekle.',
    body: 'İlk yüz sadece İngilizce kelimeyi gösterir. Dokununca Türkçe anlam açılır, sayaç biter ve sonra kelime örnek cümleyle geri döner.',
    cards: ['Dokun ve anlamı aç', '5 saniye sonra cümleyi gör', 'Sola tekrar, yukarı zaten biliyordum, sağa ezberledim'],
  },
  {
    id: 'setup',
    eyebrow: 'Adım 03 — Kurulum',
    title: 'Günlük hızını seç ve ilk turu başlat.',
    body: 'Hedefin düşük sürtünmeli olsun. Düzenli devam etmek, tek seferde çok kart açmaktan daha iyi işler.',
    cards: ['5 kelime = hafif tempo', '10 kelime = dengeli', '15 kelime = yoğun'],
  },
] as const;

export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView | null>(null);
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selected, setSelected] = useState(10);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      const settings = await getSettings();
      if (active) {
        setSelected(settings.dailyNewLimit);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  function goToStep(nextStep: number) {
    const bounded = Math.max(0, Math.min(tutorialSlides.length - 1, nextStep));
    setStep(bounded);
    scrollRef.current?.scrollTo({ x: bounded * width, animated: true });
  }

  async function handleBegin() {
    setSaving(true);
    try {
      await updateSettings({
        dailyNewLimit: selected,
        onboardingCompleted: true,
      });
      router.replace('/today');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <DotMatrixBackground opacity={0.15} />

        <View style={styles.header}>
          <TechnicalLabel style={styles.brand}>Lexicon</TechnicalLabel>
          <View style={styles.progressRow}>
            {tutorialSlides.map((slide, index) => (
              <View key={slide.id} style={index === step ? styles.progressActive : styles.progressInactive} />
            ))}
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={(event) => {
            const nextStep = Math.round(event.nativeEvent.contentOffset.x / width);
            setStep(nextStep);
          }}>
          {tutorialSlides.map((slide, index) => (
            <View key={slide.id} style={[styles.page, { width }]}>
              <View style={styles.pageInner}>
                <View style={styles.pageCopy}>
                  <TechnicalLabel style={styles.stepLabel}>{slide.eyebrow}</TechnicalLabel>
                  <ResponsiveDisplayText numberOfLines={3} style={styles.title} variant="hero">
                    {slide.title}
                  </ResponsiveDisplayText>
                  <Text style={styles.subtitle}>{slide.body}</Text>
                </View>

                {index < tutorialSlides.length - 1 ? (
                  <View style={styles.tutorialCardStack}>
                    {slide.cards.map((card, cardIndex) => (
                      <View key={card} style={[styles.tutorialCard, cardIndex === 0 && styles.tutorialCardPrimary]}>
                        <TechnicalLabel color={cardIndex === 0 ? colors.surfaceContainerLowest : colors.muted}>
                          {String(cardIndex + 1).padStart(2, '0')}
                        </TechnicalLabel>
                        <Text style={[styles.tutorialCardText, cardIndex === 0 && styles.tutorialCardTextPrimary]}>
                          {card}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.setupSection}>
                    <View style={styles.options}>
                      {options.map((value) => {
                        const active = value === selected;

                        return (
                          <Pressable
                            key={value}
                            onPress={() => setSelected(value)}
                            style={[styles.optionCard, active && styles.optionCardActive]}>
                            <View style={styles.optionCopy}>
                              <Text style={[styles.optionNumber, active && styles.optionNumberActive]}>{value}</Text>
                              <TechnicalLabel
                                color={active ? `rgba(255,255,255,0.74)` : colors.muted}
                                style={styles.optionLabel}>
                                Kelime / gün
                              </TechnicalLabel>
                            </View>
                            <View style={[styles.optionCircle, active && styles.optionCircleActive]}>
                              {active ? <View style={styles.optionCircleDot} /> : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>

                    <TechnicalLabel color={colors.mutedSoft} style={styles.setupHint}>
                      Hedefini daha sonra Ayarlar sekmesinden değiştirebilirsin.
                    </TechnicalLabel>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          {step < tutorialSlides.length - 1 ? (
            <>
              <ActionButton
                label="İleri"
                onPress={() => {
                  goToStep(step + 1);
                }}
              />
              <Pressable onPress={() => goToStep(tutorialSlides.length - 1)} style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}>
                <Text style={styles.skipText}>Kuruluma geç</Text>
              </Pressable>
            </>
          ) : (
            <>
              <ActionButton
                label={saving ? 'Hazırlanıyor...' : 'İlk Oturumu Başlat'}
                onPress={() => {
                  void handleBegin();
                }}
              />
              <Pressable onPress={() => goToStep(step - 1)} style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}>
                <Text style={styles.skipText}>Önceki adım</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
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
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      gap: spacing.lg,
    },
    brand: {
      letterSpacing: 2,
    },
    progressRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    progressInactive: {
      flex: 1,
      height: 3,
      backgroundColor: colors.border,
    },
    progressActive: {
      flex: 1,
      height: 3,
      backgroundColor: colors.primary,
    },
    page: {
      flex: 1,
    },
    pageInner: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.lg,
      justifyContent: 'space-between',
      gap: spacing.xxl,
    },
    pageCopy: {
      gap: spacing.lg,
    },
    stepLabel: {
      marginBottom: spacing.xs,
    },
    title: {
      textAlign: 'left',
      alignSelf: 'flex-start',
      maxWidth: 340,
    },
    subtitle: {
      maxWidth: 340,
      fontFamily: fontFamilies.bodyRegular,
      fontSize: 18,
      lineHeight: 28,
      color: colors.muted,
    },
    tutorialCardStack: {
      gap: spacing.md,
    },
    tutorialCard: {
      minHeight: 88,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      backgroundColor: colors.surfaceContainerLowest,
      gap: spacing.sm,
    },
    tutorialCardPrimary: {
      backgroundColor: colors.primary,
    },
    tutorialCardText: {
      fontFamily: fontFamilies.displayMedium,
      fontSize: 24,
      lineHeight: 28,
      color: colors.primary,
    },
    tutorialCardTextPrimary: {
      color: colors.surfaceContainerLowest,
    },
    setupSection: {
      gap: spacing.lg,
    },
    options: {
      gap: spacing.md,
    },
    optionCard: {
      minHeight: 102,
      backgroundColor: colors.surfaceContainerLowest,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
    },
    optionCardActive: {
      backgroundColor: colors.primary,
    },
    optionCopy: {
      minWidth: 0,
    },
    optionNumber: {
      fontFamily: fontFamilies.displayBold,
      fontSize: 54,
      lineHeight: 54,
      letterSpacing: -2,
      color: colors.primary,
    },
    optionNumberActive: {
      color: colors.surfaceContainerLowest,
    },
    optionLabel: {
      marginTop: spacing.xxs,
    },
    optionCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    optionCircleActive: {
      backgroundColor: colors.surfaceContainerLowest,
      borderColor: colors.surfaceContainerLowest,
    },
    optionCircleDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    setupHint: {
      textAlign: 'center',
    },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    skipButton: {
      alignSelf: 'center',
      minHeight: 28,
      justifyContent: 'center',
    },
    skipText: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 11,
      lineHeight: 16,
      letterSpacing: 1.8,
      textTransform: 'uppercase',
      color: colors.muted,
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
