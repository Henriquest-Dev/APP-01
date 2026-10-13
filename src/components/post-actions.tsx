import { Bookmark, ChartNoAxesColumn, Heart, MessageCircle, Repeat2, Share, type LucideIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { formatCount } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { colors, space } from '@/theme';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

type Props = {
  comments: number;
  reposts: number;
  likes: number;
  views: number;
  liked: boolean;
  reposted: boolean;
  saved: boolean;
  onComment: () => void;
  onRepost: () => void;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
};

/**
 * X-style action row: reply, repost, like, views … bookmark, share.
 * Used under every post, including posts with video.
 */
export function PostActions(p: Props) {
  return (
    <View style={styles.row}>
      <Action grow icon={MessageCircle} count={p.comments} label="Comment" onPress={p.onComment} />
      <Action
        grow
        icon={Repeat2}
        count={p.reposts}
        active={p.reposted}
        tint={colors.up}
        label="Repost"
        onPress={p.onRepost}
        size={22}
      />
      <Action grow icon={Heart} count={p.likes} active={p.liked} tint={colors.down} fill label="Like" onPress={p.onLike} />
      <View style={[styles.views, { flex: 1 }]} accessibilityLabel="Views">
        <ChartNoAxesColumn size={19} color={colors.textMuted} strokeWidth={2} />
        <Txt size={13} color={colors.textMuted} numeric>
          {formatCount(p.views)}
        </Txt>
      </View>
      <View style={styles.right}>
        <Action icon={Bookmark} active={p.saved} tint={colors.accentBright} fill label="Bookmark" onPress={p.onSave} />
        <Action icon={Share} label="Share" onPress={p.onShare} />
      </View>
    </View>
  );
}

function Action({
  icon: Icon,
  count,
  active,
  tint = colors.accentBright,
  fill,
  label,
  onPress,
  size = 20,
  grow,
}: {
  icon: LucideIcon;
  count?: number;
  active?: boolean;
  tint?: string;
  fill?: boolean;
  label: string;
  onPress: () => void;
  size?: number;
  grow?: boolean;
}) {
  const pop = useSharedValue(1);
  const was = useSharedValue(!!active);
  useEffect(() => {
    // Bounce only when it turns on (like X), not on every render.
    if (active && !was.value) {
      pop.set(withSequence(withTiming(1.35, { duration: 110 }), withTiming(1, { duration: 170 })));
    }
    was.set(!!active);
  }, [active, pop, was]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const color = active ? tint : colors.textMuted;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      hitSlop={8}
      scaleTo={0.88}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={grow ? [styles.action, { flex: 1 }] : styles.action}>
      <Animated.View style={style}>
        <Icon size={size} color={color} fill={active && fill ? tint : 'transparent'} strokeWidth={2} />
      </Animated.View>
      {count !== undefined ? (
        <Txt size={13} color={color} numeric>
          {formatCount(count)}
        </Txt>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32 },
  views: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});
