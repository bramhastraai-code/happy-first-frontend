'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { DateTime } from 'luxon';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { FeedPost } from '@/lib/api/feed';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';
import { cn } from '@/lib/utils';

interface ProfilePostViewerProps {
  posts: FeedPost[];
  startIndex: number;
  open: boolean;
  isOwner: boolean;
  onClose: () => void;
  onToggleLike: (postId: string) => void;
  onOpenComments: (post: FeedPost) => void;
  onEdit: (post: FeedPost, caption: string) => Promise<void>;
  onDelete: (post: FeedPost) => Promise<void>;
  likingId?: string | null;
}

function formatCount(value: number) {
  if (value < 1000) return String(value);
  return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
}

export function ProfilePostViewer({
  posts,
  startIndex,
  open,
  isOwner,
  onClose,
  onToggleLike,
  onOpenComments,
  onEdit,
  onDelete,
  likingId = null,
}: ProfilePostViewerProps) {
  const [index, setIndex] = useState(startIndex);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const menuRefMobile = useRef<HTMLDivElement>(null);
  const menuRefDesktop = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);
  const touchStartX = useRef<number | null>(null);

  const post = posts[index] || null;

  useEffect(() => {
    if (!open) return;
    setIndex(Math.min(Math.max(0, startIndex), Math.max(0, posts.length - 1)));
    setMediaIndex(0);
    setMenuOpen(false);
    setEditOpen(false);
    setDeleteOpen(false);
  }, [open, startIndex]);

  useEffect(() => {
    if (!open) return;
    if (posts.length === 0) {
      onClose();
      return;
    }
    setIndex((value) => Math.min(value, posts.length - 1));
  }, [open, posts.length, onClose]);

  useEffect(() => {
    setMediaIndex(0);
    setMenuOpen(false);
    if (post) setEditCaption(post.caption || '');
  }, [post?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (editOpen || deleteOpen) return;
      if (event.key === 'Escape') {
        if (menuOpen) setMenuOpen(false);
        else onClose();
      }
      if (event.key === 'ArrowRight') {
        setIndex((value) => Math.min(posts.length - 1, value + 1));
      }
      if (event.key === 'ArrowLeft') {
        setIndex((value) => Math.max(0, value - 1));
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, editOpen, deleteOpen, menuOpen, posts.length, onClose]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      const inMobile = menuRefMobile.current?.contains(target);
      const inDesktop = menuRefDesktop.current?.contains(target);
      if (!inMobile && !inDesktop) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [menuOpen]);

  const goPrevPost = () => setIndex((value) => Math.max(0, value - 1));
  const goNextPost = () => setIndex((value) => Math.min(posts.length - 1, value + 1));

  if (!open || !post) return null;

  const mediaItems =
    post.mediaItems && post.mediaItems.length > 0
      ? post.mediaItems
      : [{ url: post.imageUrl, mediaType: post.mediaType || 'image' }];
  const safeMedia = Math.min(mediaIndex, Math.max(0, mediaItems.length - 1));
  const current = mediaItems[safeMedia] || mediaItems[0];
  const isVideo = (current?.mediaType || 'image') === 'video';
  const mediaUrl = resolveMediaUrl(current?.url || post.imageUrl);
  const multi = mediaItems.length > 1;
  const timeLabel = DateTime.fromISO(post.createdAt).toRelative() || 'just now';

  const goPrevMedia = () => setMediaIndex((value) => Math.max(0, value - 1));
  const goNextMedia = () =>
    setMediaIndex((value) => Math.min(mediaItems.length - 1, value + 1));

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
  };

  const handleShare = async () => {
    const shareUrl =
      typeof window !== 'undefined' ? `${window.location.origin}/feed?post=${post.id}` : '';
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${post.author.name} on Happy First`,
          text: post.caption || 'Check out this post',
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // cancelled
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[230] bg-black sm:bg-black/80 sm:backdrop-blur-sm">
      {/* Desktop close / nav */}
      <button
        type="button"
        className="absolute inset-0 hidden sm:block"
        aria-label="Close"
        onClick={onClose}
      />
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 hidden h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10 sm:inline-flex"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      {index > 0 ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrevPost();
          }}
          className="absolute left-3 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow sm:inline-flex"
          aria-label="Previous post"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      ) : null}
      {index < posts.length - 1 ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNextPost();
          }}
          className="absolute right-3 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow sm:inline-flex"
          aria-label="Next post"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      ) : null}

      <div
        className={cn(
          'relative z-20 flex h-full w-full flex-col bg-black text-white',
          'sm:absolute sm:left-1/2 sm:top-1/2 sm:h-[min(90vh,820px)] sm:w-[min(96vw,920px)]',
          'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:flex-row sm:overflow-hidden sm:rounded-sm sm:bg-white sm:text-foreground'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile header — Instagram style */}
        <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5 sm:hidden">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <Link
            href={`/feed/profile/${post.author.profileId}`}
            className="flex min-w-0 flex-1 items-center gap-2"
            onClick={onClose}
          >
            <ProfileAvatar
              name={post.author.name}
              avatarUrl={post.author.avatarUrl}
              avatarSeed={post.author.avatarSeed}
              avatarStyle={post.author.avatarStyle}
              size="sm"
              className="h-8 w-8 ring-1 ring-white/20"
            />
            <span className="truncate text-sm font-semibold">{post.author.name}</span>
          </Link>
          <div className="relative" ref={menuRefMobile}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center"
              aria-label="Post options"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            <AnimatePresence>
              {menuOpen ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  className="absolute right-0 top-9 z-40 w-max min-w-[9.5rem] overflow-hidden rounded-md border border-border bg-surface text-foreground shadow-[var(--shadow-float)]"
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
                    <p className="px-3 py-2 text-xs text-muted-foreground">No actions</p>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </header>

        {/* Media pane */}
        <div
          className={cn(
            'relative flex min-h-0 flex-1 items-center justify-center bg-black',
            'sm:w-[58%] sm:flex-none sm:self-stretch'
          )}
          onTouchStart={(event) => {
            touchStartX.current = event.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (touchStartX.current == null) return;
            const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
            const delta = endX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(delta) < 45) return;
            if (multi) {
              if (delta < 0) {
                if (safeMedia < mediaItems.length - 1) goNextMedia();
                else goNextPost();
              } else if (safeMedia > 0) goPrevMedia();
              else goPrevPost();
              return;
            }
            if (delta < 0) goNextPost();
            else goPrevPost();
          }}
        >
          {isVideo ? (
            <video
              key={`${post.id}-${safeMedia}`}
              src={mediaUrl}
              controls
              playsInline
              className="max-h-full max-w-full object-contain"
              onDoubleClick={triggerLikeBurst}
            />
          ) : (
            <button
              type="button"
              className="flex h-full w-full items-center justify-center"
              onClick={handleMediaTap}
              aria-label="Double tap to like"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={`${post.id}-${safeMedia}`}
                src={mediaUrl}
                alt={post.caption || post.author.name}
                className="max-h-full max-w-full object-contain"
              />
            </button>
          )}

          {multi ? (
            <>
              {safeMedia > 0 ? (
                <button
                  type="button"
                  onClick={goPrevMedia}
                  className="absolute left-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black sm:inline-flex"
                  aria-label="Previous media"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              ) : null}
              {safeMedia < mediaItems.length - 1 ? (
                <button
                  type="button"
                  onClick={goNextMedia}
                  className="absolute right-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black sm:inline-flex"
                  aria-label="Next media"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : null}
              <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1">
                {mediaItems.map((_, i) => (
                  <span
                    key={`${post.id}-m-${i}`}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      i === safeMedia ? 'w-1.5 bg-primary' : 'w-1.5 bg-white/45'
                    )}
                  />
                ))}
              </div>
            </>
          ) : null}

          <AnimatePresence>
            {heartBurst ? (
              <motion.span
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.25 }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <Heart className="h-24 w-24 fill-white text-white drop-shadow-lg" />
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Details pane */}
        <div className="flex w-full flex-col bg-black sm:w-[42%] sm:bg-white sm:text-foreground">
          {/* Desktop header */}
          <div className="hidden items-center gap-3 border-b border-border px-4 py-3 sm:flex">
            <Link
              href={`/feed/profile/${post.author.profileId}`}
              className="flex min-w-0 flex-1 items-center gap-2.5"
              onClick={onClose}
            >
              <ProfileAvatar
                name={post.author.name}
                avatarUrl={post.author.avatarUrl}
                avatarSeed={post.author.avatarSeed}
                avatarStyle={post.author.avatarStyle}
                size="sm"
                className="h-8 w-8"
              />
              <span className="truncate text-sm font-semibold">{post.author.name}</span>
            </Link>
            <div className="relative" ref={menuRefDesktop}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                aria-label="Post options"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
              <AnimatePresence>
                {menuOpen ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                    className="absolute right-0 top-9 z-40 w-max min-w-[9.5rem] overflow-hidden rounded-md border border-border bg-surface shadow-[var(--shadow-float)]"
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
                      <p className="px-3 py-2 text-xs text-muted-foreground">No actions</p>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <div className="hidden flex-1 overflow-y-auto px-4 py-3 sm:block">
            {post.caption ? (
              <p className="text-sm leading-relaxed">
                <span className="font-semibold">{post.author.name}</span>{' '}
                <span className="whitespace-pre-wrap break-words">{post.caption}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No caption</p>
            )}
            <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
              {timeLabel}
            </p>
          </div>

          {/* Actions — Instagram style */}
          <div className="border-t border-white/10 px-3 py-2 sm:border-border sm:px-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={likingId === post.id}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleLike(post.id);
                }}
                className={cn(
                  'inline-flex items-center justify-center',
                  post.likedByMe ? 'text-primary' : 'text-white sm:text-foreground'
                )}
                aria-label={post.likedByMe ? 'Unlike' : 'Like'}
              >
                <Heart className={cn('h-7 w-7', post.likedByMe && 'fill-current')} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenComments(post);
                }}
                className="text-white sm:text-foreground"
                aria-label="Comment"
              >
                <MessageCircle className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleShare();
                }}
                className="text-white sm:text-foreground"
                aria-label="Share"
              >
                <Share2 className="h-6 w-6" />
              </button>
            </div>

            {post.likeCount > 0 ? (
              <p className="mt-2 text-sm font-semibold text-white sm:text-foreground">
                {formatCount(post.likeCount)} {post.likeCount === 1 ? 'like' : 'likes'}
              </p>
            ) : (
              <p className="mt-2 text-sm text-white/60 sm:text-muted-foreground">
                Be the first to like this
              </p>
            )}

            {/* Mobile caption under actions */}
            <div className="mt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:hidden">
              {post.caption ? (
                <p className="text-sm leading-snug text-white">
                  <span className="font-semibold">{post.author.name}</span>{' '}
                  <span className="whitespace-pre-wrap break-words text-white/95">
                    {post.caption}
                  </span>
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => onOpenComments(post)}
                className="mt-1.5 text-sm text-white/55"
              >
                {post.commentCount > 0
                  ? `View all ${post.commentCount} comments`
                  : 'Add a comment…'}
              </button>
              <p className="mt-1.5 text-[10px] uppercase tracking-wide text-white/40">
                {timeLabel}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenComments(post)}
              className="mt-2 hidden text-sm text-muted-foreground hover:text-foreground sm:block"
            >
              {post.commentCount > 0
                ? `View all ${post.commentCount} comments`
                : 'Add a comment…'}
            </button>
          </div>
        </div>
      </div>

      {editOpen ? (
        <div className="fixed inset-0 z-[240] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={() => !saving && setEditOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-4 text-foreground shadow-xl">
            <h3 className="text-base font-semibold">Edit caption</h3>
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
        zClassName="z-[250]"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await onDelete(post);
            setDeleteOpen(false);
            if (posts.length <= 1) onClose();
            else setIndex((value) => Math.min(value, posts.length - 2));
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>,
    document.body
  );
}
