import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  Sparkles,
  AtSign,
  Ban,
  Bookmark,
  ChevronLeft,
  FileText,
  Globe,
  Info,
  KeyRound,
  LogIn,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Vibrate,
} from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AnimatedLogo } from '@/components/animated-logo';
import { Glass } from '@/components/glass';
import { IconButton } from '@/components/icon-button';
import { PromptModal } from '@/components/prompt-modal';
import { Screen } from '@/components/screen';
import { SettingsRow } from '@/components/settings-row';
import { Txt } from '@/components/text';
import { LANGUAGES, strings } from '@/i18n';
import { haptic, hapticsEnabled, setHapticsEnabled } from '@/lib/haptics';
import { useBlocks } from '@/state/blocks';
import { useLanguage } from '@/state/language';
import { usePro } from '@/state/pro';
import { useSession } from '@/state/session';
import { colors, motion, radius, space } from '@/theme';

type Dialog = 'name' | 'password' | 'delete' | 'signOut' | null;

export default function Settings() {
  const { language } = useLanguage();
  const { pro } = usePro();
  const { user, guest, signOut, updateName, changePassword, deleteAccount } = useSession();
  const { blocked } = useBlocks();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [haptics, setHaptics] = useState(hapticsEnabled());

  const languageName = LANGUAGES.find((l) => l.code === language)?.name ?? '';

  return (
    <Screen
      withTabBar={false}
      header={
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
          <Txt size={17} weight="semibold">
            {strings.settings}
          </Txt>
          <View style={{ width: 42 }} />
        </View>
      }>
      {user ? (
        <Animated.View entering={FadeInDown.duration(motion.base)}>
          <Glass style={styles.profile}>
            <View style={styles.avatar}>
              <Txt size={20} weight="bold" color={colors.accentInk}>
                {user.name[0]?.toUpperCase()}
              </Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt size={17} weight="semibold" numberOfLines={1}>
                {user.name}
              </Txt>
              <Txt size={13} color={colors.textMuted} numberOfLines={1}>
                {user.email}
              </Txt>
            </View>
          </Glass>
        </Animated.View>
      ) : null}

      <Section title={strings.account}>
        {user ? (
          <>
            <SettingsRow
              first
              icon={AtSign}
              label={strings.username}
              value={user.name}
              onPress={() => setDialog('name')}
            />
            <SettingsRow
              icon={KeyRound}
              label={strings.changePassword}
              onPress={() => setDialog('password')}
            />
            <SettingsRow icon={LogOut} label={strings.signOut} onPress={() => setDialog('signOut')} />
            <SettingsRow
              icon={Trash2}
              label={strings.deleteAccount}
              destructive
              onPress={() => setDialog('delete')}
            />
          </>
        ) : (
          <SettingsRow first icon={LogIn} label={guest ? strings.signUp : strings.signIn} onPress={signOut} />
        )}
      </Section>

      <Section title="Callout Pro">
        <SettingsRow
          first
          icon={Sparkles}
          label="Callout Pro"
          value={pro ? strings.proActive : undefined}
          onPress={() => router.push('/pro')}
        />
      </Section>

      <Section title={strings.preferences}>
        <SettingsRow
          first
          icon={Globe}
          label={strings.language}
          value={languageName}
          onPress={() => router.push('/settings/language')}
        />
        <SettingsRow
          icon={Vibrate}
          label={strings.vibration}
          right={
            <Switch
              value={haptics}
              onValueChange={(on) => {
                setHaptics(on);
                setHapticsEnabled(on);
                if (on) haptic.tap();
              }}
              trackColor={{ false: colors.surfaceRaised, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          }
        />
      </Section>

      {user ? (
        <Section title={strings.privacySafety}>
          <SettingsRow
            first
            icon={Bookmark}
            label={strings.savedPosts}
            onPress={() => router.push('/saved')}
          />
          <SettingsRow
            icon={Ban}
            label={strings.blockedUsers}
            value={blocked.length ? String(blocked.length) : undefined}
            onPress={() => router.push('/settings/blocked')}
          />
        </Section>
      ) : null}

      <Section title={strings.about}>
        <SettingsRow
          first
          icon={FileText}
          label={strings.termsOfService}
          onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })}
        />
        <SettingsRow
          icon={ShieldCheck}
          label={strings.privacyPolicy}
          onPress={() => router.push({ pathname: '/legal', params: { doc: 'privacy' } })}
        />
        <SettingsRow
          icon={ShieldAlert}
          label={strings.riskNotice}
          onPress={() => router.push({ pathname: '/legal', params: { doc: 'risk' } })}
        />
        <SettingsRow icon={Info} label={strings.version} value={Constants.expoConfig?.version ?? '1.0.0'} />
      </Section>

      <View style={styles.brand}>
        <AnimatedLogo size={40} />
        <Txt size={12} color={colors.textFaint}>
          Callout · {strings.disclaimer}
        </Txt>
      </View>

      <PromptModal
        visible={dialog === 'name'}
        title={strings.username}
        input={{ initial: user?.name, placeholder: strings.namePlaceholder, maxLength: 40 }}
        confirmLabel={strings.save}
        cancelLabel={strings.cancel}
        onConfirm={async (v) =>
          v.trim().length < 1 ? strings.nameRequired : (await updateName(v)) ? null : strings.callFailed
        }
        onClose={() => setDialog(null)}
      />
      <PromptModal
        visible={dialog === 'password'}
        title={strings.changePassword}
        message={strings.passwordHint}
        input={{ placeholder: strings.newPassword, secure: true, maxLength: 72 }}
        confirmLabel={strings.save}
        cancelLabel={strings.cancel}
        onConfirm={async (v) => {
          if (v.length < 8) return strings.shortPassword;
          const err = await changePassword(v);
          return err ? strings.authUnknown : null;
        }}
        onClose={() => setDialog(null)}
      />
      <PromptModal
        visible={dialog === 'signOut'}
        title={strings.signOut}
        message={strings.signOutConfirm}
        confirmLabel={strings.signOut}
        cancelLabel={strings.cancel}
        onConfirm={async () => {
          await signOut();
        }}
        onClose={() => setDialog(null)}
      />
      <PromptModal
        visible={dialog === 'delete'}
        title={strings.deleteAccount}
        message={strings.deleteAccountWarning}
        input={{ placeholder: strings.typeDelete, maxLength: 20 }}
        destructive
        confirmLabel={strings.deleteForever}
        cancelLabel={strings.cancel}
        onConfirm={async (v) => {
          if (v.trim().toUpperCase() !== strings.deleteWord.toUpperCase()) return strings.typeDelete;
          return (await deleteAccount()) ? null : strings.callFailed;
        }}
        onClose={() => setDialog(null)}
      />
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.duration(motion.base)}>
      <Txt size={12} weight="semibold" color={colors.textMuted} style={styles.sectionTitle}>
        {title.toUpperCase()}
      </Txt>
      <Glass style={styles.card}>{children}</Glass>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.lg,
    marginTop: space.md,
    padding: space.lg,
    borderRadius: radius.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    paddingHorizontal: space.xl,
    marginTop: space.xl,
    marginBottom: space.sm,
    letterSpacing: 0.6,
  },
  card: { marginHorizontal: space.lg, borderRadius: radius.md },
  brand: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.xl, marginTop: space.xxl },
});
