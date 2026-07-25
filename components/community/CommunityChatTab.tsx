'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import {
  Check,
  CheckCheck,
  CheckSquare,
  Eraser,
  Loader2,
  MoreVertical,
  Paperclip,
  Send,
  Smile,
  X,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { communityAPI, type CommunityMessage } from '@/lib/api/community';
import { getAppSocket } from '@/lib/realtime/socketClient';
import { useAuthStore } from '@/lib/store/authStore';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { cn } from '@/lib/utils';

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

function nameColor(profileId: string) {
  let hash = 0;
  for (let i = 0; i < profileId.length; i += 1) {
    hash = (hash + profileId.charCodeAt(i) * (i + 1)) % NAME_COLORS.length;
  }
  return NAME_COLORS[hash] || NAME_COLORS[0];
}

type ConfirmAction = { type: 'clear' } | { type: 'delete-me' } | { type: 'delete-everyone' } | null;

export function CommunityChatTab({ communityId }: CommunityChatTabProps) {
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const messagesQuery = useQuery({
    queryKey: ['community-messages', communityId],
    queryFn: async () => {
      const res = await communityAPI.messages(communityId);
      return res.data.data.messages ?? [];
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (payload: { text?: string; file?: File }) => {
      if (payload.file) {
        const res = await communityAPI.sendMediaMessage(
          communityId,
          payload.file,
          payload.text || ''
        );
        return res.data.data.message;
      }
      const res = await communityAPI.sendMessage(communityId, payload.text || '');
      return res.data.data.message;
    },
    onSuccess: (message) => {
      queryClient.setQueryData<CommunityMessage[]>(
        ['community-messages', communityId],
        (old) => {
          if (!old) return [message];
          if (old.some((m) => m.id === message.id)) return old;
          return [...old, message];
        }
      );
      setDraft('');
      setShowEmoji(false);
      setSendError(null);
      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview.url);
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
      setConfirm(null);
      setMenuOpen(false);
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
                    }
                  : msg
              );
            }
            return old;
          }
        );
      };

      socket.on('community:message', onMessage);
      socket.on('community:messages_deleted', onDeleted);
      cleanup = () => {
        socket.off('community:message', onMessage);
        socket.off('community:messages_deleted', onDeleted);
      };
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [communityId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesQuery.data?.length]);

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

  const messages = messagesQuery.data ?? [];

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

  const submitMessage = () => {
    if (!canSend) return;
    sendMutation.mutate({ text: draft.trim(), file: mediaPreview?.file });
  };

  const onPickFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;
    if (mediaPreview) URL.revokeObjectURL(mediaPreview.url);
    setMediaPreview({ file, url: URL.createObjectURL(file) });
    setShowEmoji(false);
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
    <div className="flex h-[min(75vh,640px)] flex-col overflow-hidden rounded-2xl border border-black/5 bg-[#efeae2] shadow-sm">
      <div className="relative z-20 flex items-center gap-2 border-b border-black/5 bg-[#f0f2f5] px-2 py-2">
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
            <p className="min-w-0 flex-1 px-2 text-sm font-semibold text-[#111b21]">Group chat</p>
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
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div
        className="relative flex-1 space-y-0.5 overflow-y-auto px-2 py-3 sm:px-3"
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
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="mx-auto mt-8 max-w-xs rounded-lg bg-[#ffeecd] px-3 py-2 text-center text-xs text-[#54656f] shadow-sm">
            No messages yet. Say hello to the group.
          </div>
        ) : (
          rows.map(({ message, mine, showName, showAvatar, tightTop, showDay, selected }) => (
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
                  selectMode && 'cursor-pointer',
                  tightTop ? 'mt-0.5' : 'mt-1.5'
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
                    'relative max-w-[78%] px-2.5 pb-1.5 pt-1.5 text-[14.5px] leading-snug shadow-sm',
                    mine
                      ? 'rounded-2xl rounded-tr-sm bg-primary text-primary-foreground'
                      : 'rounded-2xl rounded-tl-sm bg-white text-[#111b21]'
                  )}
                >
                  {showName ? (
                    <Link
                      href={`/feed/profile/${message.sender.profileId}`}
                      className={cn(
                        'mb-0.5 block text-[12px] font-semibold hover:underline',
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
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {!selectMode && (
        <div className="relative z-20 border-t border-black/5 bg-[#f0f2f5] px-2 py-2">
          {mediaPreview && (
            <div className="mb-2 flex items-start gap-2 rounded-xl bg-white p-2 shadow-sm">
              {mediaPreview.file.type.startsWith('video/') ? (
                <video src={mediaPreview.url} className="h-16 w-16 rounded-lg object-cover" muted />
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
          else if (confirm.type === 'delete-me') deleteMutation.mutate('me');
          else if (confirm.type === 'delete-everyone') deleteMutation.mutate('everyone');
        }}
      />
    </div>
  );
}
