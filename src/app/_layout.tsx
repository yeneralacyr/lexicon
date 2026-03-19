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
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appTheme, palette, spacing } from '@/constants/theme';
import { initializeDatabase } from '@/db';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
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

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        await SystemUI.setBackgroundColorAsync(palette.background);
        await initializeDatabase();

        if (active) {
          setDbReady(true);
        }
      } catch (error) {
        if (active) {
          setError(error instanceof Error ? error.message : 'Unexpected bootstrap error');
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

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
        <Text style={styles.errorEyebrow}>BOOTSTRAP ERROR</Text>
        <Text style={styles.errorTitle}>Database setup failed.</Text>
        <Text style={styles.errorText}>{error ?? fontsError?.message}</Text>
      </View>
    );
  }

  if (!fontsLoaded || !dbReady) {
    return null;
  }

  return (
    <ThemeProvider value={appTheme}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="session/[sessionId]" />
        <Stack.Screen name="session/complete" />
        <Stack.Screen name="word/[wordId]" />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    backgroundColor: palette.background,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    gap: spacing.md,
  },
  errorEyebrow: {
    color: palette.muted,
    letterSpacing: 1.6,
    fontSize: 12,
  },
  errorTitle: {
    color: palette.ink,
    fontSize: 28,
    fontWeight: '700',
  },
  errorText: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 24,
  },
});
