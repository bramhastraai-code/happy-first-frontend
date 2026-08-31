'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import {
  ChevronLeft,
  Check,
  CheckCheck,
  CheckSquare,
  Copy,
  Eraser,
  ImageIcon,
  Loader2,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  Share2,
  Smile,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { DateTime } from 'luxon';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CommunityChatTab } from '@/components/community/CommunityChatTab';
import { CommunityAvatar } from '@/components/community/CommunityAvatarPicker';
import { ChatPollBubble } from '@/components/community/ChatPollBubble';
import { ChatShareCardBubble } from '@/components/community/ChatShareCardBubble';
import { DmCreatePollDialog } from '@/components/feed/DmCreatePollDialog';
import { DmShareAchievementDialog } from '@/components/feed/DmShareAchievementDialog';
import { DmSharedMediaPanel } from '@/components/feed/DmSharedMediaPanel';
import { messagesAPI, type FeedChatMessage, type FeedConversation } from '@/lib/api/messages';
import { communityAPI, type Community, type CommunityMessage } from '@/lib/api/community';
import { getAppSocket } from '@/lib/realtime/socketClient';
import { useAuthStore } from '@/lib/store/authStore';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import {
  chatWallpaperStyle,
} from '@/components/chat/MessageBubbleTail';
import { cn } from '@/lib/utils';

function toCommunityMessage(message: FeedChatMessage): CommunityMessage {
  return {
    id: message.id,
    communityId: '',
    text: message.text,
    messageType: message.messageType || 'text',
    mediaUrl: message.mediaUrl,
    mediaType: message.mediaType || null,
    deletedForEveryone: message.deletedForEveryone,
    createdAt: message.createdAt,
    poll: message.poll,
    shareCard: message.shareCard,
    sender: {
      userId: message.sender.userId,
      profileId: message.sender.profileId,
      name: message.sender.name,
      avatarUrl: message.sender.avatarUrl,
      avatarSeed: message.sender.avatarSeed,
      avatarStyle: message.sender.avatarStyle,
    },
  };
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '👏', '🔥'] as const;

function dmPreviewText(message: FeedChatMessage): string {
  if (message.messageType === 'poll') return message.poll?.question || 'Poll';
  if (message.messageType === 'share_card') return message.shareCard?.title || 'Shared update';
  if (message.text) return message.text;
  if (message.mediaType === 'image') return 'Photo';
  if (message.mediaType === 'video') return 'Video';
  return 'Message';
}

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center text-sm text-muted-foreground">
      Loading emoji…
    </div>
  ),
});

interface FeedMessagesPanelProps {
  open: boolean;
  onClose: () => void;
  initialConversationId?: string | null;
  initialCommunityId?: string | null;
  startWithUser?: {
    userId: string;
    profileId?: string;
    name?: string;
    avatarUrl?: string | null;
    avatarSeed?: string | null;
    avatarStyle?: string | null;
  } | null;
}

type ConfirmAction =
  | { type: 'clear' }
  | { type: 'delete-chat' }
  | { type: 'delete-me' }
  | { type: 'delete-everyone' }
  | null;

type InboxTab = 'direct' | 'communities';

export function FeedMessagesPanel({
  open,
  onClose,
  initialConversationId,
  initialCommunityId,
  startWithUser,
}: FeedMessagesPanelProps) {
  const { user, selectedProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const [inboxTab, setInboxTab] = useState<InboxTab>('direct');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [listMenuId, setListMenuId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [mediaPreview, setMediaPreview] = useState<{ file: File; url: string } | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharedMediaOpen, setSharedMediaOpen] = useState(false);
  const [votingMessageId, setVotingMessageId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<FeedChatMessage | null>(null);
  const [msgMenuId, setMsgMenuId] = useState<string | null>(null);
  const [msgMenuReactOpen, setMsgMenuReactOpen] = useState(false);
  const [msgMenuCoords, setMsgMenuCoords] = useState<{ top: number; left: number } | null>(
    null
  );
  const [copyToast, setCopyToast] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageElRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const msgMenuRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);

  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    enabled: open,
    queryFn: async () => {
      const res = await messagesAPI.listConversations();
      return res.data.data.conversations ?? [];
    },
  });

  const communitiesQuery = useQuery({
    queryKey: ['communities', 'mine', 'feed-chat'],
    enabled: open,
    queryFn: async () => {
      const res = await communityAPI.mine();
      return (res.data.data.communities ?? []).filter(
        (c) => c.status !== 'deleted' && c.isMember
      );
    },
  });

  const messagesQuery = useQuery({
    queryKey: ['messages', activeId],
    enabled: open && !!activeId && !activeCommunityId,
    queryFn: async () => {
      const res = await messagesAPI.listMessages(activeId!);
      return res.data.data.messages ?? [];
    },
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const searchQuery = useQuery({
    queryKey: ['dm-messages-search', activeId, debouncedSearch],
    enabled: open && !!activeId && searchOpen && debouncedSearch.length >= 2,
    queryFn: async () => {
      const res = await messagesAPI.searchMessages(activeId!, debouncedSearch, {
        page: 1,
        limit: 30,
      });
      return res.data.data;
    },
  });

  const votePollMutation = useMutation({
    mutationFn: async ({ messageId, optionIds }: { messageId: string; optionIds: string[] }) => {
      setVotingMessageId(messageId);
      const res = await messagesAPI.votePoll(activeId!, messageId, optionIds);
      return res.data.data.message;
    },
    onSuccess: (message) => {
      queryClient.setQueryData<FeedChatMessage[]>(['messages', activeId], (old) => {
        if (!old) return [message];
        return old.map((m) => (m.id === message.id ? message : m));
      });
    },
    onSettled: () => setVotingMessageId(null),
  });

  const closePollMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await messagesAPI.closePoll(activeId!, messageId);
      return res.data.data.message;
    },
    onSuccess: (message) => {
      queryClient.setQueryData<FeedChatMessage[]>(['messages', activeId], (old) => {
        if (!old) return [message];
        return old.map((m) => (m.id === message.id ? message : m));
      });
    },
  });

  const reactMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!activeId) throw new Error('No conversation');
      const res = await messagesAPI.reactToMessage(activeId, messageId, emoji);
      return res.data.data.message;
    },
    onSuccess: (message) => {
      queryClient.setQueryData<FeedChatMessage[]>(['messages', activeId], (old) => {
        if (!old) return old;
        return old.map((m) => (m.id === message.id ? message : m));
      });
      setMsgMenuId(null);
      setMsgMenuReactOpen(false);
      setMsgMenuCoords(null);
    },
  });

  const openConversation = useMutation({
    mutationFn: async (target: { userId: string; profileId?: string }) => {
      const res = await messagesAPI.openConversation(target.userId, target.profileId);
      return res.data.data.conversation;
    },
    onSuccess: (conversation) => {
      setActiveId(conversation.id);
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (payload: { text?: string; file?: File }) => {
      if (!activeId) throw new Error('No conversation');
      if (payload.file) {
        const res = await messagesAPI.sendMediaMessage(
          activeId,
          payload.file,
          payload.text || '',
          { replyTo: replyTarget?.id ?? null }
        );
        return res.data.data.message;
      }
      const res = await messagesAPI.sendMessage(activeId, payload.text || '', {
        replyTo: replyTarget?.id ?? null,
      });
      return res.data.data.message;
    },
    onSuccess: (message) => {
      queryClient.setQueryData<FeedChatMessage[]>(['messages', activeId], (old) => {
        if (!old) return [message];
        if (old.some((m) => m.id === message.id)) return old;
        return [...old, message];
      });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setDraft('');
      setShowEmoji(false);
      setReplyTarget(null);
      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview.url);
        setMediaPreview(null);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (scope: 'me' | 'everyone') => {
      if (!activeId) throw new Error('No conversation');
      const ids = Array.from(selectedIds);
      const res = await messagesAPI.deleteMessages(activeId, ids, scope);
      return { ...res.data.data, scope };
    },
    onSuccess: (result) => {
      queryClient.setQueryData<FeedChatMessage[]>(['messages', activeId], (old) => {
        if (!old) return old;
        if (result.scope === 'everyone') {
          return old.map((msg) =>
            result.messageIds.includes(msg.id)
              ? {
                  ...msg,
                  text: '',
                  mediaUrl: null,
                  mediaType: null,
                  deletedForEveryone: true,
                }
              : msg
          );
        }
        return old.filter((msg) => !result.messageIds.includes(msg.id));
      });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      exitSelectMode();
      setConfirm(null);
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!activeId) throw new Error('No conversation');
      await messagesAPI.clearChat(activeId);
    },
    onSuccess: () => {
      queryClient.setQueryData<FeedChatMessage[]>(['messages', activeId], []);
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setConfirm(null);
      setMenuOpen(false);
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      await messagesAPI.deleteChat(conversationId);
      return conversationId;
    },
    onSuccess: (conversationId) => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.setQueryData<FeedChatMessage[]>(['messages', conversationId], []);
      if (activeId === conversationId) setActiveId(null);
      setConfirm(null);
      setMenuOpen(false);
    },
  });

  useEffect(() => {
    if (!open) return;
    if (initialConversationId) {
      setActiveCommunityId(null);
      setInboxTab('direct');
      setActiveId(initialConversationId);
    }
  }, [open, initialConversationId]);

  useEffect(() => {
    if (!open) return;
    if (initialCommunityId) {
      setActiveId(null);
      setInboxTab('communities');
      setActiveCommunityId(initialCommunityId);
    }
  }, [open, initialCommunityId]);

  useEffect(() => {
    if (!open || !startWithUser?.userId) return;
    setActiveCommunityId(null);
    setInboxTab('direct');
    openConversation.mutate({
      userId: startWithUser.userId,
      profileId: startWithUser.profileId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startWithUser?.userId]);

  useEffect(() => {
    if (!open || !activeId || activeCommunityId) return;
    let active = true;
    let socketRef: { off: (event: string, fn: (...args: unknown[]) => void) => void } | null =
      null;

    const onMessage = (message: FeedChatMessage) => {
      if (message.conversationId !== activeId) return;
      queryClient.setQueryData<FeedChatMessage[]>(['messages', activeId], (old) => {
        if (!old) return [message];
        if (old.some((m) => m.id === message.id)) {
          return old.map((m) => (m.id === message.id ? message : m));
        }
        return [...old, message];
      });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    const onUpdated = (message: FeedChatMessage) => {
      if (message.conversationId !== activeId) return;
      queryClient.setQueryData<FeedChatMessage[]>(['messages', activeId], (old) => {
        if (!old) return old;
        return old.map((m) => (m.id === message.id ? message : m));
      });
    };

    const onReaction = (payload: {
      conversationId: string;
      messageId: string;
      reactions: { emoji: string; count: number }[];
    }) => {
      if (payload.conversationId !== activeId) return;
      queryClient.setQueryData<FeedChatMessage[]>(['messages', activeId], (old) => {
        if (!old) return old;
        return old.map((m) => {
          if (m.id !== payload.messageId) return m;
          // Socket payload has no viewer context — keep the local myReaction.
          const myReaction = m.myReaction || null;
          return {
            ...m,
            myReaction,
            reactions: payload.reactions.map((row) => ({
              ...row,
              reactedByMe: row.emoji === myReaction,
            })),
          };
        });
      });
    };

    void getAppSocket().then((socket) => {
      if (!active) return;
      socket.emit('dm:join', { conversationId: activeId });
      socket.on('dm:message', onMessage);
      socket.on('dm:message_updated', onUpdated);
      socket.on('dm:message_reaction', onReaction);
      socketRef = socket;
    });
    return () => {
      active = false;
      socketRef?.off('dm:message', onMessage as (...args: unknown[]) => void);
      socketRef?.off('dm:message_updated', onUpdated as (...args: unknown[]) => void);
      socketRef?.off('dm:message_reaction', onReaction as (...args: unknown[]) => void);
    };
  }, [open, activeId, activeCommunityId, queryClient]);

  useEffect(() => {
    if (activeCommunityId) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesQuery.data, activeId, activeCommunityId]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    exitSelectMode();
    setShowEmoji(false);
    setMenuOpen(false);
    setListMenuId(null);
    setDraft('');
    setSearchOpen(false);
    setSearchInput('');
    setPollDialogOpen(false);
    setShareDialogOpen(false);
    setSharedMediaOpen(false);
    setReplyTarget(null);
    setMsgMenuId(null);
    setMsgMenuReactOpen(false);
    setMsgMenuCoords(null);
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview.url);
      setMediaPreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    if (!open) {
      setActiveCommunityId(null);
      setActiveId(null);
      setInboxTab('direct');
    }
  }, [open]);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const closeMessageMenu = useCallback(() => {
    setMsgMenuId(null);
    setMsgMenuReactOpen(false);
    setMsgMenuCoords(null);
  }, []);

  const openMessageMenu = useCallback((messageId: string, reactOpen = false) => {
    setMsgMenuId(messageId);
    setMsgMenuReactOpen(reactOpen);
    setShowEmoji(false);
    setMenuOpen(false);
  }, []);

  const updateMsgMenuPosition = useCallback(() => {
    if (!msgMenuId) {
      setMsgMenuCoords(null);
      return;
    }
    const row = messageElRefs.current.get(msgMenuId);
    if (!row) return;
    const trigger =
      (row.querySelector('[data-message-bubble]') as HTMLElement | null) || row;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = Math.min(240, window.innerWidth - 16);
    const estimatedHeight = msgMenuRef.current?.offsetHeight || (msgMenuReactOpen ? 380 : 300);
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openDown =
      spaceBelow >= estimatedHeight + gap ||
      spaceAbove < estimatedHeight + gap ||
      spaceBelow >= spaceAbove;

    let top = openDown ? rect.bottom + gap : rect.top - estimatedHeight - gap;
    top = Math.max(8, Math.min(top, window.innerHeight - estimatedHeight - 8));

    let left = rect.right - menuWidth;
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

    setMsgMenuCoords({ top, left });
  }, [msgMenuId, msgMenuReactOpen]);

  useLayoutEffect(() => {
    if (!msgMenuId) {
      setMsgMenuCoords(null);
      return;
    }
    updateMsgMenuPosition();
    const raf = window.requestAnimationFrame(() => updateMsgMenuPosition());
    const onReposition = () => updateMsgMenuPosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [msgMenuId, msgMenuReactOpen, updateMsgMenuPosition]);

  useEffect(() => {
    if (!msgMenuId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMessageMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [msgMenuId, closeMessageMenu]);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const startLongPress = useCallback(
    (messageId: string) => {
      clearLongPress();
      longPressFiredRef.current = false;
      longPressTimerRef.current = window.setTimeout(() => {
        longPressFiredRef.current = true;
        openMessageMenu(messageId);
      }, 480);
    },
    [clearLongPress, openMessageMenu]
  );

  const copyMessageText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyToast(true);
      window.setTimeout(() => setCopyToast(false), 1600);
    } catch {
      /* ignore clipboard failures */
    }
  }, []);

  const scrollToMessage = (messageId: string) => {
    const el = messageElRefs.current.get(messageId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-primary');
    window.setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 1200);
  };

  const appendMessage = (message: FeedChatMessage) => {
    queryClient.setQueryData<FeedChatMessage[]>(['messages', activeId], (old) => {
      if (!old) return [message];
      if (old.some((m) => m.id === message.id)) return old;
      return [...old, message];
    });
    void queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const conversations = conversationsQuery.data ?? [];
  const communities = communitiesQuery.data ?? [];
  const messages = messagesQuery.data ?? [];
  const activeConversation = conversations.find((c) => c.id === activeId);
  const activeCommunity = communities.find((c) => c.id === activeCommunityId) ?? null;
  const canModerateCommunity =
    activeCommunity?.myRole === 'admin' || activeCommunity?.myRole === 'moderator';

  const rows = useMemo(() => {
    return messages.map((message, index) => {
      const mine =
        message.sender.userId === user?._id ||
        message.sender.profileId === selectedProfile?._id;
      const prev = messages[index - 1];
      const next = messages[index + 1];
      const sameAsPrev =
        !!prev &&
        prev.sender.profileId === message.sender.profileId &&
        DateTime.fromISO(message.createdAt).diff(
          DateTime.fromISO(prev.createdAt),
          'minutes'
        ).minutes < 8;
      const sameAsNext =
        !!next &&
        next.sender.profileId === message.sender.profileId &&
        DateTime.fromISO(next.createdAt).diff(
          DateTime.fromISO(message.createdAt),
          'minutes'
        ).minutes < 8;
      const showDay =
        !prev ||
        DateTime.fromISO(message.createdAt).toISODate() !==
          DateTime.fromISO(prev.createdAt).toISODate();

      return {
        message,
        mine,
        showAvatar: !mine && !sameAsNext,
        tightTop: sameAsPrev,
        showDay,
        selected: selectedIds.has(message.id),
      };
    });
  }, [messages, user?._id, selectedProfile?._id, selectedIds]);

  const selectedMineOnly = useMemo(() => {
    if (!selectedIds.size) return false;
    return messages
      .filter((m) => selectedIds.has(m.id))
      .every((m) => m.sender.userId === user?._id && !m.deletedForEveryone);
  }, [messages, selectedIds, user?._id]);

  const menuMessage = useMemo(
    () => (msgMenuId ? messages.find((m) => m.id === msgMenuId) || null : null),
    [messages, msgMenuId]
  );
  const menuMine =
    !!menuMessage &&
    (menuMessage.sender.userId === user?._id ||
      menuMessage.sender.profileId === selectedProfile?._id);

  const canSend =
    Boolean(selectedProfile) &&
    !sendMutation.isPending &&
    (Boolean(draft.trim()) || Boolean(mediaPreview));

  const submitMessage = () => {
    if (!canSend) return;
    sendMutation.mutate({
      text: draft.trim(),
      file: mediaPreview?.file,
    });
    void getAppSocket().then((socket) => {
      if (activeId) socket.emit('dm:typing', { conversationId: activeId });
    });
  };

  const onPickFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;
    if (mediaPreview) URL.revokeObjectURL(mediaPreview.url);
    setMediaPreview({ file, url: URL.createObjectURL(file) });
    setShowEmoji(false);
  };

  const openCommunityChat = (community: Community) => {
    setActiveId(null);
    setActiveCommunityId(community.id);
    setListMenuId(null);
  };

  if (!open) return null;

  const confirmBusy =
    deleteMutation.isPending || clearMutation.isPending || deleteChatMutation.isPending;

  const confirmCopy =
    confirm?.type === 'clear'
      ? {
          title: 'Clear this chat?',
          description: 'Messages will be removed for you only. The other person keeps their copy.',
          confirmLabel: 'Clear chat',
        }
      : confirm?.type === 'delete-chat'
        ? {
            title: 'Delete this chat?',
            description: 'The chat will be removed from your list. You can start a new chat later.',
            confirmLabel: 'Delete chat',
          }
        : confirm?.type === 'delete-everyone'
          ? {
              title: 'Delete for everyone?',
              description: 'Selected messages will be removed for you and the other person.',
              confirmLabel: 'Delete for everyone',
            }
          : {
              title: 'Delete for me?',
              description: 'Selected messages will be removed from your chat only.',
              confirmLabel: 'Delete for me',
            };

  if (activeCommunityId) {
    return (
      <div className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center sm:p-4">
        <button
          type="button"
          aria-label="Close messages"
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <div className="relative flex h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[#efeae2] shadow-[var(--shadow-float)] sm:h-[78vh] sm:rounded-3xl">
          <CommunityChatTab
            communityId={activeCommunityId}
            canModerate={canModerateCommunity}
            embedded
            communityName={activeCommunity?.name}
            communityIcon={activeCommunity?.icon}
            communityAvatarUrl={activeCommunity?.avatarUrl}
            communityAvatarSeed={activeCommunity?.avatarSeed}
            communityAvatarStyle={activeCommunity?.avatarStyle}
            onBack={() => setActiveCommunityId(null)}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close messages"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative flex h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[#efeae2] shadow-[var(--shadow-float)] sm:h-[78vh] sm:rounded-3xl">
        {/* Header */}
        <div className="relative z-20 flex items-center gap-2 rounded-t-3xl border-b border-black/5 bg-[#f0f2f5] px-2 py-2.5 sm:rounded-t-3xl sm:px-3">
          {selectMode ? (
            <>
              <button
                type="button"
                onClick={exitSelectMode}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5"
              >
                <X className="h-5 w-5" />
              </button>
              <p className="min-w-0 flex-1 text-sm font-semibold text-[#111b21]">
                {selectedIds.size} selected
              </p>
              <button
                type="button"
                disabled={!selectedIds.size}
                onClick={() => setConfirm({ type: 'delete-me' })}
                className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#111b21] hover:bg-black/5 disabled:opacity-40"
              >
                Delete for me
              </button>
              {selectedMineOnly && (
                <button
                  type="button"
                  disabled={!selectedIds.size}
                  onClick={() => setConfirm({ type: 'delete-everyone' })}
                  className="rounded-lg px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-40"
                >
                  For everyone
                </button>
              )}
            </>
          ) : (
            <>
              {activeId ? (
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#54656f] hover:bg-black/5"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : (
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <MessageSquare className="h-4 w-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                {activeId ? (
                  <div className="flex items-center gap-2">
                    {(activeConversation?.other.profileId || startWithUser?.profileId) ? (
                      <Link
                        href={`/feed/profile/${activeConversation?.other.profileId || startWithUser?.profileId}`}
                        className="shrink-0"
                      >
                        <ProfileAvatar
                          name={activeConversation?.other.name || startWithUser?.name || 'Chat'}
                          avatarUrl={
                            activeConversation?.other.avatarUrl || startWithUser?.avatarUrl
                          }
                          avatarSeed={
                            activeConversation?.other.avatarSeed || startWithUser?.avatarSeed
                          }
                          avatarStyle={
                            activeConversation?.other.avatarStyle || startWithUser?.avatarStyle
                          }
                          size="sm"
                          className="h-9 w-9"
                        />
                      </Link>
                    ) : (
                      <ProfileAvatar
                        name={activeConversation?.other.name || startWithUser?.name || 'Chat'}
                        avatarUrl={
                          activeConversation?.other.avatarUrl || startWithUser?.avatarUrl
                        }
                        avatarSeed={
                          activeConversation?.other.avatarSeed || startWithUser?.avatarSeed
                        }
                        avatarStyle={
                          activeConversation?.other.avatarStyle || startWithUser?.avatarStyle
                        }
                        size="sm"
                        className="h-9 w-9"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#111b21]">
                        {activeConversation?.other.name || startWithUser?.name || 'Chat'}
                      </p>
                      <p className="truncate text-[11px] text-[#667781]">Happy First Club</p>
                    </div>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#111b21]">Messages</p>
                    <p className="truncate text-[11px] text-[#667781]">
                      {inboxTab === 'communities'
                        ? 'Community group chats'
                        : 'Direct messages'}
                    </p>
                  </div>
                )}
              </div>
              {activeId && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5"
                    aria-label="Chat menu"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                  {menuOpen && (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-10"
                        aria-label="Close menu"
                        onClick={() => setMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-10 z-20 min-w-[11rem] overflow-hidden rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5">
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[#111b21] hover:bg-black/5"
                          onClick={() => {
                            setSearchOpen(true);
                            setMenuOpen(false);
                          }}
                        >
                          <Search className="h-4 w-4 shrink-0 text-[#54656f]" />
                          Search messages
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[#111b21] hover:bg-black/5"
                          onClick={() => {
                            setSharedMediaOpen(true);
                            setMenuOpen(false);
                          }}
                        >
                          <ImageIcon className="h-4 w-4 shrink-0 text-[#54656f]" />
                          Shared media
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[#111b21] hover:bg-black/5"
                          onClick={() => {
                            setPollDialogOpen(true);
                            setMenuOpen(false);
                          }}
                        >
                          <CheckSquare className="h-4 w-4 shrink-0 text-[#54656f]" />
                          Create poll
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[#111b21] hover:bg-black/5"
                          onClick={() => {
                            setShareDialogOpen(true);
                            setMenuOpen(false);
                          }}
                        >
                          <Share2 className="h-4 w-4 shrink-0 text-[#54656f]" />
                          Share achievement
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[#111b21] hover:bg-black/5"
                          onClick={() => {
                            setSelectMode(true);
                            setMenuOpen(false);
                          }}
                        >
                          <CheckSquare className="h-4 w-4 shrink-0 text-[#54656f]" />
                          Select messages
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[#111b21] hover:bg-black/5"
                          onClick={() => {
                            setConfirm({ type: 'clear' });
                            setMenuOpen(false);
                          }}
                        >
                          <Eraser className="h-4 w-4 shrink-0 text-[#54656f]" />
                          Clear chat
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setConfirm({ type: 'delete-chat' });
                            setMenuOpen(false);
                          }}
                        >
                          <Trash2 className="h-4 w-4 shrink-0" />
                          Delete chat
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {!activeId ? (
          <div className="flex min-h-0 flex-1 flex-col bg-white">
            <div className="flex gap-1 border-b border-black/5 bg-[#f0f2f5] px-3 py-2">
              <button
                type="button"
                onClick={() => setInboxTab('direct')}
                className={cn(
                  'flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  inboxTab === 'direct'
                    ? 'bg-white text-[#111b21] shadow-sm'
                    : 'text-[#667781] hover:bg-white/60'
                )}
              >
                Direct
              </button>
              <button
                type="button"
                onClick={() => setInboxTab('communities')}
                className={cn(
                  'flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  inboxTab === 'communities'
                    ? 'bg-white text-[#111b21] shadow-sm'
                    : 'text-[#667781] hover:bg-white/60'
                )}
              >
                Communities
                {communities.length > 0 ? (
                  <span className="ml-1 text-[10px] font-bold text-primary">
                    {communities.length}
                  </span>
                ) : null}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {inboxTab === 'direct' ? (
                conversationsQuery.isLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : conversations.length === 0 ? (
                  <p className="px-6 py-16 text-center text-sm text-[#667781]">
                    No conversations yet. Tap Message on a feed post to start chatting.
                  </p>
                ) : (
                  conversations.map((conversation: FeedConversation) => (
                    <div
                      key={conversation.id}
                      className="flex items-stretch border-b border-black/5 hover:bg-[#f5f6f6]"
                    >
                      {conversation.other.profileId ? (
                        <Link
                          href={`/feed/profile/${conversation.other.profileId}`}
                          className="flex items-center pl-4"
                          aria-label={`${conversation.other.name} profile`}
                        >
                          <ProfileAvatar
                            name={conversation.other.name}
                            avatarUrl={conversation.other.avatarUrl}
                            avatarSeed={conversation.other.avatarSeed}
                            avatarStyle={conversation.other.avatarStyle}
                            size="lg"
                            className="h-12 w-12 text-base"
                          />
                        </Link>
                      ) : (
                        <span className="flex items-center pl-4">
                          <ProfileAvatar
                            name={conversation.other.name}
                            avatarUrl={conversation.other.avatarUrl}
                            avatarSeed={conversation.other.avatarSeed}
                            avatarStyle={conversation.other.avatarStyle}
                            size="lg"
                            className="h-12 w-12 text-base"
                          />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setListMenuId(null);
                          setActiveId(conversation.id);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 pr-1">
                            <p className="truncate text-[15px] font-semibold text-[#111b21]">
                              {conversation.other.name}
                            </p>
                            <p className="shrink-0 text-[11px] text-[#667781]">
                              {DateTime.fromISO(conversation.lastMessageAt).toFormat('h:mm a')}
                            </p>
                          </div>
                          <p className="truncate text-[13px] text-[#667781]">
                            {conversation.lastMessageText || 'Say hello'}
                          </p>
                        </div>
                      </button>
                      <div className="relative flex items-center pr-2">
                        <button
                          type="button"
                          aria-label={`Chat options for ${conversation.other.name}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#667781] hover:bg-black/5"
                          onClick={(event) => {
                            event.stopPropagation();
                            setListMenuId((current) =>
                              current === conversation.id ? null : conversation.id
                            );
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {listMenuId === conversation.id && (
                          <>
                            <button
                              type="button"
                              className="fixed inset-0 z-10"
                              aria-label="Close menu"
                              onClick={() => setListMenuId(null)}
                            />
                            <div className="absolute right-2 top-10 z-20 min-w-[9.5rem] overflow-hidden rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5">
                              <button
                                type="button"
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setListMenuId(null);
                                  setActiveId(conversation.id);
                                  setConfirm({ type: 'delete-chat' });
                                }}
                              >
                                <Trash2 className="h-4 w-4 shrink-0" />
                                Delete chat
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )
              ) : communitiesQuery.isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : communities.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <Users className="mx-auto h-8 w-8 text-[#667781]/60" />
                  <p className="mt-3 text-sm text-[#667781]">
                    Join a community to open group chat with polls, reactions, pins, and more.
                  </p>
                  <Link
                    href="/community"
                    onClick={onClose}
                    className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    Browse communities
                  </Link>
                </div>
              ) : (
                communities.map((community) => (
                  <button
                    key={community.id}
                    type="button"
                    onClick={() => openCommunityChat(community)}
                    className="flex w-full items-center gap-3 border-b border-black/5 px-4 py-3 text-left hover:bg-[#f5f6f6]"
                  >
                    <CommunityAvatar
                      name={community.name}
                      icon={community.icon}
                      avatarUrl={community.avatarUrl}
                      avatarSeed={community.avatarSeed}
                      avatarStyle={community.avatarStyle}
                      size="md"
                      className="!rounded-full"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-[#111b21]">
                        {community.name}
                      </p>
                      <p className="truncate text-[13px] text-[#667781]">
                        {community.memberCount} members
                        {community.myRole === 'admin'
                          ? ' · Admin'
                          : community.myRole === 'moderator'
                            ? ' · Moderator'
                            : ''}
                        {' · '}
                        Group chat
                      </p>
                    </div>
                    <Users className="h-4 w-4 shrink-0 text-primary/70" />
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <>
            {searchOpen ? (
              <div className="relative z-20 border-b border-black/5 bg-[#f0f2f5] px-2 py-2">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 shrink-0 text-[#54656f]" />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search messages…"
                    autoFocus
                    className="min-w-0 flex-1 rounded-lg bg-white px-3 py-1.5 text-sm text-[#111b21] outline-none ring-1 ring-black/5 placeholder:text-[#667781]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchInput('');
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5"
                    aria-label="Close search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {debouncedSearch.length >= 2 ? (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-white shadow-sm ring-1 ring-black/5">
                    {searchQuery.isLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (searchQuery.data?.messages || []).length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-[#667781]">No matches</p>
                    ) : (
                      (searchQuery.data?.messages || []).map((hit) => (
                        <button
                          key={hit.id}
                          type="button"
                          className="flex w-full flex-col gap-0.5 border-b border-black/5 px-3 py-2 text-left last:border-0 hover:bg-[#f5f6f6]"
                          onClick={() => {
                            setSearchOpen(false);
                            scrollToMessage(hit.id);
                          }}
                        >
                          <span className="truncate text-xs font-semibold text-[#111b21]">
                            {hit.sender.name}
                          </span>
                          <span className="truncate text-[12px] text-[#667781]">
                            {hit.messageType === 'poll'
                              ? hit.poll?.question || 'Poll'
                              : hit.messageType === 'share_card'
                                ? hit.shareCard?.title || 'Shared update'
                                : hit.text ||
                                  (hit.mediaType === 'image'
                                    ? 'Photo'
                                    : hit.mediaType === 'video'
                                      ? 'Video'
                                      : 'Message')}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div
              ref={scrollContainerRef}
              className="relative flex-1 overflow-y-auto px-2 py-3 sm:px-4"
              style={chatWallpaperStyle}
              onClick={() => {
                setShowEmoji(false);
                setMenuOpen(false);
              }}
            >
              {messagesQuery.isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="mx-auto mt-8 max-w-xs rounded-lg bg-[#ffeecd] px-3 py-2 text-center text-xs text-[#54656f] shadow-sm">
                  No messages yet. Say hello to start the chat.
                </div>
              ) : (
                rows.map(
                  ({ message, mine, showAvatar, tightTop, showDay, selected }) => (
                    <div
                      key={message.id}
                      ref={(el) => {
                        if (el) messageElRefs.current.set(message.id, el);
                        else messageElRefs.current.delete(message.id);
                      }}
                      className="transition-shadow"
                    >
                      {showDay ? (
                        <div className="my-3.5 flex justify-center">
                          <span className="rounded-full bg-white/95 px-3.5 py-[5px] text-[12px] font-medium tracking-wide text-[#54656f] shadow-[0_1px_1px_rgba(0,0,0,0.08)]">
                            {DateTime.fromISO(message.createdAt).hasSame(DateTime.now(), 'day')
                              ? 'Today'
                              : DateTime.fromISO(message.createdAt).toFormat('d/M/yyyy')}
                          </span>
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          'group/msg flex items-end gap-1.5 px-0.5',
                          mine ? 'justify-end' : 'justify-start',
                          selectMode && 'cursor-pointer',
                          tightTop ? 'mt-[2px]' : 'mt-1.5'
                        )}
                        onClick={() => {
                          if (longPressFiredRef.current) {
                            longPressFiredRef.current = false;
                            return;
                          }
                          if (selectMode) toggleSelect(message.id);
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          if (!selectMode && !message.deletedForEveryone) {
                            openMessageMenu(message.id);
                          }
                        }}
                        onTouchStart={() => {
                          if (!selectMode && !message.deletedForEveryone) {
                            startLongPress(message.id);
                          }
                        }}
                        onTouchEnd={clearLongPress}
                        onTouchMove={clearLongPress}
                        onTouchCancel={clearLongPress}
                      >
                        {selectMode ? (
                          <span
                            className={cn(
                              'mb-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                              selected
                                ? 'border-primary bg-primary text-white'
                                : 'border-[#8696a0] bg-transparent'
                            )}
                          >
                            {selected ? <Check className="h-3 w-3" /> : null}
                          </span>
                        ) : null}

                        {!mine ? (
                          <div className="flex w-8 shrink-0 items-end">
                            {showAvatar ? (
                              <Link
                                href={`/feed/profile/${message.sender.profileId}`}
                                className="block"
                                title={message.sender.name}
                                onClick={(e) => selectMode && e.preventDefault()}
                              >
                                <ProfileAvatar
                                  name={message.sender.name}
                                  avatarUrl={message.sender.avatarUrl}
                                  avatarSeed={message.sender.avatarSeed}
                                  avatarStyle={message.sender.avatarStyle}
                                  size="sm"
                                  className="h-8 w-8"
                                />
                              </Link>
                            ) : (
                              <span className="h-8 w-8" aria-hidden />
                            )}
                          </div>
                        ) : null}

                        <div
                          className={cn(
                            'relative',
                            message.poll || message.shareCard
                              ? 'w-fit max-w-[min(88%,300px)]'
                              : 'max-w-[min(78%,32rem)]',
                            mine ? 'items-end' : 'items-start'
                          )}
                        >
                          <div
                            data-message-bubble
                            className={cn(
                              'relative rounded-[7.5px] px-[9px] pb-[6px] pt-[6px] text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]',
                              mine ? 'bg-primary text-primary-foreground' : 'bg-white',
                              (message.reactions?.length ?? 0) > 0 &&
                                !message.deletedForEveryone &&
                                'mb-3'
                            )}
                          >
                            {!message.deletedForEveryone && message.replyTo ? (
                              <button
                                type="button"
                                className={cn(
                                  'mb-1 w-full rounded-md border-l-4 px-2 py-1 text-left',
                                  mine
                                    ? 'border-white/70 bg-black/10'
                                    : 'border-primary bg-black/[0.04]'
                                )}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  scrollToMessage(message.replyTo!.id);
                                }}
                              >
                                <p
                                  className={cn(
                                    'truncate text-[11px] font-semibold',
                                    mine ? 'text-primary-foreground/90' : 'text-primary'
                                  )}
                                >
                                  {message.replyTo.senderName}
                                </p>
                                <p
                                  className={cn(
                                    'truncate text-[12px]',
                                    mine ? 'text-primary-foreground/75' : 'text-[#54656f]'
                                  )}
                                >
                                  {message.replyTo.text || 'Media'}
                                </p>
                              </button>
                            ) : null}
                            {message.deletedForEveryone ? (
                              <p
                                className={cn(
                                  'italic text-[14.2px]',
                                  mine ? 'text-primary-foreground/80' : 'text-[#667781]'
                                )}
                              >
                                This message was deleted
                              </p>
                            ) : message.messageType === 'poll' && message.poll ? (
                              <ChatPollBubble
                                message={toCommunityMessage(message)}
                                mine={mine}
                                voting={votingMessageId === message.id}
                                closing={closePollMutation.isPending}
                                onVote={(optionIds) =>
                                  votePollMutation.mutate({ messageId: message.id, optionIds })
                                }
                                onClose={
                                  mine
                                    ? () => closePollMutation.mutate(message.id)
                                    : undefined
                                }
                              />
                            ) : message.messageType === 'share_card' && message.shareCard ? (
                              <ChatShareCardBubble card={message.shareCard} mine={mine} />
                            ) : (
                              <>
                                {message.mediaUrl && message.mediaType === 'image' ? (
                                  <button
                                    type="button"
                                    className="mb-1 block overflow-hidden rounded-[6px]"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (selectMode) {
                                        toggleSelect(message.id);
                                        return;
                                      }
                                      setLightbox({ url: message.mediaUrl!, type: 'image' });
                                    }}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={message.mediaUrl}
                                      alt=""
                                      className="max-h-64 w-full max-w-[240px] object-cover"
                                    />
                                  </button>
                                ) : null}
                                {message.mediaUrl && message.mediaType === 'video' ? (
                                  <button
                                    type="button"
                                    className="mb-1 block overflow-hidden rounded-[6px]"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (selectMode) {
                                        toggleSelect(message.id);
                                        return;
                                      }
                                      setLightbox({ url: message.mediaUrl!, type: 'video' });
                                    }}
                                  >
                                    <video
                                      src={message.mediaUrl}
                                      className="max-h-64 w-full max-w-[240px] bg-black object-cover"
                                      muted
                                      playsInline
                                    />
                                  </button>
                                ) : null}
                                {message.text ? (
                                  <p className="whitespace-pre-wrap break-words text-[14.2px] leading-[1.35]">
                                    {message.text}
                                  </p>
                                ) : null}
                              </>
                            )}

                            <div
                              className={cn(
                                'mt-0.5 flex items-center justify-end gap-[3px]',
                                mine ? 'text-primary-foreground/75' : 'text-[#667781]'
                              )}
                            >
                              <span className="text-[11px] leading-none tabular-nums">
                                {DateTime.fromISO(message.createdAt)
                                  .toFormat('h:mm a')
                                  .toLowerCase()}
                              </span>
                              {mine && !message.deletedForEveryone ? (
                                <CheckCheck className="h-[15px] w-[15px] text-sky-200" />
                              ) : null}
                            </div>

                            {(message.reactions?.length ?? 0) > 0 &&
                            !message.deletedForEveryone ? (
                              <div
                                className={cn(
                                  'absolute z-[2] flex max-w-[min(100%,16rem)]',
                                  mine ? 'right-1' : 'left-1',
                                  '-bottom-3'
                                )}
                                onClick={(event) => event.stopPropagation()}
                              >
                                <div className="inline-flex items-center gap-[2px] rounded-full bg-white px-1.5 py-[3px] shadow-[0_1px_3px_rgba(11,20,26,0.2)] ring-1 ring-black/10">
                                  {message.reactions!.map((reaction) => (
                                    <button
                                      key={reaction.emoji}
                                      type="button"
                                      disabled={reactMutation.isPending}
                                      title={`${reaction.count}`}
                                      onClick={() =>
                                        reactMutation.mutate({
                                          messageId: message.id,
                                          emoji: reaction.emoji,
                                        })
                                      }
                                      className={cn(
                                        'inline-flex items-center gap-0.5 rounded-full px-1 py-0.5 text-[13px] leading-none transition hover:bg-black/[0.04]',
                                        reaction.reactedByMe && 'bg-primary/10'
                                      )}
                                    >
                                      <span className="text-[15px] leading-none">
                                        {reaction.emoji}
                                      </span>
                                      {reaction.count > 1 ? (
                                        <span className="text-[11px] font-medium text-[#54656f]">
                                          {reaction.count}
                                        </span>
                                      ) : null}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {!selectMode && !message.deletedForEveryone ? (
                          <button
                            type="button"
                            aria-label="Quick react"
                            className={cn(
                              'mb-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#667781] shadow-[0_1px_3px_rgba(0,0,0,0.18)] ring-1 ring-black/5 transition-opacity',
                              'opacity-0 group-hover/msg:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-70',
                              msgMenuId === message.id && msgMenuReactOpen && 'opacity-100',
                              mine && '-order-1'
                            )}
                            onClick={(event) => {
                              event.stopPropagation();
                              openMessageMenu(message.id, true);
                            }}
                          >
                            <Smile className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                )
              )}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            {!selectMode && (
              <div className="relative z-20 border-t border-black/5 bg-[#f0f2f5] px-2 py-2">
                {replyTarget && (
                  <div className="mb-2 flex items-start gap-2 rounded-xl border-l-4 border-primary bg-white px-3 py-2 shadow-sm">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-primary">
                        Replying to {replyTarget.sender.name}
                      </p>
                      <p className="truncate text-xs text-[#54656f]">
                        {dmPreviewText(replyTarget)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Cancel reply"
                      onClick={() => setReplyTarget(null)}
                      className="rounded-full p-1 text-[#667781] hover:bg-black/5"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {mediaPreview && (
                  <div className="mb-2 flex items-start gap-2 rounded-xl bg-white p-2 shadow-sm">
                    {mediaPreview.file.type.startsWith('video/') ? (
                      <video
                        src={mediaPreview.url}
                        className="h-16 w-16 rounded-lg object-cover"
                        muted
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaPreview.url}
                        alt=""
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[#111b21]">
                        {mediaPreview.file.name}
                      </p>
                      <p className="text-[11px] text-[#667781]">Ready to send</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(mediaPreview.url);
                        setMediaPreview(null);
                      }}
                      className="rounded-full p-1 text-[#667781] hover:bg-black/5"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {showEmoji && (
                  <div className="absolute bottom-[calc(100%-0.25rem)] left-2 right-2 z-30 overflow-hidden rounded-2xl shadow-xl sm:left-auto sm:right-3 sm:w-[320px]">
                    <EmojiPicker
                      width="100%"
                      height={320}
                      previewConfig={{ showPreview: false }}
                      onEmojiClick={(emojiData) => {
                        setDraft((prev) => `${prev}${emojiData.emoji}`);
                        composerRef.current?.focus();
                      }}
                    />
                  </div>
                )}

                <form
                  className="flex items-end gap-1.5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitMessage();
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowEmoji((v) => !v)}
                    className="mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5"
                    aria-label="Emoji"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5"
                    aria-label="Attach media"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(event) => {
                      onPickFile(event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                  <div className="flex min-w-0 flex-1 items-end rounded-[22px] bg-white px-3 py-1.5 shadow-sm">
                    <textarea
                      ref={composerRef}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          submitMessage();
                        }
                      }}
                      placeholder="Message"
                      rows={1}
                      maxLength={2000}
                      className="max-h-28 min-h-[28px] w-full resize-none bg-transparent py-1.5 text-[15px] text-[#111b21] outline-none placeholder:text-[#667781]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!canSend}
                    className="mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
                    aria-label="Send"
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </form>
                {!selectedProfile && (
                  <p className="pt-1 text-center text-[11px] text-[#667781]">
                    Select a profile to send messages.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            aria-label="Close media"
            className="absolute inset-0"
            onClick={() => setLightbox(null)}
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white"
          >
            <X className="h-5 w-5" />
          </button>
          {lightbox.type === 'video' ? (
            <video
              src={lightbox.url}
              controls
              autoPlay
              className="relative z-10 max-h-[85vh] max-w-full rounded-lg"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightbox.url}
              alt=""
              className="relative z-10 max-h-[85vh] max-w-full rounded-lg object-contain"
            />
          )}
        </div>
      )}

      {activeId ? (
        <>
          <DmCreatePollDialog
            open={pollDialogOpen}
            conversationId={activeId}
            onClose={() => setPollDialogOpen(false)}
            onCreated={appendMessage}
          />
          <DmShareAchievementDialog
            open={shareDialogOpen}
            conversationId={activeId}
            onClose={() => setShareDialogOpen(false)}
            onShared={appendMessage}
          />
          <DmSharedMediaPanel
            open={sharedMediaOpen}
            conversationId={activeId}
            onClose={() => setSharedMediaOpen(false)}
            onJumpToMessage={scrollToMessage}
          />
        </>
      ) : null}

      {menuMessage &&
        !selectMode &&
        !menuMessage.deletedForEveryone &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Close message menu"
              className="fixed inset-0 z-[232]"
              onClick={closeMessageMenu}
            />
            <div
              ref={msgMenuRef}
              className={cn(
                'fixed z-[233] w-[min(240px,calc(100vw-16px))] overflow-hidden rounded-xl bg-[#233138] py-1 text-white shadow-xl ring-1 ring-black/20',
                !msgMenuCoords && 'invisible'
              )}
              style={
                msgMenuCoords
                  ? { top: msgMenuCoords.top, left: msgMenuCoords.left }
                  : { top: 0, left: 0 }
              }
              onClick={(event) => event.stopPropagation()}
            >
              {msgMenuReactOpen && (
                <div className="flex items-center justify-around gap-0.5 border-b border-white/10 px-2 py-2.5">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      disabled={reactMutation.isPending}
                      onClick={() =>
                        reactMutation.mutate({ messageId: menuMessage.id, emoji })
                      }
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full text-[22px] transition hover:bg-white/10',
                        menuMessage.myReaction === emoji && 'bg-white/15 ring-1 ring-white/30'
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 px-3.5 py-2.5 text-left text-[14px] hover:bg-white/10"
                onClick={() => setMsgMenuReactOpen((prev) => !prev)}
              >
                <Smile className="h-4 w-4 shrink-0 opacity-90" />
                React
              </button>

              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 px-3.5 py-2.5 text-left text-[14px] hover:bg-white/10"
                onClick={() => {
                  setReplyTarget(menuMessage);
                  closeMessageMenu();
                  composerRef.current?.focus();
                }}
              >
                <MessageSquare className="h-4 w-4 shrink-0 opacity-90" />
                Reply
              </button>

              {Boolean(menuMessage.text?.trim()) && (
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center gap-3 px-3.5 py-2.5 text-left text-[14px] hover:bg-white/10"
                  onClick={() => {
                    void copyMessageText(menuMessage.text.trim());
                    closeMessageMenu();
                  }}
                >
                  <Copy className="h-4 w-4 shrink-0 opacity-90" />
                  Copy
                </button>
              )}

              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 px-3.5 py-2.5 text-left text-[14px] hover:bg-white/10"
                onClick={() => {
                  setSelectMode(true);
                  setSelectedIds(new Set([menuMessage.id]));
                  closeMessageMenu();
                }}
              >
                <CheckSquare className="h-4 w-4 shrink-0 opacity-90" />
                Select
              </button>

              <div className="my-1 border-t border-white/10" />

              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 px-3.5 py-2.5 text-left text-[14px] hover:bg-white/10"
                onClick={() => {
                  setSelectedIds(new Set([menuMessage.id]));
                  setConfirm({ type: 'delete-me' });
                  closeMessageMenu();
                }}
              >
                <Trash2 className="h-4 w-4 shrink-0 opacity-90" />
                Delete for me
              </button>

              {menuMine && (
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center gap-3 px-3.5 py-2.5 text-left text-[14px] text-[#ff8a80] hover:bg-white/10"
                  onClick={() => {
                    setSelectedIds(new Set([menuMessage.id]));
                    setConfirm({ type: 'delete-everyone' });
                    closeMessageMenu();
                  }}
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  Delete for everyone
                </button>
              )}
            </div>
          </>,
          document.body
        )}

      {copyToast &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed bottom-24 left-1/2 z-[236] -translate-x-1/2 rounded-full bg-black/80 px-3.5 py-1.5 text-xs font-medium text-white shadow-lg">
            Copied
          </div>,
          document.body
        )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.confirmLabel}
        cancelLabel="Cancel"
        destructive
        loading={confirmBusy}
        zClassName="z-[240]"
        onCancel={() => {
          if (!confirmBusy) setConfirm(null);
        }}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === 'clear') clearMutation.mutate();
          else if (confirm.type === 'delete-chat' && activeId) {
            deleteChatMutation.mutate(activeId);
          } else if (confirm.type === 'delete-me') deleteMutation.mutate('me');
          else if (confirm.type === 'delete-everyone') deleteMutation.mutate('everyone');
        }}
      />
    </div>
  );
}
