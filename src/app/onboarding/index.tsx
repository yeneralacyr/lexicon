import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ActionButton } from '@/components/ui/action-button';
import { DotMatrixBackground } from '@/components/ui/dot-matrix-background';
import { ResponsiveDisplayText } from '@/components/ui/responsive-display-text';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, radii, spacing, type AppPalette } from '@/constants/theme';
import {
  disableDailyReminderNotifications,
  enableDailyReminderNotifications,
} from '@/modules/notifications/reminders.service';
import { updateSettings } from '@/modules/progress/progress.service';
import { useAppTheme } from '@/theme/app-theme-provider';

type TutorialSlide = {
  id: 'value' | 'card-loop' | 'rhythm' | 'reminder';
  eyebrow: string;
  title: string;
  body: string;
  cards: string[];
};

const tutorialSlides: TutorialSlide[] = [
  {
    id: 'value',
    eyebrow: 'Adım 01 — Nasıl Öğretir',
    title: 'Kelimeyi sadece göstermez, geri çağırmanı ister.',
    body: 'Lexicon pasif ezber yerine aktif hatırlamaya odaklanır. Kısa oturumlar, tekrar ritmi ve yerel kayıt yapısı sayesinde öğrenme akışın kopmadan sürer.',
    cards: ['Aktif hatırlama', 'Kısa oturumlar', 'Tamamen yerel akış'],
  },
  {
    id: 'card-loop',
    eyebrow: 'Adım 02 — Kart Döngüsü',
    title: 'İngilizceyi gör, anlamı aç, sonra cümleyle pekiştir.',
    body: 'Kart önce sadece İngilizceyi gösterir. Dokununca Türkçe anlam açılır. Kısa bekleme sonrası örnek cümle gelir ve kararı kaydırarak verirsin.',
    cards: ['Önce İngilizce', 'Sonra Türkçe', 'Ardından örnek cümle'],
  },
  {
    id: 'rhythm',
    eyebrow: 'Adım 03 — Günlük Ritim',
    title: 'Her gün 7 yeni kelime, review akışı hep açık.',
    body: 'Ücretsiz akış günlük 7 yeni kelimeyle dengelenir. Due review ve kitaplıktaki hızlı review turu ücretsiz kalır; böylece tempo sürdürülebilir olur.',
    cards: ['7 yeni / gün', 'Review ücretsiz', 'Kitaplıktan hızlı tur'],
  },
  {
    id: 'reminder',
    eyebrow: 'Adım 04 — Hatırlatma',
    title: 'İstersen her gün 19:00’da tek bir nazik hatırlatma.',
    body: 'Akşam 19:00’da gelen kısa hatırlatma tekrar ritmini korumana yardım eder. Şimdi açabilir ya da daha sonra Ayarlar’dan karar verebilirsin.',
    cards: ['Her gün 19:00', 'Tek akşam sinyali', 'İstersen sonra değiştir'],
  },
];

export default function OnboardingScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  const slide = tutorialSlides[step];
  const isLastStep = step === tutorialSlides.length - 1;

  function goToStep(nextStep: number) {
    const bounded = Math.max(0, Math.min(tutorialSlides.length - 1, nextStep));
    setStep(bounded);
  }

  async function completeOnboarding(notificationsEnabled: boolean) {
    await updateSettings({
      notificationsEnabled,
      onboardingCompleted: true,
    });
    router.replace('/today');
  }

  async function handleEnableNotifications() {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      const result = await enableDailyReminderNotifications();

      if (!result.scheduled) {
        Alert.alert(
          'Bildirimler şimdilik kapalı',
          'İzin verilmediği için akşam hatırlatması açılmadı. Dilersen daha sonra Ayarlar’dan açabilirsin.',
          [
            {
              text: 'Devam et',
              onPress: () => {
                void completeOnboarding(false);
              },
            },
          ]
        );
        return;
      }

      await completeOnboarding(true);
    } catch (error) {
      Alert.alert(
        'Kurulum tamamlanamadı',
        error instanceof Error ? error.message : 'Bildirim izni işlenirken bir sorun oluştu.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSkipNotifications() {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      await disableDailyReminderNotifications();
      await completeOnboarding(false);
    } catch (error) {
      Alert.alert(
        'Kurulum tamamlanamadı',
        error instanceof Error ? error.message : 'İlk kurulum tamamlanırken bir sorun oluştu.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <DotMatrixBackground opacity={0.12} />

        <View style={styles.header}>
          <TechnicalLabel style={styles.brand}>LEXICON</TechnicalLabel>
          <View style={styles.progressRow}>
            {tutorialSlides.map((entry, index) => (
              <View key={entry.id} style={index === step ? styles.progressActive : styles.progressInactive} />
            ))}
          </View>
        </View>

        <Animated.View entering={FadeInDown.duration(360)} key={slide.id} style={styles.stage}>
          <Animated.View entering={FadeInDown.delay(40).duration(360)} style={styles.pageCopy}>
            <TechnicalLabel style={styles.stepLabel}>{slide.eyebrow}</TechnicalLabel>
            <ResponsiveDisplayText numberOfLines={3} style={styles.title} variant="hero">
              {slide.title}
            </ResponsiveDisplayText>
            <Text style={styles.subtitle}>{slide.body}</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(110).duration(420)} style={styles.visualShell}>
            <SlidePreview cards={slide.cards} slideId={slide.id} />
          </Animated.View>
        </Animated.View>

        <View style={styles.footer}>
          {!isLastStep ? (
            <>
              <ActionButton
                disabled={saving}
                label="İleri"
                onPress={() => {
                  goToStep(step + 1);
                }}
              />
              <Pressable
                onPress={() => goToStep(tutorialSlides.length - 1)}
                style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}>
                <Text style={styles.skipText}>Hatırlatma adımına geç</Text>
              </Pressable>
            </>
          ) : (
            <>
              <ActionButton
                disabled={saving}
                label={saving ? 'Hazırlanıyor...' : 'Bildirimleri Aç'}
                onPress={() => {
                  void handleEnableNotifications();
                }}
              />
              <ActionButton
                disabled={saving}
                label="Şimdilik Geç"
                onPress={() => {
                  void handleSkipNotifications();
                }}
                variant="secondary"
              />
              <Pressable
                disabled={saving}
                onPress={() => goToStep(step - 1)}
                style={({ pressed }) => [styles.skipButton, pressed && styles.pressed, saving && styles.pressed]}>
                <Text style={styles.skipText}>Önceki adım</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function SlidePreview({ cards, slideId }: { cards: string[]; slideId: TutorialSlide['id'] }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (slideId === 'reminder') {
    return <ReminderPreview cards={cards} />;
  }

  return (
    <View style={styles.cardCluster}>
      {cards.map((card, index) => (
        <FloatingFeatureCard
          key={card}
          index={index}
          label={card}
          mode={index === 0 ? 'primary' : 'neutral'}
          size={slideId === 'card-loop' ? 'medium' : 'default'}
        />
      ))}
    </View>
  );
}

function FloatingFeatureCard({
  index,
  label,
  mode,
  size = 'default',
}: {
  index: number;
  label: string;
  mode: 'primary' | 'neutral';
  size?: 'default' | 'medium';
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 2100 + index * 140, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 2100 + index * 140, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    return () => {
      cancelAnimation(drift);
    };
  }, [drift, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: drift.value * (5 + index * 1.25) },
      { translateX: drift.value * (index % 2 === 0 ? 2 : -2) },
    ],
  }));

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 90).duration(360)}
      style={[
        styles.featureCard,
        mode === 'primary' ? styles.featureCardPrimary : styles.featureCardNeutral,
        size === 'medium' && styles.featureCardMedium,
        animatedStyle,
      ]}>
      <TechnicalLabel color={mode === 'primary' ? 'rgba(0,0,0,0.52)' : colors.muted}>
        {String(index + 1).padStart(2, '0')}
      </TechnicalLabel>
      <Text style={[styles.featureCardText, mode === 'primary' && styles.featureCardTextPrimary]}>{label}</Text>
    </Animated.View>
  );
}

function ReminderPreview({ cards }: { cards: string[] }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(pulse);
    };
  }, [pulse]);

  const haloAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 0.16 + pulse.value * 0.2,
    transform: [{ scale: 1 + pulse.value * 0.22 }],
  }));

  const bellAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -pulse.value * 2 }],
  }));

  return (
    <View style={styles.reminderStage}>
      <Animated.View pointerEvents="none" style={[styles.reminderHalo, haloAnimatedStyle]} />

      <Animated.View entering={FadeInUp.delay(80).duration(380)} style={[styles.reminderCard, bellAnimatedStyle]}>
        <View style={styles.reminderTopRow}>
          <View style={styles.reminderIconWrap}>
            <MaterialIcons color={colors.surfaceContainerLowest} name="notifications-active" size={22} />
          </View>
          <TechnicalLabel color="rgba(255,255,255,0.72)">GÜNLÜK HATIRLATMA</TechnicalLabel>
        </View>

        <Text style={styles.reminderHour}>19:00</Text>
        <Text style={styles.reminderBody}>
          Kısa bir sinyal. Tekrar ritmini kaybetmeden akşam turuna dön.
        </Text>
      </Animated.View>

      <View style={styles.reminderHints}>
        {cards.map((card, index) => (
          <FloatingFeatureCard
            key={card}
            index={index}
            label={card}
            mode={index === 0 ? 'primary' : 'neutral'}
            size="medium"
          />
        ))}
      </View>
    </View>
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
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
      justifyContent: 'space-between',
      gap: spacing.xl,
    },
    header: {
      gap: spacing.lg,
    },
    brand: {
      letterSpacing: 2.2,
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
    stage: {
      flex: 1,
      justifyContent: 'space-between',
      gap: spacing.xxl,
    },
    pageCopy: {
      gap: spacing.lg,
      paddingTop: spacing.md,
    },
    stepLabel: {
      marginBottom: spacing.xs,
    },
    title: {
      textAlign: 'left',
      alignSelf: 'flex-start',
      maxWidth: 350,
    },
    subtitle: {
      maxWidth: 360,
      fontFamily: fontFamilies.bodyRegular,
      fontSize: 18,
      lineHeight: 29,
      color: colors.muted,
    },
    visualShell: {
      flex: 1,
      justifyContent: 'center',
    },
    cardCluster: {
      gap: spacing.md,
      justifyContent: 'center',
    },
    featureCard: {
      minHeight: 96,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    featureCardNeutral: {
      backgroundColor: colors.surfaceContainerLowest,
    },
    featureCardPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    featureCardMedium: {
      minHeight: 84,
    },
    featureCardText: {
      fontFamily: fontFamilies.displayMedium,
      fontSize: 24,
      lineHeight: 28,
      color: colors.primary,
    },
    featureCardTextPrimary: {
      color: colors.surfaceContainerLowest,
    },
    reminderStage: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
      paddingVertical: spacing.sm,
    },
    reminderHalo: {
      position: 'absolute',
      width: 250,
      height: 250,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    reminderCard: {
      width: '100%',
      maxWidth: 360,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
      gap: spacing.md,
      backgroundColor: colors.primary,
      borderRadius: radii.lg,
    },
    reminderTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    reminderIconWrap: {
      width: 46,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.pill,
      backgroundColor: 'rgba(0,0,0,0.18)',
    },
    reminderHour: {
      fontFamily: fontFamilies.displayBold,
      fontSize: 56,
      lineHeight: 56,
      letterSpacing: -2.8,
      color: colors.surfaceContainerLowest,
    },
    reminderBody: {
      fontFamily: fontFamilies.bodyRegular,
      fontSize: 16,
      lineHeight: 24,
      color: 'rgba(255,255,255,0.82)',
      maxWidth: 260,
    },
    reminderHints: {
      width: '100%',
      gap: spacing.sm,
    },
    footer: {
      gap: spacing.sm,
    },
    skipButton: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skipText: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 2.1,
      textTransform: 'uppercase',
      color: colors.muted,
    },
    pressed: {
      opacity: 0.6,
    },
  });
}
