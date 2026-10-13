import { router } from 'expo-router';
import { Radio, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { parseLiveUrl, startLive } from '@/lib/lives';
import { colors, fonts, radius, space } from '@/theme';

export default function NewLive() {
  const insets = useSafeAreaInsets();
  const [link, setLink] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = link.trim().length > 4 && title.trim().length >= 3;

  const start = async () => {
    if (!valid || busy) return;
    const parsed = parseLiveUrl(link);
    if (typeof parsed === 'string') {
      return setError(parsed === 'needsVideoLink' ? strings.liveNeedsVideoLink : strings.liveBadLink);
    }
    setBusy(true);
    setError(null);
    const result = await startLive(parsed, title);
    if (result === 'ok') {
      haptic.success();
      router.back();
    } else {
      setError(result === 'already' ? strings.liveAlready : strings.callFailed);
      setBusy(false);
    }
  };

  const footer = (
    <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
      <PressableScale
        accessibilityRole="button"
        onPress={start}
        style={[styles.submit, (!valid || busy) && { opacity: 0.5 }]}>
        {busy ? (
          <ActivityIndicator color={colors.accentInk} />
        ) : (
          <>
            <Radio size={18} color={colors.accentInk} strokeWidth={2.4} />
            <Txt size={16} weight="semibold" color={colors.accentInk}>
              {strings.liveStart}
            </Txt>
          </>
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
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        header={
          <View style={styles.header}>
            <Txt size={22} weight="semibold">
              {strings.goLive}
            </Txt>
            <IconButton icon={X} label="Close" onPress={() => router.back()} />
          </View>
        }>
        <Txt size={14} color={colors.textMuted} style={styles.pad}>
          {strings.liveHowTo}
        </Txt>

        <Label text={strings.liveLinkLabel} />
        <TextInput
          value={link}
          onChangeText={setLink}
          placeholder={strings.liveLinkPlaceholder}
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          maxLength={300}
          selectionColor={colors.accent}
          style={styles.input}
        />
        <Txt size={12} color={colors.textFaint} style={[styles.pad, { marginTop: space.sm }]}>
          {strings.liveSupported}
        </Txt>

        <Label text={strings.liveTitleLabel} />
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={strings.liveTitlePlaceholder}
          placeholderTextColor={colors.textFaint}
          maxLength={80}
          selectionColor={colors.accent}
          style={styles.input}
        />

        {error ? (
          <Txt size={13} color={colors.down} style={[styles.pad, { marginTop: space.md }]}>
            {error}
          </Txt>
        ) : null}
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

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  pad: { paddingHorizontal: space.lg },
  label: { paddingHorizontal: space.lg, marginTop: space.xl, marginBottom: space.sm },
  input: {
    marginHorizontal: space.lg,
    height: 54,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
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
    flexDirection: 'row',
    gap: space.sm,
  },
});
