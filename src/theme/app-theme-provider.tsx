import { useColorScheme } from 'react-native';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { createNavigationTheme, getPalette, type AppPalette, type ResolvedThemeMode, type ThemeMode } from '@/constants/theme';
import { updateSettings } from '@/modules/progress/progress.service';

type AppThemeContextValue = {
  colors: AppPalette;
  isDark: boolean;
  navigationTheme: ReturnType<typeof createNavigationTheme>;
  resolvedMode: ResolvedThemeMode;
  themeMode: ThemeMode;
  setThemeModePreference: (mode: ThemeMode) => Promise<void>;
  syncThemeMode: (mode: ThemeMode) => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

type AppThemeProviderProps = {
  children: React.ReactNode;
  initialThemeMode: ThemeMode;
};

export function AppThemeProvider({ children, initialThemeMode }: AppThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialThemeMode);

  useEffect(() => {
    setThemeMode(initialThemeMode);
  }, [initialThemeMode]);

  const resolvedMode: ResolvedThemeMode =
    themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode;
  const colors = useMemo(() => getPalette(resolvedMode), [resolvedMode]);
  const navigationTheme = useMemo(() => createNavigationTheme(colors, resolvedMode), [colors, resolvedMode]);

  const setThemeModePreference = useCallback(async (mode: ThemeMode) => {
    await updateSettings({ themeMode: mode });
    setThemeMode(mode);
  }, []);

  const syncThemeMode = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
  }, []);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      colors,
      isDark: resolvedMode === 'dark',
      navigationTheme,
      resolvedMode,
      setThemeModePreference,
      syncThemeMode,
      themeMode,
    }),
    [colors, navigationTheme, resolvedMode, setThemeModePreference, syncThemeMode, themeMode]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider.');
  }

  return context;
}
