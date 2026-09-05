import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { darkTheme, lightTheme, Theme } from './colors';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themePreference: ThemePreference;
  resolvedThemeMode: ResolvedThemeMode;
  colors: Theme;
  isDark: boolean;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = 'nexus_mobile_theme_preference';

const ThemeContext = createContext<ThemeContextType>({
  themePreference: 'system',
  resolvedThemeMode: 'dark',
  colors: darkTheme,
  isDark: true,
  setThemePreference: async () => {},
  toggleTheme: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let stored: string | null = null;
        if (Platform.OS === 'web') {
          stored = typeof localStorage !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null;
        } else {
          stored = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        }
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
          setThemePreferenceState(stored as ThemePreference);
        }
      } catch (err) {
        console.warn('[ThemeProvider] Failed to read stored theme:', err);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const resolvedThemeMode: ResolvedThemeMode =
    themePreference === 'system'
      ? systemColorScheme === 'light'
        ? 'light'
        : 'dark'
      : themePreference;

  const colors = resolvedThemeMode === 'light' ? lightTheme : darkTheme;
  const isDark = resolvedThemeMode === 'dark';

  const setThemePreference = async (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(THEME_STORAGE_KEY, pref);
        }
      } else {
        await SecureStore.setItemAsync(THEME_STORAGE_KEY, pref);
      }
    } catch (err) {
      console.warn('[ThemeProvider] Failed to store theme:', err);
    }
  };

  const toggleTheme = async () => {
    const next: ThemePreference = resolvedThemeMode === 'dark' ? 'light' : 'dark';
    await setThemePreference(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        themePreference,
        resolvedThemeMode,
        colors,
        isDark,
        setThemePreference,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
