'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  CheckSquare,
  Eraser,
  Loader2,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Send,
  Smile,
  Trash2,
  X,
} from 'lucide-react';
import { DateTime } from 'luxon';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { messagesAPI, type FeedChatMessage, type FeedConversation } from '@/lib/api/messages';
import { getAppSocket } from '@/lib/realtime/socketClient';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';

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
  startWithUser?: { userId: string; profileId?: string; name?: string } | null;
}

type ConfirmAction =
  | { type: 'clear' }
  | { type: 'delete-chat' }
  | { type: 'delete-me' }
  | { type: 'delete-everyone' }
  | null;

export function FeedMessagesPanel({
  open,
  onClose,
  initialConversationId,
  startWithUser,
}: FeedMessagesPanelProps) {
  const { user, selectedProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [listMenuId, setListMenuId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [mediaPreview, setMediaPreview] = useState<{ file: File; url: string } | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    enabled: open,
    queryFn: async () => {
      const res = await messagesAPI.listConversations();
      return res.data.data.conversations ?? [];
    },
  });

  const messagesQuery = useQuery({
    queryKey: ['messages', activeId],
    enabled: open && !!activeId,
    queryFn: async () => {
      const res = await messagesAPI.listMessages(activeId!);
      return res.data.data.messages ?? [];
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
          payload.text || ''
        );
        return res.data.data.message;
      }
      const res = await messagesAPI.sendMessage(activeId, payload.text || '');
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
    if (initialConversationId) setActiveId(initialConversationId);
  }, [open, initialConversationId]);

  useEffect(() => {
    if (!open || !startWithUser?.userId) return;
    openConversation.mutate({
      userId: startWithUser.userId,
      profileId: startWithUser.profileId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startWithUser?.userId]);

  useEffect(() => {
    if (!open || !activeId) return;
    let active = true;
    void getAppSocket().then((socket) => {
      if (!active) return;
      socket.emit('dm:join', { conversationId: activeId });
    });
    return () => {
      active = false;
    };
  }, [open, activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesQuery.data, activeId]);

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
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview.url);
      setMediaPreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
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
  const messages = messagesQuery.data ?? [];
  const activeConversation = conversations.find((c) => c.id === activeId);

  const selectedMineOnly = useMemo(() => {
    if (!selectedIds.size) return false;
    return messages
      .filter((m) => selectedIds.has(m.id))
      .every((m) => m.sender.userId === user?._id && !m.deletedForEveryone);
  }, [messages, selectedIds, user?._id]);

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
        <div className="relative z-20 flex items-center gap-2 border-b border-black/5 bg-[#f0f2f5] px-2 py-2.5 sm:px-3">
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
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              ) : (
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <MessageSquare className="h-4 w-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                {activeId ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {(activeConversation?.other.name || startWithUser?.name || 'C')
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#111b21]">
                        {activeConversation?.other.name || startWithUser?.name || 'Chat'}
                      </p>
                      <p className="truncate text-[11px] text-[#667781]">Happy First Club</p>
                    </div>
                  </div>
                ) : (
                  <p className="truncate text-sm font-semibold text-[#111b21]">Messages</p>
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
          <div className="flex-1 overflow-y-auto bg-white">
            {conversationsQuery.isLoading ? (
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
                  <button
                    type="button"
                    onClick={() => {
                      setListMenuId(null);
                      setActiveId(conversation.id);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
                      {conversation.other.name.slice(0, 1).toUpperCase()}
                    </span>
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
            )}
          </div>
        ) : (
          <>
            <div
              className="relative flex-1 space-y-1 overflow-y-auto px-2 py-3 sm:px-3"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 20%, rgba(0,0,0,0.03) 0 1px, transparent 1px), radial-gradient(circle at 80% 40%, rgba(0,0,0,0.03) 0 1px, transparent 1px)',
                backgroundSize: '18px 18px',
              }}
              onClick={() => {
                setShowEmoji(false);
                setMenuOpen(false);
              }}
            >
              {messagesQuery.isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="mx-auto mt-8 max-w-xs rounded-lg bg-[#ffeecd] px-3 py-2 text-center text-xs text-[#54656f] shadow-sm">
                  Messages are end-to-end encrypted in spirit — say hello to start the chat.
                </div>
              ) : (
                messages.map((message, index) => {
                  const mine = message.sender.userId === user?._id;
                  const selected = selectedIds.has(message.id);
                  const prev = messages[index - 1];
                  const showDay =
                    !prev ||
                    DateTime.fromISO(message.createdAt).toISODate() !==
                      DateTime.fromISO(prev.createdAt).toISODate();

                  return (
                    <div key={message.id}>
                      {showDay && (
                        <div className="my-3 flex justify-center">
                          <span className="rounded-lg bg-white/90 px-3 py-1 text-[11px] font-medium text-[#54656f] shadow-sm">
                            {DateTime.fromISO(message.createdAt).toFormat('ccc, LLL d')}
                          </span>
                        </div>
                      )}
                      <div
                        className={cn(
                          'flex items-end gap-1.5 px-1 py-0.5',
                          mine ? 'justify-end' : 'justify-start',
                          selectMode && 'cursor-pointer'
                        )}
                        onClick={() => {
                          if (selectMode) toggleSelect(message.id);
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          if (!selectMode) {
                            setSelectMode(true);
                            setSelectedIds(new Set([message.id]));
                          }
                        }}
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
                        <div
                          className={cn(
                            'relative max-w-[82%] px-2.5 pb-1.5 pt-1.5 text-[14.5px] leading-snug shadow-sm',
                            mine
                              ? 'rounded-2xl rounded-tr-sm bg-primary text-primary-foreground'
                              : 'rounded-2xl rounded-tl-sm bg-white text-[#111b21]'
                          )}
                        >
                          {message.deletedForEveryone ? (
                            <p
                              className={cn(
                                'italic',
                                mine ? 'text-primary-foreground/80' : 'text-[#667781]'
                              )}
                            >
                              This message was deleted
                            </p>
                          ) : (
                            <>
                              {message.mediaUrl && message.mediaType === 'image' && (
                                <button
                                  type="button"
                                  className="mb-1 block overflow-hidden rounded-lg"
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
                                  className="mb-1 block overflow-hidden rounded-lg"
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
                              {message.text ? (
                                <p className="whitespace-pre-wrap break-words">{message.text}</p>
                              ) : null}
                            </>
                          )}
                          <div
                            className={cn(
                              'mt-0.5 flex items-center justify-end gap-1',
                              mine ? 'text-primary-foreground/80' : 'text-[#667781]'
                            )}
                          >
                            <span className="text-[10px] leading-none">
                              {DateTime.fromISO(message.createdAt).toFormat('h:mm a')}
                            </span>
                            {mine && !message.deletedForEveryone && (
                              <CheckCheck className="h-3.5 w-3.5 opacity-90" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            {!selectMode && (
              <div className="relative z-20 border-t border-black/5 bg-[#f0f2f5] px-2 py-2 sm:px-3">
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
