'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Heart, MessageCircle, Rss } from 'lucide-react';
import { feedAPI, type FeedPost } from '@/lib/api/feed';
import { useAuthStore } from '@/lib/store/authStore';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';

interface HomeSocialPreviewProps {
  expanded: boolean;
  onToggle: () => void;
}

function PostRow({ post }: { post: FeedPost }) {
  return (
    <Link
      href={`/feed?post=${post.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
    >
      <ProfileAvatar
        name={post.author.name}
        avatarUrl={post.author.avatarUrl}
        avatarSeed={post.author.avatarSeed}
        avatarStyle={post.author.avatarStyle}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {post.author.name}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {post.caption?.trim() || (post.mediaType === 'video' ? 'Shared a video' : 'Shared a photo')}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-0.5">
          <Heart className="h-3 w-3" />
          {post.likeCount}
        </span>
        <span className="inline-flex items-center gap-0.5">
          <MessageCircle className="h-3 w-3" />
          {post.commentCount}
        </span>
      </div>
    </Link>
  );
}

/** Compact Inspiration preview on Home — full feed stays on /feed. */
export function HomeSocialPreview({ expanded, onToggle }: HomeSocialPreviewProps) {
  const profileId = useAuthStore((s) => s.selectedProfile?._id);

  const feedQuery = useQuery({
    queryKey: ['feed', profileId, 'home-preview'],
    enabled: Boolean(profileId) && expanded,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await feedAPI.getFeed({ limit: 3 });
      return res.data.data.posts ?? [];
    },
  });

  const posts = feedQuery.data ?? [];

  return (
    <CollapsibleSection
      id="home-social"
      title="My social"
      subtitle="Inspiration from people you follow"
      icon={Rss}
      expanded={expanded}
      onToggle={onToggle}
      badge={posts.length ? `${posts.length}` : undefined}
      contentClassName="!p-0"
    >
      {feedQuery.isLoading ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : posts.length === 0 ? (
        <div className="space-y-3 px-4 py-5 text-center">
          <p className="text-sm text-muted-foreground">No posts yet — explore Inspiration.</p>
          <Link href="/feed" className="text-sm font-semibold text-primary hover:underline">
            Open Inspiration
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {posts.map((post) => (
            <li key={post.id}>
              <PostRow post={post} />
            </li>
          ))}
          <li className="px-4 py-3">
            <Link href="/feed" className="text-sm font-semibold text-primary hover:underline">
              See all in Inspiration →
            </Link>
          </li>
        </ul>
      )}
    </CollapsibleSection>
  );
}
