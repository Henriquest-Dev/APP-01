import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { colors } from '@/theme';
import { Txt } from './text';

const AnimatedLine = Animated.createAnimatedComponent(Line);

type Props = { score: number; width?: number };

const STROKE = 14;

/** Point on the semicircle: 0 = far left, 100 = far right, through the top. */
function point(cx: number, cy: number, r: number, value: number) {
  const a = Math.PI * (1 - value / 100);
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
}

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const a = point(cx, cy, r, from);
  const b = point(cx, cy, r, to);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`;
}

/**
 * Speedometer for the Momentum score: red (low) · amber (neutral) · green (high),
 * with a needle that glides to each new value as live prices arrive.
 */
export function MomentumGauge({ score, width = 260 }: Props) {
  const cx = width / 2;
  const cy = width / 2;
  const r = width / 2 - STROKE;
  const height = cy + 26;

  const value = useSharedValue(score);
  useEffect(() => {
    value.set(withSpring(Math.max(0, Math.min(100, score)), { damping: 16, stiffness: 90, mass: 0.8 }));
  }, [score, value]);

  const needle = useAnimatedProps(() => {
    const a = Math.PI * (1 - value.get() / 100);
    const len = r - STROKE / 2 - 6;
    return { x2: cx + len * Math.cos(a), y2: cy - len * Math.sin(a) };
  });

  return (
    <View style={{ width, height, alignSelf: 'center' }}>
      <Svg width={width} height={height}>
        {/* zones; small gaps between them */}
        <Path
          d={arc(cx, cy, r, 0, 34)}
          stroke={colors.down}
          strokeOpacity={0.9}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={arc(cx, cy, r, 37, 63)}
          stroke={colors.warn}
          strokeOpacity={0.9}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={arc(cx, cy, r, 66, 100)}
          stroke={colors.up}
          strokeOpacity={0.9}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
        <AnimatedLine
          x1={cx}
          y1={cy}
          animatedProps={needle}
          stroke={colors.text}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <Circle cx={cx} cy={cy} r={9} fill={colors.bg} stroke={colors.text} strokeWidth={3} />
      </Svg>
      <Txt size={11} color={colors.textFaint} style={[styles.end, { left: STROKE - 4, top: cy + 12 }]}>
        0
      </Txt>
      <Txt size={11} color={colors.textFaint} style={[styles.end, { right: STROKE - 4, top: cy + 12 }]}>
        100
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  end: { position: 'absolute' },
});
