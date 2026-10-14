import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { StickerGrid } from '@/components/sticker-grid';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { createSticker, deleteSticker, fetchStickers, pickImage, type Sticker } from '@/lib/profile';
import { useSession } from '@/state/session';
import { colors, space } from '@/theme';

/** My stickers: make new ones from a picture, long-press to delete. */
export default function Stickers() {
  const { user } = useSession();
  const userId = user?.id;
  const [stickers, setStickers] = useState<Sticker[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    fetchStickers(userId).then((rows) => alive && setStickers(rows));
    return () => {
      alive = false;
    };
  }, [userId]);

  const create = useCallback(async () => {
    if (!userId || busy) return;
    setError(null);
    const img = await pickImage('sticker').catch(() => null);
    if (!img) return;
    setBusy(true);
    const r = await createSticker(userId, img);
    if (r === 'ok') {
      haptic.success();
      setStickers(await fetchStickers(userId));
    } else setError(r === 'limit' ? strings.stickerLimit : strings.imageFailed);
    setBusy(false);
  }, [userId, busy]);

  const remove = (s: Sticker) =>
    Alert.alert(strings.stickerDeleteTitle, strings.stickerDeleteText, [
      { text: strings.cancel, style: 'cancel' },
      {
        text: strings.deleteForever,
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSticker(s);
            setStickers((prev) => prev?.filter((x) => x.id !== s.id) ?? prev);
          } catch {
            setError(strings.callFailed);
          }
        },
      },
    ]);

  return (
    <Screen
      withTabBar={false}
      header={
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
          <Txt size={17} weight="semibold">
            {strings.stickersTitle}
          </Txt>
          <View style={{ width: 42 }} />
        </View>
      }>
      <Txt size={13} color={colors.textMuted} style={styles.hint}>
        {strings.stickersHint}
      </Txt>
      {error ? (
        <Txt size={13} color={colors.down} style={styles.hint}>
          {error}
        </Txt>
      ) : null}
      {stickers === null ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xl }} />
      ) : (
        <View style={{ marginTop: space.lg, opacity: busy ? 0.5 : 1 }}>
          <StickerGrid stickers={stickers} onCreate={create} onLongPress={remove} />
          {stickers.length === 0 ? (
            <Txt size={13} color={colors.textFaint} style={[styles.hint, { marginTop: space.lg }]}>
              {strings.noStickers}
            </Txt>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg },
  hint: { paddingHorizontal: space.lg, marginTop: space.sm },
});
