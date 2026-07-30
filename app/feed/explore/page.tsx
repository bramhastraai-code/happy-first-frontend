'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Loader2, Search, UserPlus } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { FollowButton } from '@/components/feed/FollowButton';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { headerActionBtnClass } from '@/components/ui/AppPageHeader';
import { followAPI, type FollowPerson } from '@/lib/api/follow';
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

export default function FeedExplorePage() {
  const router = useRouter();
  const { accessToken, isHydrated } = useAuthStore();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

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
    enabled: enabled && debounced.length >= 1,
    queryFn: async () => {
      const res = await followAPI.searchUsers(debounced, 20);
      return res.data.data.people;
    },
  });

  const browsingQuery = useQuery({
    queryKey: ['followSearch', 'browse'],
    enabled: enabled && debounced.length === 0,
    queryFn: async () => {
      const res = await followAPI.searchUsers('', 5);
      return res.data.data.people;
    },
  });
  const isSearching = debounced.length >= 1;
  const list = useMemo(() => {
    if (isSearching) return searchQuery.data || [];
    return browsingQuery.data || [];
  }, [isSearching, searchQuery.data, browsingQuery.data]);

  const suggestions = suggestionsQuery.data || [];
  const listLoading = isSearching ? searchQuery.isLoading : browsingQuery.isLoading;

  return (
    <MainLayout>
      <div className="space-y-4 pb-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className={headerActionBtnClass}
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or phone number…"
              className="h-11 w-full rounded-xl border border-input bg-secondary pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              autoFocus
              inputMode="search"
              aria-label="Search people"
            />
          </label>
        </div>

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

        <p className={cn('px-1 text-center text-[11px] text-muted-foreground')}>
          Tap a name to open their profile · Follow to connect
        </p>
      </div>
    </MainLayout>
  );
}
