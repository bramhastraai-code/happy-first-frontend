'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ChevronLeft, Loader2, Search, UserPlus } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { FollowButton } from '@/components/feed/FollowButton';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { FeedCommentsSheet } from '@/components/feed/FeedCommentsSheet';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { headerBackBtnClass } from '@/components/ui/AppPageHeader';
import { followAPI, type FollowPerson } from '@/lib/api/follow';
import { feedAPI, type FeedPost } from '@/lib/api/feed';
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

export default function FeedExplorePage() {
  const router = useRouter();
  const { accessToken, isHydrated, selectedProfile, user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [tab, setTab] = useState<SearchTab>('people');
  const [activePost, setActivePost] = useState<FeedPost | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  const enabled = isHydrated && !!accessToken;

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
    enabled: enabled && debounced.length >= 1 && tab === 'people',
    queryFn: async () => {
      const res = await followAPI.searchUsers(debounced, 20);
      return res.data.data.people;
    },
  });

  const browsingQuery = useQuery({
    queryKey: ['followSearch', 'browse'],
    enabled: enabled && debounced.length === 0 && tab === 'people',
    queryFn: async () => {
      const res = await followAPI.searchUsers('', 5);
      return res.data.data.people;
    },
  });

  const postsSearchQuery = useInfiniteQuery({
    queryKey: ['feedSearch', debounced, selectedProfile?._id],
    enabled: enabled && debounced.length >= 1 && tab === 'posts',
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await feedAPI.searchFeed({
        q: debounced,
        limit: 12,
        cursor: pageParam,
      });
      return res.data.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const isSearching = debounced.length >= 1;
  const list = useMemo(() => {
    if (isSearching) return searchQuery.data || [];
    return browsingQuery.data || [];
  }, [isSearching, searchQuery.data, browsingQuery.data]);

  const suggestions = suggestionsQuery.data || [];
  const listLoading = isSearching ? searchQuery.isLoading : browsingQuery.isLoading;
  const posts = useMemo(
    () => postsSearchQuery.data?.pages.flatMap((page) => page.posts) ?? [],
    [postsSearchQuery.data]
  );

  return (
    <MainLayout>
      <div className="space-y-4 pb-6">
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
                  ? 'Search posts, #hashtags, places…'
                  : 'Search by name or phone number…'
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
              <p className="px-1 py-10 text-center text-sm text-muted-foreground">
                Search keywords, hashtags, activities, communities, or places
              </p>
            ) : postsSearchQuery.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : posts.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No posts found for “{debounced}”
              </p>
            ) : (
              <>
                {posts.map((post) => (
                  <FeedPostCard
                    key={post.id}
                    post={post}
                    onToggleLike={async (photoId) => {
                      setLikingId(photoId);
                      try {
                        await feedAPI.toggleLike(photoId);
                        void postsSearchQuery.refetch();
                      } finally {
                        setLikingId(null);
                      }
                    }}
                    onOpenComments={setActivePost}
                    liking={likingId === post.id}
                    isOwner={post.author.profileId === selectedProfile?._id}
                    canMessage={Boolean(
                      post.author.userId && post.author.userId !== user?._id
                    )}
                  />
                ))}
                {postsSearchQuery.hasNextPage ? (
                  <button
                    type="button"
                    className="mx-auto block rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-foreground"
                    disabled={postsSearchQuery.isFetchingNextPage}
                    onClick={() => void postsSearchQuery.fetchNextPage()}
                  >
                    {postsSearchQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </button>
                ) : null}
              </>
            )}
          </section>
        )}

        <p className={cn('px-1 text-center text-[11px] text-muted-foreground')}>
          {tab === 'posts'
            ? 'Search is server-side and paginated across the feed'
            : 'Tap a name to open their profile · Follow to connect'}
        </p>
      </div>

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
