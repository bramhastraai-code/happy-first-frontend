'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { FeedTopBar } from '@/components/feed/FeedTopBar';
import { FeedStories } from '@/components/feed/FeedStories';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { FeedCommentsSheet } from '@/components/feed/FeedCommentsSheet';
import { FeedEmpty } from '@/components/feed/FeedEmpty';
import { FeedMessagesPanel } from '@/components/feed/FeedMessagesPanel';
import { FeedCreateSheet } from '@/components/feed/FeedCreateSheet';
import { StoryViewer } from '@/components/feed/StoryViewer';
import { FeedSuggestedPeople } from '@/components/feed/FeedSuggestedPeople';
import { feedAPI, type FeedPost } from '@/lib/api/feed';
import { useAuthStore } from '@/lib/store/authStore';
import { useFeedRealtime } from '@/lib/hooks/useFeedRealtime';
import { Button } from '@/components/ui/button';

export default function FeedPage() {
  const { accessToken, isHydrated, selectedProfile, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activePost, setActivePost] = useState<FeedPost | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<'post' | 'story'>('post');
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyStartIndex, setStoryStartIndex] = useState(0);
  const [messageTarget, setMessageTarget] = useState<{
    userId: string;
    profileId?: string;
    name?: string;
  } | null>(null);
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);

  const enabled = isHydrated && !!accessToken && !!selectedProfile?._id;
  useFeedRealtime(enabled, selectedProfile?._id);

  const feedQuery = useInfiniteQuery({
    queryKey: ['feed', selectedProfile?._id],
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const response = await feedAPI.getFeed({
        limit: 12,
        cursor: pageParam,
      });
      return response.data.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
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
  const stories = storiesQuery.data ?? [];
  const ownStory = useMemo(
    () =>
      stories.find(
        (story) =>
          story.profileId === selectedProfile?._id || story.userId === user?._id
      ) || null,
    [stories, selectedProfile?._id, user?._id]
  );
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
    });
    setOpenConversationId(null);
    setMessagesOpen(true);
  }, []);

  const openCreate = (kind: 'post' | 'story' = 'post') => {
    setCreateKind(kind);
    setCreateOpen(true);
  };

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
    <MainLayout>
      <div className="feed-page relative w-full pb-4">
        <FeedTopBar
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
            const post = posts.find((item) => item.id === photoId);
            if (post) setActivePost(post);
          }}
        />

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
          <FeedSuggestedPeople />
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
            <FeedEmpty onCreate={() => openCreate('post')} />
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {posts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  liking={likingId === post.id}
                  onToggleLike={handleToggleLike}
                  onOpenComments={setActivePost}
                  onMessage={handleMessage}
                  canMessage={Boolean(post.author.userId && post.author.userId !== user?._id)}
                  isOwner={
                    post.author.profileId === selectedProfile?._id ||
                    post.author.userId === user?._id
                  }
                  onEdit={async (target, caption) => {
                    const res = await feedAPI.updatePost(target.id, caption);
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
                            item.id === updated.id
                              ? { ...item, caption: updated.caption }
                              : item
                          ),
                        })),
                      };
                    });
                    if (activePost?.id === updated.id) {
                      setActivePost((prev) =>
                        prev ? { ...prev, caption: updated.caption } : prev
                      );
                    }
                  }}
                  onDelete={async (target) => {
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
                    if (activePost?.id === target.id) setActivePost(null);
                  }}
                />
              ))}
              {feedQuery.isFetchingNextPage && (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => openCreate('post')}
          className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-float)] transition-transform active:scale-95 sm:right-8"
          aria-label="Create post"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </button>
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
    </MainLayout>
  );
}
