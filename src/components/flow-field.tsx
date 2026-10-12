import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const GRID = 17;
const LOOP_SECONDS = 24;

type Props = { size: number; color?: string };

/**
 * Field of short dashes that swirl into a vortex, scatter into waves and come
 * back together. Each dash's angle comes from a time-varying flow field; the
 * whole field is one path per opacity layer, rebuilt on the UI thread every frame.
 */
export function FlowField({ size, color = colors.accentBright }: Props) {
  const t = useSharedValue(0);
  const [seeds] = useState(() => buildSeeds());

  useEffect(() => {
    t.value = withRepeat(
      withTiming(LOOP_SECONDS, { duration: LOOP_SECONDS * 1000, easing: Easing.linear }),
      -1,
    );
  }, [t]);

  const faint = useAnimatedProps(() => ({ d: fieldPath(seeds, 0, t.value, size) }));
  const mid = useAnimatedProps(() => ({ d: fieldPath(seeds, 1, t.value, size) }));
  const bright = useAnimatedProps(() => ({ d: fieldPath(seeds, 2, t.value, size) }));

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Svg width={size} height={size}>
        <AnimatedPath
          animatedProps={faint}
          stroke={color}
          strokeOpacity={0.3}
          strokeWidth={1.4}
          strokeLinecap="round"
        />
        <AnimatedPath
          animatedProps={mid}
          stroke={color}
          strokeOpacity={0.6}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
        <AnimatedPath
          animatedProps={bright}
          stroke="#FFFFFF"
          strokeOpacity={0.9}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

type Seed = { gx: number; gy: number; noise: number; layer: number };

function fieldPath(seeds: Seed[], which: number, time: number, size: number): string {
  'worklet';
  const phase = (time / LOOP_SECONDS) * Math.PI * 2;
  const swirl = (Math.cos(phase) + 1) / 2; // 1 = vortex, 0 = scattered waves
  const cell = size / GRID;
  const len = cell * 0.62;
  const half = size / 2;
  let d = '';
  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i];
    if (s.layer !== which) continue;
    const nx = s.gx / (GRID - 1) - 0.5;
    const ny = s.gy / (GRID - 1) - 0.5;
    const r = Math.sqrt(nx * nx + ny * ny);

    // Shape mask: a rounded square that frays at the edges as it breaks apart.
    const edge = Math.max(Math.abs(nx), Math.abs(ny));
    const fray = 0.42 + 0.06 * Math.sin(s.noise * 6 + time * 0.8) - (1 - swirl) * 0.12 * s.noise;
    if (edge > fray) continue;

    const vortex = Math.atan2(ny, nx) + Math.PI / 2 + r * 1.4;
    const wave = Math.sin(nx * 5 + time * 0.9) * 1.2 + Math.cos(ny * 4 - time * 0.7) + s.noise * 2;
    const angle = vortex * swirl + wave * (1 - swirl);

    // Dashes drift outward while scattered and tighten while swirling.
    const drift = (1 - swirl) * cell * 1.4 * Math.sin(s.noise * 9 + time);
    const cx = half + nx * size * 0.98 + Math.cos(angle) * drift;
    const cy = half + ny * size * 0.98 + Math.sin(angle) * drift;
    const dx = (Math.cos(angle) * len) / 2;
    const dy = (Math.sin(angle) * len) / 2;
    d += `M${(cx - dx).toFixed(1)} ${(cy - dy).toFixed(1)}L${(cx + dx).toFixed(1)} ${(cy + dy).toFixed(1)}`;
  }
  return d || 'M0 0';
}

function buildSeeds(): Seed[] {
  const seeds: Seed[] = [];
  let state = 7;
  const rand = () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const noise = rand();
      seeds.push({ gx, gy, noise, layer: noise < 0.35 ? 0 : noise < 0.75 ? 1 : 2 });
    }
  }
  return seeds;
}
