'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Copy, Hash, Loader2, Play } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { FeedCommentsSheet } from '@/components/feed/FeedCommentsSheet';
import { ProfilePostViewer } from '@/components/feed/ProfilePostViewer';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { headerBackBtnClass, pageStickyHeaderClass } from '@/components/ui/AppPageHeader';
import { hashtagAPI } from '@/lib/api/hashtag';
import { feedAPI, type FeedPost } from '@/lib/api/feed';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';

function HashtagPostGrid({
  posts,
  onOpen,
}: {
  posts: FeedPost[];
  onOpen: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-0.5 sm:gap-1.5">
      {posts.map((post, index) => {
        const cover = post.mediaItems?.[0]?.url || post.imageUrl;
        const isVideo =
          (post.mediaItems?.[0]?.mediaType || post.mediaType) === 'video';
        const multi = (post.mediaItems?.length || 0) > 1;

        return (
          <button
            key={post.id}
            type="button"
            onClick={() => onOpen(index)}
            className="relative aspect-square overflow-hidden bg-neutral-900 sm:rounded-lg"
            aria-label={post.caption || `Post by ${post.author.name}`}
          >
            {isVideo ? (
              <video
                src={resolveMediaUrl(cover)}
                className="h-full w-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveMediaUrl(cover)}
                alt={post.caption || post.author.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            )}
            {multi ? (
              <span className="absolute right-1.5 top-1.5 text-white drop-shadow">
                <Copy className="h-3.5 w-3.5" />
              </span>
            ) : isVideo ? (
              <span className="absolute right-1.5 top-1.5 text-white drop-shadow">
                <Play className="h-3.5 w-3.5 fill-white" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function formatPostCount(count: number) {
  if (count < 1000) return `${count} post${count === 1 ? '' : 's'}`;
  return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k posts`;
}

export default function HashtagFeedPage() {
  const params = useParams<{ tag: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken, isHydrated, selectedProfile } = useAuthStore();
  const tag = decodeURIComponent(String(params?.tag || '')).toLowerCase();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [activePost, setActivePost] = useState<FeedPost | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [repostingId, setRepostingId] = useState<string | null>(null);

  const enabled = isHydrated && !!accessToken && !!tag;
  const queryKey = ['hashtagFeed', tag] as const;

  const feedQuery = useInfiniteQuery({
    queryKey,
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await hashtagAPI.getFeed(tag, { limit: 30, cursor: pageParam });
      return res.data.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    retry: (failureCount, error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });

  const hashtag = feedQuery.data?.pages[0]?.hashtag ?? null;
  const posts = useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page.posts) ?? [],
    [feedQuery.data]
  );
  const notFound =
    feedQuery.isError &&
    (feedQuery.error as { response?: { status?: number } })?.response?.status === 404;

  const patchPost = (postId: string, patch: Partial<FeedPost>) => {
    queryClient.setQueryData<{
      pages: { hashtag: typeof hashtag; posts: FeedPost[]; nextCursor: string | null }[];
      pageParams: unknown[];
    }>(queryKey, (old) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          posts: page.posts.map((post) =>
            post.id === postId ? { ...post, ...patch } : post
          ),
        })),
      };
    });
  };

  const removePost = (postId: string) => {
    queryClient.setQueryData<{
      pages: { hashtag: typeof hashtag; posts: FeedPost[]; nextCursor: string | null }[];
      pageParams: unknown[];
    }>(queryKey, (old) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          posts: page.posts.filter((post) => post.id !== postId),
        })),
      };
    });
  };

  const viewerPost = viewerIndex !== null ? posts[viewerIndex] : null;
  const viewerIsOwner = Boolean(
    viewerPost && selectedProfile?._id && viewerPost.author.profileId === selectedProfile._id
  );

  return (
    <MainLayout>
      <div className="space-y-4 pb-6">
        <div className={cn(pageStickyHeaderClass, 'flex items-center gap-2')}>
          <button
            type="button"
            onClick={() => router.back()}
            className={headerBackBtnClass}
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Hash className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-foreground">
                {hashtag ? `#${hashtag.name}` : `#${tag}`}
              </p>
              {hashtag ? (
                <p className="truncate text-[11px] text-muted-foreground">
                  {formatPostCount(hashtag.postCount)}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <PullToRefresh
          onRefresh={async () => {
            await feedQuery.refetch();
          }}
          disabled={Boolean(activePost) || viewerIndex !== null}
        >
        {feedQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : notFound ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            This hashtag hasn&apos;t been used yet.
          </p>
        ) : posts.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No posts with #{tag} yet.
          </p>
        ) : (
          <>
            <HashtagPostGrid posts={posts} onOpen={(index) => setViewerIndex(index)} />
            {feedQuery.hasNextPage ? (
              <button
                type="button"
                className="mx-auto block rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-foreground"
                disabled={feedQuery.isFetchingNextPage}
                onClick={() => void feedQuery.fetchNextPage()}
              >
                {feedQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            ) : null}
          </>
        )}
        </PullToRefresh>
      </div>

      <ProfilePostViewer
        open={viewerIndex !== null}
        posts={posts}
        startIndex={viewerIndex ?? 0}
        isOwner={viewerIsOwner}
        likingId={likingId}
        repostingId={repostingId}
        onClose={() => setViewerIndex(null)}
        onToggleLike={async (postId) => {
          setLikingId(postId);
          try {
            const res = await feedAPI.toggleLike(postId);
            patchPost(postId, {
              likedByMe: res.data.data.likedByMe,
              likeCount: res.data.data.likeCount,
            });
          } finally {
            setLikingId(null);
          }
        }}
        onToggleRepost={async (postId) => {
          setRepostingId(postId);
          try {
            const res = await feedAPI.toggleRepost(postId);
            patchPost(postId, {
              repostedByMe: res.data.data.reposted,
              repostCount: res.data.data.repostCount,
            });
          } finally {
            setRepostingId(null);
          }
        }}
        onOpenComments={setActivePost}
        onEdit={async (target, caption, extras) => {
          const res = await feedAPI.updatePost(target.id, caption, extras);
          patchPost(target.id, res.data.data.post);
        }}
        onDelete={async (target) => {
          await feedAPI.deletePost(target.id);
          removePost(target.id);
          if (activePost?.id === target.id) setActivePost(null);
          if (posts.length <= 1) setViewerIndex(null);
        }}
        onLeaveSpark={async (target) => {
          if (!selectedProfile?._id) return;
          const res = await feedAPI.removeCollaborator(target.id, selectedProfile._id);
          patchPost(target.id, res.data.data.post);
        }}
      />

      {activePost ? (
        <FeedCommentsSheet open post={activePost} onClose={() => setActivePost(null)} />
      ) : null}
    </MainLayout>
  );
}
