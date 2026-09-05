'use client';

import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { FeedTopBar } from '@/components/feed/FeedTopBar';
import { FeedStories } from '@/components/feed/FeedStories';
import { FeedPostCard, type FeedPostEditExtras } from '@/components/feed/FeedPostCard';
import { FeedCommentsSheet } from '@/components/feed/FeedCommentsSheet';
import { FeedEmpty } from '@/components/feed/FeedEmpty';
import { FeedMessagesPanel } from '@/components/feed/FeedMessagesPanel';
import { FeedCreateSheet } from '@/components/feed/FeedCreateSheet';
import { StoryViewer } from '@/components/feed/StoryViewer';
import { FeedSuggestedPeople } from '@/components/feed/FeedSuggestedPeople';
import { ProfilePostViewer } from '@/components/feed/ProfilePostViewer';
import { feedAPI, type FeedPost } from '@/lib/api/feed';
import { followAPI } from '@/lib/api/follow';
import { useAuthStore } from '@/lib/store/authStore';
import { useFeedRealtime } from '@/lib/hooks/useFeedRealtime';
import { Button } from '@/components/ui/button';
import GuidedTour from '@/components/ui/GuidedTour';
import TourStartButton from '@/components/ui/TourStartButton';
import { PageFabColumn, pageFabCircleClass } from '@/components/ui/PageFabColumn';
import { PullToRefresh } from '@/components/ui/PullToRefresh';
import { usePageTour } from '@/lib/hooks/usePageTour';
import { feedTourSteps } from '@/lib/utils/tourSteps';
import { pageStickyHeaderClass } from '@/components/ui/AppPageHeader';
import { cn } from '@/lib/utils';

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <LoadingScreen fullScreen label="Loading feed…" />
        </MainLayout>
      }
    >
      <FeedPageContent />
    </Suspense>
  );
}

function FeedPageContent() {
  const { accessToken, isHydrated, selectedProfile, user } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkPostId = searchParams.get('post');
  const deepLinkDm = searchParams.get('dm');
  const [activePost, setActivePost] = useState<FeedPost | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [repostingId, setRepostingId] = useState<string | null>(null);
  const [authorViewer, setAuthorViewer] = useState<{
    profileId: string;
    startPostId: string;
  } | null>(null);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<'post' | 'story'>('post');
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyStartIndex, setStoryStartIndex] = useState(0);
  const [messageTarget, setMessageTarget] = useState<{
    userId: string;
    profileId?: string;
    name?: string;
    avatarUrl?: string | null;
    avatarSeed?: string | null;
    avatarStyle?: string | null;
  } | null>(null);
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);
  const { runTour, isMounted, handleStartTour, handleTourFinish } = usePageTour('tourCompleted:feed');

  const enabled = isHydrated && !!accessToken && !!selectedProfile?._id;
  useFeedRealtime(enabled, selectedProfile?._id);

  type FeedPageParam = { cursor?: string; feedSessionId?: string } | undefined;
  /** Set right before a pull-to-refresh triggers page 1's refetch; read once, then cleared. */
  const pullRefreshRef = useRef(false);

  const feedQuery = useInfiniteQuery({
    queryKey: ['feed', selectedProfile?._id],
    enabled,
    initialPageParam: undefined as FeedPageParam,
    queryFn: async ({ pageParam }) => {
      const isRefresh = !pageParam && pullRefreshRef.current;
      pullRefreshRef.current = false;
      const response = await feedAPI.getFeed({
        limit: 12,
        cursor: pageParam?.cursor,
        feedSessionId: pageParam?.feedSessionId,
        refresh: isRefresh || undefined,
      });
      return response.data.data;
    },
    getNextPageParam: (lastPage): FeedPageParam =>
      lastPage.nextCursor
        ? { cursor: lastPage.nextCursor, feedSessionId: lastPage.feedSessionId ?? undefined }
        : undefined,
  });

  const storiesQuery = useQuery({
    queryKey: ['feedStories', selectedProfile?._id],
    enabled,
    queryFn: async () => {
      const response = await feedAPI.getStories();
      return response.data.data.stories ?? [];
    },
  });

  const likeMutation = useMutation({
    mutationFn: (photoId: string) => feedAPI.toggleLike(photoId),
    onMutate: async (photoId) => {
      setLikingId(photoId);
      await queryClient.cancelQueries({ queryKey: ['feed', selectedProfile?._id] });
      const previous = queryClient.getQueryData(['feed', selectedProfile?._id]);

      queryClient.setQueryData<{
        pages: { posts: FeedPost[]; nextCursor: string | null }[];
        pageParams: unknown[];
      }>(['feed', selectedProfile?._id], (old) => {
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

      queryClient.setQueriesData<{ posts: FeedPost[]; nextCursor: string | null }>(
        { queryKey: ['profilePosts'] },
        (old) => {
          if (!old?.posts) return old;
          return {
            ...old,
            posts: old.posts.map((post) => {
              if (post.id !== photoId) return post;
              const likedByMe = !post.likedByMe;
              return {
                ...post,
                likedByMe,
                likeCount: Math.max(0, post.likeCount + (likedByMe ? 1 : -1)),
              };
            }),
          };
        }
      );

      return { previous };
    },
    onError: (_error, _photoId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['feed', selectedProfile?._id], context.previous);
      }
    },
    onSettled: () => {
      setLikingId(null);
    },
  });

  const posts = useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page.posts) ?? [],
    [feedQuery.data]
  );

  const deepLinkPostQuery = useQuery({
    queryKey: ['feedPost', deepLinkPostId, selectedProfile?._id],
    enabled: enabled && Boolean(deepLinkPostId),
    queryFn: async () => {
      const res = await feedAPI.getPost(deepLinkPostId!);
      return res.data.data.post;
    },
    retry: false,
  });

  const openPostById = useCallback(
    async (photoId: string) => {
      const found = posts.find((item) => item.id === photoId);
      if (found) {
        setActivePost(found);
        return;
      }
      try {
        const res = await feedAPI.getPost(photoId);
        const post = res.data.data.post;
        if (post) setActivePost(post);
      } catch {
        if (deepLinkPostId !== photoId) {
          router.push(`/feed?post=${encodeURIComponent(photoId)}`);
        }
      }
    },
    [deepLinkPostId, posts, router]
  );

  const authorPostsQuery = useQuery({
    queryKey: ['profilePosts', authorViewer?.profileId],
    enabled: Boolean(authorViewer?.profileId),
    queryFn: async () => {
      const res = await followAPI.getPosts(authorViewer!.profileId, { limit: 36, tab: 'all' });
      return res.data.data;
    },
  });

  const authorViewerPosts = useMemo(() => {
    if (!authorViewer) return [];
    const fetched = authorPostsQuery.data?.posts;
    if (fetched && fetched.length > 0) {
      if (fetched.some((post) => post.id === authorViewer.startPostId)) return fetched;
      const seed = posts.find((post) => post.id === authorViewer.startPostId);
      return seed ? [seed, ...fetched] : fetched;
    }
    const fromFeed: FeedPost[] = [];
    const seen = new Set<string>();
    for (const post of posts) {
      if (post.author.profileId !== authorViewer.profileId || post.isStory) continue;
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      fromFeed.push(post);
    }
    if (!seen.has(authorViewer.startPostId)) {
      const seed = posts.find((post) => post.id === authorViewer.startPostId);
      if (seed) fromFeed.unshift(seed);
    }
    return fromFeed;
  }, [authorViewer, authorPostsQuery.data?.posts, posts]);

  const authorStartIndex = useMemo(() => {
    if (!authorViewer) return 0;
    const index = authorViewerPosts.findIndex((post) => post.id === authorViewer.startPostId);
    return index >= 0 ? index : 0;
  }, [authorViewer, authorViewerPosts]);

  useEffect(() => {
    if (!deepLinkPostId) return;
    const found = posts.find((post) => post.id === deepLinkPostId);
    if (found) {
      setActivePost(found);
      return;
    }
    if (deepLinkPostQuery.data) setActivePost(deepLinkPostQuery.data);
  }, [deepLinkPostId, posts, deepLinkPostQuery.data]);

  useEffect(() => {
    if (!deepLinkDm) return;
    setOpenConversationId(deepLinkDm);
    setMessagesOpen(true);
  }, [deepLinkDm]);

  const stories = storiesQuery.data ?? [];
  const ownStory = useMemo(() => {
    const found =
      stories.find(
        (story) =>
          story.profileId === selectedProfile?._id || story.userId === user?._id
      ) || null;
    if (!found || !selectedProfile) return found;
    return {
      ...found,
      name: found.name || selectedProfile.name,
      avatarUrl: found.avatarUrl ?? selectedProfile.avatarUrl,
      avatarSeed: found.avatarSeed ?? selectedProfile.avatarSeed,
      avatarStyle: found.avatarStyle ?? selectedProfile.avatarStyle,
    };
  }, [stories, selectedProfile, user?._id]);
  const viewerStories = useMemo(() => {
    if (!ownStory) return stories;
    const others = stories.filter((story) => story.profileId !== ownStory.profileId);
    return [ownStory, ...others];
  }, [stories, ownStory]);

  const handleToggleLike = useCallback(
    (photoId: string) => {
      if (likeMutation.isPending) return;
      likeMutation.mutate(photoId);
    },
    [likeMutation]
  );

  const handleMessage = useCallback((post: FeedPost) => {
    if (!post.author.userId) return;
    setMessageTarget({
      userId: post.author.userId,
      profileId: post.author.profileId,
      name: post.author.name,
      avatarUrl: post.author.avatarUrl,
      avatarSeed: post.author.avatarSeed,
      avatarStyle: post.author.avatarStyle,
    });
    setOpenConversationId(null);
    setMessagesOpen(true);
  }, []);

  const handleOpenAuthorPosts = useCallback((post: FeedPost) => {
    if (!post.author.profileId) return;
    setAuthorViewer({ profileId: post.author.profileId, startPostId: post.id });
  }, []);

  const handleEditPost = useCallback(
    async (target: FeedPost, caption: string, extras?: FeedPostEditExtras) => {
      const res = await feedAPI.updatePost(target.id, caption, extras);
      const updated = res.data.data.post;
      queryClient.setQueryData<{
        pages: { posts: FeedPost[]; nextCursor: string | null }[];
        pageParams: unknown[];
      }>(['feed', selectedProfile?._id], (old) => {
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
      queryClient.setQueriesData<{ posts: FeedPost[]; nextCursor: string | null }>(
        { queryKey: ['profilePosts'] },
        (old) => {
          if (!old?.posts) return old;
          return {
            ...old,
            posts: old.posts.map((item) =>
              item.id === updated.id ? { ...item, ...updated } : item
            ),
          };
        }
      );
      if (activePost?.id === updated.id) {
        setActivePost((prev) => (prev ? { ...prev, ...updated } : prev));
      }
    },
    [queryClient, selectedProfile?._id, activePost?.id]
  );

  const handleDeletePost = useCallback(
    async (target: FeedPost) => {
      await feedAPI.deletePost(target.id);
      queryClient.setQueryData<{
        pages: { posts: FeedPost[]; nextCursor: string | null }[];
        pageParams: unknown[];
      }>(['feed', selectedProfile?._id], (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.filter((item) => item.id !== target.id),
          })),
        };
      });
      queryClient.setQueriesData<{ posts: FeedPost[]; nextCursor: string | null }>(
        { queryKey: ['profilePosts'] },
        (old) => {
          if (!old?.posts) return old;
          return {
            ...old,
            posts: old.posts.filter((item) => item.id !== target.id),
          };
        }
      );
      if (activePost?.id === target.id) setActivePost(null);
    },
    [queryClient, selectedProfile?._id, activePost?.id]
  );

  const handleLeaveSpark = useCallback(
    async (target: FeedPost) => {
      if (!selectedProfile?._id) return;
      const res = await feedAPI.removeCollaborator(target.id, selectedProfile._id);
      const updated = res.data.data.post;
      queryClient.setQueryData<{
        pages: { posts: FeedPost[]; nextCursor: string | null }[];
        pageParams: unknown[];
      }>(['feed', selectedProfile._id], (old) => {
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
      queryClient.setQueriesData<{ posts: FeedPost[]; nextCursor: string | null }>(
        { queryKey: ['profilePosts'] },
        (old) => {
          if (!old?.posts) return old;
          return {
            ...old,
            posts: old.posts.filter((item) => item.id !== target.id),
          };
        }
      );
      if (activePost?.id === target.id) {
        setActivePost((prev) => (prev ? { ...prev, ...updated } : prev));
      }
    },
    [queryClient, selectedProfile?._id, activePost?.id]
  );

  const handleToggleRepost = useCallback(
    async (postId: string) => {
      setRepostingId(postId);
      try {
        const res = await feedAPI.toggleRepost(postId);
        const result = res.data.data;
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
        queryClient.setQueriesData<{ posts: FeedPost[]; nextCursor: string | null }>(
          { queryKey: ['profilePosts'] },
          (old) => {
            if (!old?.posts) return old;
            return {
              ...old,
              posts: old.posts.map((item) => {
                if (item.id !== result.photoId && item.repostOf?.id !== result.photoId) {
                  return item;
                }
                return {
                  ...item,
                  repostCount: result.repostCount,
                  repostedByMe: result.reposted,
                };
              }),
            };
          }
        );
        void queryClient.invalidateQueries({ queryKey: ['feed'] });
      } finally {
        setRepostingId(null);
      }
    },
    [queryClient]
  );

  const openCreate = (kind: 'post' | 'story' = 'post') => {
    setCreateKind(kind);
    setCreateOpen(true);
  };

  const overlaysOpen =
    Boolean(authorViewer) ||
    Boolean(activePost) ||
    messagesOpen ||
    createOpen ||
    storyViewerOpen;

  const handleRefresh = useCallback(async () => {
    pullRefreshRef.current = true;
    // resetQueries (not refetch) — a ranked refresh starts a new session and should
    // replace the whole feed, not re-fetch every previously-loaded page in place.
    await Promise.all([
      queryClient.resetQueries({ queryKey: ['feed', selectedProfile?._id], exact: true }),
      storiesQuery.refetch(),
    ]);
  }, [queryClient, selectedProfile?._id, storiesQuery]);

  useEffect(() => {
    if (!feedQuery.hasNextPage || feedQuery.isFetchingNextPage) return;

    const onScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 480;
      if (nearBottom) {
        void feedQuery.fetchNextPage();
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [feedQuery]);

  if (!isHydrated) {
    return (
      <MainLayout>
        <LoadingScreen fullScreen label="Loading feed…" />
      </MainLayout>
    );
  }

  return (
    <MainLayout hideBottomNav={Boolean(authorViewer)}>
      {isMounted ? (
        <GuidedTour run={runTour} onFinish={handleTourFinish} steps={feedTourSteps} />
      ) : null}
      <div className="feed-page w-full">
        <div className={cn('feed-header', pageStickyHeaderClass)}>
          <FeedTopBar
          flush
          onOpenMessages={() => {
            setMessageTarget(null);
            setOpenConversationId(null);
            setMessagesOpen(true);
          }}
          onOpenMessageFromNotification={(conversationId) => {
            setMessageTarget(null);
            setOpenConversationId(conversationId);
            setMessagesOpen(true);
          }}
          onOpenPost={(photoId) => {
            void openPostById(photoId);
          }}
        />
        </div>

        <PullToRefresh onRefresh={handleRefresh} disabled={overlaysOpen}>
        <div className="overflow-x-clip">
        <div className="mt-3 overflow-visible border-b border-border/60 pb-3 sm:mt-4 sm:rounded-2xl sm:border sm:border-border sm:bg-surface sm:p-3 sm:pb-3 sm:pt-4 sm:shadow-[var(--shadow-card)]">
          <FeedStories
            stories={stories}
            ownStory={ownStory}
            onAddStory={() => openCreate('story')}
            onOpenOwnStory={() => {
              setStoryStartIndex(0);
              setStoryViewerOpen(true);
            }}
            onSelect={(_story, index) => {
              // other stories are listed after own in viewerStories
              setStoryStartIndex(ownStory ? index + 1 : index);
              setStoryViewerOpen(true);
            }}
          />
        </div>

        <div className="mt-3 w-full space-y-3 sm:mt-4 sm:space-y-4">
          {feedQuery.isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : feedQuery.isError ? (
            <div className="px-2 py-12 text-center">
              <p className="text-sm font-semibold text-foreground">Couldn&apos;t load feed</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {(feedQuery.error as { response?: { data?: { message?: string } } })?.response?.data
                  ?.message ||
                  (feedQuery.error instanceof Error
                    ? feedQuery.error.message
                    : 'Something went wrong')}
              </p>
              <Button className="mt-4" onClick={() => void feedQuery.refetch()}>
                Try again
              </Button>
            </div>
          ) : posts.length === 0 ? (
            <>
              <FeedSuggestedPeople />
              <FeedEmpty onCreate={() => openCreate('post')} />
            </>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {posts.map((post, index) => (
                <Fragment key={post.id}>
                <FeedPostCard
                  post={post}
                  liking={likingId === post.id}
                  onToggleLike={handleToggleLike}
                  onOpenComments={setActivePost}
                  onOpenPost={handleOpenAuthorPosts}
                  onMessage={handleMessage}
                  canMessage={Boolean(post.author.userId && post.author.userId !== user?._id)}
                  isOwner={
                    post.author.profileId === selectedProfile?._id ||
                    post.author.userId === user?._id
                  }
                  onEdit={handleEditPost}
                  onDelete={handleDeletePost}
                />
                {((index + 1) % 3 === 0 ||
                  (index === posts.length - 1 && posts.length < 3)) && (
                  <FeedSuggestedPeople chunkIndex={Math.floor(index / 3)} />
                )}
                </Fragment>
              ))}
              {feedQuery.isFetchingNextPage && (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </div>
          )}
        </div>
        </div>
        </PullToRefresh>

        {isMounted ? (
          <PageFabColumn>
            <button
              type="button"
              onClick={() => openCreate('post')}
              className={`feed-compose ${pageFabCircleClass}`}
              aria-label="Create post"
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </button>
            <TourStartButton inline onClick={handleStartTour} />
          </PageFabColumn>
        ) : null}
      </div>

      {activePost && (
        <FeedCommentsSheet
          post={activePost}
          open={!!activePost}
          onClose={() => setActivePost(null)}
        />
      )}

      <FeedMessagesPanel
        open={messagesOpen}
        onClose={() => {
          setMessagesOpen(false);
          setMessageTarget(null);
          setOpenConversationId(null);
        }}
        initialConversationId={openConversationId}
        startWithUser={messageTarget}
      />

      <FeedCreateSheet
        open={createOpen}
        defaultKind={createKind}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          void feedQuery.refetch();
          void storiesQuery.refetch();
        }}
      />

      <StoryViewer
        open={storyViewerOpen}
        stories={viewerStories}
        startIndex={storyStartIndex}
        onClose={() => setStoryViewerOpen(false)}
        onDeleted={() => {
          void storiesQuery.refetch();
        }}
      />

      <ProfilePostViewer
        open={authorViewer !== null && authorViewerPosts.length > 0}
        posts={authorViewerPosts}
        startIndex={authorStartIndex}
        isOwner={authorViewer?.profileId === selectedProfile?._id}
        likingId={likingId}
        repostingId={repostingId}
        onClose={() => setAuthorViewer(null)}
        onToggleLike={handleToggleLike}
        onToggleRepost={handleToggleRepost}
        onOpenComments={(post) => setActivePost(post)}
        onEdit={handleEditPost}
        onDelete={handleDeletePost}
        onLeaveSpark={handleLeaveSpark}
      />
    </MainLayout>
  );
}
