import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Globe, Lock, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { createGroup } from '@/lib/community';
import { colors, fonts, radius, space } from '@/theme';

type Privacy = 'public' | 'private';

export default function NewGroup() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<Privacy>('public');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = name.trim().length >= 3 && name.trim().length <= 40;

  const create = async () => {
    if (!valid) return setError(strings.groupNameShort);
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createGroup(name, description, privacy === 'public');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: '/group/[id]', params: { id } });
    } catch {
      setError(strings.callFailed);
      setBusy(false);
    }
  };

  const footer = (
    <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
      <PressableScale
        accessibilityRole="button"
        onPress={create}
        style={[styles.submit, (!valid || busy) && { opacity: 0.5 }]}>
        {busy ? (
          <ActivityIndicator color={colors.accentInk} />
        ) : (
          <Txt size={16} weight="semibold" color={colors.accentInk}>
            {strings.create}
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
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        header={
          <View style={styles.header}>
            <Txt size={22} weight="semibold">
              {strings.createGroup}
            </Txt>
            <IconButton icon={X} label="Close" onPress={() => router.back()} />
          </View>
        }>
        <Label text={strings.groupName} />
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={strings.groupNamePlaceholder}
          placeholderTextColor={colors.textFaint}
          maxLength={40}
          selectionColor={colors.accent}
          style={styles.input}
        />
        <Label text={strings.groupDescription} />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="…"
          placeholderTextColor={colors.textFaint}
          maxLength={200}
          multiline
          selectionColor={colors.accent}
          style={[styles.input, { height: 96, textAlignVertical: 'top', paddingTop: 14 }]}
        />
        <Label text={strings.privacy} />
        <View style={{ paddingHorizontal: space.lg }}>
          <Segmented<Privacy>
            value={privacy}
            onChange={setPrivacy}
            options={[
              { value: 'public', label: strings.publicGroup },
              { value: 'private', label: strings.privateGroup },
            ]}
          />
        </View>
        <View style={styles.hint}>
          {privacy === 'public' ? (
            <Globe size={16} color={colors.textMuted} strokeWidth={1.9} />
          ) : (
            <Lock size={16} color={colors.textMuted} strokeWidth={1.9} />
          )}
          <Txt size={13} color={colors.textMuted} style={{ flex: 1 }}>
            {privacy === 'public' ? strings.publicHint : strings.privateHint}
          </Txt>
        </View>
        {error ? (
          <Txt size={13} color={colors.down} style={{ paddingHorizontal: space.lg, marginTop: space.md }}>
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
  hint: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, marginTop: space.md },
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
