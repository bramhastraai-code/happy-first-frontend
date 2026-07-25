'use client';

import { useRef, useState } from 'react';
import { DateTime } from 'luxon';
import { Heart, MessageCircle, MessageSquare, MoreHorizontal, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FeedPost } from '@/lib/api/feed';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';
import { cn } from '@/lib/utils';

interface FeedPostCardProps {
  post: FeedPost;
  onToggleLike: (postId: string) => void;
  onOpenComments: (post: FeedPost) => void;
  onMessage?: (post: FeedPost) => void;
  liking?: boolean;
  canMessage?: boolean;
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
  liking = false,
  canMessage = false,
}: FeedPostCardProps) {
  const [heartBurst, setHeartBurst] = useState(false);
  const lastTap = useRef(0);
  const isVideo = post.mediaType === 'video';

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      if (!post.likedByMe) onToggleLike(post.id);
      setHeartBurst(true);
      window.setTimeout(() => setHeartBurst(false), 700);
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

  return (
    <article className="feed-post border-b border-border bg-background px-0 py-4 sm:rounded-2xl sm:border sm:bg-surface sm:px-4 sm:shadow-[var(--shadow-card)]">
      <header className="mb-2.5 flex items-center gap-2.5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-500 text-xs font-bold text-primary-foreground">
          {post.author.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight text-foreground">
            {post.author.name}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{timeLabel}</span>
        {canMessage ? (
          <button
            type="button"
            onClick={() => onMessage?.(post)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-primary"
            aria-label="Message"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        ) : (
          <span className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </span>
        )}
      </header>

      {post.caption ? (
        <p className="mb-3 text-[15px] leading-relaxed text-foreground">{post.caption}</p>
      ) : null}

      <div className="relative overflow-hidden rounded-2xl bg-secondary">
        {isVideo ? (
          <video
            src={resolveMediaUrl(post.imageUrl)}
            controls
            playsInline
            preload="metadata"
            className="aspect-[4/5] w-full object-cover sm:aspect-square"
            onDoubleClick={handleDoubleTap}
          />
        ) : (
          <button
            type="button"
            className="relative block w-full"
            onClick={handleDoubleTap}
            aria-label="Double tap to like"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveMediaUrl(post.imageUrl)}
              alt={post.caption || `${post.author.name} activity`}
              className="aspect-[4/5] w-full object-cover sm:aspect-square"
              loading="lazy"
            />
          </button>
        )}
        <AnimatePresence>
          {heartBurst && (
            <motion.span
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <Heart className="h-20 w-20 fill-white text-white drop-shadow-lg" />
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
            'inline-flex items-center gap-1.5 text-sm font-medium transition-colors',
            post.likedByMe ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label={post.likedByMe ? 'Unlike' : 'Like'}
        >
          <Heart className={cn('h-5 w-5', post.likedByMe && 'fill-primary')} />
          {post.likeCount > 0 ? formatCount(post.likeCount) : null}
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
        <button
          type="button"
          onClick={handleShare}
          className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          aria-label="Share"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </div>
    </article>
  );
}
