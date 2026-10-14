import {
  Activity,
  BarChart3,
  Gauge,
  Layers,
  ShieldAlert,
  Sparkles,
  Square,
  TrendingUp,
  Volume2,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { strings } from '@/i18n';
import { analyzeCoin, parseAnalysis, sectionTitle, type AiMode, type AiSectionKey } from '@/lib/ai';
import { haptic } from '@/lib/haptics';
import { speakAnalysis, stopSpeaking } from '@/lib/speech';
import type { Coin } from '@/lib/types';
import { colors, radius, space } from '@/theme';
import { Glass } from './glass';
import { IconButton } from './icon-button';
import { PressableScale } from './pressable-scale';
import { Segmented } from './segmented';
import { Txt } from './text';

type State =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'done'; text: string }
  | { phase: 'error'; message: string };

const ICONS: Record<AiSectionKey, LucideIcon> = {
  context: Activity,
  trend: TrendingUp,
  levels: Layers,
  volume: BarChart3,
  signals: Gauge,
  risks: ShieldAlert,
};

/**
 * On-demand AI reading of one coin's market data, in two depths:
 * a short summary or a technical analysis. Nothing is generated until asked,
 * and each mode keeps its own result while the screen is open.
 */
export function AiAnalysis({ coin, series, rangeDays }: { coin: Coin; series: number[]; rangeDays: number }) {
  const [mode, setMode] = useState<AiMode>('summary');
  const [states, setStates] = useState<Record<AiMode, State>>({
    summary: { phase: 'idle' },
    technical: { phase: 'idle' },
  });
  const [speaking, setSpeaking] = useState(false);
  const state = states[mode];

  // Stop reading when leaving the screen or switching mode.
  useEffect(() => () => stopSpeaking(), []);
  const switchMode = (next: AiMode) => {
    stopSpeaking();
    setSpeaking(false);
    setMode(next);
  };

  const run = async () => {
    if (state.phase === 'loading') return;
    haptic.tap();
    const m = mode;
    setStates((s) => ({ ...s, [m]: { phase: 'loading' } }));
    const r = await analyzeCoin(coin, series, rangeDays, m);
    const next: State =
      'text' in r
        ? { phase: 'done', text: r.text }
        : {
            phase: 'error',
            message:
              r.error === 'limit'
                ? strings.aiLimit
                : r.error === 'signin'
                  ? strings.accountNeeded
                  : strings.aiError,
          };
    setStates((s) => ({ ...s, [m]: next }));
  };

  const toggleSpeech = () => {
    if (state.phase !== 'done') return;
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      speakAnalysis(parseAnalysis(state.text), () => setSpeaking(false));
    }
  };

  return (
    <Glass style={styles.card}>
      <View style={styles.head}>
        <View style={styles.title}>
          <Sparkles size={17} color={colors.accent} strokeWidth={1.9} />
          <Txt size={16} weight="semibold">
            {strings.aiTitle}
          </Txt>
        </View>
        {state.phase === 'done' ? (
          <IconButton
            icon={speaking ? Square : Volume2}
            label={speaking ? strings.aiStop : strings.aiListen}
            onPress={toggleSpeech}
            size={36}
          />
        ) : null}
      </View>

      <Segmented<AiMode>
        size="sm"
        value={mode}
        onChange={switchMode}
        options={[
          { value: 'summary', label: strings.aiModeSummary },
          { value: 'technical', label: strings.aiModeTechnical },
        ]}
      />

      {state.phase === 'done' ? (
        <View style={{ gap: space.md }}>
          {parseAnalysis(state.text).map((s, i) => {
            const Icon = s.key ? ICONS[s.key] : null;
            return (
              <View key={i} style={styles.section}>
                {s.key && Icon ? (
                  <View style={styles.sectionHead}>
                    <Icon size={14} color={colors.accent} strokeWidth={2.1} />
                    <Txt size={12} weight="bold" color={colors.accent} style={{ letterSpacing: 0.6 }}>
                      {sectionTitle(s.key).toUpperCase()}
                    </Txt>
                  </View>
                ) : null}
                <Txt size={14} style={{ lineHeight: 21 }}>
                  {s.body}
                </Txt>
              </View>
            );
          })}
          <Txt size={11} color={colors.textFaint}>
            {strings.aiNote}
          </Txt>
        </View>
      ) : state.phase === 'loading' ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Txt size={13} color={colors.textMuted}>
            {strings.aiLoading}
          </Txt>
        </View>
      ) : (
        <>
          {state.phase === 'error' ? (
            <Txt size={13} color={colors.down}>
              {state.message}
            </Txt>
          ) : null}
          <Txt size={12} color={colors.textMuted}>
            {mode === 'summary' ? strings.aiSummaryHint : strings.aiTechnicalHint}
          </Txt>
          <PressableScale accessibilityRole="button" onPress={run} style={styles.btn}>
            <Txt size={14} weight="semibold" color={colors.accentInk}>
              {strings.aiGenerate}
            </Txt>
          </PressableScale>
        </>
      )}
    </Glass>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.lg, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  section: { gap: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: {
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
