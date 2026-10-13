import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Film, ImageIcon, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoinAvatar } from '@/components/coin-avatar';
import { IconButton } from '@/components/icon-button';
import { PostVideo } from '@/components/post-video';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { createPost, type PickedMedia } from '@/lib/posts';
import { isStablecoin } from '@/lib/momentum';
import { useMarket } from '@/state/market';
import { useSession } from '@/state/session';
import { colors, fonts, radius, space } from '@/theme';

const MAX_VIDEO_SECONDS = 30;
const MAX_BYTES = 20 * 1024 * 1024;

export default function NewPost() {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const coins = useMarket()
    .coins.filter((c) => !isStablecoin(c))
    .slice(0, 12);
  const [body, setBody] = useState('');
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [coinId, setCoinId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (kind: 'images' | 'videos') => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [kind],
      allowsEditing: kind === 'images',
      quality: 0.7,
      videoMaxDuration: MAX_VIDEO_SECONDS,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    const isVideo = a.type === 'video';
    if (isVideo && a.duration && a.duration / 1000 > MAX_VIDEO_SECONDS + 1)
      return setError(strings.videoTooLong);
    if (a.fileSize && a.fileSize > MAX_BYTES) return setError(strings.fileTooBig);
    setMedia({
      uri: a.uri,
      type: isVideo ? 'video' : 'image',
      mimeType: a.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
      width: a.width,
      height: a.height,
    });
  };

  const canPost = !!user && (body.trim().length > 0 || !!media) && !busy;

  const submit = async () => {
    if (!user || !canPost) return;
    setBusy(true);
    setError(null);
    try {
      await createPost(user.id, body, media, coinId);
      haptic.success();
      router.back();
    } catch (e) {
      const m = String((e as Error).message ?? '');
      setError(
        m.includes('slow down')
          ? strings.tooManyPosts
          : m.toLowerCase().includes('size')
            ? strings.fileTooBig
            : strings.callFailed,
      );
      setBusy(false);
    }
  };

  const aspect =
    media && media.width && media.height ? Math.max(0.6, Math.min(1.9, media.width / media.height)) : 1;

  const footer = (
    <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
      {error ? (
        <Txt size={13} color={colors.down} style={{ textAlign: 'center', marginBottom: space.sm }}>
          {error}
        </Txt>
      ) : null}
      <PressableScale
        accessibilityRole="button"
        onPress={submit}
        style={[styles.submit, !canPost && { opacity: 0.45 }]}>
        {busy ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <ActivityIndicator color={colors.accentInk} />
            <Txt size={14} weight="semibold" color={colors.accentInk}>
              {media ? strings.uploading : ''}
            </Txt>
          </View>
        ) : (
          <Txt size={16} weight="semibold" color={colors.accentInk}>
            {strings.publish}
          </Txt>
        )}
      </PressableScale>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        withTabBar={false}
        keyboardShouldPersistTaps="handled"
        footer={footer}
        contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}
        header={
          <View style={styles.header}>
            <Txt size={22} weight="semibold">
              {strings.newPost}
            </Txt>
            <IconButton icon={X} label="Close" onPress={() => router.back()} />
          </View>
        }>
        <View style={styles.inputWrap}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={strings.postPlaceholder}
            placeholderTextColor={colors.textFaint}
            multiline
            maxLength={500}
            autoFocus
            selectionColor={colors.accent}
            style={styles.input}
          />
          <Txt size={11} color={colors.textFaint} style={{ alignSelf: 'flex-end' }}>
            {body.length}/500
          </Txt>
        </View>

        {media ? (
          <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.preview}>
            {media.type === 'image' ? (
              <Image
                source={{ uri: media.uri }}
                style={{ width: '100%', aspectRatio: aspect }}
                contentFit="cover"
              />
            ) : (
              <PostVideo uri={media.uri} aspect={aspect} />
            )}
            <View style={styles.removeMedia}>
              <IconButton icon={X} label="Remove" onPress={() => setMedia(null)} size={34} />
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn} style={styles.pickRow}>
            <PressableScale accessibilityRole="button" onPress={() => pick('images')} style={styles.pickBtn}>
              <ImageIcon size={22} color={colors.accentBright} strokeWidth={1.9} />
              <Txt size={14} weight="semibold">
                {strings.addPhoto}
              </Txt>
            </PressableScale>
            <PressableScale accessibilityRole="button" onPress={() => pick('videos')} style={styles.pickBtn}>
              <Film size={22} color={colors.accentBright} strokeWidth={1.9} />
              <Txt size={14} weight="semibold">
                {strings.addVideo}
              </Txt>
              <Txt size={11} color={colors.textFaint}>
                ≤ {MAX_VIDEO_SECONDS}s
              </Txt>
            </PressableScale>
          </Animated.View>
        )}

        <Txt size={13} weight="medium" color={colors.textMuted} style={styles.label}>
          {strings.tagCoin}
        </Txt>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
          {coins.map((c) => {
            const on = c.id === coinId;
            return (
              <PressableScale
                key={c.id}
                scaleTo={0.92}
                onPress={() => setCoinId(on ? null : c.id)}
                style={[
                  styles.coin,
                  on && { borderColor: colors.accent, backgroundColor: colors.accentSoft },
                ]}>
                <CoinAvatar uri={c.image} symbol={c.symbol} size={22} />
                <Txt size={12} weight="semibold">
                  {c.symbol}
                </Txt>
              </PressableScale>
            );
          })}
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  inputWrap: {
    marginHorizontal: space.lg,
    marginTop: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    minHeight: 110,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  preview: { marginHorizontal: space.lg, marginTop: space.lg, borderRadius: radius.md, overflow: 'hidden' },
  removeMedia: { position: 'absolute', top: 10, right: 10 },
  pickRow: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, marginTop: space.lg },
  pickBtn: {
    flex: 1,
    height: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: { paddingHorizontal: space.lg, marginTop: space.xl, marginBottom: space.sm },
  coin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
