import { Gauge } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { strings } from '@/i18n';
import type { LivePrice } from '@/hooks/use-live-price';
import { liveMomentum, momentumHistory, momentumRaw } from '@/lib/momentum';
import type { Coin } from '@/lib/types';
import { colors, space } from '@/theme';
import { AreaChart } from './area-chart';
import { LiveDot } from './live-dot';
import { MomentumGauge } from './momentum-gauge';
import { momentumColor } from './momentum-meter';
import { Txt } from './text';

/**
 * Momentum as a live instrument: a speedometer on top and, below it, a line
 * that starts with the last hours and keeps growing with every new price.
 */
export function MomentumLive({ coin, live }: { coin: Coin; live: LivePrice }) {
  const history = useMemo(() => momentumHistory(coin), [coin]);
  const liveScores = useMemo(() => live.ticks.map((p) => liveMomentum(coin, p)), [coin, live.ticks]);

  const series = useMemo(() => [...history, ...liveScores], [history, liveScores]);
  const score = liveScores[liveScores.length - 1] ?? momentumRaw(coin);
  const color = momentumColor(Math.round(score));
  const low = Math.min(...series, score);
  const high = Math.max(...series, score);
  const isLive = live.price !== null;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.title}>
          <Gauge size={17} color={colors.textMuted} strokeWidth={1.9} />
          <Txt size={16} weight="semibold">
            {strings.momentum}
          </Txt>
        </View>
        {isLive ? <LiveDot /> : null}
      </View>

      <MomentumGauge score={score} />
      <View style={styles.value}>
        <Txt size={34} weight="bold" color={color} numeric>
          {score.toFixed(1)}
        </Txt>
        <Txt size={13} color={colors.textFaint}>
          {' '}
          / 100
        </Txt>
      </View>

      {series.length > 2 ? (
        <View style={{ gap: 4 }}>
          <AreaChart data={series} height={96} color={color} animate={false} marker strokeWidth={2} />
          <View style={styles.range}>
            <Txt size={11} color={colors.textFaint} numeric>
              {low.toFixed(1)}
            </Txt>
            <Txt size={11} color={colors.textFaint}>
              {isLive ? strings.momentumLiveHint : strings.momentumRecent}
            </Txt>
            <Txt size={11} color={colors.textFaint} numeric>
              {high.toFixed(1)}
            </Txt>
          </View>
        </View>
      ) : null}

      <Txt size={12} color={colors.textMuted}>
        {strings.momentumHint}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginTop: -4 },
  range: { flexDirection: 'row', justifyContent: 'space-between' },
});
