import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * Who is using the app: a Supabase account, a guest (browsing only), or nobody yet.
 * The onboarding/guest flags are device-local; the account lives in Supabase Auth.
 */
export type User = { id: string; name: string; email: string };

export type AuthError = 'invalidLogin' | 'emailTaken' | 'checkEmail' | 'network' | 'unknown';

type LocalFlags = { onboarded: boolean; guest: boolean };

type SessionState = LocalFlags & {
  ready: boolean;
  user: User | null;
  signedIn: boolean;
  completeOnboarding: () => void;
  signUp: (name: string, email: string, password: string) => Promise<AuthError | null>;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
  updateName: (name: string) => Promise<boolean>;
  changePassword: (password: string) => Promise<AuthError | null>;
  deleteAccount: () => Promise<boolean>;
};

const KEY = 'callout.session.v1';

const SessionContext = createContext<SessionState | null>(null);

function toUser(session: Session | null, profileName?: string | null): User | null {
  const u = session?.user;
  if (!u) return null;
  const meta = (u.user_metadata?.name as string | undefined)?.trim();
  return { id: u.id, email: u.email ?? '', name: profileName || meta || (u.email ?? '').split('@')[0] };
}

function mapError(message: string | undefined): AuthError {
  const m = (message ?? '').toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'invalidLogin';
  if (m.includes('already registered') || m.includes('already exists')) return 'emailTaken';
  if (m.includes('email not confirmed')) return 'checkEmail';
  if (m.includes('network') || m.includes('fetch')) return 'network';
  return 'unknown';
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<LocalFlags>({ onboarded: false, guest: false });
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    const loadProfileName = async (session: Session | null) => {
      if (!session) return null;
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .maybeSingle();
      return data?.username ?? null;
    };

    Promise.all([
      AsyncStorage.getItem(KEY).catch(() => null),
      supabase.auth
        .getSession()
        .then(({ data }) => data.session)
        .catch(() => null),
    ]).then(async ([raw, session]) => {
      if (!alive) return;
      if (raw) {
        const saved = JSON.parse(raw) as Partial<LocalFlags>;
        setFlags({ onboarded: !!saved.onboarded, guest: !!saved.guest });
      }
      setUser(toUser(session));
      setReady(true);
      const name = await loadProfileName(session).catch(() => null);
      if (alive && name) setUser(toUser(session, name));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser((prev) => {
        const next = toUser(session);
        return next && prev?.id === next.id ? { ...next, name: prev.name } : next;
      });
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const updateFlags = (patch: Partial<LocalFlags>) =>
    setFlags((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });

  const value: SessionState = {
    ...flags,
    ready,
    user,
    signedIn: !!user || flags.guest,
    completeOnboarding: () => updateFlags({ onboarded: true }),
    signUp: async (name, email, password) => {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      if (error) return mapError(error.message);
      // Projects with "Confirm email" on return no session until the link is clicked.
      if (!data.session) return 'checkEmail';
      updateFlags({ onboarded: true, guest: false });
      setUser(toUser(data.session, name));
      return null;
    },
    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return mapError(error.message);
      updateFlags({ onboarded: true, guest: false });
      setUser(toUser(data.session));
      return null;
    },
    continueAsGuest: () => updateFlags({ guest: true, onboarded: true }),
    signOut: async () => {
      updateFlags({ guest: false });
      await supabase.auth.signOut().catch(() => {});
      setUser(null);
    },
    updateName: async (name) => {
      if (!user) return false;
      const clean = name.trim().slice(0, 40);
      const { error } = await supabase.from('profiles').update({ username: clean }).eq('id', user.id);
      if (error) return false;
      await supabase.auth.updateUser({ data: { name: clean } }).catch(() => {});
      setUser({ ...user, name: clean });
      return true;
    },
    changePassword: async (password) => {
      const { error } = await supabase.auth.updateUser({ password });
      return error ? mapError(error.message) : null;
    },
    deleteAccount: async () => {
      if (!user) return false;
      // Remove the user's uploaded media first (the database cascade can't reach storage).
      const { data: files } = await supabase.storage.from('media').list(user.id, { limit: 1000 });
      if (files?.length)
        await supabase.storage.from('media').remove(files.map((f) => `${user.id}/${f.name}`));
      const { error } = await supabase.rpc('delete_my_account');
      if (error) return false;
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      updateFlags({ guest: false });
      setUser(null);
      return true;
    },
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
