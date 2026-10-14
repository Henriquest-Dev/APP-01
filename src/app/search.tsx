import { router } from 'expo-router';
import { ChevronLeft, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Badges } from '@/components/badges';
import { Glass } from '@/components/glass';
import { IconButton } from '@/components/icon-button';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { badgesFor } from '@/lib/badges';
import { formatCount } from '@/lib/format';
import { searchProfiles, type ProfileCard } from '@/lib/social';
import { colors, fonts, radius, space } from '@/theme';

export default function SearchPeople() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ q: string; rows: ProfileCard[] } | null>(null);
  const term = q.replace(/^@/, '').trim();

  useEffect(() => {
    if (term.length < 2) return;
    let alive = true;
    const t = setTimeout(() => searchProfiles(term).then((rows) => alive && setResults({ q: term, rows })), 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [term]);

  const rows = term.length >= 2 && results?.q === term ? results.rows : null;

  return (
    <Screen
      withTabBar={false}
      keyboardShouldPersistTaps="handled"
      header={
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
          <View style={styles.field}>
            <Search size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              autoFocus
              value={q}
              onChangeText={setQ}
              placeholder={strings.peoplePlaceholder}
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
              selectionColor={colors.accent}
              style={styles.input}
            />
          </View>
        </View>
      }>
      {term.length < 2 ? (
        <Txt size={14} color={colors.textMuted} style={styles.hint}>
          {strings.searchHint}
        </Txt>
      ) : rows === null ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
      ) : rows.length === 0 ? (
        <Txt size={14} color={colors.textMuted} style={styles.hint}>
          {strings.noResults}
        </Txt>
      ) : (
        <Glass style={styles.list}>
          {rows.map((p, i) => (
            <PressableScale
              key={p.id}
              scaleTo={0.98}
              onPress={() => router.push({ pathname: '/user/[id]', params: { id: p.id } })}
              style={[styles.row, i > 0 && styles.divider]}>
              <Avatar userId={p.id} name={p.username} size={44} />
              <View style={{ flex: 1, gap: 4 }}>
                <Txt size={15} weight="semibold" numberOfLines={1}>
                  {p.username}
                </Txt>
                <Txt size={12} color={colors.textMuted} numberOfLines={1}>
                  @{p.handle} · {formatCount(p.followers)} {strings.followers}
                </Txt>
                <Badges badges={badgesFor(p).slice(0, 3)} />
              </View>
            </PressableScale>
          ))}
        </Glass>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 46,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15 },
  hint: { textAlign: 'center', marginTop: space.xxl, paddingHorizontal: space.xl },
  list: { marginHorizontal: space.lg, marginTop: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
