'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Search, X } from 'lucide-react';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { FeedCommentsSheet } from '@/components/feed/FeedCommentsSheet';
import { FeedEmpty } from '@/components/feed/FeedEmpty';
import { FeedCreateSheet } from '@/components/feed/FeedCreateSheet';
import { feedAPI, type FeedPost } from '@/lib/api/feed';
import { useAuthStore } from '@/lib/store/authStore';
import { useFeedRealtime } from '@/lib/hooks/useFeedRealtime';
import { Button } from '@/components/ui/button';

interface CommunityFeedTabProps {
  communityId: string;
  /** Discover visitors: browse only (no post / like / comment) */
  readOnly?: boolean;
}

type FeedPages = {
  pages: { posts: FeedPost[]; nextCursor: string | null }[];
  pageParams: unknown[];
};

export function CommunityFeedTab({ communityId, readOnly = false }: CommunityFeedTabProps) {
  const { selectedProfile, user, accessToken, isHydrated } = useAuthStore();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activePost, setActivePost] = useState<FeedPost | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQ(searchInput.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const enabled = isHydrated && !!accessToken && !!selectedProfile?._id && !!communityId;
  const isSearching = searchQ.length >= 1;
  const feedKey = ['feed', selectedProfile?._id, communityId] as const;
  const searchKey = ['feedSearch', communityId, searchQ, selectedProfile?._id] as const;

  useFeedRealtime(enabled, selectedProfile?._id, communityId);

  const feedQuery = useInfiniteQuery({
    queryKey: feedKey,
    enabled: enabled && !isSearching,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const response = await feedAPI.getFeed({
        limit: 12,
        cursor: pageParam,
        communityId,
      });
      return response.data.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const searchQuery = useInfiniteQuery({
    queryKey: searchKey,
    enabled: enabled && isSearching,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const response = await feedAPI.searchFeed({
        q: searchQ,
        limit: 12,
        cursor: pageParam,
        communityId,
      });
      return response.data.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const activeQuery = isSearching ? searchQuery : feedQuery;

  const likeMutation = useMutation({
    mutationFn: (photoId: string) => feedAPI.toggleLike(photoId),
    onMutate: async (photoId) => {
      setLikingId(photoId);
      const key = isSearching ? searchKey : feedKey;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);

      queryClient.setQueryData<FeedPages>(key, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) => {
              if (post.id !== photoId) return post;
              const likedByMe = !post.likedByMe;
              return {
                ...post,
                likedByMe,
                likeCount: Math.max(0, post.likeCount + (likedByMe ? 1 : -1)),
              };
            }),
          })),
        };
      });

      return { previous, key };
    },
    onError: (_error, _photoId, context) => {
      if (context?.previous && context.key) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: () => {
      setLikingId(null);
    },
  });

  const posts = useMemo(
    () => activeQuery.data?.pages.flatMap((page) => page.posts) ?? [],
    [activeQuery.data]
  );

  const handleToggleLike = useCallback(
    (photoId: string) => {
      if (likeMutation.isPending) return;
      likeMutation.mutate(photoId);
    },
    [likeMutation]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !activeQuery.hasNextPage || activeQuery.isFetchingNextPage) return;

    const onScroll = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 320) {
        void activeQuery.fetchNextPage();
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [activeQuery]);

  if (!isHydrated) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative space-y-3">
      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search posts…"
            className="h-10 w-full rounded-full border-0 bg-secondary pl-10 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring"
            inputMode="search"
            aria-label="Search posts"
          />
          {searchInput ? (
            <button
              type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>
        {!readOnly ? (
          <Button
            size="sm"
            className="h-10 shrink-0 gap-1.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Post
          </Button>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        className="max-h-[min(72vh,720px)] space-y-3 overflow-y-auto pr-0.5 sm:space-y-4"
      >
        {activeQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : activeQuery.isError ? (
          <div className="rounded-xl border border-border bg-surface px-4 py-10 text-center">
            <p className="text-sm font-semibold text-foreground">Couldn&apos;t load feed</p>
            <Button className="mt-4" onClick={() => void activeQuery.refetch()}>
              Try again
            </Button>
          </div>
        ) : posts.length === 0 ? (
          isSearching ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No posts found
            </p>
          ) : (
            <FeedEmpty
              variant="community"
              onCreate={readOnly ? undefined : () => setCreateOpen(true)}
            />
          )
        ) : (
          posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              liking={likingId === post.id}
              hideCommunityLabel
              flush
              interactionsDisabled={readOnly}
              onToggleLike={readOnly ? () => undefined : handleToggleLike}
              onOpenComments={setActivePost}
              isOwner={
                !readOnly &&
                (post.author.profileId === selectedProfile?._id ||
                  post.author.userId === user?._id)
              }
              onEdit={
                readOnly
                  ? undefined
                  : async (target, caption, extras) => {
                      const res = await feedAPI.updatePost(target.id, caption, extras);
                      const updated = res.data.data.post;
                      const key = isSearching ? searchKey : feedKey;
                      queryClient.setQueryData<FeedPages>(key, (old) => {
                        if (!old?.pages) return old;
                        return {
                          ...old,
                          pages: old.pages.map((page) => ({
                            ...page,
                            posts: page.posts.map((item) =>
                              item.id === updated.id ? { ...item, ...updated } : item
                            ),
                          })),
                        };
                      });
                      if (activePost?.id === updated.id) {
                        setActivePost((prev) => (prev ? { ...prev, ...updated } : prev));
                      }
                    }
              }
              onDelete={
                readOnly
                  ? undefined
                  : async (target) => {
                      await feedAPI.deletePost(target.id);
                      const key = isSearching ? searchKey : feedKey;
                      queryClient.setQueryData<FeedPages>(key, (old) => {
                        if (!old?.pages) return old;
                        return {
                          ...old,
                          pages: old.pages.map((page) => ({
                            ...page,
                            posts: page.posts.filter((item) => item.id !== target.id),
                          })),
                        };
                      });
                      if (activePost?.id === target.id) setActivePost(null);
                    }
              }
            />
          ))
        )}

        {activeQuery.isFetchingNextPage ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </div>

      {activePost ? (
        <FeedCommentsSheet
          post={activePost}
          open
          readOnly={readOnly}
          onClose={() => setActivePost(null)}
        />
      ) : null}

      {!readOnly ? (
        <FeedCreateSheet
          open={createOpen}
          communityId={communityId}
          defaultKind="post"
          onClose={() => setCreateOpen(false)}
          onCreated={() => void feedQuery.refetch()}
        />
      ) : null}
    </div>
  );
}
