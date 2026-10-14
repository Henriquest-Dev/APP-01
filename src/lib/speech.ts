import * as Speech from 'expo-speech';

import { currentLanguage } from '@/i18n';
import type { AiSection } from './ai';
import { sectionTitle } from './ai';

const VOICE_LANG: Record<string, string> = {
  pt: 'pt-PT',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  ru: 'ru-RU',
  tr: 'tr-TR',
  zh: 'zh-CN',
  hi: 'hi-IN',
};

/** Reads an analysis aloud with the phone's own voice (free, offline when the voice is installed). */
export function speakAnalysis(sections: AiSection[], onEnd: () => void) {
  const text = sections.map((s) => (s.key ? `${sectionTitle(s.key)}. ${s.body}` : s.body)).join('\n\n');
  const max = Speech.maxSpeechInputLength || 4000;
  Speech.speak(text.slice(0, max), {
    language: VOICE_LANG[currentLanguage()] ?? 'en-US',
    rate: 0.98,
    onDone: onEnd,
    onStopped: onEnd,
    onError: onEnd,
  });
}

export function stopSpeaking() {
  Speech.stop().catch(() => {});
}
