import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Camera, ChevronRight, Sticker as StickerIcon, Trash2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { IconButton } from '@/components/icon-button';
import { LabelChips } from '@/components/label-chips';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { setAvatarCache } from '@/lib/avatars';
import { BANNER_KEYS, bannerColors, type BannerKey } from '@/lib/banners';
import { haptic } from '@/lib/haptics';
import {
  addLabel,
  fetchLabels,
  pickImage,
  removeLabel,
  saveProfile,
  type Label,
  type ProcessedImage,
} from '@/lib/profile';
import { fetchCard, type ProfileCard } from '@/lib/social';
import { useSession } from '@/state/session';
import { colors, fonts, radius, space } from '@/theme';

type Pending = ProcessedImage | null | undefined; // undefined = unchanged, null = remove

export default function EditProfile() {
  const insets = useSafeAreaInsets();
  const { user, updateName } = useSession();
  const userId = user?.id;
  const [card, setCard] = useState<ProfileCard | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [bannerColor, setBannerColor] = useState<BannerKey | null>(null);
  const [avatar, setAvatar] = useState<Pending>(undefined);
  const [banner, setBanner] = useState<Pending>(undefined);
  const [labelText, setLabelText] = useState('');
  const [labelColor, setLabelColor] = useState<BannerKey>('violet');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    Promise.all([fetchCard(userId), fetchLabels(userId)]).then(([c, l]) => {
      if (!alive) return;
      setCard(c);
      setLabels(l);
      if (c) {
        setBio(c.bio);
        setLocation(c.location);
        setWebsite(c.website);
        setBannerColor((c.bannerColor as BannerKey | null) ?? null);
      }
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  const choose = async (kind: 'avatar' | 'banner') => {
    setError(null);
    const img = await pickImage(kind).catch(() => null);
    if (!img) return;
    if (kind === 'avatar') setAvatar(img);
    else setBanner(img);
  };

  const onAddLabel = async () => {
    const text = labelText.trim();
    if (text.length < 2) return;
    setError(null);
    const r = await addLabel(text, labelColor);
    if (r === 'ok') {
      haptic.tap();
      setLabelText('');
      if (userId) setLabels(await fetchLabels(userId));
    } else
      setError(
        r === 'duplicate' ? strings.labelDuplicate : r === 'limit' ? strings.labelLimit : strings.callFailed,
      );
  };

  const onRemoveLabel = async (l: Label) => {
    setLabels((prev) => prev.filter((x) => x.id !== l.id));
    await removeLabel(l.id);
  };

  const save = async () => {
    if (!userId || !card || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (name.trim() && name.trim() !== user?.name) await updateName(name.trim());
      const { avatarUrl } = await saveProfile(
        userId,
        card,
        { bio, location, website, bannerColor },
        { avatar, banner },
      );
      if (avatar !== undefined) setAvatarCache(userId, avatarUrl);
      haptic.success();
      router.back();
    } catch {
      setError(strings.imageFailed);
      setBusy(false);
    }
  };

  const [ca, cb] = bannerColors(bannerColor ?? 'violet');
  const bannerUri = banner === undefined ? card?.bannerUrl : banner?.uri;
  const avatarUri = avatar === undefined ? card?.avatarUrl : (avatar?.uri ?? null);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        withTabBar={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        header={
          <View style={styles.header}>
            <IconButton icon={X} label="Close" onPress={() => router.back()} />
            <Txt size={17} weight="semibold">
              {strings.editProfile}
            </Txt>
            <PressableScale
              accessibilityRole="button"
              onPress={save}
              style={[styles.saveBtn, (busy || !card) && { opacity: 0.5 }]}>
              {busy ? (
                <ActivityIndicator color={colors.accentInk} size="small" />
              ) : (
                <Txt size={14} weight="bold" color={colors.accentInk}>
                  {strings.save}
                </Txt>
              )}
            </PressableScale>
          </View>
        }>
        {/* Banner + photo */}
        <PressableScale scaleTo={0.99} onPress={() => choose('banner')} style={styles.banner}>
          {bannerUri ? (
            <Image source={{ uri: bannerUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={[ca, cb]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={styles.cameraBadge}>
            <Camera size={18} color="#FFFFFF" strokeWidth={2} />
          </View>
          {bannerUri ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={strings.removeImage}
              scaleTo={0.9}
              onPress={() => setBanner(null)}
              style={[styles.cameraBadge, { right: undefined, left: space.lg }]}>
              <Trash2 size={17} color="#FFFFFF" strokeWidth={2} />
            </PressableScale>
          ) : null}
        </PressableScale>
        <View style={styles.rowBetween}>
          <PressableScale scaleTo={0.96} onPress={() => choose('avatar')} style={styles.avatarWrap}>
            <Avatar userId={userId} name={name || user?.name || '?'} size={84} uri={avatarUri} ring />
            <View style={[styles.cameraBadge, { right: -2, bottom: 2 }]}>
              <Camera size={16} color="#FFFFFF" strokeWidth={2} />
            </View>
          </PressableScale>
          {avatarUri ? (
            <View style={{ marginBottom: 6 }}>
              <Pill label={strings.removeImage} onPress={() => setAvatar(null)} />
            </View>
          ) : null}
        </View>

        <Txt size={13} weight="medium" color={colors.textMuted} style={styles.label}>
          {strings.profileBanner}
        </Txt>
        <View style={styles.swatches}>
          {BANNER_KEYS.map((k) => (
            <PressableScale
              key={k}
              accessibilityRole="button"
              accessibilityLabel={k}
              scaleTo={0.9}
              onPress={() => {
                setBannerColor(k);
                setBanner(null);
              }}
              style={[
                styles.swatch,
                { backgroundColor: bannerColors(k)[0] },
                bannerColor === k && !bannerUri && styles.swatchOn,
              ]}>
              {null}
            </PressableScale>
          ))}
        </View>

        <Field label={strings.username} value={name} onChange={setName} max={40} />
        <Field
          label={strings.bioLabel}
          value={bio}
          onChange={setBio}
          max={160}
          multiline
          placeholder={strings.bioPlaceholder}
        />
        <Field label={strings.locationLabel} value={location} onChange={setLocation} max={40} />
        <Field
          label={strings.websiteLabel}
          value={website}
          onChange={setWebsite}
          max={120}
          placeholder={strings.websitePlaceholder}
          url
        />

        {/* Labels */}
        <Txt size={15} weight="semibold" style={[styles.pad, { marginTop: space.xl }]}>
          {strings.labelsTitle}
        </Txt>
        <Txt size={12} color={colors.textMuted} style={[styles.pad, { marginBottom: space.sm }]}>
          {strings.labelsHint}
        </Txt>
        <View style={styles.pad}>
          <LabelChips labels={labels} onRemove={onRemoveLabel} />
        </View>
        {labels.length < 6 ? (
          <View style={{ gap: space.sm, marginTop: space.md }}>
            <View style={[styles.pad, { flexDirection: 'row', gap: space.sm }]}>
              <TextInput
                value={labelText}
                onChangeText={setLabelText}
                placeholder={strings.labelPlaceholder}
                placeholderTextColor={colors.textFaint}
                maxLength={20}
                selectionColor={colors.accent}
                onSubmitEditing={onAddLabel}
                style={[styles.input, { flex: 1, marginHorizontal: 0, minWidth: 0 }]}
              />
              <PressableScale
                accessibilityRole="button"
                onPress={onAddLabel}
                style={[styles.addBtn, labelText.trim().length < 2 && { opacity: 0.4 }]}>
                <Txt size={14} weight="bold" color={colors.accentInk}>
                  {strings.addLabel}
                </Txt>
              </PressableScale>
            </View>
            <View style={styles.swatches}>
              {BANNER_KEYS.map((k) => (
                <PressableScale
                  key={k}
                  accessibilityRole="button"
                  accessibilityLabel={k}
                  scaleTo={0.9}
                  onPress={() => setLabelColor(k)}
                  style={[
                    styles.swatchSm,
                    { backgroundColor: bannerColors(k)[0] },
                    labelColor === k && styles.swatchOn,
                  ]}>
                  {null}
                </PressableScale>
              ))}
            </View>
          </View>
        ) : null}

        {/* Stickers */}
        <PressableScale scaleTo={0.98} onPress={() => router.push('/stickers')} style={styles.stickersRow}>
          <StickerIcon size={20} color={colors.accent} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Txt size={15} weight="semibold">
              {strings.stickersTitle}
            </Txt>
            <Txt size={12} color={colors.textMuted}>
              {strings.stickersHint}
            </Txt>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </PressableScale>

        {error ? (
          <Txt size={13} color={colors.down} style={[styles.pad, { marginTop: space.md }]}>
            {error}
          </Txt>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Pill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" scaleTo={0.94} onPress={onPress} style={styles.pill}>
      <Trash2 size={13} color={colors.textMuted} strokeWidth={2} />
      <Txt size={12} color={colors.textMuted}>
        {label}
      </Txt>
    </PressableScale>
  );
}

function Field({
  label,
  value,
  onChange,
  max,
  multiline,
  placeholder,
  url,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  multiline?: boolean;
  placeholder?: string;
  url?: boolean;
}) {
  return (
    <View>
      <Txt size={13} weight="medium" color={colors.textMuted} style={styles.label}>
        {label}
      </Txt>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        maxLength={max}
        multiline={multiline}
        autoCapitalize={url ? 'none' : 'sentences'}
        autoCorrect={!url}
        keyboardType={url ? 'url' : 'default'}
        selectionColor={colors.accent}
        style={[styles.input, multiline && { height: 96, textAlignVertical: 'top', paddingTop: 14 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
  },
  saveBtn: {
    height: 38,
    minWidth: 78,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: { height: 132, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  cameraBadge: {
    position: 'absolute',
    right: space.lg,
    bottom: space.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    marginTop: -44,
  },
  avatarWrap: { width: 84, height: 84 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pad: { paddingHorizontal: space.lg },
  label: { paddingHorizontal: space.lg, marginTop: space.lg, marginBottom: space.sm },
  swatches: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  swatchSm: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: '#FFFFFF' },
  input: {
    marginHorizontal: space.lg,
    height: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  addBtn: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.lg,
    marginTop: space.xl,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
