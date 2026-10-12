import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, motion } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  data: number[];
  height: number;
  color?: string;
  /** Pulsing "live" dot at the last point. */
  marker?: boolean;
  strokeWidth?: number;
  /** Draws the line from left to right when the data changes. */
  animate?: boolean;
  /** Fill under the line. */
  fill?: boolean;
  delay?: number;
};

const MAX_POINTS = 90;

export function AreaChart({
  data,
  height,
  color = colors.accent,
  marker = false,
  strokeWidth = 2,
  animate = true,
  fill = true,
  delay = 0,
}: Props) {
  const [width, setWidth] = useState(0);
  const gradientId = `fill${color.replace(/[^a-z0-9]/gi, '')}`;

  const geometry = useMemo(
    () => buildPaths(data, width, height, marker ? 10 : 2),
    [data, width, height, marker],
  );

  const progress = useSharedValue(animate ? 0 : 1);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!geometry) return;
    if (animate) {
      progress.value = 0;
      progress.value = withDelay(
        delay,
        withTiming(1, { duration: motion.slow, easing: Easing.out(Easing.cubic) }),
      );
    }
    if (marker) {
      pulse.value = 0;
      pulse.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1);
    }
  }, [geometry, animate, marker, delay, progress, pulse]);

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: (geometry?.length ?? 0) * (1 - progress.value),
  }));
  const areaProps = useAnimatedProps(() => ({ opacity: progress.value }));
  const dotProps = useAnimatedProps(() => ({ opacity: progress.value > 0.92 ? 1 : 0 }));
  const ringProps = useAnimatedProps(() => ({
    r: 5 + pulse.value * 9,
    opacity: progress.value > 0.92 ? 0.45 * (1 - pulse.value) : 0,
  }));

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {geometry ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.32} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {fill ? (
            <AnimatedPath d={geometry.area} fill={`url(#${gradientId})`} animatedProps={areaProps} />
          ) : null}
          <AnimatedPath
            d={geometry.line}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={[geometry.length, geometry.length]}
            animatedProps={lineProps}
          />
          {marker ? (
            <>
              <AnimatedCircle
                cx={geometry.last.x}
                cy={geometry.last.y}
                fill={color}
                animatedProps={ringProps}
              />
              <AnimatedCircle
                cx={geometry.last.x}
                cy={geometry.last.y}
                r={4.5}
                fill="#FFFFFF"
                stroke={color}
                strokeWidth={2.5}
                animatedProps={dotProps}
              />
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

/** Smooth (Catmull-Rom → Bézier) line and area paths for the series. */
function buildPaths(data: number[], width: number, height: number, pad: number) {
  if (width <= 0 || data.length < 2) return null;
  const series = downsample(data, MAX_POINTS);
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const right = width - pad;
  const pts = series.map((v, i) => ({
    x: (i / (series.length - 1)) * right,
    y: pad + (1 - (v - min) / span) * (height - pad * 2),
  }));

  let line = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  let length = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    line += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    length += Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }
  const last = pts[pts.length - 1];
  const area = `${line} L${last.x.toFixed(1)},${height} L0,${height} Z`;
  // Curves are a bit longer than the polyline; overshoot so the dash always covers the whole line.
  return { line, area, last, length: Math.ceil(length * 1.15) + 4 };
}

function downsample(data: number[], max: number): number[] {
  if (data.length <= max) return data;
  const step = (data.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => data[Math.round(i * step)]);
}
