import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';

import { AdsProvider } from '@/ads/provider';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { darkPalette, spacing, type ThemeMode } from '@/constants/theme';
import { initializeDatabase, resetDatabaseInitialization } from '@/db';
import { setupNotificationHandler, syncDailyReminderNotifications } from '@/modules/notifications/reminders.service';
import { getSettings, updateSettings } from '@/modules/progress/progress.service';
import { AppThemeProvider, useAppTheme } from '@/theme/app-theme-provider';
import type { StudySettings } from '@/types/db';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const isWeb = Platform.OS === 'web';
  const [fontsLoaded, fontsError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'SpaceGrotesk-Regular': SpaceGrotesk_400Regular,
    'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
  });
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [bootSettings, setBootSettings] = useState<StudySettings | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const styles = useMemo(() => createStyles(darkPalette), []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        await SystemUI.setBackgroundColorAsync(darkPalette.background);

        if (!isWeb) {
          await initializeDatabase();
          setupNotificationHandler();
          const settings = await getSettings().catch(() => null);

          if (active && settings) {
            setThemeMode(settings.themeMode);
            setBootSettings(settings);
          }
        }

        if (active) {
          setDbReady(true);
        }
      } catch (error) {
        if (active) {
          setError(error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu');
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [bootstrapAttempt, isWeb]);

  useEffect(() => {
    if (isWeb || !dbReady || error || !bootSettings) {
      return;
    }

    let active = true;

    async function syncNotifications(currentSettings: StudySettings) {
      try {
        const result = await syncDailyReminderNotifications({
          enabled: currentSettings.notificationsEnabled,
        });

        if (
          active &&
          currentSettings.notificationsEnabled &&
          !result.scheduled &&
          result.permissionStatus !== 'granted' &&
          result.permissionStatus !== 'unsupported'
        ) {
          const nextSettings = await updateSettings({ notificationsEnabled: false });
          setBootSettings(nextSettings);
        }
      } catch (syncError) {
        console.warn(
          'Notification sync failed after bootstrap:',
          syncError instanceof Error ? syncError.message : syncError
        );
      }
    }

    void syncNotifications(bootSettings);

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void getSettings()
          .then((settings) => {
            setBootSettings(settings);
            return syncNotifications(settings);
          })
          .catch(() => undefined);
      }
    });

    return () => {
      active = false;
      appStateSubscription.remove();
    };
  }, [bootSettings, dbReady, error, isWeb]);

  useEffect(() => {
    if (!fontsLoaded || !dbReady || error) {
      return;
    }

    SplashScreen.hideAsync().catch(() => undefined);
  }, [dbReady, error, fontsLoaded]);

  const handleRetry = useCallback(() => {
    resetDatabaseInitialization();
    setDbReady(false);
    setError(null);
    setBootSettings(null);
    setBootstrapAttempt((current) => current + 1);
  }, []);

  if (fontsError || error) {
    return (
      <View style={styles.errorScreen}>
        <StatusBar style="light" />
        <Text style={styles.errorEyebrow}>BAŞLATMA HATASI</Text>
        <Text style={styles.errorTitle}>Veritabanı kurulumu başarısız.</Text>
        <Text style={styles.errorText}>{error ?? fontsError?.message}</Text>
        {!fontsError ? (
          <Pressable onPress={handleRetry} style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}>
            <Text style={styles.retryButtonText}>Tekrar dene</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (!fontsLoaded || !dbReady) {
    return null;
  }

  if (isWeb) {
    return (
      <View style={styles.errorScreen}>
        <StatusBar style="light" />
        <Text style={styles.errorEyebrow}>SADECE YEREL DERLEME</Text>
        <Text style={styles.errorTitle}>Kalıcı depolama iOS veya Android gerektirir.</Text>
        <Text style={styles.errorText}>
          Lexicon yerel SQLite, yerel dışa aktarımlar ve paylaşım akışları kullanır. Üretime uygunluk için web önizlemesi bilerek devre dışı bırakılmıştır.
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <AppThemeProvider initialThemeMode={themeMode}>
        <AdsProvider>
          <ErrorBoundary>
            <RootNavigator />
          </ErrorBoundary>
        </AdsProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { colors, isDark, navigationTheme } = useAppTheme();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    function redirectFromNotification(notification: Notifications.Notification) {
      const url = notification.request.content.data?.url;

      if (url === '/today') {
        router.push('/today');
      }
    }

    const response = Notifications.getLastNotificationResponse();

    if (response?.notification) {
      redirectFromNotification(response.notification);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((responseValue) => {
      redirectFromNotification(responseValue.notification);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="session/[sessionId]" />
        <Stack.Screen name="session/quiz/[sessionId]" />
        <Stack.Screen name="session/complete" />
        <Stack.Screen name="word/[wordId]" />
      </Stack>
    </ThemeProvider>
  );
}

function createStyles(colors: typeof darkPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    errorScreen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.xl,
      justifyContent: 'center',
      gap: spacing.md,
    },
    errorEyebrow: {
      color: colors.muted,
      letterSpacing: 1.6,
      fontSize: 12,
    },
    errorTitle: {
      color: colors.ink,
      fontSize: 28,
      fontWeight: '700',
    },
    errorText: {
      color: colors.muted,
      fontSize: 16,
      lineHeight: 24,
    },
    retryButton: {
      alignSelf: 'flex-start',
      marginTop: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      backgroundColor: colors.surface,
    },
    retryButtonPressed: {
      opacity: 0.78,
    },
    retryButtonText: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
