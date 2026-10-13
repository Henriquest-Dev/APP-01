import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { block as blockUser, fetchBlocked, unblock as unblockUser } from '@/lib/safety';
import { useSession } from './session';

type BlocksState = {
  blocked: { id: string; username: string }[];
  isBlocked: (userId: string) => boolean;
  block: (userId: string, username: string) => Promise<void>;
  unblock: (userId: string) => Promise<void>;
};

const BlocksContext = createContext<BlocksState | null>(null);

/** Users I blocked; their posts, calls and messages are hidden everywhere. */
export function BlocksProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [store, setStore] = useState<{ userId?: string; list: { id: string; username: string }[] }>({
    list: [],
  });
  const blocked = useMemo(() => (store.userId === user?.id ? store.list : []), [store, user?.id]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetchBlocked().then((list) => alive && setStore({ userId: user.id, list }));
    return () => {
      alive = false;
    };
  }, [user]);

  const isBlocked = useCallback((id: string) => blocked.some((b) => b.id === id), [blocked]);

  const value: BlocksState = {
    blocked,
    isBlocked,
    block: async (id, username) => {
      await blockUser(id);
      setStore((s) => ({ userId: user?.id, list: [...s.list.filter((b) => b.id !== id), { id, username }] }));
    },
    unblock: async (id) => {
      await unblockUser(id);
      setStore((s) => ({ userId: user?.id, list: s.list.filter((b) => b.id !== id) }));
    },
  };

  return <BlocksContext.Provider value={value}>{children}</BlocksContext.Provider>;
}

export function useBlocks(): BlocksState {
  const ctx = useContext(BlocksContext);
  if (!ctx) throw new Error('useBlocks must be used inside BlocksProvider');
  return ctx;
}
