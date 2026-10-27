import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { dark, light, type Palette } from './tokens';

export type ThemePref = 'system' | 'light' | 'dark';

type ThemeValue = {
  c: Palette;
  isDark: boolean;
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('system');
  useEffect(() => {
    AsyncStorage.getItem('platewise:theme')
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPrefState(v);
      })
      .catch(() => undefined);
  }, []);
  const setPref = (p: ThemePref) => {
    setPrefState(p);
    AsyncStorage.setItem('platewise:theme', p).catch(() => undefined);
  };
  const isDark = pref === 'dark' || (pref === 'system' && system === 'dark');

  const value = useMemo<ThemeValue>(
    () => ({ c: isDark ? dark : light, isDark, pref, setPref }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDark, pref],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const v = useContext(ThemeContext);
  if (!v) throw new Error('useTheme must be used inside ThemeProvider');
  return v;
}
