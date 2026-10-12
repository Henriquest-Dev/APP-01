import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Chips } from '@/components/chips';
import { CoinAvatar } from '@/components/coin-avatar';
import { Disclaimer } from '@/components/disclaimer';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { formatPercent, formatPrice } from '@/lib/format';
import { isStablecoin } from '@/lib/momentum';
import type { Direction, Timeframe } from '@/lib/types';
import { useCalls } from '@/state/calls';
import { useMarket } from '@/state/market';
import { colors, fonts, radius, space } from '@/theme';

export default function NewCall() {
  const params = useLocalSearchParams<{ coin?: string; direction?: Direction }>();
  const coins = useMarket().coins.filter((c) => !isStablecoin(c) || c.id === params.coin);
  const { addCall } = useCalls();

  const [picked, setPicked] = useState(params.coin);
  const coinId = picked ?? coins[0]?.id;
  const [direction, setDirection] = useState<Direction>(params.direction ?? 'up');
  const [target, setTarget] = useState('');
  const [timeframe, setTimeframe] = useState<Timeframe>('7d');

  const coin = coins.find((c) => c.id === coinId);
  const targetValue = Number(target.replace(',', '.'));
  const hasTarget = target.trim() !== '' && targetValue > 0;
  const targetMismatch =
    coin && hasTarget && (direction === 'up' ? targetValue <= coin.price : targetValue >= coin.price);
  const canSubmit = !!coin && (!target.trim() || (hasTarget && !targetMismatch));

  const submit = () => {
    if (!coin || !canSubmit) return;
    addCall({
      coinId: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.image,
      direction,
      entryPrice: coin.price,
      targetPrice: hasTarget ? targetValue : undefined,
      timeframe,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.dismissTo('/profile');
  };

  const pickable =
    coin && !coins.slice(0, 15).some((c) => c.id === coin.id)
      ? [coin, ...coins.slice(0, 15)]
      : coins.slice(0, 15);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        withTabBar={false}
        keyboardShouldPersistTaps="handled"
        header={
          <View style={styles.header}>
            <Txt size={24} weight="semibold">
              {strings.newCall}
            </Txt>
            <IconButton icon="close" label="Close" onPress={() => router.back()} />
          </View>
        }>
        <Label text={strings.pickCoin} />
        <FlatList
          horizontal
          data={pickable}
          keyExtractor={(c) => c.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}
          renderItem={({ item }) => {
            const active = item.id === coinId;
            return (
              <Pressable
                onPress={() => setPicked(item.id)}
                style={[
                  styles.coin,
                  active && { borderColor: colors.accent, backgroundColor: colors.accentSoft },
                ]}>
                <CoinAvatar uri={item.image} symbol={item.symbol} size={32} />
                <Txt size={13} weight="semibold">
                  {item.symbol}
                </Txt>
              </Pressable>
            );
          }}
        />
        {coin ? (
          <Txt size={13} color={colors.textMuted} style={styles.hint}>
            {strings.current}: {formatPrice(coin.price)}
          </Txt>
        ) : null}

        <Label text={strings.direction} />
        <View style={styles.dirRow}>
          <DirectionButton active={direction === 'up'} up onPress={() => setDirection('up')} />
          <DirectionButton active={direction === 'down'} up={false} onPress={() => setDirection('down')} />
        </View>

        <Label text={strings.targetPrice} />
        <View style={styles.inputWrap}>
          <Txt size={22} weight="semibold" color={colors.textMuted}>
            $
          </Txt>
          <TextInput
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
            placeholder={coin ? String(coin.price) : '0.00'}
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />
          {coin && hasTarget ? (
            <Txt size={14} weight="semibold" color={targetMismatch ? colors.down : colors.accent}>
              {formatPercent(((targetValue - coin.price) / coin.price) * 100)}
            </Txt>
          ) : null}
        </View>

        <Label text={strings.timeframe} />
        <View style={styles.tfRow}>
          <Chips<Timeframe>
            scroll={false}
            value={timeframe}
            onChange={setTimeframe}
            options={[
              { value: '24h', label: '24h' },
              { value: '7d', label: '7d' },
              { value: '30d', label: '30d' },
            ]}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={submit}
          style={({ pressed }) => [styles.submit, (!canSubmit || pressed) && { opacity: 0.5 }]}>
          <Ionicons name="megaphone" size={20} color={colors.accentInk} />
          <Txt size={17} weight="semibold" color={colors.accentInk}>
            {strings.makeCall}
          </Txt>
        </Pressable>

        <Disclaimer />
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Label({ text }: { text: string }) {
  return (
    <Txt size={14} weight="medium" color={colors.textMuted} style={styles.label}>
      {text}
    </Txt>
  );
}

function DirectionButton({ active, up, onPress }: { active: boolean; up: boolean; onPress: () => void }) {
  const tint = up ? colors.up : colors.down;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.dir,
        active && { borderColor: tint, backgroundColor: up ? colors.accentSoft : colors.downSoft },
      ]}>
      <Ionicons
        name={up ? 'trending-up' : 'trending-down'}
        size={26}
        color={active ? tint : colors.textMuted}
      />
      <Txt size={16} weight="semibold" color={active ? tint : colors.textMuted}>
        {up ? strings.willGoUp : strings.willGoDown}
      </Txt>
    </Pressable>
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
    width: 72,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dirRow: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg },
  dir: {
    flex: 1,
    height: 96,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
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
  tfRow: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg },
  submit: {
    flexDirection: 'row',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.xxl,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
