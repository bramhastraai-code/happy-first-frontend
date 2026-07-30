'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { Link2, Loader2, X } from 'lucide-react';
import { messagesAPI } from '@/lib/api/messages';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'image', label: 'Photos' },
  { id: 'video', label: 'Videos' },
  { id: 'link', label: 'Links' },
] as const;

interface DmSharedMediaPanelProps {
  open: boolean;
  conversationId: string;
  onClose: () => void;
  onJumpToMessage: (messageId: string) => void;
}

export function DmSharedMediaPanel({
  open,
  conversationId,
  onClose,
  onJumpToMessage,
}: DmSharedMediaPanelProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('image');

  const mediaQuery = useInfiniteQuery({
    queryKey: ['dm-shared-media', conversationId, tab],
    enabled: open && !!conversationId,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await messagesAPI.sharedMedia(conversationId, {
        type: tab,
        page: pageParam,
        limit: 24,
      });
      return res.data.data;
    },
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });

  if (!open || typeof document === 'undefined') return null;

  const items = mediaQuery.data?.pages.flatMap((p) => p.items) ?? [];

  return createPortal(
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 flex h-[min(84vh,680px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <p className="text-sm font-bold text-[#111b21]">Shared media</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-black/5 px-2 py-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap',
                tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {mediaQuery.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nothing here yet.</p>
          ) : tab === 'image' || tab === 'video' ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {items.map((item) => (
                <button
                  key={`${item.messageId}-${item.url}`}
                  type="button"
                  onClick={() => {
                    onJumpToMessage(item.messageId);
                    onClose();
                  }}
                  className="aspect-square overflow-hidden rounded-lg bg-secondary"
                >
                  {tab === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <video src={item.url} className="h-full w-full object-cover" muted />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <button
                  key={`${item.messageId}-${item.url}`}
                  type="button"
                  onClick={() => {
                    onJumpToMessage(item.messageId);
                    onClose();
                  }}
                  className="flex w-full items-start gap-3 rounded-xl border border-black/5 px-3 py-2.5 text-left hover:bg-secondary/60"
                >
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Link2 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[#111b21]">
                      {item.url || item.text || 'Link'}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[#667781]">
                      {item.senderName} ·{' '}
                      {DateTime.fromISO(item.createdAt).toFormat('LLL d, h:mm a')}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {mediaQuery.hasNextPage ? (
            <button
              type="button"
              disabled={mediaQuery.isFetchingNextPage}
              onClick={() => mediaQuery.fetchNextPage()}
              className="mt-3 w-full rounded-xl py-2 text-sm font-semibold text-primary disabled:opacity-50"
            >
              {mediaQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
