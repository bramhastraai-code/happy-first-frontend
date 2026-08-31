'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Copy, Loader2, Play, Search, UserPlus } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { FollowButton } from '@/components/feed/FollowButton';
import { FeedCommentsSheet } from '@/components/feed/FeedCommentsSheet';
import { ProfilePostViewer } from '@/components/feed/ProfilePostViewer';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { headerBackBtnClass, pageStickyHeaderClass } from '@/components/ui/AppPageHeader';
import { followAPI, type FollowPerson } from '@/lib/api/follow';
import { feedAPI, type FeedPost } from '@/lib/api/feed';
import { resolveMediaUrl } from '@/lib/utils/resolveMediaUrl';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';

function PersonRow({ person }: { person: FollowPerson }) {
  const subtitle =
    person.matchLabel ||
    (person.followsYou ? 'Follows you' : 'Tap to view profile');

  return (
    <div className="flex items-center gap-3 px-1 py-2.5">
      <Link
        href={`/feed/profile/${person.profileId}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <ProfileAvatar
          name={person.name}
          avatarUrl={person.avatarUrl}
          avatarSeed={person.avatarSeed}
          avatarStyle={person.avatarStyle}
          size="md"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{person.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </Link>
      <FollowButton
        profileId={person.profileId}
        isFollowing={person.isFollowing}
        followsYou={person.followsYou}
        isMe={person.isMe}
        size="sm"
      />
    </div>
  );
}

type SearchTab = 'people' | 'posts';

function ExplorePostGrid({
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
            className={cn(
              'relative aspect-square overflow-hidden bg-neutral-900',
              'sm:rounded-lg'
            )}
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

export default function FeedExplorePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken, isHydrated, selectedProfile } = useAuthStore();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [tab, setTab] = useState<SearchTab>('people');
  const [activePost, setActivePost] = useState<FeedPost | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [repostingId, setRepostingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  const enabled = isHydrated && !!accessToken;
  const isSearching = debounced.length >= 1;

  const suggestionsQuery = useQuery({
    queryKey: ['followSuggestions', 'explore'],
    enabled,
    queryFn: async () => {
      const res = await followAPI.getSuggestions(5);
      return res.data.data.people;
    },
  });

  const searchQuery = useQuery({
    queryKey: ['followSearch', debounced],
    enabled: enabled && isSearching && tab === 'people',
    queryFn: async () => {
      const res = await followAPI.searchUsers(debounced, 20);
      return res.data.data.people;
    },
  });

  const browsingQuery = useQuery({
    queryKey: ['followSearch', 'browse'],
    enabled: enabled && !isSearching && tab === 'people',
    queryFn: async () => {
      const res = await followAPI.searchUsers('', 5);
      return res.data.data.people;
    },
  });

  const explorePostsQuery = useInfiniteQuery({
    queryKey: ['feedExplore', selectedProfile?._id],
    enabled: enabled && tab === 'posts' && !isSearching,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await feedAPI.getExploreFeed({
        limit: 30,
        cursor: pageParam,
      });
      return res.data.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const postsSearchQuery = useInfiniteQuery({
    queryKey: ['feedSearch', debounced, selectedProfile?._id],
    enabled: enabled && isSearching && tab === 'posts',
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await feedAPI.searchFeed({
        q: debounced,
        limit: 30,
        cursor: pageParam,
      });
      return res.data.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const list = useMemo(() => {
    if (isSearching) return searchQuery.data || [];
    return browsingQuery.data || [];
  }, [isSearching, searchQuery.data, browsingQuery.data]);

  const suggestions = suggestionsQuery.data || [];
  const listLoading = isSearching ? searchQuery.isLoading : browsingQuery.isLoading;

  const activePostsQuery = isSearching ? postsSearchQuery : explorePostsQuery;
  const posts = useMemo(
    () => activePostsQuery.data?.pages.flatMap((page) => page.posts) ?? [],
    [activePostsQuery.data]
  );

  const patchPost = (postId: string, patch: Partial<FeedPost>) => {
    const keys = [
      ['feedExplore', selectedProfile?._id],
      ['feedSearch', debounced, selectedProfile?._id],
    ] as const;
    keys.forEach((key) => {
      queryClient.setQueryData<{
        pages: { posts: FeedPost[]; nextCursor: string | null }[];
        pageParams: unknown[];
      }>(key, (old) => {
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
    });
  };

  const removePost = (postId: string) => {
    const keys = [
      ['feedExplore', selectedProfile?._id],
      ['feedSearch', debounced, selectedProfile?._id],
    ] as const;
    keys.forEach((key) => {
      queryClient.setQueryData<{
        pages: { posts: FeedPost[]; nextCursor: string | null }[];
        pageParams: unknown[];
      }>(key, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.filter((post) => post.id !== postId),
          })),
        };
      });
    });
  };

  const viewerPost = viewerIndex !== null ? posts[viewerIndex] : null;
  const viewerIsOwner = Boolean(
    viewerPost && selectedProfile?._id && viewerPost.author.profileId === selectedProfile._id
  );

  return (
    <MainLayout>
      <div className="space-y-4 pb-6">
        <div className={cn(pageStickyHeaderClass, 'space-y-3')}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className={headerBackBtnClass}
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                tab === 'posts'
                  ? 'Search posts'
                  : 'Search people'
              }
              className="h-11 w-full rounded-xl border border-input bg-secondary pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              autoFocus
              inputMode="search"
              aria-label={tab === 'posts' ? 'Search posts' : 'Search people'}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
          {(
            [
              { id: 'people', label: 'People' },
              { id: 'posts', label: 'Posts' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'rounded-xl py-2 text-sm font-semibold transition-colors',
                tab === item.id
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
            </button>
            ))}
          </div>
        </div>

        {tab === 'people' ? (
          <>
            {!isSearching ? (
              <section className="rounded-2xl border border-border bg-surface p-3 sm:p-4 sm:shadow-[var(--shadow-card)]">
                <div className="mb-2 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Suggested for you</h2>
                </div>
                {suggestionsQuery.isLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : suggestions.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No suggestions right now. Try searching a name or phone number.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {suggestions.map((person) => (
                      <li key={person.profileId}>
                        <PersonRow person={person} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            <section className="rounded-2xl border border-border bg-surface p-3 sm:p-4 sm:shadow-[var(--shadow-card)]">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {isSearching ? 'Search results' : 'People to follow'}
                </h2>
                <span className="text-[11px] text-muted-foreground">{list.length}</span>
              </div>

              {listLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : list.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {isSearching ? `No users found for “${debounced}”` : 'No users to show yet'}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {list.map((person) => (
                    <li key={person.profileId}>
                      <PersonRow person={person} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          <section className="space-y-3">
            {!isSearching ? (
              <div className="px-1">
                <h2 className="text-sm font-semibold text-foreground">Suggested posts</h2>
              </div>
            ) : null}

            {activePostsQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : posts.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {isSearching
                  ? `No posts found for “${debounced}”`
                  : 'No posts to explore yet'}
              </p>
            ) : (
              <>
                <ExplorePostGrid
                  posts={posts}
                  onOpen={(index) => setViewerIndex(index)}
                />
                {activePostsQuery.hasNextPage ? (
                  <button
                    type="button"
                    className="mx-auto block rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-foreground"
                    disabled={activePostsQuery.isFetchingNextPage}
                    onClick={() => void activePostsQuery.fetchNextPage()}
                  >
                    {activePostsQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </button>
                ) : null}
              </>
            )}
          </section>
        )}
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
      />

      {activePost ? (
        <FeedCommentsSheet
          open
          post={activePost}
          onClose={() => setActivePost(null)}
        />
      ) : null}
    </MainLayout>
  );
}
