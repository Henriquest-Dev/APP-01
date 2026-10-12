import { router } from 'expo-router';
import { ChevronLeft, Eye, EyeOff, Lock, Mail, UserRound, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { useSession } from '@/state/session';
import { colors, fonts, motion, radius, space } from '@/theme';

type Mode = 'signUp' | 'signIn';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Auth() {
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();
  const [mode, setMode] = useState<Mode>('signUp');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (mode === 'signUp' && !name.trim()) return setError(strings.nameRequired);
    if (!EMAIL.test(email.trim())) return setError(strings.invalidEmail);
    if (password.length < 8) return setError(strings.shortPassword);
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    signIn({ name: name.trim() || cleanEmail.split('@')[0], email: cleanEmail });
  };

  const footer = (
    <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
      <PressableScale accessibilityRole="button" onPress={submit} style={styles.submit}>
        <Txt size={16} weight="semibold" color={colors.accentInk}>
          {mode === 'signUp' ? strings.signUp : strings.signIn}
        </Txt>
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
            <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
          </View>
        }>
        <Animated.View
          key={mode}
          entering={FadeInDown.duration(motion.base)}
          exiting={FadeOut.duration(100)}
          style={styles.titleWrap}>
          <Txt size={32} weight="display" style={{ lineHeight: 40 }}>
            {mode === 'signUp' ? strings.signUpTitle : strings.signInTitle}
          </Txt>
        </Animated.View>

        <View style={{ paddingHorizontal: space.lg, marginTop: space.xl }}>
          <Segmented<Mode>
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
            options={[
              { value: 'signUp', label: strings.signUp },
              { value: 'signIn', label: strings.signIn },
            ]}
          />
        </View>

        <Animated.View layout={LinearTransition.duration(motion.base)} style={styles.form}>
          {mode === 'signUp' ? (
            <Animated.View entering={FadeIn.duration(motion.base)} exiting={FadeOut.duration(motion.fast)}>
              <Field
                icon={UserRound}
                label={strings.nameLabel}
                value={name}
                onChangeText={setName}
                placeholder={strings.namePlaceholder}
                autoCapitalize="words"
                textContentType="name"
              />
            </Animated.View>
          ) : null}
          <Animated.View layout={LinearTransition.duration(motion.base)}>
            <Field
              icon={Mail}
              label={strings.emailLabel}
              value={email}
              onChangeText={setEmail}
              placeholder="nome@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </Animated.View>
          <Animated.View layout={LinearTransition.duration(motion.base)}>
            <Field
              icon={Lock}
              label={strings.passwordLabel}
              value={password}
              onChangeText={setPassword}
              placeholder={strings.passwordHint}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
              right={
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10} accessibilityRole="button">
                  {showPassword ? (
                    <EyeOff size={18} color={colors.textMuted} strokeWidth={1.9} />
                  ) : (
                    <Eye size={18} color={colors.textMuted} strokeWidth={1.9} />
                  )}
                </Pressable>
              }
            />
          </Animated.View>

          {error ? (
            <Animated.View entering={FadeInDown.duration(motion.fast)}>
              <Txt size={13} color={colors.down}>
                {error}
              </Txt>
            </Animated.View>
          ) : null}
        </Animated.View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Field({
  icon: Icon,
  label,
  right,
  ...input
}: TextInputProps & { icon: LucideIcon; label: string; right?: React.ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Txt size={13} weight="medium" color={colors.textMuted}>
        {label}
      </Txt>
      <View style={[styles.field, focused && styles.fieldFocused]}>
        <Icon size={18} color={focused ? colors.accentBright : colors.textMuted} strokeWidth={1.9} />
        <TextInput
          {...input}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.accent}
          style={styles.input}
        />
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', paddingHorizontal: space.lg },
  titleWrap: { paddingHorizontal: space.lg, marginTop: space.md },
  form: { paddingHorizontal: space.lg, marginTop: space.xl, gap: space.lg },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    height: 54,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldFocused: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  input: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15, height: '100%' },
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
