import { createContext, useContext, useState, type ReactNode } from 'react';

import type { Call } from '@/lib/types';

type CallsState = {
  calls: Call[];
  addCall: (call: Omit<Call, 'id' | 'createdAt'>) => void;
};

const CallsContext = createContext<CallsState | null>(null);

/** In-memory for now; calls move to the backend (and get auto-resolved) next phase. */
export function CallsProvider({ children }: { children: ReactNode }) {
  const [calls, setCalls] = useState<Call[]>([]);

  const addCall: CallsState['addCall'] = (call) =>
    setCalls((prev) => [{ ...call, id: `${Date.now()}`, createdAt: Date.now() }, ...prev]);

  return <CallsContext.Provider value={{ calls, addCall }}>{children}</CallsContext.Provider>;
}

export function useCalls(): CallsState {
  const ctx = useContext(CallsContext);
  if (!ctx) throw new Error('useCalls must be used inside CallsProvider');
  return ctx;
}
