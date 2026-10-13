import { Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { strings } from '@/i18n';
import { analyzeCoin } from '@/lib/ai';
import { haptic } from '@/lib/haptics';
import type { Coin } from '@/lib/types';
import { colors, radius, space } from '@/theme';
import { Glass } from './glass';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

type State =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'done'; text: string }
  | { phase: 'error'; message: string };

/** On-demand AI reading of one coin's market data (nothing is generated until the user asks). */
export function AiAnalysis({ coin, series }: { coin: Coin; series: number[] }) {
  const [state, setState] = useState<State>({ phase: 'idle' });

  const run = async () => {
    if (state.phase === 'loading') return;
    haptic.tap();
    setState({ phase: 'loading' });
    const r = await analyzeCoin(coin, series);
    if ('text' in r) setState({ phase: 'done', text: r.text });
    else
      setState({
        phase: 'error',
        message:
          r.error === 'limit'
            ? strings.aiLimit
            : r.error === 'signin'
              ? strings.accountNeeded
              : strings.aiError,
      });
  };

  return (
    <Glass style={styles.card}>
      <View style={styles.head}>
        <Sparkles size={17} color={colors.accent} strokeWidth={1.9} />
        <Txt size={16} weight="semibold">
          {strings.aiTitle}
        </Txt>
      </View>

      {state.phase === 'done' ? (
        <>
          <Txt size={14} style={{ lineHeight: 21 }}>
            {state.text}
          </Txt>
          <Txt size={11} color={colors.textFaint}>
            {strings.aiNote}
          </Txt>
        </>
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
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  btn: {
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
