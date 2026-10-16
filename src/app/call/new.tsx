import { haptic } from '@/lib/haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, TrendingDown, TrendingUp, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoinAvatar } from '@/components/coin-avatar';
import { Glass } from '@/components/glass';
import { IconButton } from '@/components/icon-button';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { lookupCoin } from '@/lib/coin-lookup';
import { formatPercent, formatPrice } from '@/lib/format';
import { isStablecoin } from '@/lib/momentum';
import type { Coin, Direction, Timeframe } from '@/lib/types';
import { useCalls, type CallError } from '@/state/calls';
import { useSession } from '@/state/session';
import { useMarket } from '@/state/market';
import { colors, fonts, motion, radius, space } from '@/theme';

export default function NewCall() {
  const params = useLocalSearchParams<{ coin?: string; direction?: Direction }>();
  const insets = useSafeAreaInsets();
  const coins = useMarket().coins.filter((c) => !isStablecoin(c) || c.id === params.coin);
  const { addCall } = useCalls();
  const { user, signOut } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [picked, setPicked] = useState(params.coin);
  const coinId = picked ?? coins[0]?.id;
  const [direction, setDirection] = useState<Direction>(params.direction ?? 'up');
  const [target, setTarget] = useState('');
  const [timeframe, setTimeframe] = useState<Timeframe>('7d');
  const [note, setNote] = useState('');

  // Coins that are not in the main list (new or trending ones) are looked up by id.
  const listed = coins.find((c) => c.id === coinId);
  const [looked, setLooked] = useState<{ id: string; coin?: Coin; failed?: boolean }>();
  useEffect(() => {
    if (!coinId || listed) return;
    let alive = true;
    lookupCoin(coinId).then((c) => alive && setLooked({ id: coinId, coin: c, failed: !c }));
    return () => {
      alive = false;
    };
  }, [coinId, listed]);
  const fetched = looked?.id === coinId ? looked : undefined;
  const coin = listed ?? fetched?.coin;
  const loadingCoin = !coin && !!coinId && !fetched;
  const targetValue = Number(target.replace(',', '.'));
  const hasTarget = target.trim() !== '' && targetValue > 0;
  const targetMismatch =
    coin && hasTarget && (direction === 'up' ? targetValue <= coin.price : targetValue >= coin.price);
  const canSubmit = !!coin && (!target.trim() || (hasTarget && !targetMismatch));

  const callMessage = (e: CallError) =>
    ({
      duplicate: strings.callDuplicate,
      limit: strings.callLimit,
      priceMoved: strings.callPriceMoved,
      target: strings.callTarget,
      account: strings.accountNeeded,
      network: strings.authNetwork,
      unknown: strings.callFailed,
    })[e];

  const submit = async () => {
    if (!coin || !canSubmit || busy) return;
    setBusy(true);
    setError(null);
    const result = await addCall({
      coinId: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.image,
      direction,
      entryPrice: coin.price,
      targetPrice: hasTarget ? targetValue : undefined,
      timeframe,
      note,
    });
    setBusy(false);
    if (result) {
      haptic.error();
      setError(callMessage(result));
      return;
    }
    haptic.success();
    router.dismissTo('/profile');
  };

  const top = coins.slice(0, 15);
  const pickable = coin && !top.some((c) => c.id === coin.id) ? [coin, ...top] : top;

  const footer = (
    <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
      {error ? (
        <Txt size={13} color={colors.down} style={{ textAlign: 'center', marginBottom: space.sm }}>
          {error}
        </Txt>
      ) : null}
      {user ? (
        <PressableScale
          accessibilityRole="button"
          disabled={!canSubmit || busy}
          onPress={submit}
          style={[styles.submit, (!canSubmit || busy) && { opacity: 0.4 }]}>
          {busy ? (
            <ActivityIndicator color={colors.accentInk} />
          ) : (
            <>
              <Check size={20} color={colors.accentInk} strokeWidth={2.4} />
              <Txt size={16} weight="semibold" color={colors.accentInk}>
                {strings.makeCall}
              </Txt>
            </>
          )}
        </PressableScale>
      ) : (
        <>
          <Txt size={13} color={colors.textMuted} style={{ textAlign: 'center', marginBottom: space.sm }}>
            {strings.accountNeededText}
          </Txt>
          <PressableScale accessibilityRole="button" onPress={signOut} style={styles.submit}>
            <Txt size={16} weight="semibold" color={colors.accentInk}>
              {strings.accountNeeded}
            </Txt>
          </PressableScale>
        </>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        withTabBar={false}
        keyboardShouldPersistTaps="handled"
        footer={footer}
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        header={
          <View style={styles.header}>
            <Txt size={22} weight="semibold">
              {strings.newCall}
            </Txt>
            <IconButton icon={X} label="Close" onPress={() => router.back()} />
          </View>
        }>
        <Label text={strings.pickCoin} />
        <FlatList
          horizontal
          data={pickable}
          keyExtractor={(c) => c.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 30).duration(motion.base)}>
              <CoinChip
                selected={item.id === coinId}
                symbol={item.symbol}
                image={item.image}
                onPress={() => setPicked(item.id)}
              />
            </Animated.View>
          )}
        />

        {coin ? (
          <Glass style={styles.current}>
            <Txt size={13} color={colors.textMuted}>
              {strings.current}
            </Txt>
            <Txt size={15} weight="semibold" numeric>
              {formatPrice(coin.price)}
            </Txt>
          </Glass>
        ) : loadingCoin ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: space.lg }} />
        ) : fetched?.failed ? (
          <Txt size={13} color={colors.down} style={{ paddingHorizontal: space.lg, marginTop: space.md }}>
            {strings.coinUnavailable}
          </Txt>
        ) : null}

        <Label text={strings.direction} />
        <View style={styles.dirRow}>
          <DirectionCard up active={direction === 'up'} onPress={() => setDirection('up')} />
          <DirectionCard up={false} active={direction === 'down'} onPress={() => setDirection('down')} />
        </View>

        <Label text={strings.targetPrice} />
        <View style={[styles.inputWrap, targetMismatch && { borderColor: colors.down }]}>
          <Txt size={22} weight="semibold" color={colors.textFaint}>
            $
          </Txt>
          <TextInput
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
            placeholder={coin ? String(coin.price) : '0.00'}
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.accent}
            style={styles.input}
          />
          {coin && hasTarget ? (
            <Txt size={13} weight="semibold" color={targetMismatch ? colors.down : colors.up} numeric>
              {formatPercent(((targetValue - coin.price) / coin.price) * 100)}
            </Txt>
          ) : null}
        </View>
        {targetMismatch ? (
          <Txt size={12} color={colors.down} style={styles.hint}>
            {direction === 'up' ? strings.targetAbove : strings.targetBelow}
          </Txt>
        ) : null}

        <Label text={strings.timeframe} />
        <View style={{ paddingHorizontal: space.lg }}>
          <Segmented<Timeframe>
            value={timeframe}
            onChange={setTimeframe}
            options={[
              { value: '24h', label: '24h' },
              { value: '7d', label: '7d' },
              { value: '30d', label: '30d' },
            ]}
          />
        </View>

        <Label text={strings.thesis} />
        <View style={styles.noteWrap}>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={strings.thesisPlaceholder}
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.accent}
            multiline
            maxLength={280}
            style={styles.noteInput}
          />
          <Txt size={11} color={colors.textFaint} style={{ alignSelf: 'flex-end' }}>
            {note.length}/280
          </Txt>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Label({ text }: { text: string }) {
  return (
    <Txt size={13} weight="medium" color={colors.textMuted} style={styles.label}>
      {text}
    </Txt>
  );
}

function CoinChip({
  selected,
  symbol,
  image,
  onPress,
}: {
  selected: boolean;
  symbol: string;
  image: string;
  onPress: () => void;
}) {
  const ring = useAnimatedStyle(() => ({
    borderColor: withTiming(selected ? colors.accent : colors.border, { duration: motion.fast }),
    backgroundColor: withTiming(selected ? colors.accentSoft : colors.surface, { duration: motion.fast }),
  }));
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      scaleTo={0.92}>
      <Animated.View style={[styles.coin, ring]}>
        <CoinAvatar uri={image} symbol={symbol} size={30} />
        <Txt size={12} weight="semibold">
          {symbol}
        </Txt>
      </Animated.View>
    </PressableScale>
  );
}

function DirectionCard({ up, active, onPress }: { up: boolean; active: boolean; onPress: () => void }) {
  const tint = up ? colors.up : colors.down;
  const Icon = up ? TrendingUp : TrendingDown;
  const card = useAnimatedStyle(() => ({
    borderColor: withTiming(active ? tint : colors.border, { duration: motion.fast }),
    backgroundColor: withTiming(active ? (up ? colors.upSoft : colors.downSoft) : colors.surface, {
      duration: motion.fast,
    }),
  }));
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{ flex: 1 }}>
      <Animated.View style={[styles.dir, card]}>
        <View style={[styles.dirIcon, { backgroundColor: active ? tint : colors.surfaceRaised }]}>
          <Icon size={20} color={active ? colors.bg : colors.textMuted} strokeWidth={2.2} />
        </View>
        <Txt size={15} weight="semibold" color={active ? colors.text : colors.textMuted}>
          {up ? strings.willGoUp : strings.willGoDown}
        </Txt>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  label: { paddingHorizontal: space.lg, marginTop: space.xl, marginBottom: space.md },
  hint: { paddingHorizontal: space.lg, marginTop: space.sm },
  coin: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: space.md,
    width: 68,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  current: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: space.lg,
    marginTop: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
  },
  dirRow: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg },
  dir: {
    height: 110,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  dirIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    paddingHorizontal: space.lg,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 22 },
  noteWrap: {
    marginHorizontal: space.lg,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteInput: {
    minHeight: 70,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: 'rgba(11, 12, 20, 0.92)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submit: {
    flexDirection: 'row',
    gap: space.sm,
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
