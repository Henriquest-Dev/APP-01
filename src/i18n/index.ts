import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

import { de } from './locales/de';
import { en, type Strings } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { hi } from './locales/hi';
import { it } from './locales/it';
import { pt } from './locales/pt';
import { ru } from './locales/ru';
import { tr } from './locales/tr';
import { zh } from './locales/zh';

export type { Strings };

/** Languages offered in Settings, shown by their own name. */
export const LANGUAGES = [
  { code: 'pt', name: 'Português', table: pt },
  { code: 'en', name: 'English', table: en },
  { code: 'es', name: 'Español', table: es },
  { code: 'fr', name: 'Français', table: fr },
  { code: 'de', name: 'Deutsch', table: de },
  { code: 'it', name: 'Italiano', table: it },
  { code: 'ru', name: 'Русский', table: ru },
  { code: 'tr', name: 'Türkçe', table: tr },
  { code: 'zh', name: '中文', table: zh },
  { code: 'hi', name: 'हिन्दी', table: hi },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

const KEY = 'callout.language.v1';

function deviceLanguage(): LanguageCode {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return (LANGUAGES.find((l) => l.code === code)?.code ?? 'en') as LanguageCode;
}

let current: LanguageCode = deviceLanguage();

/**
 * Active strings. Screens read `strings.someKey` while rendering; switching
 * language swaps the table in place and the root re-mounts the UI.
 */
export const strings: Strings = { ...(LANGUAGES.find((l) => l.code === current)?.table ?? en) };

function apply(code: LanguageCode) {
  current = code;
  Object.assign(strings, LANGUAGES.find((l) => l.code === code)?.table ?? en);
}

export function currentLanguage(): LanguageCode {
  return current;
}

/** Restores the language picked in Settings (falls back to the device language). */
export async function loadLanguage(): Promise<LanguageCode> {
  try {
    const saved = (await AsyncStorage.getItem(KEY)) as LanguageCode | null;
    if (saved && LANGUAGES.some((l) => l.code === saved)) apply(saved);
  } catch {
    // keep device language
  }
  return current;
}

export async function setLanguage(code: LanguageCode): Promise<void> {
  apply(code);
  try {
    await AsyncStorage.setItem(KEY, code);
  } catch {
    // still applied for this session
  }
}
