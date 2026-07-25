'use client';

import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { Loader2, Send, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { feedAPI, type FeedComment, type FeedPost } from '@/lib/api/feed';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';

interface FeedCommentsSheetProps {
  post: FeedPost;
  open: boolean;
  onClose: () => void;
}

export function FeedCommentsSheet({ post, open, onClose }: FeedCommentsSheetProps) {
  const { selectedProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const feedKey = ['feed', selectedProfile?._id] as const;

  const { data, isLoading } = useQuery({
    queryKey: ['feedComments', post.id],
    enabled: open,
    queryFn: async () => {
      const response = await feedAPI.getComments(post.id);
      return response.data.data.comments ?? [];
    },
  });

  const comments = data ?? [];

  const mutation = useMutation({
    mutationFn: (value: string) => feedAPI.addComment(post.id, value),
    onSuccess: (response) => {
      const payload = response.data.data;
      queryClient.setQueryData<FeedComment[]>(['feedComments', post.id], (prev) => [
        payload.comment,
        ...(prev ?? []),
      ]);
      queryClient.setQueryData<{ pages: { posts: FeedPost[]; nextCursor: string | null }[]; pageParams: unknown[] }>(
        feedKey,
        (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((item) =>
                item.id === post.id
                  ? { ...item, commentCount: payload.commentCount }
                  : item
              ),
            })),
          };
        }
      );
      setText('');
    },
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close comments" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[var(--shadow-float)] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Comments</p>
            <p className="text-xs text-muted-foreground">{post.author.name}&apos;s post</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : comments.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Be the first to comment.
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                  {comment.author.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{comment.author.name}</span>{' '}
                    <span className="text-foreground/90">{comment.text}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {DateTime.fromISO(comment.createdAt).toRelative() || 'just now'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <form
          className="flex items-center gap-2 border-t border-border px-3 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            const value = text.trim();
            if (!value || mutation.isPending) return;
            mutation.mutate(value);
          }}
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {(selectedProfile?.name || 'Y').slice(0, 1).toUpperCase()}
          </span>
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Add a comment…"
            maxLength={500}
            className="h-10 flex-1 rounded-full border border-input bg-secondary px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={!text.trim() || mutation.isPending}
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors',
              text.trim()
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground'
            )}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
