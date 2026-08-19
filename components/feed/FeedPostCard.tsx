'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { DateTime } from 'luxon';
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Share2,
  Trash2,
  UserMinus,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { feedAPI, formatCollaborationLabel, type FeedPost } from '@/lib/api/feed';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';
import { renderCaptionWithMentions } from '@/lib/utils/renderCaptionWithMentions';
import { useAuthStore } from '@/lib/store/authStore';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { FeedLikesSheet } from '@/components/feed/FeedLikesSheet';
import { FollowButton } from '@/components/feed/FollowButton';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { HappyIcon } from '@/components/ui/HappyIcon';
import { ZoomableImage } from '@/components/ui/ZoomableImage';
import { cn } from '@/lib/utils';

interface FeedPostCardProps {
  post: FeedPost;
  onToggleLike: (postId: string) => void;
  onOpenComments: (post: FeedPost) => void;
  onMessage?: (post: FeedPost) => void;
  onEdit?: (post: FeedPost, caption: string) => Promise<void> | void;
  onDelete?: (post: FeedPost) => Promise<void> | void;
  liking?: boolean;
  canMessage?: boolean;
  isOwner?: boolean;
  /** Hide “Community: …” badge (e.g. inside community feed tab) */
  hideCommunityLabel?: boolean;
}

function formatCount(value: number) {
  if (value < 1000) return String(value);
  return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
}

export function FeedPostCard({
  post,
  onToggleLike,
  onOpenComments,
  onMessage,
  onEdit,
  onDelete,
  liking = false,
  canMessage = false,
  isOwner = false,
  hideCommunityLabel = false,
}: FeedPostCardProps) {
  const queryClient = useQueryClient();
  const { selectedProfile } = useAuthStore();
  const [heartBurst, setHeartBurst] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [manageCollabOpen, setManageCollabOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{
    profileId: string;
    name: string;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [editCaption, setEditCaption] = useState(post.caption || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);
  const touchStartX = useRef<number | null>(null);

  const mediaItems =
    post.mediaItems && post.mediaItems.length > 0
      ? post.mediaItems
      : [{ url: post.imageUrl, mediaType: post.mediaType || 'image' }];
  const safeIndex = Math.min(mediaIndex, Math.max(0, mediaItems.length - 1));
  const current = mediaItems[safeIndex] || mediaItems[0];
  const isVideo = (current?.mediaType || 'image') === 'video';
  const mediaUrl = resolveMediaUrl(current?.url || post.imageUrl);
  const multi = mediaItems.length > 1;

  useEffect(() => {
    setMediaIndex(0);
  }, [post.id]);

  useEffect(() => {
    setEditCaption(post.caption || '');
  }, [post.caption]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewOpen(false);
      if (event.key === 'ArrowRight' && multi) {
        setMediaIndex((value) => Math.min(mediaItems.length - 1, value + 1));
      }
      if (event.key === 'ArrowLeft' && multi) {
        setMediaIndex((value) => Math.max(0, value - 1));
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [previewOpen, multi, mediaItems.length]);

  const triggerLikeBurst = () => {
    if (!post.likedByMe) onToggleLike(post.id);
    setHeartBurst(true);
    window.setTimeout(() => setHeartBurst(false), 700);
  };

  const handleMediaTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      triggerLikeBurst();
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    window.setTimeout(() => {
      if (lastTap.current === now && !isVideo) {
        setPreviewOpen(true);
      }
    }, 280);
  };

  const goPrev = () => setMediaIndex((value) => Math.max(0, value - 1));
  const goNext = () => setMediaIndex((value) => Math.min(mediaItems.length - 1, value + 1));

  const repostMutation = useMutation({
    mutationFn: async () => {
      const res = await feedAPI.toggleRepost(post.id);
      return res.data.data;
    },
    onSuccess: (result) => {
      queryClient.setQueriesData<{
        pages: { posts: FeedPost[]; nextCursor: string | null }[];
        pageParams: unknown[];
      }>({ queryKey: ['feed'] }, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((item) => {
              const canonicalId = item.repostOf?.id || item.id;
              if (canonicalId !== result.photoId) return item;
              return {
                ...item,
                repostCount: result.repostCount,
                repostedByMe: result.reposted,
              };
            }),
          })),
        };
      });
      // Refetch so the new repost row appears (or a removed one disappears).
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const handleShare = async () => {
    const shareUrl =
      typeof window !== 'undefined' ? `${window.location.origin}/feed?post=${post.id}` : '';
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${post.author.name} on Happy First`,
          text: post.caption || 'Check out this activity moment',
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // cancelled
    }
  };

  const timeLabel = DateTime.fromISO(post.createdAt).toRelative({ style: 'short' }) || 'now';

  const canRepost =
    !isOwner &&
    !post.communityId &&
    !post.isStory &&
    post.repostOf?.author.profileId !== selectedProfile?._id;

  const accepted = post.acceptedCollaborators || [];
  const allCollabs = post.collaborators || [];
  const removableCollabs = allCollabs.filter(
    (c) => c.status === 'accepted' || c.status === 'pending'
  );
  const myCollab = allCollabs.find(
    (c) => c.profileId === selectedProfile?._id && c.status === 'accepted'
  );
  const titleLabel = formatCollaborationLabel(post.author.name, accepted);

  const patchFeedPost = (updated: FeedPost) => {
    queryClient.setQueriesData<{
      pages: { posts: FeedPost[]; nextCursor: string | null }[];
      pageParams: unknown[];
    }>({ queryKey: ['feed'] }, (old) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          posts: page.posts.map((item) =>
            item.id === updated.id
              ? {
                  ...item,
                  ...updated,
                  author: { ...item.author, ...updated.author },
                }
              : item
          ),
        })),
      };
    });
    void queryClient.invalidateQueries({ queryKey: ['profilePosts'] });
  };

  const removeCollabMutation = useMutation({
    mutationFn: (profileId: string) => feedAPI.removeCollaborator(post.id, profileId),
    onSuccess: (res) => {
      const updated = res.data.data.post;
      patchFeedPost(updated);
      setRemoveTarget(null);
      setLeaveOpen(false);
      setManageCollabOpen(false);
    },
  });

  return (
    <article className="feed-post w-full border-b border-border bg-background px-0 py-4 sm:rounded-2xl sm:border sm:bg-surface sm:px-5 sm:py-5 sm:shadow-[var(--shadow-card)]">
      {post.repostOf ? (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Repeat2 className="h-3.5 w-3.5" />
          <span className="truncate">
            {post.author.name} reposted from{' '}
            <Link
              href={`/feed/profile/${post.repostOf.author.profileId}`}
              className="font-semibold text-foreground hover:underline"
            >
              {post.repostOf.author.name}
            </Link>
          </span>
        </div>
      ) : null}
      <header className="mb-2.5 flex items-center gap-2.5">
        <Link
          href={`/feed/profile/${post.author.profileId}`}
          className="shrink-0"
        >
          <ProfileAvatar
            name={post.author.name}
            avatarUrl={post.author.avatarUrl}
            avatarSeed={post.author.avatarSeed}
            avatarStyle={post.author.avatarStyle}
            size="md"
            className="h-10 w-10"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate text-[15px] font-semibold leading-tight text-foreground">
              <Link
                href={`/feed/profile/${post.author.profileId}`}
                className="hover:underline"
              >
                {post.author.name}
              </Link>
              {accepted.length > 0 ? (
                <span className="font-medium text-muted-foreground">
                  {' '}
                  with{' '}
                  <Link
                    href={`/feed/profile/${accepted[0].profileId}`}
                    className="font-semibold text-foreground hover:underline"
                  >
                    {accepted[0].name}
                  </Link>
                  {accepted.length > 1
                    ? ` and ${accepted.length - 1} others`
                    : null}
                </span>
              ) : !hideCommunityLabel && post.communityId && post.communityName ? (
                <span className="font-medium text-muted-foreground">
                  {' '}
                  ·{' '}
                  <Link
                    href={`/community/${post.communityId}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {post.communityName}
                  </Link>
                </span>
              ) : null}
            </p>
            {!isOwner && !post.author.isFollowing ? (
              <FollowButton
                profileId={post.author.profileId}
                isFollowing={false}
                size="sm"
                className="h-7 shrink-0 px-2.5"
              />
            ) : null}
          </div>
          {accepted.length > 0 &&
          !hideCommunityLabel &&
          post.communityId &&
          post.communityName ? (
            <p className="truncate text-xs text-muted-foreground">
              <Link
                href={`/community/${post.communityId}`}
                className="font-medium text-primary hover:underline"
              >
                {post.communityName}
              </Link>
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">{timeLabel}</p>
          <span className="sr-only">{titleLabel}</span>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Post options"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          <AnimatePresence>
            {menuOpen ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -4 }}
                className="absolute right-0 top-9 z-30 w-max min-w-[9.5rem] overflow-hidden rounded-md border border-border bg-surface shadow-[var(--shadow-float)]"
              >
                {isOwner ? (
                  <>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                      onClick={() => {
                        setMenuOpen(false);
                        setEditCaption(post.caption || '');
                        setEditOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 shrink-0" />
                      Edit
                    </button>
                    {removableCollabs.length > 0 ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                        onClick={() => {
                          setMenuOpen(false);
                          setManageCollabOpen(true);
                        }}
                      >
                        <UserMinus className="h-3.5 w-3.5 shrink-0" />
                        Remove collaborator
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                      onClick={() => {
                        setMenuOpen(false);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    {myCollab ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                        onClick={() => {
                          setMenuOpen(false);
                          setLeaveOpen(true);
                        }}
                      >
                        <UserMinus className="h-3.5 w-3.5 shrink-0" />
                        Leave collaboration
                      </button>
                    ) : null}
                    {canMessage ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                        onClick={() => {
                          setMenuOpen(false);
                          onMessage?.(post);
                        }}
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                        Message
                      </button>
                    ) : null}
                    {!myCollab && !canMessage ? (
                      <p className="px-3 py-2 text-[11px] text-muted-foreground">No actions</p>
                    ) : null}
                  </>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </header>

      {post.caption ? (
        <div className="mb-3">
          {renderCaptionWithMentions(post.caption, {
            collaborators: [
              ...(post.acceptedCollaborators || []),
              ...(post.collaborators || []),
            ],
          })}
        </div>
      ) : null}

      <div
        className="relative flex min-h-[12rem] items-center justify-center overflow-hidden rounded-2xl bg-neutral-950"
        onTouchStart={(event) => {
          touchStartX.current = event.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (!multi || touchStartX.current == null) return;
          const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
          const delta = endX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(delta) < 40) return;
          if (delta < 0) goNext();
          else goPrev();
        }}
      >
        {isVideo ? (
          <video
            key={`${post.id}-${safeIndex}`}
            src={mediaUrl}
            controls
            playsInline
            preload="metadata"
            className="mx-auto max-h-[min(78vh,760px)] w-auto max-w-full object-contain"
            onDoubleClick={triggerLikeBurst}
          />
        ) : (
          <button
            type="button"
            className={cn(
              'relative flex w-full items-center justify-center',
              'sm:cursor-zoom-in'
            )}
            onClick={handleMediaTap}
            aria-label={isVideo ? 'Play video' : 'Open photo'}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`${post.id}-${safeIndex}`}
              src={mediaUrl}
              alt={post.caption || `${post.author.name} activity`}
              className="mx-auto max-h-[min(78vh,760px)] w-auto max-w-full object-contain"
              loading="lazy"
            />
          </button>
        )}

        {multi ? (
          <>
            {safeIndex > 0 ? (
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/60 sm:inline-flex"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : null}
            {safeIndex < mediaItems.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="absolute right-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/60 sm:inline-flex"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            ) : null}
            <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
              {mediaItems.map((_, index) => (
                <button
                  key={`${post.id}-dot-${index}`}
                  type="button"
                  onClick={() => setMediaIndex(index)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    index === safeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/45'
                  )}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
            <span className="absolute right-3 top-3 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
              {safeIndex + 1}/{mediaItems.length}
            </span>
          </>
        ) : null}

        <AnimatePresence>
          {heartBurst && (
            <motion.span
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <HappyIcon className="h-20 w-20 text-white drop-shadow-lg" filled />
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex items-center gap-5">
        <button
          type="button"
          disabled={liking}
          onClick={() => onToggleLike(post.id)}
          className={cn(
            'inline-flex items-center text-sm font-medium transition-colors',
            post.likedByMe ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label={post.likedByMe ? 'Unlike' : 'Like'}
        >
          <HappyIcon className="h-5 w-5" filled={post.likedByMe} />
        </button>
        <button
          type="button"
          onClick={() => onOpenComments(post)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          aria-label="Comment"
        >
          <MessageCircle className="h-5 w-5" />
          {post.commentCount > 0 ? formatCount(post.commentCount) : null}
        </button>
        {canRepost ? (
          <button
            type="button"
            disabled={repostMutation.isPending}
            onClick={() => repostMutation.mutate()}
            className={cn(
              'inline-flex items-center gap-1.5 text-sm font-medium transition-colors',
              post.repostedByMe
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label={post.repostedByMe ? 'Remove repost' : 'Repost'}
          >
            <Repeat2 className="h-5 w-5" />
            {(post.repostCount ?? 0) > 0 ? formatCount(post.repostCount!) : null}
          </button>
        ) : (post.repostCount ?? 0) > 0 ? (
          <span
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground"
            aria-label="Reposts"
          >
            <Repeat2 className="h-5 w-5" />
            {formatCount(post.repostCount!)}
          </span>
        ) : null}
        <button
          type="button"
          onClick={handleShare}
          className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          aria-label="Share"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </div>

      {post.likeCount > 0 ? (
        <button
          type="button"
          onClick={() => setLikesOpen(true)}
          className="mt-1.5 block text-sm font-semibold text-foreground hover:underline"
          aria-label="See who liked this post"
        >
          {post.likeCount === 1 ? '1 like' : `${formatCount(post.likeCount)} likes`}
        </button>
      ) : null}

      {editOpen ? (
        <div className="fixed inset-0 z-[210] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => !saving && setEditOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-float)]"
          >
            <h3 className="text-base font-semibold text-foreground">Edit caption</h3>
            <textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value.slice(0, 300))}
              rows={4}
              maxLength={300}
              className="mt-3 w-full rounded-xl border border-input bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Write a caption…"
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground">
              {editCaption.length}/300
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (!onEdit) return;
                  setSaving(true);
                  try {
                    await onEdit(post, editCaption.trim());
                    setEditOpen(false);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this post?"
        description="Are you sure you want to delete this post?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        loading={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          if (!onDelete) return;
          setDeleting(true);
          try {
            await onDelete(post);
            setDeleteOpen(false);
          } finally {
            setDeleting(false);
          }
        }}
      />

      <ConfirmDialog
        open={leaveOpen}
        title="Leave collaboration?"
        description="This post will no longer appear as shared with you."
        confirmLabel="Leave"
        cancelLabel="Cancel"
        destructive
        loading={removeCollabMutation.isPending}
        onCancel={() => setLeaveOpen(false)}
        onConfirm={() => {
          if (!selectedProfile?._id) return;
          removeCollabMutation.mutate(selectedProfile._id);
        }}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove collaborator?"
        description={
          removeTarget
            ? `${removeTarget.name} will be removed from this post.`
            : undefined
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        loading={removeCollabMutation.isPending}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (!removeTarget) return;
          removeCollabMutation.mutate(removeTarget.profileId);
        }}
      />

      {manageCollabOpen
        ? createPortal(
            <div className="fixed inset-0 z-[250] flex items-end justify-center sm:items-center">
              <button
                type="button"
                aria-label="Close"
                className="absolute inset-0 bg-black/45"
                onClick={() => setManageCollabOpen(false)}
              />
              <div className="relative z-10 w-full max-w-md rounded-t-3xl border border-border bg-surface p-4 shadow-[var(--shadow-float)] sm:rounded-3xl">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Collaborators</p>
                    <p className="text-xs text-muted-foreground">
                      Remove people tagged on this post
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManageCollabOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <ul className="divide-y divide-border">
                  {removableCollabs.map((person) => (
                    <li
                      key={person.profileId}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <ProfileAvatar
                        name={person.name}
                        avatarUrl={person.avatarUrl}
                        avatarSeed={person.avatarSeed}
                        avatarStyle={person.avatarStyle}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {person.name}
                        </p>
                        <p className="text-[11px] capitalize text-muted-foreground">
                          {person.status}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-destructive"
                        disabled={removeCollabMutation.isPending}
                        onClick={() =>
                          setRemoveTarget({
                            profileId: person.profileId,
                            name: person.name,
                          })
                        }
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
                {removableCollabs.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No collaborators on this post
                  </p>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}

      {previewOpen
        ? createPortal(
            <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/90 p-3 sm:p-6">
              <button
                type="button"
                aria-label="Close preview"
                className="absolute inset-0 cursor-zoom-out"
                onClick={() => setPreviewOpen(false)}
              />
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top,0px))] z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              {multi && safeIndex > 0 ? (
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : null}
              {multi && safeIndex < mediaItems.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-16 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:right-4 sm:top-auto"
                  aria-label="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              ) : null}
              <div className="relative z-[1] flex max-h-[92vh] max-w-[min(100%,960px)] flex-col items-center">
                {isVideo ? (
                  <video
                    src={mediaUrl}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-[min(88vh,900px)] max-w-full rounded-lg object-contain"
                  />
                ) : (
                  <ZoomableImage
                    src={mediaUrl}
                    alt={post.caption || `${post.author.name} activity`}
                    className="max-h-[min(88vh,900px)] max-w-full rounded-lg object-contain"
                    stageClassName="max-h-[min(88vh,900px)] w-full"
                  />
                )}
                {multi ? (
                  <p className="mt-2 text-xs text-white/70">
                    {safeIndex + 1} / {mediaItems.length}
                  </p>
                ) : null}
                {post.caption ? (
                  <div className="mt-3 max-w-lg px-2 text-center">
                    {renderCaptionWithMentions(post.caption, {
                      collaborators: [
                        ...(post.acceptedCollaborators || []),
                        ...(post.collaborators || []),
                      ],
                      className: 'text-sm text-white/90',
                      mentionClassName: 'font-semibold text-primary hover:underline',
                    })}
                  </div>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}

      <FeedLikesSheet
        open={likesOpen}
        onClose={() => setLikesOpen(false)}
        photoId={post.id}
      />
    </article>
  );
}
