import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { currentLanguage, loadLanguage, setLanguage, type LanguageCode } from '@/i18n';

type LanguageState = {
  language: LanguageCode;
  ready: boolean;
  change: (code: LanguageCode) => Promise<void>;
};

const LanguageContext = createContext<LanguageState | null>(null);

let reopenSettings = false;

/** True once after a language switch, so the re-mounted app can return to Settings. */
export function consumeReopenSettings() {
  const value = reopenSettings;
  reopenSettings = false;
  return value;
}

export function LanguageProvider({ children }: { children: (language: LanguageCode) => ReactNode }) {
  const [language, setState] = useState<LanguageCode>(currentLanguage());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadLanguage().then((code) => {
      setState(code);
      setReady(true);
    });
  }, []);

  const change = async (code: LanguageCode) => {
    if (code === language) return;
    await setLanguage(code);
    reopenSettings = true;
    setState(code);
  };

  return (
    <LanguageContext.Provider value={{ language, ready, change }}>
      {ready ? children(language) : null}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageState {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
