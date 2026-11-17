import React, { createContext, useContext, useMemo, useState } from 'react';
import { Language, messages, TranslationKey } from '../constants/i18n';

type LanguageContextValue = {
  language: Language;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: React.PropsWithChildren) {
  const [language, setLanguage] = useState<Language>('en');
  const value = useMemo(
    () => ({
      language,
      toggleLanguage: () => setLanguage((current) => current === 'en' ? 'bn' : 'en'),
      t: (key: TranslationKey) => messages[language][key],
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
