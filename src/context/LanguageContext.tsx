import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Language, messages, TranslationKey } from '../constants/i18n';
import type { Localized } from '../services/mock';
import { toBanglaDigits } from '../utils/format';

const STORAGE_KEY = 'shushastho.language';

type LanguageContextValue = {
  language: Language;
  /** False until the saved language choice has been read (avoids a flash of the wrong language). */
  ready: boolean;
  toggleLanguage: () => void;
  /** Pick a specific language (splash screen) and remember it. */
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
  /** Translate and fill `{n}`-style placeholders. */
  tf: (key: TranslationKey, vars: Record<string, string | number>) => string;
  /** Format a number/string: Bangla digits (০-৯) in Bangla mode. */
  nf: (value: string | number) => string;
  /**
   * Both languages of a message at once (placeholders filled; Bangla digits in the bn text),
   * for the "Bangla main line + small English line" pattern. Vars may be `Localized`.
   */
  L: (key: TranslationKey, vars?: Record<string, string | number | Localized>) => Localized;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: React.PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>('bn');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (active && (saved === 'en' || saved === 'bn')) setLanguageState(saved);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((current) => {
      const next: Language = current === 'en' ? 'bn' : 'en';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const t = (key: TranslationKey): string => messages[language][key];
    const nf = (input: string | number) => (language === 'bn' ? toBanglaDigits(input) : String(input));
    const fill = (text: string, lang: Language, vars: Record<string, string | number | Localized>) =>
      text.replace(/\{(\w+)\}/g, (_, name: string) => {
        if (!(name in vars)) return `{${name}}`;
        const v = vars[name];
        const raw = typeof v === 'object' ? v[lang] : v;
        return lang === 'bn' ? toBanglaDigits(raw) : String(raw);
      });
    return {
      language,
      ready,
      L: (key, vars = {}) => ({
        en: fill(messages.en[key], 'en', vars),
        bn: fill(messages.bn[key], 'bn', vars),
      }),
      toggleLanguage,
      setLanguage,
      t,
      nf,
      tf: (key, vars) =>
        t(key).replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? nf(vars[name]) : `{${name}}`)),
    };
  }, [language, ready, toggleLanguage, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
