import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { colors, fonts, radius, space } from '@/theme';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  /** Show a text field (edit name, new password); omit for a plain confirmation. */
  input?: { initial?: string; placeholder?: string; secure?: boolean; maxLength?: number };
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: (value: string) => Promise<string | null | void>;
  onClose: () => void;
};

/** Centered dialog used for edits and confirmations; onConfirm returns an error text to show, or nothing. */
export function PromptModal({
  visible,
  title,
  message,
  input,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onClose,
}: Props) {
  const [value, setValue] = useState(input?.initial ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await onConfirm(value);
    setBusy(false);
    if (result) setError(result);
    else onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => {
        setValue(input?.initial ?? '');
        setError(null);
      }}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <Txt size={18} weight="semibold">
            {title}
          </Txt>
          {message ? (
            <Txt size={14} color={colors.textMuted} style={{ lineHeight: 20 }}>
              {message}
            </Txt>
          ) : null}
          {input ? (
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder={input.placeholder}
              placeholderTextColor={colors.textFaint}
              secureTextEntry={input.secure}
              maxLength={input.maxLength}
              autoFocus
              autoCapitalize={input.secure ? 'none' : 'words'}
              selectionColor={colors.accent}
              style={styles.input}
            />
          ) : null}
          {error ? (
            <Txt size={13} color={colors.down}>
              {error}
            </Txt>
          ) : null}
          <View style={styles.buttons}>
            <PressableScale onPress={onClose} style={[styles.btn, styles.cancel]}>
              <Txt size={15} weight="semibold">
                {cancelLabel}
              </Txt>
            </PressableScale>
            <PressableScale
              onPress={confirm}
              style={[styles.btn, { backgroundColor: destructive ? colors.down : colors.accent }]}>
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Txt
                  size={15}
                  weight="semibold"
                  color="#FFFFFF"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ paddingHorizontal: 8 }}>
                  {confirmLabel}
                </Txt>
              )}
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: space.xl },
  card: {
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  input: {
    height: 50,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  buttons: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  btn: { flex: 1, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  cancel: { backgroundColor: colors.surfaceRaised },
});
