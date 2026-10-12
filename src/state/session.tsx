import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * Local session: whether onboarding was seen and who is signed in.
 * Accounts live only on this device until the backend (real auth) exists.
 */
export type User = { name: string; email: string };

type SessionData = { onboarded: boolean; user: User | null; guest: boolean };

type SessionState = SessionData & {
  ready: boolean;
  signedIn: boolean;
  completeOnboarding: () => void;
  signIn: (user: User) => void;
  continueAsGuest: () => void;
  signOut: () => void;
};

const KEY = 'callout.session.v1';
const EMPTY: SessionData = { onboarded: false, user: null, guest: false };

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SessionData>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setData({ ...EMPTY, ...JSON.parse(raw) }))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const update = (patch: Partial<SessionData>) =>
    setData((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });

  const value: SessionState = {
    ...data,
    ready,
    signedIn: !!data.user || data.guest,
    completeOnboarding: () => update({ onboarded: true }),
    signIn: (user) => update({ user, guest: false, onboarded: true }),
    continueAsGuest: () => update({ guest: true, onboarded: true }),
    signOut: () => update({ user: null, guest: false }),
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
