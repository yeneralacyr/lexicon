import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/action-button';
import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { ResponsiveDisplayText } from '@/components/ui/responsive-display-text';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, spacing, type AppPalette } from '@/constants/theme';
import { updateSettings } from '@/modules/progress/progress.service';
import { useAppTheme } from '@/theme/app-theme-provider';

const tutorialSlides = [
  {
    id: 'value',
    eyebrow: 'Adım 01 — Amaç',
    title: 'Kelimeyi sadece görme, geri çağır.',
    body: 'Lexicon kelimeyi doğru anda tekrar ettirir. Böylece pasif okumak yerine gerçekten hatırlamayı çalışırsın.',
    cards: ['Kısa oturumlar', 'Çevrimdışı çalışma', 'Tek kelime yerine tekrar döngüsü'],
  },
  {
    id: 'card-loop',
    eyebrow: 'Adım 02 — Kart akışı',
    title: 'Önce İngilizceyi gör, sonra anlamı aç.',
    body: 'Kart ilk anda sadece İngilizce kelimeyi gösterir. Dokununca Türkçe anlam açılır, seçtiğin kısa sayaç bitince kart İngilizce tarafa örnek cümleyle geri döner.',
    cards: ['İngilizce kelime', 'Dokun ve Türkçeyi gör', 'Sayaç bitince cümleyle geri dön'],
  },
  {
    id: 'decisions',
    eyebrow: 'Adım 03 — Karar ver',
    title: 'Biliyorsan beklemeden yukarı kaydır.',
    body: 'Anlam açıkken kelimeyi zaten biliyorsan yukarı kaydırarak beklemeyi atlayabilirsin. Kart cümleyle geri geldiğinde sola kaydırırsan tekrar görürsün, sağa kaydırırsan bu oturumda ezberledin sayılır.',
    cards: ['Anlam açıkken yukarı: zaten biliyordum', 'Sola: sonra tekrar', 'Sağa: bu turda ezberledim'],
  },
  {
    id: 'setup',
    eyebrow: 'Adım 04 — Quiz ve tempo',
    title: 'Tur bitince çoktan seçmeli quiz gelir.',
    body: 'Oturum sonunda İngilizce kelimeler için doğru Türkçe anlamı seçersin. Son doğrulama burada yapılır. Her gün ücretsiz 7 yeni kelime açılır; tekrar kartların her zaman ücretsiz devam eder.',
    cards: ['Final kontrol: çoktan seçmeli quiz', 'Doğruysa kelime güçlenir', 'Her gün ücretsiz 7 yeni kelime'],
  },
] as const;

export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView | null>(null);
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  function goToStep(nextStep: number) {
    const bounded = Math.max(0, Math.min(tutorialSlides.length - 1, nextStep));
    setStep(bounded);
    scrollRef.current?.scrollTo({ x: bounded * width, animated: true });
  }

  async function handleBegin() {
    setSaving(true);
    try {
      await updateSettings({
        dailyNewLimit: 7,
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
                    <View style={[styles.optionCard, styles.optionCardActive]}>
                      <View style={styles.optionCopy}>
                        <Text style={[styles.optionNumber, styles.optionNumberActive]}>7</Text>
                        <TechnicalLabel color="rgba(255,255,255,0.74)" style={styles.optionLabel}>
                          Ücretsiz yeni kelime / gün
                        </TechnicalLabel>
                      </View>
                      <View style={[styles.optionCircle, styles.optionCircleActive]}>
                        <View style={styles.optionCircleDot} />
                      </View>
                    </View>

                    <TechnicalLabel color={colors.mutedSoft} style={styles.setupHint}>
                      Yeni kelime kotası günlük olarak 7 kelimeye sabitlendi. Verileri sıfırlarsan bu kısa turu yeniden görebilirsin.
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
