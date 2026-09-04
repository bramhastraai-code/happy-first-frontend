'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { ChevronLeft, Loader2, Send, X } from 'lucide-react';
import { communityAPI, type CommunityMessage } from '@/lib/api/community';
import { cn } from '@/lib/utils';

interface ChatThreadSheetProps {
  open: boolean;
  communityId: string;
  parentId: string | null;
  onClose: () => void;
  onJumpToMessage?: (messageId: string) => void;
}

export function ChatThreadSheet({
  open,
  communityId,
  parentId,
  onClose,
  onJumpToMessage,
}: ChatThreadSheetProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');

  const threadQuery = useQuery({
    queryKey: ['community-thread', communityId, parentId],
    enabled: open && Boolean(parentId),
    queryFn: async () => {
      const res = await communityAPI.threadReplies(communityId, parentId!);
      return res.data.data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await communityAPI.sendMessage(communityId, text, { replyTo: parentId! });
      return res.data.data.message;
    },
    onSuccess: (message) => {
      setDraft('');
      queryClient.setQueryData<{ parent: CommunityMessage; replies: CommunityMessage[] }>(
        ['community-thread', communityId, parentId],
        (old) => {
          if (!old) return old;
          if (old.replies.some((r) => r.id === message.id)) return old;
          return {
            ...old,
            parent: { ...old.parent, replyCount: (old.parent.replyCount || 0) + 1 },
            replies: [...old.replies, message],
          };
        }
      );
      queryClient.setQueryData<CommunityMessage[]>(['community-messages', communityId], (old) => {
        if (!old) return [message];
        if (old.some((m) => m.id === message.id)) return old;
        return [
          ...old.map((m) =>
            m.id === parentId ? { ...m, replyCount: (m.replyCount || 0) + 1 } : m
          ),
          message,
        ];
      });
    },
  });

  useEffect(() => {
    if (!open) setDraft('');
  }, [open]);

  if (!open || !parentId || typeof document === 'undefined') return null;

  const parent = threadQuery.data?.parent;
  const replies = threadQuery.data?.replies ?? [];

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[249] hidden bg-black/40 md:block"
        aria-label="Close thread"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="Thread"
        className={cn(
          'fixed z-[250] flex w-full flex-col overflow-hidden bg-white',
          'inset-0 h-[100dvh]',
          'md:inset-auto md:left-1/2 md:top-1/2 md:h-[min(82vh,640px)] md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:shadow-xl'
        )}
      >
        <div className="flex shrink-0 items-center gap-1 border-b border-black/5 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:px-3 md:pt-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#111b21] hover:bg-black/5"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-semibold tracking-tight text-[#111b21]">Thread</p>
            <p className="text-[11px] text-[#667781]">
              {parent?.replyCount || replies.length} replies
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hidden h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 md:inline-flex"
            aria-label="Close thread"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-[#efeae2] px-3 py-3">
          {threadQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {parent && (
                <button
                  type="button"
                  onClick={() => onJumpToMessage?.(parent.id)}
                  className="w-full rounded-xl bg-white p-3 text-left shadow-sm"
                >
                  <p className="text-[12px] font-semibold text-primary">{parent.sender.name}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-[14px] text-[#111b21]">
                    {parent.text || 'Media'}
                  </p>
                </button>
              )}
              {replies.map((reply) => (
                <div key={reply.id} className="rounded-xl bg-white px-3 py-2 shadow-sm">
                  <p className="text-[12px] font-semibold text-primary">{reply.sender.name}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-[14px] text-[#111b21]">
                    {reply.text || 'Media'}
                  </p>
                  <p className="mt-1 text-[10px] text-[#667781]">
                    {DateTime.fromISO(reply.createdAt).toFormat('h:mm a').toLowerCase()}
                  </p>
                </div>
              ))}
            </>
          )}
        </div>

        <form
          className="flex items-end gap-2 border-t border-black/5 bg-[#f0f2f5] px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim() || sendMutation.isPending) return;
            sendMutation.mutate(draft.trim());
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={1}
            placeholder="Reply in thread"
            className="max-h-24 min-h-[40px] flex-1 resize-none rounded-2xl bg-white px-3 py-2 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sendMutation.isPending}
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground',
              'disabled:opacity-50'
            )}
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </>,
    document.body
  );
}
