'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  themeMode: 'system',
  setThemeMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setModeState] = useState<ThemeMode>('system');
  const [theme, setTheme] = useState<Theme>('dark');

  const applyTheme = (mode: ThemeMode) => {
    let resolved: Theme = 'dark';
    if (mode === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolved = mode;
    }
    setTheme(resolved);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(resolved);
  };

  useEffect(() => {
    const savedMode = (localStorage.getItem('fmms_theme_mode') || localStorage.getItem('fmms-theme')) as ThemeMode | null;
    const initialMode = savedMode || 'system';
    setModeState(initialMode);
    applyTheme(initialMode);
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setModeState(mode);
    try {
      localStorage.setItem('fmms_theme_mode', mode);
      localStorage.setItem('fmms-theme', mode === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode);
    } catch {}
    applyTheme(mode);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
