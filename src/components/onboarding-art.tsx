import { Crown, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { sampleCoins } from '@/lib/sample';
import { colors, radius } from '@/theme';
import { AreaChart } from './area-chart';
import { ConsensusBar } from './consensus-bar';
import { Float } from './float';
import { Glass } from './glass';
import { LogoMark } from './logo';
import { MomentumMeter } from './momentum-meter';
import { Txt } from './text';

const pop = (delay: number) => ZoomIn.delay(delay).springify().damping(12).stiffness(160);

/** Speech-bubble blob in a given color with an icon inside (the "callers"). */
function Bubble({ size, color, children }: { size: number; color: string; children?: React.ReactNode }) {
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

/** Slide 1: calls popping up around the Callout mark. */
export function CallsArt() {
  return (
    <View style={styles.stage}>
      <Animated.View entering={pop(0)} style={styles.center}>
        <Float amplitude={8}>
          <LogoMark size={150} />
        </Float>
      </Animated.View>
      <Animated.View entering={pop(250)} style={[styles.abs, { top: 30, left: 24 }]}>
        <Float amplitude={7} delay={300} rotate={6}>
          <Bubble size={78} color={colors.up}>
            <TrendingUp size={28} color={colors.bg} strokeWidth={2.6} />
          </Bubble>
        </Float>
      </Animated.View>
      <Animated.View entering={pop(400)} style={[styles.abs, { bottom: 36, right: 22 }]}>
        <Float amplitude={9} delay={600} rotate={-5}>
          <Bubble size={88} color={colors.down}>
            <TrendingDown size={30} color={colors.bg} strokeWidth={2.6} />
          </Bubble>
        </Float>
      </Animated.View>
      <Animated.View entering={pop(550)} style={[styles.abs, { top: 46, right: 40 }]}>
        <Float amplitude={5} delay={900}>
          <Bubble size={46} color={colors.warn} />
        </Float>
      </Animated.View>
      <Animated.View entering={pop(650)} style={[styles.abs, { bottom: 60, left: 50 }]}>
        <Float amplitude={6} delay={200}>
          <Bubble size={38} color={colors.accentBright} />
        </Float>
      </Animated.View>
    </View>
  );
}

const AVATARS = [
  { letter: 'K', color: '#3DDC97' },
  { letter: 'M', color: '#FF5C7A' },
  { letter: 'A', color: '#FFB547' },
  { letter: 'S', color: '#6BC7FF' },
  { letter: 'D', color: '#A891FF' },
  { letter: 'T', color: '#FF8AD8' },
];

/** Slide 2: the community orbiting a live consensus card. */
export function CommunityArt() {
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 22000, easing: Easing.linear }), -1);
  }, [spin]);
  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const counter = useAnimatedStyle(() => ({ transform: [{ rotate: `${-spin.value * 360}deg` }] }));

  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.ring, ring]}>
        {AVATARS.map((a, i) => {
          const angle = (i / AVATARS.length) * Math.PI * 2;
          return (
            <Animated.View
              key={a.letter}
              entering={pop(150 + i * 90)}
              style={[
                styles.abs,
                { left: 155 + Math.cos(angle) * 140 - 22, top: 155 + Math.sin(angle) * 140 - 22 },
              ]}>
              <Animated.View style={[styles.avatar, { backgroundColor: a.color }, counter]}>
                <Txt size={16} weight="bold" color={colors.bg}>
                  {a.letter}
                </Txt>
              </Animated.View>
            </Animated.View>
          );
        })}
      </Animated.View>
      <Animated.View entering={pop(0)} style={styles.center}>
        <Float amplitude={5}>
          <Glass style={styles.consensusCard}>
            <Txt size={13} weight="semibold" color={colors.textMuted}>
              BTC · 7d
            </Txt>
            <ConsensusBar up={68} />
          </Glass>
        </Float>
      </Animated.View>
    </View>
  );
}

/** Slide 3: a chart drawing itself plus the Momentum gauge. */
export function MomentumArt() {
  const coin = sampleCoins[2];
  return (
    <View style={styles.stage}>
      <Animated.View entering={pop(0)} style={styles.center}>
        <Float amplitude={6}>
          <Glass style={styles.chartCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt size={13} weight="semibold" color={colors.textMuted}>
                SOL
              </Txt>
              <Txt size={13} weight="semibold" color={colors.up}>
                82 / 100
              </Txt>
            </View>
            <AreaChart data={coin.sparkline} height={90} marker color={colors.accentBright} delay={250} />
            <MomentumMeter score={82} />
          </Glass>
        </Float>
      </Animated.View>
    </View>
  );
}

/** Slide 4: podium rising, crown bouncing on the winner. */
export function RankingArt() {
  return (
    <View style={styles.stage}>
      <View style={styles.podium}>
        <Column height={110} delay={200} label="2" color="#C9CEDC" />
        <View style={{ alignItems: 'center' }}>
          <Animated.View entering={pop(900)}>
            <Float amplitude={5} rotate={6}>
              <Crown size={44} color="#FFD66B" strokeWidth={1.8} fill="rgba(255,214,107,0.25)" />
            </Float>
          </Animated.View>
          <Column height={160} delay={0} label="1" color={colors.accent} />
        </View>
        <Column height={80} delay={400} label="3" color="#E3A574" />
      </View>
    </View>
  );
}

function Column({
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
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <Animated.View style={[styles.column, { backgroundColor: color }, style]}>
      <Txt size={26} weight="display" color={colors.bg}>
        {label}
      </Txt>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { width: 330, height: 330, alignSelf: 'center' },
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
  ring: { position: 'absolute', left: 10, top: 10, width: 310, height: 310 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  consensusCard: { width: 190, padding: 16, gap: 10, borderRadius: radius.md },
  chartCard: { width: 250, padding: 16, gap: 12, borderRadius: radius.lg },
  podium: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
  },
  column: {
    width: 76,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: 'center',
    paddingTop: 12,
    overflow: 'hidden',
  },
});
