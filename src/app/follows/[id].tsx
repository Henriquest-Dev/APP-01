import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Glass } from '@/components/glass';
import { IconButton } from '@/components/icon-button';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { UnderlineTabs } from '@/components/underline-tabs';
import { strings } from '@/i18n';
import { fetchFollowList, type Person } from '@/lib/profile';
import { colors, space } from '@/theme';

type Kind = 'followers' | 'following';

export default function Follows() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const [kind, setKind] = useState<Kind>(tab === 'following' ? 'following' : 'followers');
  const [lists, setLists] = useState<Partial<Record<Kind, Person[]>>>({});
  const list = lists[kind];

  useEffect(() => {
    let alive = true;
    fetchFollowList(id, kind).then((rows) => alive && setLists((prev) => ({ ...prev, [kind]: rows })));
    return () => {
      alive = false;
    };
  }, [id, kind]);

  return (
    <Screen
      withTabBar={false}
      header={
        <View>
          <View style={styles.header}>
            <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
            <View style={{ width: 42 }} />
          </View>
          <UnderlineTabs<Kind>
            value={kind}
            onChange={setKind}
            options={[
              { value: 'followers', label: strings.followers },
              { value: 'following', label: strings.followingLabel },
            ]}
          />
        </View>
      }>
      {list === undefined ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
      ) : list.length === 0 ? (
        <Txt size={14} color={colors.textMuted} style={{ textAlign: 'center', marginTop: space.xxl }}>
          {strings.nothingYet}
        </Txt>
      ) : (
        <Glass style={styles.card}>
          {list.map((p, i) => (
            <PressableScale
              key={p.id}
              scaleTo={0.98}
              onPress={() => router.push({ pathname: '/user/[id]', params: { id: p.id } })}
              style={[styles.row, i > 0 && styles.divider]}>
              <Avatar userId={p.id} name={p.username} size={44} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Txt size={15} weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {p.username}
                  </Txt>
                  {p.pro ? <Sparkles size={13} color={colors.accent} strokeWidth={2.2} /> : null}
                </View>
                <Txt size={13} color={colors.textMuted} numberOfLines={1}>
                  @{p.handle}
                </Txt>
                {p.bio ? (
                  <Txt size={13} numberOfLines={2}>
                    {p.bio}
                  </Txt>
                ) : null}
              </View>
            </PressableScale>
          ))}
        </Glass>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.lg },
  card: { marginHorizontal: space.lg, marginTop: space.md },
  row: { flexDirection: 'row', gap: space.md, padding: space.lg },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
});
