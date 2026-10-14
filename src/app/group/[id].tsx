import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Ban,
  ChevronLeft,
  Flag,
  Globe,
  Lock,
  LogOut,
  Megaphone,
  SendHorizontal,
  Share2,
  Sticker as StickerIcon,
  X,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/action-sheet';
import { Background } from '@/components/background';
import { FeedCallCard } from '@/components/feed-call-card';
import { StickerGrid } from '@/components/sticker-grid';
import { fetchStickers, type Sticker } from '@/lib/profile';
import { GroupBanner } from '@/components/group-banner';
import { IconButton } from '@/components/icon-button';
import { LiveDot } from '@/components/live-dot';
import { PressableScale } from '@/components/pressable-scale';
import { Txt } from '@/components/text';
import { useMessages } from '@/hooks/use-messages';
import { strings } from '@/i18n';
import {
  fetchGroup,
  isMember,
  joinGroup,
  leaveGroup,
  sendMessage,
  type Group,
  type Message,
} from '@/lib/community';
import { formatAgo, formatPrice } from '@/lib/format';
import { report } from '@/lib/safety';
import { useBlocks } from '@/state/blocks';
import { useCalls } from '@/state/calls';
import { useMarket } from '@/state/market';
import { useSession } from '@/state/session';
import { colors, fonts, radius, space } from '@/theme';

export default function GroupChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { calls: myCalls } = useCalls();
  const { coins } = useMarket();

  const [group, setGroup] = useState<Group | null | undefined>(undefined);
  const [member, setMember] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [tray, setTray] = useState(false);
  const [myStickers, setMyStickers] = useState<Sticker[]>([]);

  useEffect(() => {
    let alive = true;
    fetchGroup(id).then((g) => alive && setGroup(g));
    if (user) isMember(id, user.id).then((m) => alive && setMember(m));
    return () => {
      alive = false;
    };
  }, [id, user]);

  const canRead = !!group && (group.isPublic || member);
  const { isBlocked, block } = useBlocks();
  const [selected, setSelected] = useState<Message | null>(null);
  const { messages: rawMessages, calls, stickers } = useMessages(id, canRead);
  const messages = rawMessages?.filter((m) => !isBlocked(m.userId)) ?? null;

  const send = async (callId?: string, stickerId?: string) => {
    const body = text.trim();
    if ((!body && !callId && !stickerId) || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(id, callId || stickerId ? '' : body, callId, stickerId);
      if (!callId && !stickerId) setText('');
    } catch (e) {
      setError(
        String((e as Error).message).includes('slow down') ? strings.tooManyMessages : strings.callFailed,
      );
    } finally {
      setSending(false);
    }
  };

  const join = async () => {
    if (!user) return setError(strings.accountNeeded);
    try {
      await joinGroup(id, user.id);
      setMember(true);
      setGroup(await fetchGroup(id));
    } catch {
      setError(strings.callFailed);
    }
  };

  const leave = async () => {
    if (!user) return;
    try {
      await leaveGroup(id, user.id);
      router.back();
    } catch {
      setError(strings.callFailed);
    }
  };

  const share = () => {
    if (!group) return;
    Share.share({
      message: strings.shareInvite.replace('{name}', group.name).replace('{code}', group.inviteCode),
    });
  };

  const isOwner = !!group && !!user && group.ownerId === user.id;
  const openCalls = myCalls.filter((c) => c.status === 'open');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.root, { paddingTop: insets.top + space.sm }]}>
        <Background />
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
          <View style={styles.headerTitle}>
            <Txt size={16} weight="semibold" numberOfLines={1}>
              {group?.name ?? ''}
            </Txt>
            {group ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {group.isPublic ? (
                  <Globe size={11} color={colors.textMuted} strokeWidth={2} />
                ) : (
                  <Lock size={11} color={colors.textMuted} strokeWidth={2} />
                )}
                <Txt size={12} color={colors.textMuted}>
                  {group.memberCount} {strings.members}
                </Txt>
              </View>
            ) : null}
          </View>
          {member ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <IconButton icon={Share2} label={strings.inviteCode} onPress={share} size={38} />
              {!isOwner ? (
                <IconButton icon={LogOut} label={strings.leaveGroup} onPress={leave} size={38} />
              ) : null}
            </View>
          ) : (
            <LiveDot />
          )}
        </View>

        {group ? (
          <View style={styles.bannerWrap}>
            <GroupBanner banner={group.banner} name={group.name} style={styles.banner} />
            {group.description ? (
              <Txt size={13} color="#FFFFFF" numberOfLines={2} style={styles.bannerText}>
                {group.description}
              </Txt>
            ) : null}
          </View>
        ) : null}

        {member && !group?.isPublic && group ? (
          <Pressable onPress={share} style={styles.codeBanner}>
            <Txt size={12} color={colors.textMuted}>
              {strings.inviteCode}:{' '}
              <Txt size={12} weight="bold" color={colors.accentBright} style={{ letterSpacing: 2 }}>
                {group.inviteCode}
              </Txt>
            </Txt>
          </Pressable>
        ) : null}

        {group === undefined || (canRead && messages === null) ? (
          <ActivityIndicator color={colors.accent} style={{ flex: 1 }} />
        ) : !group ? (
          <View style={styles.center}>
            <Txt color={colors.textMuted}>{strings.invalidCode}</Txt>
          </View>
        ) : (
          <FlatList
            inverted
            data={messages ?? []}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={{ padding: space.lg, gap: space.sm }}
            ListEmptyComponent={
              <View style={[styles.center, { transform: [{ scaleY: -1 }] }]}>
                <Txt size={14} color={colors.textMuted}>
                  {strings.noMessages}
                </Txt>
              </View>
            }
            renderItem={({ item, index }) => (
              <Bubble
                onLongPress={item.userId !== user?.id ? () => setSelected(item) : undefined}
                message={item}
                mine={item.userId === user?.id}
                showName={(messages ?? [])[index + 1]?.userId !== item.userId}
                call={item.callId ? calls[item.callId] : undefined}
                sticker={item.stickerId ? stickers[item.stickerId] : undefined}
                livePrice={
                  item.callId ? coins.find((c) => c.id === calls[item.callId!]?.coinId)?.price : undefined
                }
              />
            )}
          />
        )}

        <View style={[styles.composer, { paddingBottom: insets.bottom + space.sm }]}>
          {error ? (
            <Txt size={12} color={colors.down} style={{ marginBottom: 6 }}>
              {error}
            </Txt>
          ) : null}
          {member ? (
            <View style={styles.inputRow}>
              <IconButton
                icon={Megaphone}
                label={strings.shareCall}
                onPress={() => setPicker(true)}
                size={44}
              />
              <IconButton
                icon={StickerIcon}
                label={strings.stickersTitle}
                onPress={() => {
                  setTray(true);
                  if (user) fetchStickers(user.id).then(setMyStickers);
                }}
                size={44}
              />
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={strings.messagePlaceholder}
                placeholderTextColor={colors.textFaint}
                selectionColor={colors.accent}
                multiline
                maxLength={1000}
                style={styles.input}
              />
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Send"
                onPress={() => send()}
                scaleTo={0.9}
                style={[styles.send, !text.trim() && { opacity: 0.4 }]}>
                {sending ? (
                  <ActivityIndicator color={colors.accentInk} size="small" />
                ) : (
                  <SendHorizontal size={20} color={colors.accentInk} strokeWidth={2.2} />
                )}
              </PressableScale>
            </View>
          ) : group?.isPublic ? (
            <PressableScale accessibilityRole="button" onPress={join} style={styles.joinBtn}>
              <Txt size={15} weight="semibold" color={colors.accentInk}>
                {strings.join}
              </Txt>
            </PressableScale>
          ) : null}
        </View>

        <ActionSheet
          visible={!!selected}
          onClose={() => setSelected(null)}
          actions={
            selected
              ? [
                  {
                    label: strings.report,
                    icon: Flag,
                    onPress: () =>
                      report('message', String(selected.id))
                        .then(() => setError(strings.reportThanks))
                        .catch(() => setError(strings.callFailed)),
                  },
                  {
                    label: `${strings.blockUser} @${selected.username}`,
                    icon: Ban,
                    destructive: true,
                    onPress: () =>
                      block(selected.userId, selected.username)
                        .then(() => setError(strings.blockedNotice))
                        .catch(() => setError(strings.callFailed)),
                  },
                ]
              : []
          }
        />

        <Modal visible={tray} transparent animationType="slide" onRequestClose={() => setTray(false)}>
          <Pressable style={styles.backdrop} onPress={() => setTray(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
            <View style={styles.sheetHead}>
              <Txt size={17} weight="semibold">
                {strings.stickersTitle}
              </Txt>
              <IconButton icon={X} label="Close" onPress={() => setTray(false)} size={36} />
            </View>
            <StickerGrid
              stickers={myStickers}
              onCreate={() => {
                setTray(false);
                router.push('/stickers');
              }}
              onPress={(s) => {
                setTray(false);
                send(undefined, s.id);
              }}
            />
          </View>
        </Modal>

        <Modal visible={picker} transparent animationType="slide" onRequestClose={() => setPicker(false)}>
          <Pressable style={styles.backdrop} onPress={() => setPicker(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
            <View style={styles.sheetHead}>
              <Txt size={17} weight="semibold">
                {strings.shareCall}
              </Txt>
              <IconButton icon={X} label="Close" onPress={() => setPicker(false)} size={36} />
            </View>
            {openCalls.length === 0 ? (
              <Txt size={14} color={colors.textMuted} style={{ padding: space.lg }}>
                {strings.noOpenCalls}
              </Txt>
            ) : (
              openCalls.map((c) => (
                <PressableScale
                  key={c.id}
                  scaleTo={0.98}
                  onPress={() => {
                    setPicker(false);
                    send(c.id);
                  }}
                  style={styles.pickRow}>
                  <Txt size={15} weight="semibold">
                    {c.symbol}
                  </Txt>
                  <Txt size={13} color={c.direction === 'up' ? colors.up : colors.down}>
                    {c.direction === 'up' ? '↗' : '↘'} {c.timeframe}
                  </Txt>
                  <View style={{ flex: 1 }} />
                  <Txt size={13} color={colors.textMuted} numeric>
                    {formatPrice(c.entryPrice)}
                  </Txt>
                </PressableScale>
              ))
            )}
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({
  onLongPress,
  message,
  mine,
  showName,
  call,
  sticker,
  livePrice,
}: {
  onLongPress?: () => void;
  message: Message;
  mine: boolean;
  showName: boolean;
  call?: import('@/lib/community').FeedCall;
  sticker?: Sticker;
  livePrice?: number;
}) {
  const ago = formatAgo(message.createdAt) || strings.justNow;
  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      style={[styles.bubbleWrap, mine ? styles.right : styles.left]}>
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={350}
        style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
        {showName && !mine ? (
          <Txt
            size={12}
            weight="semibold"
            color={colors.accentBright}
            style={{ marginBottom: 3, marginLeft: 4 }}>
            @{message.username}
          </Txt>
        ) : null}
        {message.stickerId ? (
          sticker ? (
            <Image source={{ uri: sticker.url }} style={styles.stickerImg} contentFit="contain" />
          ) : (
            <View style={styles.stickerImg} />
          )
        ) : message.callId ? (
          <View style={{ width: 300, maxWidth: '100%' }}>
            {call ? (
              <FeedCallCard call={call} livePrice={livePrice} compact isMine={mine} />
            ) : (
              <ActivityIndicator color={colors.accent} />
            )}
          </View>
        ) : (
          <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
            <Txt size={15} color={mine ? colors.accentInk : colors.text} style={{ lineHeight: 20 }}>
              {message.body}
            </Txt>
          </View>
        )}
        <Txt size={10} color={colors.textFaint} style={{ marginTop: 3, marginHorizontal: 6 }}>
          {ago}
        </Txt>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stickerImg: { width: 150, height: 150 },
  bannerWrap: {
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  banner: { height: 64 },
  bannerText: { position: 'absolute', left: space.md, right: 90, bottom: 10 },
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  headerTitle: { flex: 1, gap: 2 },
  codeBanner: {
    marginHorizontal: space.lg,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  bubbleWrap: { maxWidth: '82%' },
  left: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  right: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 6 },
  bubbleOther: { backgroundColor: colors.surfaceRaised, borderBottomLeftRadius: 6 },
  composer: {
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: 'rgba(11, 12, 20, 0.94)',
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: space.lg,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtn: {
    height: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: colors.surfaceSolid,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
