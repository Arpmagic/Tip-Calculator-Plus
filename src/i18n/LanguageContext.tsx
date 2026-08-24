import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppLanguage } from '../types';
import { TRANSLATIONS, Translations } from './translations';

export interface LanguageOption {
  code: AppLanguage;
  label: string;
  flag: string;
}

export const AVAILABLE_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'uk', label: 'Українська', flag: '🇺🇦' },
  { code: 'ru', label: 'Русский', flag: '🌐' },
];

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: Translations;
  availableLanguages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always default to English on first launch if not explicitly set
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem('tip_calc_language');
    if (saved === 'en' || saved === 'uk' || saved === 'ru') {
      return saved;
    }
    return 'en';
  });

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('tip_calc_language', lang);
  };

  useEffect(() => {
    localStorage.setItem('tip_calc_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const value: LanguageContextValue = {
    language,
    setLanguage,
    t: TRANSLATIONS[language] || TRANSLATIONS.en,
    availableLanguages: AVAILABLE_LANGUAGES,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
