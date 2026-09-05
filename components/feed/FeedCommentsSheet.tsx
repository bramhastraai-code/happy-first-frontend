'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { Loader2, Send, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { feedAPI, type FeedComment, type FeedPost } from '@/lib/api/feed';
import { followAPI } from '@/lib/api/follow';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ReportContentDialog } from '@/components/community/ReportContentDialog';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { HappyIcon } from '@/components/ui/HappyIcon';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';
import { renderCaptionWithMentions } from '@/lib/utils/renderCaptionWithMentions';
import { MentionSuggestionList } from '@/components/feed/MentionSuggestionList';

interface FeedCommentsSheetProps {
  post: FeedPost;
  open: boolean;
  onClose: () => void;
  /** Discover / visitor mode — view comments, no compose */
  readOnly?: boolean;
}

function updateCommentInTree(
  comments: FeedComment[],
  commentId: string,
  patch: Partial<FeedComment>
): FeedComment[] {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      return { ...comment, ...patch };
    }
    if (comment.replies?.length) {
      return {
        ...comment,
        replies: comment.replies.map((reply) =>
          reply.id === commentId ? { ...reply, ...patch } : reply
        ),
      };
    }
    return comment;
  });
}

function insertComment(comments: FeedComment[], comment: FeedComment): FeedComment[] {
  if (!comment.parentCommentId) {
    return [comment, ...comments];
  }

  return comments.map((root) => {
    if (root.id !== comment.parentCommentId) return root;
    const replies = [...(root.replies || []), comment];
    return { ...root, replies };
  });
}

function sameId(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  return String(a) === String(b);
}

function removeCommentsFromTree(comments: FeedComment[], deletedIds: string[]): FeedComment[] {
  const remove = new Set(deletedIds);
  return comments
    .filter((comment) => !remove.has(comment.id))
    .map((comment) => ({
      ...comment,
      replies: (comment.replies || []).filter((reply) => !remove.has(reply.id)),
    }));
}

export function FeedCommentsSheet({
  post,
  open,
  onClose,
  readOnly = false,
}: FeedCommentsSheetProps) {
  const { selectedProfile } = useAuthStore();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<FeedComment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeedComment | null>(null);
  const [reportTarget, setReportTarget] = useState<FeedComment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedKey = ['feed', selectedProfile?._id] as const;

  const myProfileId = selectedProfile?._id || null;
  const canModeratePost = sameId(post.author.profileId, myProfileId);
  const canDeleteComment = (comment: FeedComment) =>
    sameId(comment.author.profileId, myProfileId) || canModeratePost;

  const followingQuery = useQuery({
    queryKey: ['following', selectedProfile?._id, 'comment-mentions'],
    enabled: open && !!selectedProfile?._id,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await followAPI.getFollowing(selectedProfile!._id, { limit: 100 });
      return res.data.data.people || [];
    },
  });

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const me = selectedProfile?._id;
    return (followingQuery.data || [])
      .filter((p) => p.profileId !== me)
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionQuery, followingQuery.data, selectedProfile?._id]);

  const detectMention = (value: string, cursor: number) => {
    const before = value.slice(0, cursor);
    const match = before.match(/@([^\s@]*)$/);
    setMentionQuery(match ? match[1] : null);
  };

  const insertMention = (name: string) => {
    const el = inputRef.current;
    const cursor = el?.selectionStart ?? text.length;
    const before = text.slice(0, cursor);
    const after = text.slice(cursor);
    const replaced = before.replace(/@([^\s@]*)$/, `@${name} `);
    const next = `${replaced}${after}`.slice(0, 500);
    setText(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const pos = replaced.length;
      el?.setSelectionRange(pos, pos);
      el?.focus();
    });
  };

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
    mutationFn: (value: string) =>
      feedAPI.addComment(post.id, value, replyTo?.id || null),
    onSuccess: (response) => {
      const payload = response.data.data;
      queryClient.setQueryData<FeedComment[]>(['feedComments', post.id], (prev) =>
        insertComment(prev ?? [], payload.comment)
      );
      queryClient.setQueryData<{
        pages: { posts: FeedPost[]; nextCursor: string | null }[];
        pageParams: unknown[];
      }>(feedKey, (old) => {
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
      });
      setText('');
      setReplyTo(null);
    },
  });

  const likeMutation = useMutation({
    mutationFn: (commentId: string) => feedAPI.toggleCommentLike(commentId),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: ['feedComments', post.id] });
      const previous = queryClient.getQueryData<FeedComment[]>(['feedComments', post.id]);

      queryClient.setQueryData<FeedComment[]>(['feedComments', post.id], (prev) => {
        if (!prev) return prev;
        const find = (list: FeedComment[]): FeedComment | undefined => {
          for (const item of list) {
            if (item.id === commentId) return item;
            const nested = item.replies?.find((r) => r.id === commentId);
            if (nested) return nested;
          }
          return undefined;
        };
        const target = find(prev);
        if (!target) return prev;
        const likedByMe = !target.likedByMe;
        return updateCommentInTree(prev, commentId, {
          likedByMe,
          likeCount: Math.max(0, target.likeCount + (likedByMe ? 1 : -1)),
        });
      });

      return { previous };
    },
    onError: (_error, _commentId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['feedComments', post.id], context.previous);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => feedAPI.deleteComment(commentId),
    onSuccess: (response) => {
      const payload = response.data.data;
      queryClient.setQueryData<FeedComment[]>(['feedComments', post.id], (prev) =>
        removeCommentsFromTree(prev ?? [], payload.deletedIds)
      );

      const patchCommentCount = (old?: {
        pages: { posts: FeedPost[]; nextCursor: string | null }[];
        pageParams: unknown[];
      }) => {
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
      };

      queryClient.setQueryData(feedKey, patchCommentCount);
      if (post.communityId) {
        queryClient.setQueryData(
          ['feed', selectedProfile?._id, post.communityId],
          patchCommentCount
        );
      }

      setDeleteTarget(null);
      if (replyTo && payload.deletedIds.includes(replyTo.id)) {
        setReplyTo(null);
      }
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

  useEffect(() => {
    if (!open) {
      setText('');
      setReplyTo(null);
    }
  }, [open]);

  const startReply = (comment: FeedComment) => {
    setReplyTo(comment);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (!open) return null;

  const renderComment = (comment: FeedComment, isReply = false) => (
    <div key={comment.id} className={cn('flex gap-2.5', isReply && 'ml-10')}>
      <Link
        href={`/feed/profile/${comment.author.profileId}`}
        className="shrink-0"
        onClick={onClose}
      >
        <ProfileAvatar
          name={comment.author.name}
          avatarUrl={comment.author.avatarUrl}
          avatarSeed={comment.author.avatarSeed}
          avatarStyle={comment.author.avatarStyle}
          size="sm"
          className={cn(isReply ? 'h-7 w-7' : 'h-8 w-8')}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-foreground">
          <Link
            href={`/feed/profile/${comment.author.profileId}`}
            className="font-semibold hover:underline"
            onClick={onClose}
          >
            {comment.author.name}
          </Link>{' '}
          <span className="text-foreground/90">
            {renderCaptionWithMentions(comment.text, { inline: true })}
          </span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span>{DateTime.fromISO(comment.createdAt).toRelative() || 'just now'}</span>
          {comment.likeCount > 0 ? (
            <span className="font-medium">
              {comment.likeCount} {comment.likeCount === 1 ? 'like' : 'likes'}
            </span>
          ) : null}
          {!readOnly ? (
            <button
              type="button"
              className="font-semibold hover:text-foreground"
              onClick={() => startReply(comment)}
            >
              Reply
            </button>
          ) : null}
          {!readOnly && canDeleteComment(comment) ? (
            <button
              type="button"
              className="font-semibold text-destructive hover:text-destructive/80"
              onClick={() => setDeleteTarget(comment)}
            >
              Delete
            </button>
          ) : null}
          {!readOnly &&
          !sameId(comment.author.profileId, myProfileId) ? (
            <button
              type="button"
              className="font-semibold hover:text-foreground"
              onClick={() => setReportTarget(comment)}
            >
              Report
            </button>
          ) : null}
        </div>

        {!isReply && (comment.replies?.length || 0) > 0 ? (
          <div className="mt-3 space-y-3">
            {comment.replies!.map((reply) => renderComment(reply, true))}
          </div>
        ) : null}
      </div>

      {!readOnly ? (
        <button
          type="button"
          onClick={() => likeMutation.mutate(comment.id)}
          className={cn(
            'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors',
            comment.likedByMe ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label={comment.likedByMe ? 'Unlike comment' : 'Like comment'}
        >
          <HappyIcon className="h-3.5 w-3.5" filled={comment.likedByMe} />
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[260] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close comments"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[var(--shadow-float)] sm:mx-4 sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Comments</p>
            <p className="text-xs text-muted-foreground">{post.author.name}&apos;s post</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80"
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
              {readOnly ? 'No comments yet.' : 'Be the first to comment.'}
            </p>
          ) : (
            comments.map((comment) => renderComment(comment))
          )}
        </div>

        {replyTo && !readOnly ? (
          <div className="flex items-center justify-between border-t border-border bg-secondary/50 px-4 py-2 text-xs">
            <p className="min-w-0 truncate text-muted-foreground">
              Replying to <span className="font-semibold text-foreground">{replyTo.author.name}</span>
            </p>
            <button
              type="button"
              className="shrink-0 font-medium text-primary"
              onClick={() => setReplyTo(null)}
            >
              Cancel
            </button>
          </div>
        ) : null}

        {readOnly ? (
          <p className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
            Join this community to leave a comment.
          </p>
        ) : (
        <form
          className="relative flex items-center gap-2 border-t border-border px-3 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            const value = text.trim();
            if (!value || mutation.isPending) return;
            mutation.mutate(value);
            setMentionQuery(null);
          }}
        >
          {selectedProfile?._id ? (
            <Link href={`/feed/profile/${selectedProfile._id}`} className="shrink-0" onClick={onClose}>
              <ProfileAvatar
                name={selectedProfile?.name || 'You'}
                avatarUrl={selectedProfile?.avatarUrl}
                avatarSeed={selectedProfile?.avatarSeed}
                avatarStyle={selectedProfile?.avatarStyle}
                size="sm"
                className="h-9 w-9"
              />
            </Link>
          ) : (
            <ProfileAvatar
              name={selectedProfile?.name || 'You'}
              avatarUrl={selectedProfile?.avatarUrl}
              avatarSeed={selectedProfile?.avatarSeed}
              avatarStyle={selectedProfile?.avatarStyle}
              size="sm"
              className="h-9 w-9"
            />
          )}
          <div className="relative min-w-0 flex-1">
            <input
              ref={inputRef}
              value={text}
              onChange={(event) => {
                const value = event.target.value.slice(0, 500);
                setText(value);
                detectMention(value, event.target.selectionStart ?? value.length);
              }}
              onKeyUp={(event) => {
                detectMention(
                  event.currentTarget.value,
                  event.currentTarget.selectionStart ?? event.currentTarget.value.length
                );
              }}
              placeholder={
                replyTo
                  ? `Reply to ${replyTo.author.name}… @ to tag`
                  : 'Add a comment… @ to tag people you follow'
              }
              maxLength={500}
              className="h-10 w-full rounded-full border border-input bg-secondary px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {mentionSuggestions.length > 0 ? (
              <MentionSuggestionList
                people={mentionSuggestions}
                onSelect={(person) => insertMention(person.name)}
                placement="above"
              />
            ) : null}
          </div>
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
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete comment?"
        description={
          deleteTarget && !deleteTarget.parentCommentId && (deleteTarget.replies?.length || 0) > 0
            ? 'This will also remove replies to this comment.'
            : 'This comment will be removed for everyone.'
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        onCancel={() => {
          if (!deleteMutation.isPending) setDeleteTarget(null);
        }}
      />

      <ReportContentDialog
        open={Boolean(reportTarget)}
        targetType="feed_comment"
        targetId={reportTarget?.id || ''}
        onClose={() => setReportTarget(null)}
      />
    </div>
  );
}
