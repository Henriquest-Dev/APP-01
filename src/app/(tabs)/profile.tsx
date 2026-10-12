import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { CoinAvatar } from '@/components/coin-avatar';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { formatPercent, formatPrice } from '@/lib/format';
import { useCalls } from '@/state/calls';
import { useMarket } from '@/state/market';
import { colors, radius, space } from '@/theme';

export default function Profile() {
  const { calls } = useCalls();
  const { coins } = useMarket();

  return (
    <Screen>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={30} color={colors.accentInk} />
        </View>
        <View>
          <Txt size={22} weight="semibold">
            @you
          </Txt>
          <Txt size={14} color={colors.textMuted}>
            Callout
          </Txt>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat label={strings.callsMade} value={String(calls.length)} />
        <Stat label={strings.hitRate} value="—" />
        <Stat label={strings.streak} value="—" />
      </View>

      <View style={styles.pro}>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt size={18} weight="semibold">
            ⚡ {strings.premium}
          </Txt>
          <Txt size={13} color={colors.textMuted}>
            {strings.premiumSubtitle}
          </Txt>
        </View>
        <View style={styles.soon}>
          <Txt size={12} weight="semibold" color={colors.accentInk}>
            {strings.comingSoon}
          </Txt>
        </View>
      </View>

      <SectionHeader title={strings.myCalls} />
      {calls.length === 0 ? (
        <Txt size={14} color={colors.textMuted} style={styles.empty}>
          {strings.noCalls}
        </Txt>
      ) : (
        calls.map((call) => {
          const now = coins.find((c) => c.id === call.coinId)?.price ?? call.entryPrice;
          const move = ((now - call.entryPrice) / call.entryPrice) * 100;
          const winning = call.direction === 'up' ? move >= 0 : move <= 0;
          const up = call.direction === 'up';
          return (
            <View key={call.id} style={styles.call}>
              <CoinAvatar uri={call.image} symbol={call.symbol} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt size={16} weight="semibold">
                  {call.symbol}{' '}
                  <Txt size={16} weight="semibold" color={up ? colors.up : colors.down}>
                    {up ? '↑' : '↓'} {call.timeframe}
                  </Txt>
                </Txt>
                <Txt size={12} color={colors.textMuted}>
                  {strings.entry} {formatPrice(call.entryPrice)}
                  {call.targetPrice ? ` · ${strings.target} ${formatPrice(call.targetPrice)}` : ''}
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Txt size={15} weight="semibold" color={winning ? colors.up : colors.down}>
                  {formatPercent(move)}
                </Txt>
                <Txt size={12} color={colors.textMuted}>
                  {strings.pending}
                </Txt>
              </View>
            </View>
          );
        })
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Txt size={24} weight="semibold">
        {value}
      </Txt>
      <Txt size={13} color={colors.textMuted}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.lg },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, marginTop: space.xl },
  stat: {
    flex: 1,
    padding: space.lg,
    gap: 2,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.lg,
    marginTop: space.lg,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  soon: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  empty: { paddingHorizontal: space.lg, lineHeight: 21 },
  call: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
});
