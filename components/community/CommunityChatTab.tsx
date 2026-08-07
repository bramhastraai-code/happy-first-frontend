'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import {
  ChevronLeft,
  Check,
  CheckCheck,
  CheckSquare,
  ChevronDown,
  Copy,
  Eraser,
  ImageIcon,
  Loader2,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Pin,
  PinOff,
  Search,
  Send,
  Share2,
  Smile,
  Trash2,
  X,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ChatPollBubble } from '@/components/community/ChatPollBubble';
import { ChatShareCardBubble } from '@/components/community/ChatShareCardBubble';
import { ChatCreatePollDialog } from '@/components/community/ChatCreatePollDialog';
import { ChatThreadSheet } from '@/components/community/ChatThreadSheet';
import { ChatSharedMediaPanel } from '@/components/community/ChatSharedMediaPanel';
import { ChatShareActivityDialog } from '@/components/community/ChatShareActivityDialog';
import {
  communityAPI,
  type CommunityMember,
  type CommunityMessage,
  type CommunityMessageReaction,
} from '@/lib/api/community';
import { getAppSocket } from '@/lib/realtime/socketClient';
import { useAuthStore } from '@/lib/store/authStore';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { cn } from '@/lib/utils';
import { chatWallpaperStyle } from '@/components/chat/MessageBubbleTail';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center text-sm text-muted-foreground">
      Loading emoji…
    </div>
  ),
});

interface CommunityChatTabProps {
  communityId: string;
  canModerate?: boolean;
  /** Fill parent height (e.g. Feed messages panel) instead of capped page height */
  embedded?: boolean;
  /** Shown in the chat header when provided */
  communityName?: string;
  /** Back control for inbox / sheet embedding */
  onBack?: () => void;
  /** Optional close control (e.g. dismiss Feed messages sheet) */
  onClose?: () => void;
  className?: string;
}

const NAME_COLORS = [
  'text-orange-600',
  'text-emerald-600',
  'text-sky-600',
  'text-violet-600',
  'text-rose-600',
  'text-amber-700',
  'text-teal-600',
  'text-indigo-600',
];

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '👏', '🔥'] as const;

const ROLE_MENTIONS: Array<{ role: 'admin' | 'moderator'; label: string }> = [
  { role: 'admin', label: 'admins' },
  { role: 'moderator', label: 'moderators' },
];

function nameColor(profileId: string) {
  let hash = 0;
  for (let i = 0; i < profileId.length; i += 1) {
    hash = (hash + profileId.charCodeAt(i) * (i + 1)) % NAME_COLORS.length;
  }
  return NAME_COLORS[hash] || NAME_COLORS[0];
}

/** Active `@query` token at end of draft (after start or whitespace). */
function getActiveMention(text: string): { start: number; query: string } | null {
  const match = /(^|[\s])@([^\s@]*)$/.exec(text);
  if (!match) return null;
  const start = text.lastIndexOf('@');
  return { start, query: match[2] ?? '' };
}

function patchMessageInList(
  messages: CommunityMessage[] | undefined,
  messageId: string,
  patch: Partial<CommunityMessage> | ((msg: CommunityMessage) => CommunityMessage)
): CommunityMessage[] | undefined {
  if (!messages) return messages;
  return messages.map((msg) => {
    if (msg.id !== messageId) return msg;
    return typeof patch === 'function' ? patch(msg) : { ...msg, ...patch };
  });
}

function applyReactionSocket(
  msg: CommunityMessage,
  payload: { reactions?: CommunityMessageReaction[]; myReaction?: string | null }
): CommunityMessage {
  const localMy = msg.myReaction ?? null;
  const nextReactions = (payload.reactions || []).map((r) => ({
    emoji: r.emoji,
    count: r.count,
    reactedByMe: localMy === r.emoji,
  }));
  return { ...msg, reactions: nextReactions, myReaction: localMy };
}

function renderMessageText(
  text: string,
  mentionNames: string[],
  mine: boolean
) {
  if (!text) return null;
  const names = [...mentionNames].sort((a, b) => b.length - a.length);
  const rolePattern = '@admins|@moderators';
  const namePattern = names.length
    ? names.map((n) => `@${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).join('|')
    : null;
  const pattern = namePattern
    ? new RegExp(`(${rolePattern}|${namePattern})`, 'gi')
    : new RegExp(`(${rolePattern})`, 'gi');

  const parts = text.split(pattern);
  return (
    <p className="whitespace-pre-wrap break-words text-[14.2px] leading-[1.35]">
      {parts.map((part, index) => {
        if (!part) return null;
        const isMention =
          /^@(admins|moderators)$/i.test(part) ||
          names.some((n) => part.toLowerCase() === `@${n}`.toLowerCase());
        if (isMention) {
          return (
            <span
              key={`${index}-${part}`}
              className={cn(
                'font-semibold',
                mine ? 'text-primary-foreground underline decoration-white/40' : 'text-primary'
              )}
            >
              {part}
            </span>
          );
        }
        return <span key={`${index}-${part}`}>{part}</span>;
      })}
    </p>
  );
}

type ConfirmAction = { type: 'clear' } | { type: 'delete-me' } | { type: 'delete-everyone' } | null;

export function CommunityChatTab({
  communityId,
  canModerate = false,
  embedded = false,
  communityName,
  onBack,
  onClose,
  className,
}: CommunityChatTabProps) {
  const { user, selectedProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [mediaPreview, setMediaPreview] = useState<{ file: File; url: string } | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
  const [menuReactOpen, setMenuReactOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const [copyToast, setCopyToast] = useState(false);
  const [pinsExpanded, setPinsExpanded] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<CommunityMessage | null>(null);
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharedMediaOpen, setSharedMediaOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchPage, setSearchPage] = useState(1);
  const [mentionProfileIds, setMentionProfileIds] = useState<string[]>([]);
  const [mentionRoles, setMentionRoles] = useState<Array<'admin' | 'moderator'>>([]);
  const [mentionLabels, setMentionLabels] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const messageElRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useQuery({
    queryKey: ['community-messages', communityId],
    queryFn: async () => {
      const res = await communityAPI.messages(communityId);
      return res.data.data.messages ?? [];
    },
  });

  const pinnedQuery = useQuery({
    queryKey: ['community-messages-pinned', communityId],
    queryFn: async () => {
      const res = await communityAPI.pinnedMessages(communityId);
      return res.data.data.messages ?? [];
    },
  });

  const membersQuery = useQuery({
    queryKey: ['community-members', communityId],
    queryFn: async () => {
      const res = await communityAPI.members(communityId);
      return res.data.data.members ?? [];
    },
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setSearchPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const searchQuery = useQuery({
    queryKey: ['community-messages-search', communityId, debouncedSearch, searchPage],
    queryFn: async () => {
      const res = await communityAPI.searchMessages(communityId, debouncedSearch, {
        page: searchPage,
        limit: 10,
      });
      return res.data.data;
    },
    enabled: searchOpen && debouncedSearch.length >= 2,
  });

  const upsertMessage = useCallback(
    (message: CommunityMessage) => {
      queryClient.setQueryData<CommunityMessage[]>(
        ['community-messages', communityId],
        (old) => {
          if (!old) return [message];
          const idx = old.findIndex((m) => m.id === message.id);
          if (idx === -1) return [...old, message];
          const next = [...old];
          next[idx] = { ...next[idx], ...message };
          return next;
        }
      );
    },
    [communityId, queryClient]
  );

  const sendMutation = useMutation({
    mutationFn: async (payload: {
      text?: string;
      file?: File;
      mentionProfileIds?: string[];
      mentionRoles?: Array<'admin' | 'moderator'>;
      replyTo?: string | null;
    }) => {
      const extras = {
        mentionProfileIds: payload.mentionProfileIds,
        mentionRoles: payload.mentionRoles,
        replyTo: payload.replyTo || replyTarget?.id || undefined,
      };
      if (payload.file) {
        const res = await communityAPI.sendMediaMessage(
          communityId,
          payload.file,
          payload.text || '',
          extras
        );
        return res.data.data.message;
      }
      const res = await communityAPI.sendMessage(communityId, payload.text || '', extras);
      return res.data.data.message;
    },
    onSuccess: (message) => {
      upsertMessage(message);
      setDraft('');
      setShowEmoji(false);
      setSendError(null);
      setMentionProfileIds([]);
      setMentionRoles([]);
      setMentionLabels({});
      setReplyTarget(null);
      if (mediaPreview) {
        if (mediaPreview.url) URL.revokeObjectURL(mediaPreview.url);
        setMediaPreview(null);
      }
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      setSendError(
        axiosError.response?.data?.message ||
          axiosError.message ||
          'Failed to send media. Try a smaller image or video.'
      );
    },
  });

  const votePollMutation = useMutation({
    mutationFn: async ({ messageId, optionIds }: { messageId: string; optionIds: string[] }) => {
      const res = await communityAPI.votePoll(communityId, messageId, optionIds);
      return res.data.data.message;
    },
    onSuccess: (message) => upsertMessage(message),
  });

  const closePollMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await communityAPI.closePoll(communityId, messageId);
      return res.data.data.message;
    },
    onSuccess: (message) => upsertMessage(message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (scope: 'me' | 'everyone') => {
      const ids = Array.from(selectedIds);
      const res = await communityAPI.deleteMessages(communityId, ids, scope);
      return { ...res.data.data, scope };
    },
    onSuccess: (result) => {
      queryClient.setQueryData<CommunityMessage[]>(
        ['community-messages', communityId],
        (old) => {
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
                    pinned: false,
                    reactions: [],
                    myReaction: null,
                    poll: null,
                    shareCard: null,
                    replyCount: msg.replyCount,
                  }
                : msg
            );
          }
          return old.filter((msg) => !result.messageIds.includes(msg.id));
        }
      );
      exitSelectMode();
      setConfirm(null);
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await communityAPI.clearChat(communityId);
    },
    onSuccess: () => {
      queryClient.setQueryData<CommunityMessage[]>(['community-messages', communityId], []);
      queryClient.setQueryData<CommunityMessage[]>(['community-messages-pinned', communityId], []);
      setConfirm(null);
      setMenuOpen(false);
    },
  });

  const pinMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await communityAPI.pinMessage(communityId, messageId);
      return res.data.data.message;
    },
    onSuccess: (message) => {
      queryClient.setQueryData<CommunityMessage[]>(
        ['community-messages-pinned', communityId],
        (old) => {
          const next = (old || []).filter((m) => m.id !== message.id);
          return [message, ...next].sort((a, b) => {
            const ta = a.pinnedAt ? Date.parse(a.pinnedAt) : 0;
            const tb = b.pinnedAt ? Date.parse(b.pinnedAt) : 0;
            return tb - ta;
          });
        }
      );
      queryClient.setQueryData<CommunityMessage[]>(
        ['community-messages', communityId],
        (old) =>
          patchMessageInList(old, message.id, {
            pinned: true,
            pinnedAt: message.pinnedAt ?? new Date().toISOString(),
          })
      );
      exitSelectMode();
    },
  });

  const unpinMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await communityAPI.unpinMessage(communityId, messageId);
      return messageId;
    },
    onSuccess: (messageId) => {
      queryClient.setQueryData<CommunityMessage[]>(
        ['community-messages-pinned', communityId],
        (old) => (old ? old.filter((m) => m.id !== messageId) : [])
      );
      queryClient.setQueryData<CommunityMessage[]>(
        ['community-messages', communityId],
        (old) =>
          patchMessageInList(old, messageId, {
            pinned: false,
            pinnedAt: null,
          })
      );
      exitSelectMode();
    },
  });

  const reactMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const res = await communityAPI.reactToMessage(communityId, messageId, emoji);
      return res.data.data.message;
    },
    onSuccess: (message) => {
      upsertMessage(message);
      setMenuReactOpen(false);
      setMenuMessageId(null);
    },
  });

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;

    void getAppSocket().then((socket) => {
      if (!active) return;
      socket.emit('community:join', { communityId });

      const onMessage = (message: CommunityMessage) => {
        if (message.communityId !== communityId) return;
        queryClient.setQueryData<CommunityMessage[]>(
          ['community-messages', communityId],
          (old) => {
            if (!old) return [message];
            if (old.some((m) => m.id === message.id)) return old;
            return [...old, message];
          }
        );
      };

      const onDeleted = (payload: {
        communityId: string;
        messageIds: string[];
        scope: 'me' | 'everyone';
      }) => {
        if (payload.communityId !== communityId) return;
        queryClient.setQueryData<CommunityMessage[]>(
          ['community-messages', communityId],
          (old) => {
            if (!old) return old;
            if (payload.scope === 'everyone') {
              return old.map((msg) =>
                payload.messageIds.includes(msg.id)
                  ? {
                      ...msg,
                      text: '',
                      mediaUrl: null,
                      mediaType: null,
                      deletedForEveryone: true,
                      pinned: false,
                      reactions: [],
                      myReaction: null,
                    }
                  : msg
              );
            }
            return old;
          }
        );
        queryClient.setQueryData<CommunityMessage[]>(
          ['community-messages-pinned', communityId],
          (old) => (old ? old.filter((m) => !payload.messageIds.includes(m.id)) : old)
        );
      };

      const onPinned = (payload: { communityId: string; message: CommunityMessage }) => {
        if (payload.communityId !== communityId) return;
        const message = payload.message;
        queryClient.setQueryData<CommunityMessage[]>(
          ['community-messages-pinned', communityId],
          (old) => {
            const next = (old || []).filter((m) => m.id !== message.id);
            return [message, ...next].sort((a, b) => {
              const ta = a.pinnedAt ? Date.parse(a.pinnedAt) : 0;
              const tb = b.pinnedAt ? Date.parse(b.pinnedAt) : 0;
              return tb - ta;
            });
          }
        );
        queryClient.setQueryData<CommunityMessage[]>(
          ['community-messages', communityId],
          (old) =>
            patchMessageInList(old, message.id, {
              pinned: true,
              pinnedAt: message.pinnedAt ?? null,
            })
        );
      };

      const onUnpinned = (payload: { communityId: string; messageId: string }) => {
        if (payload.communityId !== communityId) return;
        queryClient.setQueryData<CommunityMessage[]>(
          ['community-messages-pinned', communityId],
          (old) => (old ? old.filter((m) => m.id !== payload.messageId) : [])
        );
        queryClient.setQueryData<CommunityMessage[]>(
          ['community-messages', communityId],
          (old) =>
            patchMessageInList(old, payload.messageId, {
              pinned: false,
              pinnedAt: null,
            })
        );
      };

      const onReaction = (payload: {
        communityId: string;
        messageId: string;
        reactions?: CommunityMessageReaction[];
        myReaction?: string | null;
      }) => {
        if (payload.communityId !== communityId) return;
        queryClient.setQueryData<CommunityMessage[]>(
          ['community-messages', communityId],
          (old) =>
            old?.map((msg) =>
              msg.id === payload.messageId ? applyReactionSocket(msg, payload) : msg
            )
        );
      };

      const onPollUpdated = (payload: { communityId: string; message: CommunityMessage }) => {
        if (payload.communityId !== communityId) return;
        upsertMessage(payload.message);
      };

      const onThreadReply = (payload: {
        communityId: string;
        parentId: string;
        message: CommunityMessage;
        replyCount?: number;
      }) => {
        if (payload.communityId !== communityId) return;
        upsertMessage(payload.message);
        queryClient.setQueryData<CommunityMessage[]>(
          ['community-messages', communityId],
          (old) =>
            old?.map((m) =>
              m.id === payload.parentId
                ? { ...m, replyCount: payload.replyCount ?? (m.replyCount || 0) + 1 }
                : m
            )
        );
        queryClient.setQueryData<{ parent: CommunityMessage; replies: CommunityMessage[] }>(
          ['community-thread', communityId, payload.parentId],
          (old) => {
            if (!old) return old;
            if (old.replies.some((r) => r.id === payload.message.id)) return old;
            return {
              parent: {
                ...old.parent,
                replyCount: payload.replyCount ?? (old.parent.replyCount || 0) + 1,
              },
              replies: [...old.replies, payload.message],
            };
          }
        );
      };

      socket.on('community:message', onMessage);
      socket.on('community:messages_deleted', onDeleted);
      socket.on('community:message_pinned', onPinned);
      socket.on('community:message_unpinned', onUnpinned);
      socket.on('community:message_reaction', onReaction);
      socket.on('community:poll_updated', onPollUpdated);
      socket.on('community:thread_reply', onThreadReply);
      cleanup = () => {
        socket.off('community:message', onMessage);
        socket.off('community:messages_deleted', onDeleted);
        socket.off('community:message_pinned', onPinned);
        socket.off('community:message_unpinned', onUnpinned);
        socket.off('community:message_reaction', onReaction);
        socket.off('community:poll_updated', onPollUpdated);
        socket.off('community:thread_reply', onThreadReply);
      };
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [communityId, queryClient, upsertMessage]);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const closeMessageMenu = useCallback(() => {
    setMenuMessageId(null);
    setMenuReactOpen(false);
    setMenuCoords(null);
  }, []);

  const openMessageMenu = useCallback((messageId: string) => {
    setMenuMessageId(messageId);
    setMenuReactOpen(false);
    setShowEmoji(false);
    setMenuOpen(false);
  }, []);

  const updateMenuPosition = useCallback(() => {
    if (!menuMessageId) {
      setMenuCoords(null);
      return;
    }
    const row = messageElRefs.current.get(menuMessageId);
    if (!row) return;
    const trigger =
      (row.querySelector('[data-message-menu-trigger]') as HTMLElement | null) ||
      (row.querySelector('[data-message-bubble]') as HTMLElement | null) ||
      row;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = Math.min(240, window.innerWidth - 16);
    const estimatedHeight = menuRef.current?.offsetHeight || (menuReactOpen ? 420 : 300);
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

    setMenuCoords({ top, left });
  }, [menuMessageId, menuReactOpen]);

  useLayoutEffect(() => {
    if (!menuMessageId) {
      setMenuCoords(null);
      return;
    }
    updateMenuPosition();
    // Re-measure after paint once menu content (react row) settles.
    const raf = window.requestAnimationFrame(() => updateMenuPosition());
    const onReposition = () => updateMenuPosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [menuMessageId, menuReactOpen, updateMenuPosition]);

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

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const isNearBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  // Jump to latest message when opening chat or when history first loads.
  useLayoutEffect(() => {
    if (searchOpen || messagesQuery.isLoading) return;

    const jump = () => scrollToBottom('auto');
    jump();
    const raf = window.requestAnimationFrame(jump);
    const raf2 = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(jump);
    });
    const timer = window.setTimeout(jump, 80);
    const timer2 = window.setTimeout(jump, 250);
    const timer3 = window.setTimeout(jump, 500);
    prevMessageCountRef.current = messagesQuery.data?.length ?? 0;

    return () => {
      window.cancelAnimationFrame(raf);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(timer);
      window.clearTimeout(timer2);
      window.clearTimeout(timer3);
    };
  }, [
    communityId,
    searchOpen,
    messagesQuery.isLoading,
    messagesQuery.dataUpdatedAt,
    messagesQuery.data?.length,
    scrollToBottom,
  ]);

  // Smooth scroll for new messages only when already near the bottom.
  useEffect(() => {
    if (searchOpen || messagesQuery.isLoading) return;
    const len = messagesQuery.data?.length ?? 0;
    if (len > prevMessageCountRef.current && isNearBottom()) {
      scrollToBottom('smooth');
    }
    prevMessageCountRef.current = len;
  }, [
    messagesQuery.data?.length,
    messagesQuery.isLoading,
    searchOpen,
    isNearBottom,
    scrollToBottom,
  ]);

  useEffect(() => {
    if (!menuMessageId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMessageMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuMessageId, closeMessageMenu]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scrollToMessage = (messageId: string) => {
    const el = messageElRefs.current.get(messageId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-primary/60');
    window.setTimeout(() => {
      el.classList.remove('ring-2', 'ring-primary/60');
    }, 1600);
  };

  const messages = messagesQuery.data ?? [];
  const pinnedMessages = pinnedQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const menuMessage = useMemo(
    () => (menuMessageId ? messages.find((m) => m.id === menuMessageId) ?? null : null),
    [menuMessageId, messages]
  );
  const menuMine =
    !!menuMessage &&
    (menuMessage.sender.userId === user?._id ||
      menuMessage.sender.profileId === selectedProfile?._id);

  const pinPreviewText = (msg: CommunityMessage) =>
    msg.deletedForEveryone
      ? 'Deleted message'
      : msg.text?.trim()
        ? msg.text.trim()
        : msg.mediaUrl
          ? 'Media'
          : 'Pinned message';

  const visiblePinnedMessages = pinsExpanded ? pinnedMessages : pinnedMessages.slice(0, 2);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      map.set(m.profile.id, m.profile.name);
    }
    return map;
  }, [members]);

  const memberProfileById = useMemo(() => {
    const map = new Map<string, CommunityMember['profile']>();
    for (const m of members) {
      map.set(m.profile.id, m.profile);
    }
    return map;
  }, [members]);

  const mentionHighlightNames = useMemo(() => {
    const names = new Set<string>(Object.values(mentionLabels));
    for (const m of members) names.add(m.profile.name);
    return Array.from(names);
  }, [members, mentionLabels]);

  const activeMention = useMemo(() => getActiveMention(draft), [draft]);

  const mentionSuggestions = useMemo(() => {
    if (!activeMention) return null;
    const q = activeMention.query.toLowerCase();
    const roles = ROLE_MENTIONS.filter(
      (r) => !q || r.label.startsWith(q) || r.role.startsWith(q)
    );
    const people = members
      .filter((m) => m.profile.id !== selectedProfile?._id)
      .filter((m) => !q || m.profile.name.toLowerCase().includes(q))
      .slice(0, 8);
    if (!roles.length && !people.length) return { roles: [], people: [] as CommunityMember[] };
    return { roles, people };
  }, [activeMention, members, selectedProfile?._id]);

  const selectedMineOnly = useMemo(() => {
    if (!selectedIds.size) return false;
    return messages
      .filter((m) => selectedIds.has(m.id))
      .every(
        (m) =>
          (m.sender.userId === user?._id || m.sender.profileId === selectedProfile?._id) &&
          !m.deletedForEveryone
      );
  }, [messages, selectedIds, user?._id, selectedProfile?._id]);

  const singleSelected = useMemo(() => {
    if (selectedIds.size !== 1) return null;
    const id = Array.from(selectedIds)[0];
    return messages.find((m) => m.id === id) ?? null;
  }, [messages, selectedIds]);

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
        showName: !mine && !sameAsPrev,
        showAvatar: !mine && !sameAsNext,
        tightTop: sameAsPrev,
        showDay,
        selected: selectedIds.has(message.id),
      };
    });
  }, [messages, user?._id, selectedProfile?._id, selectedIds]);

  const canSend =
    Boolean(selectedProfile) &&
    !sendMutation.isPending &&
    (Boolean(draft.trim()) || Boolean(mediaPreview));

  const collectMentionsForSend = (text: string) => {
    const keptProfiles = new Set(
      mentionProfileIds.filter((id) => {
        const name = mentionLabels[id] || memberNameById.get(id);
        if (!name) return false;
        return text.includes(`@${name}`);
      })
    );
    // Resolve @Name from text even if the suggestion wasn't tapped.
    for (const m of members) {
      const name = m.profile.name?.trim();
      if (!name || m.profile.id === selectedProfile?._id) continue;
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(?:^|[\\s])@${escaped}(?=$|[\\s.,!?;:…])`, 'i');
      if (pattern.test(` ${text}`)) {
        keptProfiles.add(m.profile.id);
      }
    }
    const keptRoles: Array<'admin' | 'moderator'> = [...mentionRoles].filter((role) => {
      const label = role === 'admin' ? '@admins' : '@moderators';
      return text.toLowerCase().includes(label);
    });
    if (/\B@admins\b/i.test(text) && !keptRoles.includes('admin')) {
      keptRoles.push('admin');
    }
    if (/\B@moderators\b/i.test(text) && !keptRoles.includes('moderator')) {
      keptRoles.push('moderator');
    }
    return {
      mentionProfileIds: Array.from(keptProfiles),
      mentionRoles: keptRoles,
    };
  };

  const submitMessage = () => {
    if (!canSend) return;
    const text = draft.trim();
    const mentions = collectMentionsForSend(text);
    sendMutation.mutate({
      text,
      file: mediaPreview?.file,
      ...mentions,
    });
  };

  const onPickFile = (file: File | undefined) => {
    if (!file) return;
    const mime = file.type || '';
    const name = file.name.toLowerCase();
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');
    const isAudio = mime.startsWith('audio/');
    const isDoc =
      mime === 'application/pdf' ||
      mime.includes('document') ||
      mime.includes('sheet') ||
      mime.includes('presentation') ||
      mime === 'text/plain' ||
      mime === 'text/csv' ||
      mime === 'application/zip' ||
      mime === 'application/msword' ||
      /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar)$/i.test(name);
    if (!isImage && !isVideo && !isAudio && !isDoc) {
      setSendError('Only images, videos, audio, or documents are allowed.');
      return;
    }
    if (mediaPreview?.url) URL.revokeObjectURL(mediaPreview.url);
    setMediaPreview({
      file,
      url: isImage || isVideo || isAudio ? URL.createObjectURL(file) : '',
    });
    setSendError(null);
    setShowEmoji(false);
  };

  const insertMention = (
    option:
      | { kind: 'role'; role: 'admin' | 'moderator'; label: string }
      | { kind: 'member'; profileId: string; name: string }
  ) => {
    if (!activeMention) return;
    const label = option.kind === 'role' ? option.label : option.name;
    const next = `${draft.slice(0, activeMention.start)}@${label} `;
    setDraft(next);
    if (option.kind === 'role') {
      setMentionRoles((prev) => (prev.includes(option.role) ? prev : [...prev, option.role]));
    } else {
      setMentionProfileIds((prev) =>
        prev.includes(option.profileId) ? prev : [...prev, option.profileId]
      );
      setMentionLabels((prev) => ({ ...prev, [option.profileId]: option.name }));
    }
    composerRef.current?.focus();
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchInput('');
    setDebouncedSearch('');
    setSearchPage(1);
  };

  const confirmBusy = deleteMutation.isPending || clearMutation.isPending;
  const confirmCopy =
    confirm?.type === 'clear'
      ? {
          title: 'Clear this chat?',
          description: 'Messages will be removed for you only. Other members keep their copy.',
          confirmLabel: 'Clear chat',
        }
      : confirm?.type === 'delete-everyone'
        ? {
            title: 'Delete for everyone?',
            description: 'Selected messages will be removed for all members.',
            confirmLabel: 'Delete for everyone',
          }
        : {
            title: 'Delete for me?',
            description: 'Selected messages will be removed from your chat only.',
            confirmLabel: 'Delete for me',
          };

  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden bg-[#efeae2]',
        embedded
          ? 'h-full min-h-0 border-0 rounded-none shadow-none'
          : 'h-[min(75vh,640px)] rounded-2xl border border-black/5 shadow-sm',
        className
      )}
    >
      <div
        className={cn(
          'relative z-20 flex items-center gap-2 border-b border-black/5 bg-[#f0f2f5] px-2 py-2',
          embedded ? 'rounded-t-3xl sm:rounded-t-3xl' : 'rounded-t-2xl'
        )}
      >
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
            {canModerate && singleSelected && !singleSelected.deletedForEveryone && (
              <button
                type="button"
                disabled={pinMutation.isPending || unpinMutation.isPending}
                onClick={() => {
                  if (singleSelected.pinned) unpinMutation.mutate(singleSelected.id);
                  else pinMutation.mutate(singleSelected.id);
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#111b21] hover:bg-black/5 disabled:opacity-40"
              >
                {singleSelected.pinned ? (
                  <>
                    <PinOff className="h-3.5 w-3.5" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="h-3.5 w-3.5" />
                    Pin
                  </>
                )}
              </button>
            )}
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
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#54656f] hover:bg-black/5"
                aria-label="Back to chats"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : null}
            <div className="min-w-0 flex-1 px-1">
              <p className="truncate text-sm font-semibold text-[#111b21]">
                {communityName || 'Group chat'}
              </p>
              <p className="truncate text-[11px] text-[#667781]">Community · all chat features</p>
            </div>
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
                  </div>
                </>
              )}
            </div>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
          </>
        )}
      </div>

      {searchOpen && (
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
              onClick={closeSearch}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {debouncedSearch.length >= 2 && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-white shadow-sm ring-1 ring-black/5">
              {searchQuery.isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (searchQuery.data?.results?.length ?? 0) === 0 ? (
                <p className="px-3 py-3 text-center text-xs text-[#667781]">No results</p>
              ) : (
                <>
                  {searchQuery.data!.results.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      className="flex w-full flex-col gap-0.5 border-b border-black/5 px-3 py-2 text-left last:border-0 hover:bg-black/[0.03]"
                      onClick={() => {
                        closeSearch();
                        window.setTimeout(() => scrollToMessage(result.id), 50);
                      }}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-[#111b21]">
                          {result.sender.name}
                        </span>
                        <span className="shrink-0 text-[10px] text-[#667781]">
                          {DateTime.fromISO(result.createdAt).toFormat('LLL d, h:mm a')}
                        </span>
                      </div>
                      <span className="truncate text-[12px] text-[#54656f]">
                        {result.deletedForEveryone
                          ? 'This message was deleted'
                          : result.text?.trim() ||
                            (result.mediaUrl ? 'Media' : 'Message')}
                      </span>
                    </button>
                  ))}
                  {(searchQuery.data!.totalPages ?? 1) > 1 && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <button
                        type="button"
                        disabled={searchPage <= 1}
                        onClick={() => setSearchPage((p) => Math.max(1, p - 1))}
                        className="text-xs font-semibold text-primary disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="text-[11px] text-[#667781]">
                        {searchPage} / {searchQuery.data!.totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={searchPage >= (searchQuery.data!.totalPages || 1)}
                        onClick={() => setSearchPage((p) => p + 1)}
                        className="text-xs font-semibold text-primary disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {searchInput.trim().length > 0 && searchInput.trim().length < 2 && (
            <p className="mt-1 px-1 text-[11px] text-[#667781]">Type at least 2 characters</p>
          )}
        </div>
      )}

      {pinnedMessages.length > 0 && !searchOpen && (
        <div className="relative z-10 border-b border-black/5 bg-[#fffef5]">
          <div className="flex items-center justify-between gap-2 px-3 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              {pinnedMessages.length} pinned
            </p>
            {pinnedMessages.length > 2 && (
              <button
                type="button"
                className="text-[11px] font-semibold text-[#54656f] hover:text-[#111b21]"
                onClick={() => setPinsExpanded((v) => !v)}
              >
                {pinsExpanded ? 'Show less' : 'Show all'}
              </button>
            )}
          </div>
          <div className={cn('max-h-36 overflow-y-auto', pinsExpanded ? 'pb-1' : 'pb-1')}>
            {visiblePinnedMessages.map((pin) => (
              <div
                key={pin.id}
                className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-black/[0.03]"
              >
                <button
                  type="button"
                  onClick={() => scrollToMessage(pin.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <Pin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-primary">
                      {pin.sender.name}
                    </p>
                    <p className="truncate text-xs text-[#54656f]">{pinPreviewText(pin)}</p>
                  </div>
                </button>
                {canModerate && (
                  <button
                    type="button"
                    aria-label="Unpin message"
                    disabled={unpinMutation.isPending}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5 disabled:opacity-40"
                    onClick={() => unpinMutation.mutate(pin.id)}
                  >
                    <PinOff className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="relative flex-1 overflow-y-auto px-2 py-3 sm:px-4"
        style={chatWallpaperStyle}
        onClick={() => {
          setShowEmoji(false);
          setMenuOpen(false);
          closeMessageMenu();
        }}
      >
        {messagesQuery.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="mx-auto mt-8 max-w-xs rounded-lg bg-[#ffeecd] px-3 py-2 text-center text-xs text-[#54656f] shadow-sm">
            No messages yet. Say hello to the group.
          </div>
        ) : (
          rows.map(({ message, mine, showName, showAvatar, tightTop, showDay, selected }) => (
            <div
              key={message.id}
              ref={(el) => {
                if (el) messageElRefs.current.set(message.id, el);
                else messageElRefs.current.delete(message.id);
              }}
              className="transition-shadow"
            >
              {showDay && (
                <div className="my-3.5 flex justify-center">
                  <span className="rounded-full bg-white/95 px-3.5 py-[5px] text-[12px] font-medium tracking-wide text-[#54656f] shadow-[0_1px_1px_rgba(0,0,0,0.08)]">
                    {DateTime.fromISO(message.createdAt).hasSame(DateTime.now(), 'day')
                      ? 'Today'
                      : DateTime.fromISO(message.createdAt).toFormat('d/M/yyyy')}
                  </span>
                </div>
              )}
              <div
                className={cn(
                  'group/msg flex items-end gap-1.5 px-0.5',
                  mine ? 'justify-end' : 'justify-start',
                  selectMode && 'cursor-pointer',
                  tightTop ? 'mt-[2px]' : 'mt-1.5'
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  if (longPressFiredRef.current) {
                    longPressFiredRef.current = false;
                    return;
                  }
                  if (selectMode) {
                    toggleSelect(message.id);
                    return;
                  }
                  if (menuMessageId && menuMessageId !== message.id) {
                    closeMessageMenu();
                  }
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  if (selectMode || message.deletedForEveryone) return;
                  openMessageMenu(message.id);
                }}
                onTouchStart={() => {
                  if (selectMode || message.deletedForEveryone) return;
                  startLongPress(message.id);
                }}
                onTouchEnd={clearLongPress}
                onTouchMove={clearLongPress}
                onTouchCancel={clearLongPress}
              >
                {selectMode && (
                  <span
                    className={cn(
                      'mb-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                      selected
                        ? 'border-primary bg-primary text-white'
                        : 'border-[#8696a0] bg-transparent'
                    )}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                )}

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

                {mine && !selectMode && !message.deletedForEveryone && (
                  <button
                    type="button"
                    aria-label="Quick react"
                    className={cn(
                      'mb-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#667781] shadow-[0_1px_3px_rgba(0,0,0,0.18)] ring-1 ring-black/5 transition-opacity',
                      'opacity-0 group-hover/msg:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-70',
                      menuMessageId === message.id && menuReactOpen && 'opacity-100'
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      openMessageMenu(message.id);
                      setMenuReactOpen(true);
                    }}
                  >
                    <Smile className="h-4 w-4" />
                  </button>
                )}

                <div
                  className={cn(
                    'relative',
                    message.poll || message.shareCard
                      ? 'w-fit max-w-[min(88%,300px)]'
                      : 'max-w-[min(78%,32rem)]',
                    mine ? 'items-end' : 'items-start',
                    (message.reactions?.length ?? 0) > 0 && !message.deletedForEveryone
                      ? 'mb-3'
                      : undefined
                  )}
                >
                  <div
                    data-message-bubble
                    className={cn(
                      'relative rounded-[7.5px] px-[9px] pb-[6px] pt-[6px] text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]',
                      mine ? 'bg-primary text-primary-foreground' : 'bg-white'
                    )}
                  >
                    {!selectMode && !message.deletedForEveryone && (
                      <button
                        type="button"
                        data-message-menu-trigger
                        aria-label="Message actions"
                        className={cn(
                          'absolute right-0 top-0 z-10 flex h-8 w-10 items-start justify-end pt-0.5 pr-1 transition-opacity',
                          'opacity-0 group-hover/msg:opacity-100 focus-visible:opacity-100',
                          '[@media(hover:none)]:opacity-80',
                          menuMessageId === message.id && 'opacity-100'
                        )}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (menuMessageId === message.id) closeMessageMenu();
                          else openMessageMenu(message.id);
                        }}
                      >
                        {/* Soft fade so chevron sits cleanly over the bubble corner (WhatsApp-style) */}
                        <span
                          aria-hidden
                          className={cn(
                            'pointer-events-none absolute inset-0 rounded-tr-[7.5px]',
                            mine
                              ? 'bg-gradient-to-l from-primary via-primary/90 to-transparent'
                              : 'bg-gradient-to-l from-white via-white/90 to-transparent'
                          )}
                        />
                        <ChevronDown
                          className={cn(
                            'relative mt-0.5 h-[18px] w-[18px] shrink-0',
                            mine ? 'text-primary-foreground/80' : 'text-[#8696a0]'
                          )}
                          strokeWidth={2.25}
                        />
                      </button>
                    )}

                    {message.pinned ? (
                      <span
                        className={cn(
                          'mb-0.5 inline-flex items-center gap-0.5 pr-7 text-[10px]',
                          mine ? 'text-primary-foreground/80' : 'text-primary'
                        )}
                      >
                        <Pin className="h-2.5 w-2.5" />
                        Pinned
                      </span>
                    ) : null}

                    {showName ? (
                      <Link
                        href={`/feed/profile/${message.sender.profileId}`}
                        className={cn(
                          'mb-0.5 block pr-7 text-[12.8px] font-semibold hover:underline',
                          nameColor(message.sender.profileId)
                        )}
                        onClick={(e) => selectMode && e.preventDefault()}
                      >
                        {message.sender.name}
                      </Link>
                    ) : null}

                    {message.deletedForEveryone ? (
                      <p
                        className={cn(
                          'italic text-[14.2px] pr-1',
                          mine ? 'text-primary-foreground/80' : 'text-[#667781]'
                        )}
                      >
                        This message was deleted
                      </p>
                    ) : (
                      <div className="min-w-0 pr-6">
                        {message.replyTo && (
                          <button
                            type="button"
                            className={cn(
                              'mb-1 w-full rounded-md border-l-4 px-2 py-1 text-left',
                              mine
                                ? 'border-white/70 bg-black/10'
                                : 'border-primary bg-black/[0.04]'
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
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
                        )}
                        {message.poll ? (
                          <ChatPollBubble
                            message={message}
                            mine={mine}
                            canModerate={canModerate}
                            memberProfileById={memberProfileById}
                            voting={votePollMutation.isPending}
                            closing={closePollMutation.isPending}
                            onVote={(optionIds) =>
                              votePollMutation.mutate({ messageId: message.id, optionIds })
                            }
                            onClose={() => closePollMutation.mutate(message.id)}
                          />
                        ) : message.shareCard ? (
                          <ChatShareCardBubble card={message.shareCard} mine={mine} />
                        ) : (
                          <>
                            {message.mediaUrl && message.mediaType === 'image' && (
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
                            )}
                            {message.mediaUrl && message.mediaType === 'video' && (
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
                            )}
                            {message.mediaUrl &&
                              (message.mediaType === 'document' ||
                                message.mediaType === 'audio') && (
                                <a
                                  href={message.mediaUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={cn(
                                    'mb-1 block rounded-lg px-2 py-1.5 text-[13px] font-medium underline',
                                    mine ? 'bg-black/10' : 'bg-black/[0.04] text-primary'
                                  )}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {message.fileName ||
                                    (message.mediaType === 'audio' ? 'Voice note' : 'Document')}
                                </a>
                              )}
                            {message.messageType !== 'poll' &&
                            message.messageType !== 'share_card' &&
                            message.text
                              ? renderMessageText(message.text, mentionHighlightNames, mine)
                              : null}
                          </>
                        )}
                        {(message.replyCount || 0) > 0 && (
                          <button
                            type="button"
                            className={cn(
                              'mt-1 text-[12px] font-semibold',
                              mine ? 'text-primary-foreground/90' : 'text-primary'
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setThreadParentId(message.id);
                            }}
                          >
                            {message.replyCount}{' '}
                            {message.replyCount === 1 ? 'reply' : 'replies'}
                          </button>
                        )}
                      </div>
                    )}

                    <div
                      className={cn(
                        'mt-0.5 flex items-center justify-end gap-[3px]',
                        mine ? 'text-primary-foreground/75' : 'text-[#667781]'
                      )}
                    >
                      <span className="text-[11px] leading-none tabular-nums">
                        {DateTime.fromISO(message.createdAt).toFormat('h:mm a').toLowerCase()}
                      </span>
                      {mine && !message.deletedForEveryone && (
                        <CheckCheck className="h-[15px] w-[15px] text-sky-200" />
                      )}
                    </div>

                    {(message.reactions?.length ?? 0) > 0 && !message.deletedForEveryone && (
                      <div
                        className={cn(
                          'absolute z-[2] flex max-w-[min(100%,16rem)]',
                          mine ? 'right-1' : 'left-1',
                          '-bottom-3'
                        )}
                        onClick={(e) => e.stopPropagation()}
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
                              <span className="text-[15px] leading-none">{reaction.emoji}</span>
                              {reaction.count > 1 && (
                                <span className="text-[11px] font-medium text-[#54656f]">
                                  {reaction.count}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {!mine && !selectMode && !message.deletedForEveryone && (
                  <button
                    type="button"
                    aria-label="Quick react"
                    className={cn(
                      'mb-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#667781] shadow-[0_1px_3px_rgba(0,0,0,0.18)] ring-1 ring-black/5 transition-opacity',
                      'opacity-0 group-hover/msg:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-70',
                      menuMessageId === message.id && menuReactOpen && 'opacity-100'
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      openMessageMenu(message.id);
                      setMenuReactOpen(true);
                    }}
                  >
                    <Smile className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {!selectMode && (
        <div className="relative z-20 border-t border-black/5 bg-[#f0f2f5] px-2 py-2">
          {replyTarget && (
            <div className="mb-2 flex items-start gap-2 rounded-xl border-l-4 border-primary bg-white px-3 py-2 shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-primary">
                  Replying to {replyTarget.sender.name}
                </p>
                <p className="truncate text-xs text-[#54656f]">
                  {replyTarget.messageType === 'poll'
                    ? replyTarget.poll?.question || 'Poll'
                    : replyTarget.messageType === 'share_card'
                      ? replyTarget.shareCard?.title || 'Shared update'
                      : replyTarget.text ||
                        replyTarget.fileName ||
                        (replyTarget.mediaUrl ? 'Media' : 'Message')}
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
              {mediaPreview.file.type.startsWith('video/') && mediaPreview.url ? (
                <video src={mediaPreview.url} className="h-16 w-16 rounded-lg object-cover" muted />
              ) : mediaPreview.file.type.startsWith('image/') && mediaPreview.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaPreview.url}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-foreground">
                  FILE
                </div>
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
                  if (mediaPreview.url) URL.revokeObjectURL(mediaPreview.url);
                  setMediaPreview(null);
                  setSendError(null);
                }}
                className="rounded-full p-1 text-[#667781] hover:bg-black/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {sendError ? (
            <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{sendError}</p>
          ) : null}

          {mentionSuggestions && activeMention && (
            <div className="absolute bottom-[calc(100%-0.25rem)] left-2 right-2 z-30 max-h-48 overflow-y-auto rounded-xl bg-white py-1 shadow-xl ring-1 ring-black/5 sm:left-12 sm:right-12">
              {mentionSuggestions.roles.map((role) => (
                <button
                  key={role.role}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#111b21] hover:bg-black/5"
                  onClick={() =>
                    insertMention({ kind: 'role', role: role.role, label: role.label })
                  }
                >
                  <span className="font-semibold text-primary">@{role.label}</span>
                  <span className="text-xs text-[#667781]">Notify {role.label}</span>
                </button>
              ))}
              {mentionSuggestions.people.map((member) => (
                <button
                  key={member.profile.id}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#111b21] hover:bg-black/5"
                  onClick={() =>
                    insertMention({
                      kind: 'member',
                      profileId: member.profile.id,
                      name: member.profile.name,
                    })
                  }
                >
                  <ProfileAvatar
                    name={member.profile.name}
                    avatarUrl={member.profile.avatarUrl}
                    avatarSeed={member.profile.avatarSeed}
                    avatarStyle={member.profile.avatarStyle}
                    size="sm"
                    className="h-6 w-6"
                  />
                  <span className="font-medium">@{member.profile.name}</span>
                </button>
              ))}
              {!mentionSuggestions.roles.length && !mentionSuggestions.people.length && (
                <p className="px-3 py-2 text-xs text-[#667781]">No matches</p>
              )}
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
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
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

      {menuMessage &&
        !selectMode &&
        !menuMessage.deletedForEveryone &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Close message menu"
              className="fixed inset-0 z-[220]"
              onClick={closeMessageMenu}
            />
            <div
              ref={menuRef}
              className={cn(
                'fixed z-[221] w-[min(240px,calc(100vw-16px))] overflow-hidden rounded-xl bg-[#233138] py-1 text-white shadow-xl ring-1 ring-black/20',
                !menuCoords && 'invisible'
              )}
              style={
                menuCoords
                  ? { top: menuCoords.top, left: menuCoords.left }
                  : { top: 0, left: 0 }
              }
              onClick={(e) => e.stopPropagation()}
            >
              {menuReactOpen && (
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
                onClick={() => setMenuReactOpen((open) => !open)}
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

              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 px-3.5 py-2.5 text-left text-[14px] hover:bg-white/10"
                onClick={() => {
                  setThreadParentId(menuMessage.id);
                  closeMessageMenu();
                }}
              >
                <MessageSquare className="h-4 w-4 shrink-0 opacity-90" />
                View thread
              </button>

              {canModerate && (
                <button
                  type="button"
                  disabled={pinMutation.isPending || unpinMutation.isPending}
                  className="flex min-h-11 w-full items-center gap-3 px-3.5 py-2.5 text-left text-[14px] hover:bg-white/10 disabled:opacity-40"
                  onClick={() => {
                    if (menuMessage.pinned) unpinMutation.mutate(menuMessage.id);
                    else pinMutation.mutate(menuMessage.id);
                    closeMessageMenu();
                  }}
                >
                  {menuMessage.pinned ? (
                    <>
                      <PinOff className="h-4 w-4 shrink-0 opacity-90" />
                      Unpin
                    </>
                  ) : (
                    <>
                      <Pin className="h-4 w-4 shrink-0 opacity-90" />
                      Pin
                    </>
                  )}
                </button>
              )}

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
          if (!confirmBusy) {
            setConfirm(null);
            if (!selectMode) setSelectedIds(new Set());
          }
        }}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === 'clear') clearMutation.mutate();
          else if (confirm.type === 'delete-me') deleteMutation.mutate('me');
          else if (confirm.type === 'delete-everyone') deleteMutation.mutate('everyone');
        }}
      />

      <ChatCreatePollDialog
        open={pollDialogOpen}
        communityId={communityId}
        onClose={() => setPollDialogOpen(false)}
        onCreated={(message) => upsertMessage(message)}
      />

      <ChatShareActivityDialog
        open={shareDialogOpen}
        communityId={communityId}
        onClose={() => setShareDialogOpen(false)}
        onShared={(message) => upsertMessage(message)}
      />

      <ChatSharedMediaPanel
        open={sharedMediaOpen}
        communityId={communityId}
        onClose={() => setSharedMediaOpen(false)}
        onJumpToMessage={(messageId) => {
          setSharedMediaOpen(false);
          window.setTimeout(() => scrollToMessage(messageId), 50);
        }}
      />

      <ChatThreadSheet
        open={Boolean(threadParentId)}
        communityId={communityId}
        parentId={threadParentId}
        onClose={() => setThreadParentId(null)}
        onJumpToMessage={(messageId) => {
          setThreadParentId(null);
          window.setTimeout(() => scrollToMessage(messageId), 50);
        }}
      />

      {copyToast && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-[#111b21]/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          Message copied
        </div>
      )}
    </div>
  );
}
