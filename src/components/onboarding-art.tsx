import { Crown, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  ZoomIn,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { strings } from '@/i18n';
import { sampleCoins } from '@/lib/sample';
import { colors, radius } from '@/theme';
import { AnimatedLogo } from './animated-logo';
import { AreaChart } from './area-chart';
import { CoinToken, type CoinKey } from './coin-token';
import { ConsensusBar } from './consensus-bar';
import { Float } from './float';
import { Glass } from './glass';
import { MomentumMeter } from './momentum-meter';
import { Txt } from './text';
import { Layer, TiltStage } from './tilt-stage';

const STAGE = 330;
const pop = (delay: number) => ZoomIn.delay(delay).springify().damping(12).stiffness(160);

/** Soft elliptical shadow on the "floor" under a floating object. */
function FloorShadow({ width }: { width: number }) {
  const h = width * 0.22;
  return (
    <Svg width={width} height={h}>
      <Defs>
        <RadialGradient id="floor" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#000" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#000" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={width / 2} cy={h / 2} rx={width / 2} ry={h / 2} fill="url(#floor)" />
    </Svg>
  );
}

function Bubble({ size, color, children }: { size: number; color: string; children?: ReactNode }) {
  return (
    <View style={{ width: size, height: size * 0.9, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size * 0.9} viewBox="200 280 640 560" style={StyleSheet.absoluteFill}>
        <Path
          d="M292 300 h440 a90 90 0 0 1 90 90 v220 a90 90 0 0 1 -90 90 h-250 l-120 104 v-104 h-70 a90 90 0 0 1 -90 -90 v-220 a90 90 0 0 1 90 -90 z"
          fill={color}
        />
      </Svg>
      <View style={{ marginTop: -size * 0.12 }}>{children}</View>
    </View>
  );
}

/** Slide 1: the animated logo flips in, then calls pop around it at different depths. */
export function CallsArt() {
  const flip = useSharedValue(0);
  useEffect(() => {
    flip.value = withSpring(1, { damping: 11, stiffness: 70 });
  }, [flip]);
  const logo = useAnimatedStyle(() => ({
    opacity: Math.min(1, flip.value * 1.5),
    transform: [
      { perspective: 700 },
      { rotateY: `${(1 - flip.value) * 100}deg` },
      { rotateX: `${(1 - flip.value) * -25}deg` },
      { scale: 0.5 + flip.value * 0.5 },
    ],
  }));

  return (
    <TiltStage style={styles.stage}>
      <Layer depth={-1.2} style={[styles.abs, { top: 40, right: 46 }]}>
        <Animated.View entering={pop(900)}>
          <Float amplitude={4} delay={900}>
            <View style={{ opacity: 0.55 }}>
              <Bubble size={40} color={colors.warn} />
            </View>
          </Float>
        </Animated.View>
      </Layer>
      <Layer depth={-0.8} style={[styles.abs, { bottom: 78, left: 40 }]}>
        <Animated.View entering={pop(1050)}>
          <Float amplitude={5} delay={200}>
            <View style={{ opacity: 0.7 }}>
              <Bubble size={34} color={colors.accentBright} />
            </View>
          </Float>
        </Animated.View>
      </Layer>

      <Layer depth={0} style={styles.center}>
        <Float amplitude={8}>
          <Animated.View style={logo}>
            <AnimatedLogo size={190} />
          </Animated.View>
        </Float>
        <View style={{ marginTop: -6 }}>
          <FloorShadow width={150} />
        </View>
      </Layer>

      <Layer depth={1.4} style={[styles.abs, { top: 36, left: 18 }]}>
        <Animated.View entering={pop(600)}>
          <Float amplitude={7} delay={300} rotate={6}>
            <Bubble size={80} color={colors.up}>
              <TrendingUp size={28} color={colors.bg} strokeWidth={2.6} />
            </Bubble>
          </Float>
        </Animated.View>
      </Layer>
      <Layer depth={2} style={[styles.abs, { bottom: 40, right: 16 }]}>
        <Animated.View entering={pop(750)}>
          <Float amplitude={9} delay={600} rotate={-5}>
            <Bubble size={92} color={colors.down}>
              <TrendingDown size={30} color={colors.bg} strokeWidth={2.6} />
            </Bubble>
          </Float>
        </Animated.View>
      </Layer>
    </TiltStage>
  );
}

const ORBIT: CoinKey[] = ['btc', 'eth', 'sol', 'bnb', 'xrp', 'doge', 'ada'];
const ORBIT_MS = 16000;

/** Slide 2: crypto coins orbit the live consensus in perspective; tap one to flip it. */
export function CommunityArt() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: ORBIT_MS, easing: Easing.linear }), -1);
  }, [t]);

  return (
    <TiltStage style={styles.stage}>
      <View style={[styles.center, { zIndex: 5 }]} pointerEvents="none">
        <Animated.View entering={pop(0)}>
          <Glass style={styles.consensusCard}>
            <Txt size={13} weight="semibold" color={colors.textMuted}>
              BTC · 7d
            </Txt>
            <ConsensusBar up={68} />
          </Glass>
        </Animated.View>
      </View>
      {ORBIT.map((coin, i) => (
        <OrbitingCoin key={coin} coin={coin} index={i} count={ORBIT.length} t={t} />
      ))}
    </TiltStage>
  );
}

function OrbitingCoin({
  coin,
  index,
  count,
  t,
}: {
  coin: CoinKey;
  index: number;
  count: number;
  t: SharedValue<number>;
}) {
  const boost = useSharedValue(0);
  const spin = useDerivedValue(() => t.value * Math.PI * 2 * 3 + index * 0.9 + boost.value);
  const SIZE = 52;

  const style = useAnimatedStyle(() => {
    const a = t.value * Math.PI * 2 + (index / count) * Math.PI * 2;
    const depth = Math.sin(a); // -1 back … 1 front
    const x = Math.cos(a) * 138;
    const y = Math.sin(a) * 52 - 6;
    const s = 0.62 + ((depth + 1) / 2) * 0.48;
    return {
      zIndex: depth > 0 ? 10 : 1,
      opacity: 0.45 + ((depth + 1) / 2) * 0.55,
      transform: [{ translateX: x }, { translateY: y }, { scale: s }],
    };
  });

  return (
    <Animated.View style={[styles.orbitSlot, style]}>
      <Animated.View entering={pop(200 + index * 110)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={coin.toUpperCase()}
          hitSlop={8}
          onPress={() => {
            boost.value = withTiming(boost.value + Math.PI * 4, {
              duration: 900,
              easing: Easing.out(Easing.cubic),
            });
          }}>
          <CoinToken coin={coin} size={SIZE} spin={spin} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

/** Slide 3: Momentum cards laid out in depth (chart at the back, gauge and score in front). */
export function MomentumArt() {
  const coin = sampleCoins[2];
  return (
    <TiltStage style={styles.stage}>
      <Layer depth={-0.6} style={styles.center}>
        <Animated.View entering={pop(0)} style={styles.backCard}>
          <Glass style={styles.chartCard}>
            <Txt size={13} weight="semibold" color={colors.textMuted}>
              SOL · {strings.momentum}
            </Txt>
            <AreaChart data={coin.sparkline} height={110} marker color={colors.accentBright} delay={250} />
          </Glass>
        </Animated.View>
      </Layer>
      <Layer depth={1.2} style={[styles.abs, { bottom: 34, left: 34 }]}>
        <Animated.View entering={pop(500)}>
          <Float amplitude={5} delay={400}>
            <Glass style={styles.gaugeCard}>
              <MomentumMeter score={82} />
            </Glass>
          </Float>
        </Animated.View>
      </Layer>
      <Layer depth={2.2} style={[styles.abs, { top: 30, right: 24 }]}>
        <Animated.View entering={pop(750)}>
          <Float amplitude={7} delay={100} rotate={4}>
            <View style={styles.scoreBadge}>
              <Txt size={30} weight="display" color={colors.bg}>
                82
              </Txt>
              <Txt size={10} weight="bold" color={colors.bg}>
                / 100
              </Txt>
            </View>
          </Float>
        </Animated.View>
      </Layer>
    </TiltStage>
  );
}

/** Slide 4: a 3D podium rising (front + top faces) with the crown bouncing above #1. */
export function RankingArt() {
  return (
    <TiltStage style={styles.stage}>
      <View style={styles.podium}>
        <Block height={100} delay={200} label="2" color="#C9CEDC" />
        <View style={{ alignItems: 'center' }}>
          <Layer depth={1.5}>
            <Animated.View entering={pop(900)}>
              <Float amplitude={6} rotate={6}>
                <Crown size={48} color="#FFD66B" strokeWidth={1.8} fill="rgba(255,214,107,0.25)" />
              </Float>
            </Animated.View>
          </Layer>
          <Block height={150} delay={0} label="1" color={colors.accent} />
        </View>
        <Block height={70} delay={400} label="3" color="#E3A574" />
      </View>
      <Layer depth={-1} style={[styles.abs, { top: 30, left: 34 }]}>
        <Animated.View entering={pop(1100)}>
          <Float amplitude={5}>
            <CoinToken coin="btc" size={34} />
          </Float>
        </Animated.View>
      </Layer>
      <Layer depth={1.8} style={[styles.abs, { top: 64, right: 30 }]}>
        <Animated.View entering={pop(1250)}>
          <Float amplitude={6} delay={500}>
            <CoinToken coin="eth" size={40} />
          </Float>
        </Animated.View>
      </Layer>
    </TiltStage>
  );
}

function Block({
  height,
  delay,
  label,
  color,
}: {
  height: number;
  delay: number;
  label: string;
  color: string;
}) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(delay, withSpring(height, { damping: 14, stiffness: 120 }));
  }, [h, height, delay]);
  const front = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <View style={{ alignItems: 'center' }}>
      {/* top face, seen in perspective */}
      <View style={[styles.blockTop, { backgroundColor: color }]} />
      <Animated.View style={[styles.blockFront, { backgroundColor: color }, front]}>
        <View style={styles.blockShade} />
        <Txt size={26} weight="display" color={colors.bg}>
          {label}
        </Txt>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: STAGE, height: STAGE, alignSelf: 'center' },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abs: { position: 'absolute' },
  orbitSlot: { position: 'absolute', left: STAGE / 2 - 30, top: STAGE / 2 - 26 },
  consensusCard: { width: 190, padding: 16, gap: 10, borderRadius: radius.md },
  backCard: { transform: [{ translateY: -24 }] },
  chartCard: { width: 250, padding: 16, gap: 12, borderRadius: radius.lg },
  gaugeCard: { width: 170, padding: 14, borderRadius: radius.md },
  scoreBadge: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: colors.up,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.up,
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 10,
  },
  podium: {
    position: 'absolute',
    bottom: 34,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 12,
  },
  blockTop: {
    width: 78,
    height: 18,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    opacity: 0.55,
    transform: [{ perspective: 300 }, { rotateX: '55deg' }, { translateY: 7 }],
  },
  blockFront: {
    width: 78,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    alignItems: 'center',
    paddingTop: 12,
    overflow: 'hidden',
  },
  blockShade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 18,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
});
