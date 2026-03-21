import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { File, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useAds } from '@/ads/provider';
import { FullscreenScrollScene } from '@/components/layout/fullscreen-scroll-scene';
import { ActionButton } from '@/components/ui/action-button';
import { ResponsiveDisplayText } from '@/components/ui/responsive-display-text';
import { TechnicalLabel } from '@/components/ui/technical-label';
import { fontFamilies, spacing, type AppPalette, type ThemeMode } from '@/constants/theme';
import {
  exportProgressSnapshot,
  getAppOverview,
  getSettings,
  resetUserData,
  updateSettings,
} from '@/modules/progress/progress.service';
import { useSessionStore } from '@/store/sessionStore';
import { useAppTheme } from '@/theme/app-theme-provider';
import type { AppOverview, StudySettings } from '@/types/db';
import { formatShortDate } from '@/utils/dates';

const newWordOptions = [5, 10, 15];
const revealSecondOptions = [3, 5, 7];
const themeModeOptions: { label: string; value: ThemeMode }[] = [
  { label: 'Otomatik', value: 'system' },
  { label: 'Açık', value: 'light' },
  { label: 'Koyu', value: 'dark' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const setActiveSessionId = useSessionStore((state) => state.setActiveSessionId);
  const { openPrivacyOptions, privacyStatus } = useAds();
  const { colors, setThemeModePreference, syncThemeMode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [settings, setSettings] = useState<StudySettings | null>(null);
  const [overview, setOverview] = useState<AppOverview | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isOpeningPrivacyOptions, setIsOpeningPrivacyOptions] = useState(false);

  const refresh = useCallback(async () => {
    const [nextSettings, nextOverview] = await Promise.all([getSettings(), getAppOverview()]);
    setSettings(nextSettings);
    setOverview(nextOverview);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  async function patchSettings(updates: Partial<StudySettings>) {
    const next = await updateSettings(updates);
    setSettings(next);
  }

  async function handleThemeModeChange(mode: ThemeMode) {
    await setThemeModePreference(mode);
    setSettings((current) => (current ? { ...current, themeMode: mode } : current));
  }

  async function handleExport() {
    if (isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const payload = await exportProgressSnapshot();
      const file = new File(
        Paths.cache,
        `lexicon-progress-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      );

      if (file.exists) {
        file.delete();
      }

      file.create({ intermediates: true, overwrite: true });
      file.write(JSON.stringify(payload, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Lexicon verilerini dışa aktar',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('Dışa aktarma tamamlandı', `Veri yedeği şuraya kaydedildi:\n${file.uri}`);
      }
    } catch (error) {
      Alert.alert('Dışa aktarma başarısız', error instanceof Error ? error.message : 'Veriler dışa aktarılamadı.');
    } finally {
      setIsExporting(false);
    }
  }

  async function handleOpenPrivacyOptions() {
    if (isOpeningPrivacyOptions) {
      return;
    }

    setIsOpeningPrivacyOptions(true);

    try {
      const opened = await openPrivacyOptions();

      if (!opened) {
        Alert.alert(
          'Gizlilik seçenekleri şu an kullanılamıyor',
          'Bu seçenek yalnızca AdMob modülüyle yeniden build alınmış yerel native sürümde ve gerekli olduğunda açılır.'
        );
      }
    } catch (error) {
      Alert.alert(
        'Gizlilik seçenekleri açılamadı',
        error instanceof Error ? error.message : 'Reklam gizliliği ekranı açılamadı.'
      );
    } finally {
      setIsOpeningPrivacyOptions(false);
    }
  }

  function handleResetPrompt() {
    if (isResetting) {
      return;
    }

    Alert.alert(
      'Çalışma verileri sıfırlansın mı?',
      'Bu işlem oturumları, ilerlemeyi, günlük istatistikleri ve ilk kurulum seçimlerini temizler. Cihazdaki kelimeler silinmez.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: () => {
            void handleReset();
          },
        },
      ]
    );
  }

  async function handleReset() {
    setIsResetting(true);

    try {
      await resetUserData();
      syncThemeMode('dark');
      setActiveSessionId(null);
      await refresh();
      router.replace('/onboarding');
    } catch (error) {
      Alert.alert('Sıfırlama başarısız', error instanceof Error ? error.message : 'Çalışma verileri sıfırlanamadı.');
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <FullscreenScrollScene
      dotOpacity={0.04}
      topSlot={
        <View style={styles.hero}>
          <TechnicalLabel style={styles.heroLabel}>Sistem Yapılandırması</TechnicalLabel>
          <ResponsiveDisplayText style={styles.heroTitle} variant="hero">
            Ayarlar
          </ResponsiveDisplayText>
          <Text style={styles.heroSubtitle}>
            Hedeflerini, görünümü ve tekrar ritmini düzenleyerek öğrenme akışını kendine göre ayarla.
          </Text>
        </View>
      }
      withTabInset>
      <View style={styles.grid}>
        <View style={styles.primaryColumn}>
          <View style={styles.block}>
            <TechnicalLabel style={styles.blockLabel}>Günlük tempo</TechnicalLabel>
            <Text style={styles.blockTitle}>Yeni kelime hedefi</Text>
            <View style={styles.segmentRow}>
              {newWordOptions.map((option) => {
                const active = settings?.dailyNewLimit === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      void patchSettings({ dailyNewLimit: option });
                    }}
                    style={[styles.segment, active && styles.segmentActive]}>
                    <Text
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      numberOfLines={1}
                      style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {String(option).padStart(2, '0')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.block}>
            <TechnicalLabel style={styles.blockLabel}>Günlük tekrar</TechnicalLabel>
            <Text style={styles.blockTitle}>Tekrar limiti</Text>
            <View style={styles.capacityCard}>
              <View style={styles.capacityCopy}>
                <Text style={styles.capacityLabel}>Aktif kapasite</Text>
                <Text style={styles.capacityHint}>
                  Gün içinde aynı anda kaç kartın review kuyruğuna gireceğini belirler.
                </Text>
              </View>
              <View style={styles.capacityRight}>
                <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.capacityValue}>
                  {settings?.dailyReviewLimit ?? 0}
                </Text>
                <View style={styles.capacityButtons}>
                  <Pressable
                    onPress={() => {
                      void patchSettings({
                        dailyReviewLimit: Math.min(100, (settings?.dailyReviewLimit ?? 20) + 5),
                      });
                    }}
                    style={styles.iconAction}>
                    <MaterialIcons color={colors.primary} name="add" size={18} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void patchSettings({
                        dailyReviewLimit: Math.max(5, (settings?.dailyReviewLimit ?? 20) - 5),
                      });
                    }}
                    style={styles.iconAction}>
                    <MaterialIcons color={colors.primary} name="remove" size={18} />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.block}>
            <TechnicalLabel style={styles.blockLabel}>Kart ritmi</TechnicalLabel>
            <Text style={styles.blockTitle}>Anlam bekleme süresi</Text>
            <Text style={styles.capacityHint}>
              Türkçe anlam açıldıktan sonra örnek cümlenin ne kadar bekleyip görüneceğini seç. Biliyorsan bekleme sırasında yukarı kaydırarak kartı erken bitirebilirsin.
            </Text>
            <View style={styles.segmentRow}>
              {revealSecondOptions.map((option) => {
                const active = settings?.meaningRevealSeconds === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      void patchSettings({ meaningRevealSeconds: option });
                    }}
                    style={[styles.segment, active && styles.segmentActive]}>
                    <Text
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      numberOfLines={1}
                      style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {`${option} sn`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.sideColumn}>
          <View style={styles.sideCard}>
            <View style={styles.preferenceBlock}>
              <View style={styles.preferenceHeader}>
                <Text style={styles.preferenceTitle}>Tema modu</Text>
                <TechnicalLabel color={colors.muted}>Sistem tercihini izle veya override et</TechnicalLabel>
              </View>
              <View style={styles.themeSegmentRow}>
                {themeModeOptions.map((option) => {
                  const active = settings?.themeMode === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        void handleThemeModeChange(option.value);
                      }}
                      style={[styles.themeSegment, active && styles.themeSegmentActive]}>
                      <Text
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                        numberOfLines={1}
                        style={[styles.themeSegmentText, active && styles.themeSegmentTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceHeader}>
                <Text style={styles.preferenceTitle}>Bildirimler</Text>
                <TechnicalLabel color={colors.muted}>Günlük hatırlatma sinyalleri</TechnicalLabel>
              </View>
              <Switch
                onValueChange={(value) => {
                  void patchSettings({ notificationsEnabled: value });
                }}
                thumbColor={colors.surfaceContainerLowest}
                trackColor={{ false: colors.border, true: colors.primary }}
                value={settings?.notificationsEnabled ?? false}
              />
            </View>
          </View>

          <View style={styles.sideCard}>
            <View style={styles.preferenceBlock}>
              <View style={styles.preferenceHeader}>
                <Text style={styles.preferenceTitle}>Reklam gizliliği</Text>
                <TechnicalLabel color={colors.muted}>Consent ve privacy seçenekleri</TechnicalLabel>
              </View>

              <View style={styles.privacyStatusCard}>
                <View style={styles.privacyStatusCopy}>
                  <Text style={styles.capacityLabel}>
                    {privacyStatus.isAvailable
                      ? privacyStatus.canRequestAds
                        ? privacyStatus.requestNonPersonalizedAdsOnly
                          ? 'Kişiselleştirilmemiş reklam modu'
                          : 'Reklam isteği hazır'
                        : privacyStatus.consentStatus === 'required'
                          ? 'İzin bekleniyor'
                          : 'Reklamlar devre dışı'
                      : 'Native build gerekli'}
                  </Text>
                  <Text style={styles.capacityHint}>
                    {privacyStatus.isAvailable
                      ? privacyStatus.privacyOptionsRequired
                        ? 'Gizlilik seçeneklerini tekrar açarak reklam tercihini gözden geçirebilirsin.'
                        : privacyStatus.canRequestAds
                          ? 'AdMob yalnızca doğal geçiş anlarında çalışır; çalışma ekranları reklam göstermez.'
                          : 'Consent alınmadan reklam talebi yapılmaz. Öğrenme akışı normal şekilde devam eder.'
                      : 'Expo Go, web veya AdMob modülü eklenmeden alınmış eski native build üzerinde reklam katmanı devreye girmez.'}
                  </Text>
                </View>
                <Text style={styles.inlineValue}>
                  {privacyStatus.isInitialized ? 'Hazır' : privacyStatus.isAvailable ? 'Bekliyor' : 'Kapalı'}
                </Text>
              </View>

              <ActionButton
                disabled={
                  isOpeningPrivacyOptions ||
                  !privacyStatus.isAvailable ||
                  !privacyStatus.privacyOptionsRequired
                }
                label={isOpeningPrivacyOptions ? 'Açılıyor...' : 'Gizlilik seçeneklerini aç'}
                onPress={() => {
                  void handleOpenPrivacyOptions();
                }}
                variant="secondary"
              />

              {privacyStatus.lastError ? (
                <TechnicalLabel color={colors.error} style={styles.privacyError}>
                  {privacyStatus.lastError}
                </TechnicalLabel>
              ) : null}
            </View>
          </View>

          <View style={styles.sideCard}>
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceHeader}>
                <Text style={styles.preferenceTitle}>Depolama</Text>
                <TechnicalLabel color={colors.muted}>Kalıcılık katmanı</TechnicalLabel>
              </View>
              <Text style={styles.inlineValue}>Yerel SQLite</Text>
            </View>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceHeader}>
                <Text style={styles.preferenceTitle}>Seed durumu</Text>
                <TechnicalLabel color={colors.muted}>Kelime arşivi yükleme tarihi</TechnicalLabel>
              </View>
              <Text style={styles.inlineValue}>
                {overview?.seededAt ? formatShortDate(overview.seededAt) : 'Yüklenmedi'}
              </Text>
            </View>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceHeader}>
                <Text style={styles.preferenceTitle}>Aktif oturum</Text>
                <TechnicalLabel color={colors.muted}>Devam edilebilir durum</TechnicalLabel>
              </View>
              <Text style={styles.inlineValue}>{overview?.activeSessionId ? 'Hazır' : 'Yok'}</Text>
            </View>
          </View>

          <View style={styles.actionStack}>
            <ActionButton
              disabled={isExporting || isResetting}
              label={isExporting ? 'Dışa aktarılıyor...' : 'Verileri dışa aktar'}
              onPress={() => {
                void handleExport();
              }}
              variant="secondary"
            />
            <ActionButton
              disabled={isResetting || isExporting}
              label={isResetting ? 'Sıfırlanıyor...' : 'Verileri sıfırla'}
              onPress={handleResetPrompt}
              style={styles.dangerButton}
              variant="secondary"
            />
          </View>
        </View>
      </View>

      <View style={styles.footerStats}>
        <FooterStat label="Veritabanı sürümü" value={`v${overview?.dbVersion ?? '0'}`} />
        <FooterStat label="Yükleme sürümü" value={`v${overview?.seedVersion ?? '0'}`} />
        <FooterStat label="Kelime arşivi" value={String(overview?.wordCount ?? 0)} />
        <FooterStat align="right" label="Aktif mod" value={settings?.themeMode?.toUpperCase() ?? 'DARK'} />
      </View>
    </FullscreenScrollScene>
  );
}

function FooterStat({
  align = 'left',
  label,
  value,
}: {
  label: string;
  value: string;
  align?: 'left' | 'right';
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={align === 'right' ? styles.footerStatRight : styles.footerStat}>
      <TechnicalLabel color={colors.muted}>{label}</TechnicalLabel>
      <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={styles.footerValue}>
        {value}
      </Text>
    </View>
  );
}

function createStyles(colors: AppPalette) {
  return StyleSheet.create({
    hero: {
      marginBottom: spacing.xxxl,
      gap: spacing.md,
    },
    heroLabel: {
      textAlign: 'left',
    },
    heroTitle: {
      textAlign: 'left',
      alignSelf: 'flex-start',
      maxWidth: 320,
    },
    heroSubtitle: {
      maxWidth: 420,
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 15,
      lineHeight: 24,
      color: colors.muted,
    },
    grid: {
      gap: spacing.xl,
    },
    primaryColumn: {
      gap: spacing.xxxl,
    },
    block: {
      gap: spacing.lg,
    },
    blockLabel: {
      marginBottom: spacing.xxs,
    },
    blockTitle: {
      fontFamily: fontFamilies.displayBold,
      fontSize: 28,
      lineHeight: 32,
      color: colors.primary,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    segmentRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    segment: {
      flex: 1,
      minHeight: 54,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceContainer,
      minWidth: 0,
    },
    segmentActive: {
      backgroundColor: colors.primary,
    },
    segmentText: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 16,
      color: colors.primary,
      textAlign: 'center',
      paddingHorizontal: spacing.xs,
    },
    segmentTextActive: {
      color: colors.surfaceContainerLowest,
    },
    capacityCard: {
      minHeight: 118,
      backgroundColor: colors.surfaceContainerLow,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
    },
    capacityCopy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    capacityLabel: {
      fontFamily: fontFamilies.bodyMedium,
      fontSize: 14,
      color: colors.ink,
      textTransform: 'uppercase',
    },
    capacityHint: {
      fontFamily: fontFamilies.bodyRegular,
      fontSize: 14,
      lineHeight: 20,
      color: colors.muted,
    },
    capacityRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    capacityValue: {
      fontFamily: fontFamilies.displayBold,
      fontSize: 42,
      color: colors.primary,
      minWidth: 48,
      textAlign: 'right',
    },
    capacityButtons: {
      gap: spacing.sm,
    },
    iconAction: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      backgroundColor: colors.surfaceContainerLowest,
    },
    sideColumn: {
      gap: spacing.xl,
    },
    sideCard: {
      padding: spacing.lg,
      backgroundColor: colors.surfaceContainer,
      borderLeftWidth: 2,
      borderLeftColor: colors.primary,
      gap: spacing.xl,
    },
    preferenceBlock: {
      gap: spacing.md,
    },
    privacyStatusCard: {
      minHeight: 96,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    privacyStatusCopy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    preferenceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
    },
    preferenceHeader: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xxs,
    },
    preferenceTitle: {
      fontFamily: fontFamilies.displayBold,
      fontSize: 16,
      lineHeight: 20,
      color: colors.primary,
      textTransform: 'uppercase',
    },
    inlineValue: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: colors.primary,
      flexShrink: 1,
      textAlign: 'right',
    },
    themeSegmentRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    themeSegment: {
      flex: 1,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 0,
    },
    themeSegmentActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    themeSegmentText: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: colors.primary,
      paddingHorizontal: spacing.xs,
      textAlign: 'center',
    },
    themeSegmentTextActive: {
      color: colors.surfaceContainerLowest,
    },
    actionStack: {
      gap: spacing.md,
    },
    privacyError: {
      marginTop: spacing.xs,
    },
    dangerButton: {
      backgroundColor: colors.errorContainer,
      borderColor: colors.error,
    },
    footerStats: {
      marginTop: spacing.xxxxl,
      paddingTop: spacing.xxl,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xl,
    },
    footerStat: {
      minWidth: 132,
      gap: spacing.xs,
      flexGrow: 1,
    },
    footerStatRight: {
      minWidth: 132,
      gap: spacing.xs,
      flexGrow: 1,
      alignItems: 'flex-end',
    },
    footerValue: {
      fontFamily: fontFamilies.bodyBold,
      fontSize: 12,
      lineHeight: 16,
      color: colors.primary,
    },
  });
}
