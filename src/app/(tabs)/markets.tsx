import { Search } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { CoinRow } from '@/components/coin-row';
import { Glass } from '@/components/glass';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { isStablecoin, momentumScore } from '@/lib/momentum';
import { useMarket } from '@/state/market';
import { colors, fonts, radius, space } from '@/theme';

export default function Markets() {
  const { coins, trending } = useMarket();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const list = q
    ? coins.filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
    : coins;

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <Txt size={28} weight="semibold" style={styles.title}>
        {strings.markets}
      </Txt>
      <View style={styles.search}>
        <Search size={18} color={colors.textMuted} strokeWidth={1.9} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={strings.searchPlaceholder}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.accent}
          style={styles.input}
          autoCorrect={false}
        />
      </View>

      {!q && trending.length > 0 ? (
        <Glass style={styles.card}>
          <Txt size={16} weight="semibold" style={styles.cardTitle}>
            {strings.trending}
          </Txt>
          {trending.slice(0, 7).map((c, i) => (
            <CoinRow key={c.id} {...c} index={i} subtitle={c.rank ? `${c.symbol} · #${c.rank}` : c.symbol} />
          ))}
        </Glass>
      ) : null}

      <Glass style={styles.card}>
        <Txt size={16} weight="semibold" style={styles.cardTitle}>
          {q ? strings.results : strings.popular}
        </Txt>
        {list.map((c, i) => (
          <CoinRow key={c.id} {...c} index={i} momentum={isStablecoin(c) ? undefined : momentumScore(c)} />
        ))}
      </Glass>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { paddingHorizontal: space.lg, marginBottom: space.lg },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    paddingHorizontal: space.lg,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15 },
  card: { marginHorizontal: space.lg, marginTop: space.lg, paddingBottom: space.sm },
  cardTitle: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xs },
});
