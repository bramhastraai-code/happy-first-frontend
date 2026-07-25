'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, MessageSquare, Send, X } from 'lucide-react';
import { DateTime } from 'luxon';
import { messagesAPI, type FeedChatMessage, type FeedConversation } from '@/lib/api/messages';
import { getAppSocket } from '@/lib/realtime/socketClient';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';

interface FeedMessagesPanelProps {
  open: boolean;
  onClose: () => void;
  initialConversationId?: string | null;
  startWithUser?: { userId: string; profileId?: string; name?: string } | null;
}

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
  const bottomRef = useRef<HTMLDivElement>(null);

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
    mutationFn: async (text: string) => {
      if (!activeId) throw new Error('No conversation');
      const res = await messagesAPI.sendMessage(activeId, text);
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

  if (!open) return null;

  const conversations = conversationsQuery.data ?? [];
  const messages = messagesQuery.data ?? [];
  const activeConversation = conversations.find((c) => c.id === activeId);

  return (
    <div className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close messages" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[var(--shadow-float)] sm:h-[70vh] sm:rounded-3xl">
        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          {activeId ? (
            <button
              type="button"
              onClick={() => setActiveId(null)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
              <MessageSquare className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {activeId
                ? activeConversation?.other.name || startWithUser?.name || 'Chat'
                : 'Messages'}
            </p>
            <p className="text-xs text-muted-foreground">Realtime over WebSocket</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!activeId ? (
          <div className="flex-1 overflow-y-auto">
            {conversationsQuery.isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="px-6 py-16 text-center text-sm text-muted-foreground">
                No conversations yet. Tap Message on a feed post to start chatting.
              </p>
            ) : (
              conversations.map((conversation: FeedConversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setActiveId(conversation.id)}
                  className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left hover:bg-secondary/50"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {conversation.other.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {conversation.other.name}
                      </p>
                      <p className="shrink-0 text-[11px] text-muted-foreground">
                        {DateTime.fromISO(conversation.lastMessageAt).toRelative()}
                      </p>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {conversation.lastMessageText || 'Say hello'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
              {messagesQuery.isLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                messages.map((message) => {
                  const mine = message.sender.userId === user?._id;
                  return (
                    <div
                      key={message.id}
                      className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                          mine
                            ? 'rounded-br-md bg-primary text-primary-foreground'
                            : 'rounded-bl-md bg-secondary text-foreground'
                        )}
                      >
                        {!mine && (
                          <p className="mb-0.5 text-[11px] font-semibold opacity-80">
                            {message.sender.name}
                          </p>
                        )}
                        <p>{message.text}</p>
                        <p
                          className={cn(
                            'mt-1 text-[10px]',
                            mine ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          )}
                        >
                          {DateTime.fromISO(message.createdAt).toFormat('h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form
              className="flex items-center gap-2 border-t border-border px-3 py-3"
              onSubmit={(event) => {
                event.preventDefault();
                const text = draft.trim();
                if (!text || sendMutation.isPending) return;
                sendMutation.mutate(text);
                void getAppSocket().then((socket) => {
                  socket.emit('dm:typing', { conversationId: activeId });
                });
              }}
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Message…"
                maxLength={2000}
                className="h-11 flex-1 rounded-full border border-input bg-secondary px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sendMutation.isPending}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
            {!selectedProfile && (
              <p className="px-4 pb-2 text-center text-[11px] text-muted-foreground">
                Select a profile to send messages.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
