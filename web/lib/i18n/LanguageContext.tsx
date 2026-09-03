'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language, TRANSLATIONS } from './translations';

export interface LanguageContextType {
  language: Language;
  isEn: boolean;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'vi',
  isEn: false,
  setLanguage: () => {},
  t: (key, fallback) => TRANSLATIONS.vi[key] || fallback || key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>('vi');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fmms_language') as Language | null;
      if (saved === 'vi' || saved === 'en') {
        setLangState(saved);
        document.documentElement.lang = saved;
      }
    } catch {}
  }, []);

  const setLanguage = (lang: Language) => {
    setLangState(lang);
    try {
      localStorage.setItem('fmms_language', lang);
      document.documentElement.lang = lang;
    } catch {}
  };

  const t = (key: string, fallback?: string): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.vi;
    return dict[key] || TRANSLATIONS.vi[key] || fallback || key;
  };

  const isEn = language === 'en';

  return (
    <LanguageContext.Provider value={{ language, isEn, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
