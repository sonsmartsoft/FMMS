'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language, TRANSLATIONS } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof TRANSLATIONS['vi']) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'vi',
  setLanguage: () => {},
  t: (key) => TRANSLATIONS.vi[key] || key,
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

  const t = (key: keyof typeof TRANSLATIONS['vi']): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.vi;
    return (dict as any)[key] || TRANSLATIONS.vi[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
