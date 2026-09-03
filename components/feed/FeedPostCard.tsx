'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { DateTime } from 'luxon';
import {
  ArrowLeft,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Share2,
  Sparkles,
  Trash2,
  UserMinus,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { feedAPI, formatCollaborationLabel, type FeedPost } from '@/lib/api/feed';
import { FeedCaption } from '@/components/feed/FeedCaption';
import {
  renderTextCardImage,
  textCardGradient,
  TEXT_CARD_BACKGROUNDS,
  TEXT_CARD_FONTS,
  TEXT_CARD_MAX_LENGTH,
} from '@/lib/utils/textCardImage';
import { useAuthStore } from '@/lib/store/authStore';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { FeedLikesSheet } from '@/components/feed/FeedLikesSheet';
import { FollowButton } from '@/components/feed/FollowButton';
import { DailyMoodInline } from '@/components/mood/DailyMoodInline';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { HappyIcon } from '@/components/ui/HappyIcon';
import { PostMediaCarousel } from '@/components/feed/PostMediaCarousel';
import { cn } from '@/lib/utils';
import { useOverlayHistory } from '@/lib/hooks/useOverlayHistory';

export type FeedPostEditExtras = {
  textCard?: NonNullable<FeedPost['textCard']>;
  media?: Blob;
};

interface FeedPostCardProps {
  post: FeedPost;
  onToggleLike: (postId: string) => void;
  onOpenComments: (post: FeedPost) => void;
  onMessage?: (post: FeedPost) => void;
  onEdit?: (
    post: FeedPost,
    caption: string,
    extras?: FeedPostEditExtras
  ) => Promise<void> | void;
  onDelete?: (post: FeedPost) => Promise<void> | void;
  liking?: boolean;
  canMessage?: boolean;
  isOwner?: boolean;
  /** Hide “Community: …” badge (e.g. inside community feed tab) */
  hideCommunityLabel?: boolean;
  /** Discover visitor mode — disable like/comment/share actions */
  interactionsDisabled?: boolean;
  /** Single-tap media opens this instead of the one-photo preview */
  onOpenPost?: (post: FeedPost) => void;
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
  interactionsDisabled = false,
  onOpenPost,
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
  const [editCaption, setEditCaption] = useState(post.caption || '');
  const [editText, setEditText] = useState(post.textCard?.text || '');
  const [editBgIndex, setEditBgIndex] = useState(() =>
    Math.max(
      0,
      TEXT_CARD_BACKGROUNDS.findIndex((b) => b.id === post.textCard?.backgroundId)
    )
  );
  const [editFontIndex, setEditFontIndex] = useState(() =>
    Math.max(0, TEXT_CARD_FONTS.findIndex((f) => f.id === post.textCard?.fontId))
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const mediaItems =
    post.mediaItems && post.mediaItems.length > 0
      ? post.mediaItems
      : [{ url: post.imageUrl, mediaType: post.mediaType || 'image' }];

  useOverlayHistory({
    open: previewOpen,
    onClose: () => setPreviewOpen(false),
    key: `feed-preview-${post.id}`,
  });

  useEffect(() => {
    setEditCaption(post.caption || '');
    setEditText(post.textCard?.text || '');
    setEditBgIndex(
      Math.max(
        0,
        TEXT_CARD_BACKGROUNDS.findIndex((b) => b.id === post.textCard?.backgroundId)
      )
    );
    setEditFontIndex(
      Math.max(0, TEXT_CARD_FONTS.findIndex((f) => f.id === post.textCard?.fontId))
    );
  }, [post.caption, post.textCard]);

  const isTextCardPost = Boolean(post.textCard?.text);

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
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [previewOpen]);

  const triggerLikeBurst = () => {
    if (interactionsDisabled) return;
    if (!post.likedByMe) onToggleLike(post.id);
    setHeartBurst(true);
    window.setTimeout(() => setHeartBurst(false), 700);
  };

  const handleMediaTap = () => {
    if (onOpenPost) onOpenPost(post);
    else setPreviewOpen(true);
  };

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
              <DailyMoodInline mood={post.author.dailyMood} />
              {accepted.length > 0 ? (
                <span className="font-medium text-muted-foreground">
                  {' '}
                  and{' '}
                  <Link
                    href={`/feed/profile/${accepted[0].profileId}`}
                    className="font-semibold text-foreground hover:underline"
                  >
                    {accepted[0].name}
                  </Link>
                  {accepted.length > 1
                    ? ` and ${accepted.length - 1} others`
                    : null}
                  <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-primary">
                    <Sparkles className="h-2.5 w-2.5" />
                    Spark
                  </span>
                </span>
              ) : !hideCommunityLabel && post.communityId && post.communityName ? (
                <span className="font-medium text-muted-foreground">
                  {' '}
                  on Community:{' '}
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
                isFollowing={Boolean(post.author.isFollowing)}
                followsYou={Boolean(post.author.followsYou)}
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
              on Community:{' '}
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
                        Remove from Spark
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
                        Leave Spark
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

      <PostMediaCarousel
        items={mediaItems}
        alt={post.caption || `${post.author.name} activity`}
        className="rounded-2xl"
        onTap={handleMediaTap}
        onDoubleTap={triggerLikeBurst}
      >
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
      </PostMediaCarousel>

      <div className="mt-3 flex items-center gap-5">
        <button
          type="button"
          disabled={liking || interactionsDisabled}
          onClick={() => {
            if (interactionsDisabled) return;
            onToggleLike(post.id);
          }}
          className={cn(
            'inline-flex items-center text-sm font-medium transition-colors',
            post.likedByMe ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            interactionsDisabled && 'opacity-60'
          )}
          aria-label={post.likedByMe ? 'Unlike' : 'Like'}
        >
          <HappyIcon className="h-5 w-5" filled={post.likedByMe} />
        </button>
        <button
          type="button"
          onClick={() => onOpenComments(post)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          aria-label={
            interactionsDisabled
              ? post.commentCount > 0
                ? 'View comments'
                : 'Comments'
              : 'Comment'
          }
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

      {post.caption ? (
        <FeedCaption
          caption={post.caption}
          authorName={post.author.name}
          authorProfileId={post.author.profileId}
          collaborators={[
            ...(post.acceptedCollaborators || []),
            ...(post.collaborators || []),
          ]}
        />
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
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-float)]"
          >
            <h3 className="text-base font-semibold text-foreground">
              {isTextCardPost ? 'Edit text post' : 'Edit caption'}
            </h3>

            {isTextCardPost ? (
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
                  <span className="absolute bottom-2 right-3 text-[10px] font-medium text-white/70">
                    {editText.length}/{TEXT_CARD_MAX_LENGTH}
                  </span>
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
                          : 'border-border bg-secondary/60 text-muted-foreground hover:text-foreground'
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
              rows={isTextCardPost ? 2 : 4}
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
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving || (isTextCardPost && !editText.trim())}
                onClick={async () => {
                  if (!onEdit) return;
                  setSaving(true);
                  try {
                    if (isTextCardPost) {
                      const trimmed = editText.trim();
                      const background = TEXT_CARD_BACKGROUNDS[editBgIndex];
                      const font = TEXT_CARD_FONTS[editFontIndex];
                      const kind = post.textCard?.kind === 'story' ? 'story' : 'post';
                      const media = await renderTextCardImage({
                        text: trimmed,
                        background,
                        font,
                        kind,
                      });
                      await onEdit(post, editCaption.trim(), {
                        textCard: {
                          text: trimmed,
                          backgroundId: background.id,
                          fontId: font.id,
                          kind,
                        },
                        media,
                      });
                    } else {
                      await onEdit(post, editCaption.trim());
                    }
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
        description={
          accepted.length > 0
            ? 'This Spark will be removed for everyone on it.'
            : 'Are you sure you want to delete this post?'
        }
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
        title="Leave Spark?"
        description="This Spark will no longer appear on your profile. The original post stays up."
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
        title="Remove from Spark?"
        description={
          removeTarget
            ? `${removeTarget.name} will be removed from this Spark.`
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
                    <p className="text-sm font-semibold text-foreground">Spark</p>
                    <p className="text-xs text-muted-foreground">
                      Remove people from this Spark
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
                    No one on this Spark yet
                  </p>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}

      {previewOpen
        ? createPortal(
            <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/90 p-3 pt-16 sm:p-6 sm:pt-16">
              <button
                type="button"
                aria-label="Close preview"
                className="absolute inset-0 cursor-zoom-out"
                onClick={() => setPreviewOpen(false)}
              />
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setPreviewOpen(false);
                }}
                className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div
                className="relative z-[1] w-full max-w-[min(100%,960px)]"
                onClick={(event) => event.stopPropagation()}
              >
                <PostMediaCarousel
                  items={mediaItems}
                  alt={post.caption || `${post.author.name} activity`}
                  className="rounded-lg"
                  slideClassName="h-[min(82dvh,40rem)]"
                />
                {post.caption ? (
                  <FeedCaption
                    className="mt-3 max-w-lg px-2"
                    textClassName="text-center text-white/90"
                    caption={post.caption}
                    authorName={post.author.name}
                    authorProfileId={post.author.profileId}
                    collaborators={[
                      ...(post.acceptedCollaborators || []),
                      ...(post.collaborators || []),
                    ]}
                    mentionClassName="font-semibold text-primary hover:underline"
                    moreFadeClassName="bg-black text-white/55"
                  />
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
