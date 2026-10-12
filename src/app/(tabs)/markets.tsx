import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { CoinRow } from '@/components/coin-row';
import { Disclaimer } from '@/components/disclaimer';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { isStablecoin, momentumScore } from '@/lib/momentum';
import { useMarket } from '@/state/market';
import { colors, fonts, radius, space } from '@/theme';

export default function Markets() {
  const { coins } = useMarket();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const list = q
    ? coins.filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
    : coins;

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <Txt size={30} weight="semibold" style={styles.title}>
        {strings.markets}
      </Txt>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={strings.searchPlaceholder}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          autoCorrect={false}
        />
      </View>
      {list.map((c) => (
        <CoinRow key={c.id} {...c} momentum={isStablecoin(c) ? undefined : momentumScore(c)} />
      ))}
      <Disclaimer />
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
    marginBottom: space.md,
    paddingHorizontal: space.lg,
    height: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 16 },
});
