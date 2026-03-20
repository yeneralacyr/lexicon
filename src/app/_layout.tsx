import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { lightPalette, spacing, type ThemeMode } from '@/constants/theme';
import { initializeDatabase } from '@/db';
import { getSettings } from '@/modules/progress/progress.service';
import { AppThemeProvider, useAppTheme } from '@/theme/app-theme-provider';

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
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const styles = useMemo(() => createStyles(lightPalette), []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        await SystemUI.setBackgroundColorAsync(lightPalette.background);

        if (!isWeb) {
          await initializeDatabase();
          const settings = await getSettings();

          if (active) {
            setThemeMode(settings.themeMode);
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
  }, [isWeb]);

  useEffect(() => {
    if (!fontsLoaded || !dbReady || error) {
      return;
    }

    SplashScreen.hideAsync().catch(() => undefined);
  }, [dbReady, error, fontsLoaded]);

  if (fontsError || error) {
    return (
      <View style={styles.errorScreen}>
        <StatusBar style="dark" />
        <Text style={styles.errorEyebrow}>BAŞLATMA HATASI</Text>
        <Text style={styles.errorTitle}>Veritabanı kurulumu başarısız.</Text>
        <Text style={styles.errorText}>{error ?? fontsError?.message}</Text>
      </View>
    );
  }

  if (!fontsLoaded || !dbReady) {
    return null;
  }

  if (isWeb) {
    return (
      <View style={styles.errorScreen}>
        <StatusBar style="dark" />
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
        <RootNavigator />
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { colors, isDark, navigationTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

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

function createStyles(colors: typeof lightPalette) {
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
  });
}
