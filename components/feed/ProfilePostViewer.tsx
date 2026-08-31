'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { DateTime } from 'luxon';
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Share2,
  Trash2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { FeedPost } from '@/lib/api/feed';
import type { FeedPostEditExtras } from '@/components/feed/FeedPostCard';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { headerBackBtnClass } from '@/components/ui/AppPageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { HappyIcon } from '@/components/ui/HappyIcon';
import { ZoomableImage } from '@/components/ui/ZoomableImage';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';
import { renderCaptionWithMentions } from '@/lib/utils/renderCaptionWithMentions';
import {
  renderTextCardImage,
  textCardGradient,
  TEXT_CARD_BACKGROUNDS,
  TEXT_CARD_FONTS,
  TEXT_CARD_MAX_LENGTH,
} from '@/lib/utils/textCardImage';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';
import { useOverlayHistory } from '@/lib/hooks/useOverlayHistory';

interface ProfilePostViewerProps {
  posts: FeedPost[];
  startIndex: number;
  open: boolean;
  isOwner: boolean;
  onClose: () => void;
  onToggleLike: (postId: string) => void;
  onToggleRepost?: (postId: string) => void;
  onOpenComments: (post: FeedPost) => void;
  onEdit: (
    post: FeedPost,
    caption: string,
    extras?: FeedPostEditExtras
  ) => Promise<void>;
  onDelete: (post: FeedPost) => Promise<void>;
  likingId?: string | null;
  repostingId?: string | null;
}

function formatCount(value: number) {
  if (value < 1000) return String(value);
  return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
}

function ViewerPostCard({
  post,
  isOwner,
  liking,
  reposting,
  menuOpen,
  onMenuToggle,
  onCloseMenu,
  onToggleLike,
  onToggleRepost,
  onOpenComments,
  onEditClick,
  onDeleteClick,
  onShare,
}: {
  post: FeedPost;
  isOwner: boolean;
  liking: boolean;
  reposting: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onCloseMenu: () => void;
  onToggleLike: () => void;
  onToggleRepost?: () => void;
  onOpenComments: () => void;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onShare: () => void;
}) {
  const { selectedProfile } = useAuthStore();
  const ownsPost =
    isOwner ||
    Boolean(selectedProfile?._id && post.author.profileId === selectedProfile._id);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [heartBurst, setHeartBurst] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);

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

  const canRepost =
    Boolean(onToggleRepost) &&
    !ownsPost &&
    !post.communityId &&
    !post.isStory &&
    post.repostOf?.author.profileId !== selectedProfile?._id;

  useEffect(() => {
    setMediaIndex(0);
    setShareMenuOpen(false);
  }, [post.id]);

  // Auto-advance multi-photo carousel every 3s
  useEffect(() => {
    if (!multi || mediaItems.length < 2) return;
    const timer = window.setInterval(() => {
      setMediaIndex((value) => (value + 1) % mediaItems.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [multi, mediaItems.length, post.id]);

  useEffect(() => {
    if (!menuOpen && !shareMenuOpen) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuOpen && menuRef.current && !menuRef.current.contains(target)) {
        onCloseMenu();
      }
      if (shareMenuOpen && shareMenuRef.current && !shareMenuRef.current.contains(target)) {
        setShareMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [menuOpen, shareMenuOpen, onCloseMenu]);

  const goPrevMedia = () => setMediaIndex((value) => Math.max(0, value - 1));
  const goNextMedia = () =>
    setMediaIndex((value) => Math.min(mediaItems.length - 1, value + 1));

  const triggerLikeBurst = () => {
    if (!post.likedByMe) onToggleLike();
    setHeartBurst(true);
    window.setTimeout(() => setHeartBurst(false), 700);
  };

  const handleRepost = () => {
    onCloseMenu();
    setShareMenuOpen(false);
    onToggleRepost?.();
  };

  return (
    <article className="border-b border-border bg-surface pb-4 pt-3 last:border-b-0">
      <div className="mb-3 flex items-center gap-2.5 px-4">
        <Link
          href={`/feed/profile/${post.author.profileId}`}
          className="flex min-w-0 flex-1 items-center gap-2.5"
        >
          <ProfileAvatar
            name={post.author.name}
            avatarUrl={post.author.avatarUrl}
            avatarSeed={post.author.avatarSeed}
            avatarStyle={post.author.avatarStyle}
            size="sm"
            rounded="xl"
            className="h-9 w-9 ring-1 ring-border"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {post.author.name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{timeLabel}</p>
          </div>
        </Link>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={onMenuToggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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
                className="absolute right-0 top-10 z-40 w-max min-w-[10rem] overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-float)]"
              >
                {ownsPost ? (
                  <>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                      onClick={onEditClick}
                    >
                      <Pencil className="h-4 w-4 shrink-0" />
                      Edit caption
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                      onClick={onDeleteClick}
                    >
                      <Trash2 className="h-4 w-4 shrink-0" />
                      Delete
                    </button>
                  </>
                ) : canRepost ? (
                  <button
                    type="button"
                    disabled={reposting}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                    onClick={handleRepost}
                  >
                    <Repeat2 className="h-4 w-4 shrink-0" />
                    {post.repostedByMe ? 'Remove repost' : 'Repost'}
                  </button>
                ) : (
                  <p className="px-3.5 py-2.5 text-sm text-muted-foreground">No actions</p>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div
        className="relative mx-3 flex min-h-[12rem] items-center justify-center overflow-hidden rounded-2xl bg-stone-900 sm:mx-4"
        onTouchStart={(event) => {
          touchStartX.current = event.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (!multi || touchStartX.current == null) return;
          const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
          const delta = endX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(delta) < 40) return;
          if (delta < 0) goNextMedia();
          else goPrevMedia();
        }}
      >
        {isVideo ? (
          <video
            key={`${post.id}-${safeMedia}`}
            src={mediaUrl}
            controls
            playsInline
            className="max-h-[min(58vh,520px)] w-full object-contain"
            onDoubleClick={triggerLikeBurst}
          />
        ) : (
          <ZoomableImage
            src={mediaUrl}
            alt={post.caption || post.author.name}
            className="max-h-[min(58vh,520px)] w-full object-contain"
            stageClassName="max-h-[min(58vh,520px)] w-full"
          />
        )}

        {multi ? (
          <>
            {safeMedia > 0 ? (
              <button
                type="button"
                onClick={goPrevMedia}
                className="absolute left-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/60 sm:inline-flex"
                aria-label="Previous media"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : null}
            {safeMedia < mediaItems.length - 1 ? (
              <button
                type="button"
                onClick={goNextMedia}
                className="absolute right-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/60 sm:inline-flex"
                aria-label="Next media"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : null}
            <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
              {mediaItems.map((_, i) => (
                <span
                  key={`${post.id}-m-${i}`}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === safeMedia ? 'w-4 bg-primary' : 'w-1.5 bg-white/50'
                  )}
                />
              ))}
            </div>
            <span className="absolute right-2.5 top-2.5 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
              {safeMedia + 1}/{mediaItems.length}
            </span>
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
              <HappyIcon className="h-20 w-20 text-primary drop-shadow-lg" filled />
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="px-4 pt-3 sm:px-5">
        <div className="flex items-center gap-5">
          <button
            type="button"
            disabled={liking}
            onClick={onToggleLike}
            className={cn(
              'inline-flex items-center gap-1.5 text-sm font-medium transition-colors',
              post.likedByMe ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label={post.likedByMe ? 'Unlike' : 'Like'}
          >
            <HappyIcon className="h-5 w-5" filled={post.likedByMe} />
            {post.likeCount > 0 ? formatCount(post.likeCount) : null}
          </button>
          <button
            type="button"
            onClick={onOpenComments}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Comment"
          >
            <MessageCircle className="h-5 w-5" />
            {post.commentCount > 0 ? formatCount(post.commentCount) : null}
          </button>
          {canRepost ? (
            <button
              type="button"
              disabled={reposting}
              onClick={handleRepost}
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
          <div className="relative ml-auto" ref={shareMenuRef}>
            <button
              type="button"
              onClick={() => {
                if (canRepost) setShareMenuOpen((v) => !v);
                else onShare();
              }}
              className="inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Share"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <AnimatePresence>
              {shareMenuOpen && canRepost ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 4 }}
                  className="absolute bottom-9 right-0 z-40 w-max min-w-[9.5rem] overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-float)]"
                >
                  <button
                    type="button"
                    disabled={reposting}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                    onClick={handleRepost}
                  >
                    <Repeat2 className="h-4 w-4 shrink-0" />
                    {post.repostedByMe ? 'Remove repost' : 'Repost'}
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    onClick={() => {
                      setShareMenuOpen(false);
                      onShare();
                    }}
                  >
                    <Share2 className="h-4 w-4 shrink-0" />
                    Share
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {post.likeCount > 0 ? (
          <p className="mt-2.5 text-sm font-semibold text-foreground">
            {formatCount(post.likeCount)} {post.likeCount === 1 ? 'like' : 'likes'}
          </p>
        ) : (
          <p className="mt-2.5 text-sm text-muted-foreground">Be the first to like this</p>
        )}

        {post.caption ? (
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            <span className="font-semibold">{post.author.name}</span>{' '}
            {renderCaptionWithMentions(post.caption, {
              collaborators: [
                ...(post.acceptedCollaborators || []),
                ...(post.collaborators || []),
              ],
              inline: true,
              mentionClassName: 'font-semibold text-primary hover:underline',
            })}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onOpenComments}
          className="mt-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {post.commentCount > 0
            ? `View all ${post.commentCount} comments`
            : 'Add a comment…'}
        </button>
      </div>
    </article>
  );
}

export function ProfilePostViewer({
  posts,
  startIndex,
  open,
  isOwner,
  onClose,
  onToggleLike,
  onToggleRepost,
  onOpenComments,
  onEdit,
  onDelete,
  likingId = null,
  repostingId = null,
}: ProfilePostViewerProps) {
  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  const [editPost, setEditPost] = useState<FeedPost | null>(null);
  const [deletePost, setDeletePost] = useState<FeedPost | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editText, setEditText] = useState('');
  const [editBgIndex, setEditBgIndex] = useState(0);
  const [editFontIndex, setEditFontIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didScrollToStart = useRef(false);

  useOverlayHistory({
    open,
    onClose,
    key: 'profile-post-viewer',
  });

  useEffect(() => {
    if (!open) {
      didScrollToStart.current = false;
      setMenuPostId(null);
      setEditPost(null);
      setDeletePost(null);
      return;
    }
    if (posts.length === 0) {
      onClose();
    }
  }, [open, posts.length, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (editPost || deletePost) return;
      if (event.key === 'Escape') {
        if (menuPostId) setMenuPostId(null);
        else onClose();
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, editPost, deletePost, menuPostId, onClose]);

  // Jump to the tapped post once the list is mounted
  useEffect(() => {
    if (!open || didScrollToStart.current || posts.length === 0) return;
    const targetIndex = Math.min(Math.max(0, startIndex), posts.length - 1);
    const frame = requestAnimationFrame(() => {
      const root = scrollRef.current;
      if (!root) return;
      const el = root.querySelector<HTMLElement>(`[data-post-index="${targetIndex}"]`);
      if (el) {
        el.scrollIntoView({ block: 'start' });
        didScrollToStart.current = true;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [open, startIndex, posts.length]);

  const handleShare = async (post: FeedPost) => {
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

  if (!open || posts.length === 0) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[230] flex items-end justify-center sm:items-center sm:p-4">
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className={cn(
          'relative z-20 flex w-full flex-col overflow-hidden bg-background text-foreground',
          'h-[100dvh] sm:h-[min(92vh,860px)] sm:max-w-lg sm:rounded-3xl sm:border sm:border-border sm:bg-surface sm:shadow-[var(--shadow-float)]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-2 bg-surface px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:rounded-t-3xl sm:px-4">
          <button
            type="button"
            onClick={onClose}
            className={headerBackBtnClass}
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">Posts</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {posts.length} {posts.length === 1 ? 'post' : 'posts'} 
            </p>
          </div>
        </header>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          {posts.map((post, i) => (
            <div key={post.id} data-post-index={i} data-post-id={post.id}>
              <ViewerPostCard
                post={post}
                isOwner={isOwner}
                liking={likingId === post.id}
                reposting={repostingId === post.id}
                menuOpen={menuPostId === post.id}
                onMenuToggle={() =>
                  setMenuPostId((id) => (id === post.id ? null : post.id))
                }
                onCloseMenu={() => setMenuPostId(null)}
                onToggleLike={() => onToggleLike(post.id)}
                onToggleRepost={
                  onToggleRepost ? () => onToggleRepost(post.id) : undefined
                }
                onOpenComments={() => onOpenComments(post)}
                onEditClick={() => {
                  setMenuPostId(null);
                  setEditCaption(post.caption || '');
                  setEditText(post.textCard?.text || '');
                  setEditBgIndex(
                    Math.max(
                      0,
                      TEXT_CARD_BACKGROUNDS.findIndex(
                        (b) => b.id === post.textCard?.backgroundId
                      )
                    )
                  );
                  setEditFontIndex(
                    Math.max(
                      0,
                      TEXT_CARD_FONTS.findIndex((f) => f.id === post.textCard?.fontId)
                    )
                  );
                  setEditPost(post);
                }}
                onDeleteClick={() => {
                  setMenuPostId(null);
                  setDeletePost(post);
                }}
                onShare={() => void handleShare(post)}
              />
            </div>
          ))}
        </div>
      </motion.div>

      {editPost ? (
        <div className="fixed inset-0 z-[240] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/50"
            aria-label="Close"
            onClick={() => !saving && setEditPost(null)}
          />
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-4 text-foreground shadow-xl">
            <h3 className="text-base font-semibold">
              {editPost.textCard?.text ? 'Edit text post' : 'Edit caption'}
            </h3>
            {editPost.textCard?.text ? (
              <div className="mt-3 space-y-3">
                <div
                  className="relative mx-auto flex aspect-[4/5] w-full max-w-[280px] items-center justify-center overflow-hidden rounded-2xl p-4"
                  style={{
                    background: textCardGradient(TEXT_CARD_BACKGROUNDS[editBgIndex]),
                  }}
                >
                  <textarea
                    value={editText}
                    maxLength={TEXT_CARD_MAX_LENGTH}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={Math.min(
                      10,
                      Math.max(2, editText.split('\n').length + Math.floor(editText.length / 26))
                    )}
                    className={cn(
                      'max-h-full w-full resize-none bg-transparent text-center text-white outline-none placeholder:text-white/70',
                      editText.length > 160 ? 'text-lg leading-snug' : 'text-2xl leading-snug',
                      TEXT_CARD_FONTS[editFontIndex].className
                    )}
                    placeholder="Edit your status text…"
                  />
                </div>
                <div className="flex items-center justify-center gap-2">
                  {TEXT_CARD_BACKGROUNDS.map((background, index) => (
                    <button
                      key={background.id}
                      type="button"
                      aria-label={background.label}
                      onClick={() => setEditBgIndex(index)}
                      className={cn(
                        'h-7 w-7 rounded-full transition-transform',
                        index === editBgIndex
                          ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-surface'
                          : 'hover:scale-105'
                      )}
                      style={{ background: textCardGradient(background) }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-center gap-2">
                  {TEXT_CARD_FONTS.map((cardFont, index) => (
                    <button
                      key={cardFont.id}
                      type="button"
                      onClick={() => setEditFontIndex(index)}
                      className={cn(
                        'rounded-xl border px-3 py-1.5 text-sm transition-colors',
                        cardFont.className,
                        index === editFontIndex
                          ? 'border-primary bg-primary-soft text-primary'
                          : 'border-border bg-secondary/60 text-muted-foreground'
                      )}
                    >
                      Aa
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <label className="mt-3 block text-xs font-medium text-muted-foreground">
              Caption
            </label>
            <textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value.slice(0, 300))}
              rows={editPost.textCard?.text ? 2 : 4}
              maxLength={300}
              className="mt-1.5 w-full rounded-xl border border-input bg-secondary px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
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
                onClick={() => setEditPost(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving || (Boolean(editPost.textCard?.text) && !editText.trim())}
                onClick={async () => {
                  setSaving(true);
                  try {
                    if (editPost.textCard?.text) {
                      const trimmed = editText.trim();
                      const background = TEXT_CARD_BACKGROUNDS[editBgIndex];
                      const font = TEXT_CARD_FONTS[editFontIndex];
                      const kind = editPost.textCard.kind === 'story' ? 'story' : 'post';
                      const media = await renderTextCardImage({
                        text: trimmed,
                        background,
                        font,
                        kind,
                      });
                      await onEdit(editPost, editCaption.trim(), {
                        textCard: {
                          text: trimmed,
                          backgroundId: background.id,
                          fontId: font.id,
                          kind,
                        },
                        media,
                      });
                    } else {
                      await onEdit(editPost, editCaption.trim());
                    }
                    setEditPost(null);
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
        open={Boolean(deletePost)}
        title="Delete this post?"
        description="Are you sure you want to delete this post?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        loading={deleting}
        zClassName="z-[250]"
        onCancel={() => setDeletePost(null)}
        onConfirm={async () => {
          if (!deletePost) return;
          setDeleting(true);
          try {
            await onDelete(deletePost);
            setDeletePost(null);
            if (posts.length <= 1) onClose();
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>,
    document.body
  );
}
