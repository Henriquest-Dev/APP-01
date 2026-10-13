import { useEffect, useRef, useState } from 'react';

import { fetchCallsByIds, fetchMessages, fetchUsernames, type FeedCall, type Message } from '@/lib/community';
import { supabase } from '@/lib/supabase';

/** Chat of one group, newest first, kept live with Realtime. Also loads shared calls. */
export function useMessages(groupId: string | undefined, canRead: boolean) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [calls, setCalls] = useState<Record<string, FeedCall>>({});
  const names = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!groupId || !canRead) return;
    let alive = true;

    const loadCalls = async (ids: (string | null)[]) => {
      const wanted = ids.filter((id): id is string => !!id);
      if (!wanted.length) return;
      const found = await fetchCallsByIds(wanted);
      if (alive) setCalls((prev) => ({ ...prev, ...found }));
    };

    fetchMessages(groupId).then((rows) => {
      if (!alive) return;
      for (const m of rows) names.current[m.userId] = m.username;
      setMessages(rows);
      loadCalls(rows.map((m) => m.callId));
    });

    const channel = supabase
      .channel(`chat-${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        async (p) => {
          const r = p.new as {
            id: number;
            group_id: string;
            user_id: string;
            body: string;
            call_id: string | null;
            created_at: string;
          };
          if (!names.current[r.user_id]) Object.assign(names.current, await fetchUsernames([r.user_id]));
          if (!alive) return;
          const msg: Message = {
            id: r.id,
            groupId: r.group_id,
            userId: r.user_id,
            username: names.current[r.user_id] ?? '',
            body: r.body,
            callId: r.call_id,
            createdAt: Date.parse(r.created_at),
          };
          setMessages((prev) => (prev?.some((m) => m.id === msg.id) ? prev : [msg, ...(prev ?? [])]));
          loadCalls([msg.callId]);
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [groupId, canRead]);

  return { messages, calls };
}
