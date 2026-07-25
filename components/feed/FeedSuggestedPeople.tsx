'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, UserPlus } from 'lucide-react';
import { followAPI } from '@/lib/api/follow';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { FollowButton } from '@/components/feed/FollowButton';
import { cn } from '@/lib/utils';

export function FeedSuggestedPeople() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['followSuggestions'],
    queryFn: async () => {
      const res = await followAPI.getSuggestions(5);
      return res.data.data.people;
    },
  });

  const people = data || [];
  if (isLoading || people.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-surface p-3 sm:p-4 sm:shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Suggested for you</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/feed/explore"
            className="text-xs font-semibold text-primary hover:underline"
          >
            See all
          </Link>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label="Refresh suggestions"
          >
            <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </button>
        </div>
      </div>
      <ul className="space-y-2.5">
        {people.slice(0, 5).map((person) => (
          <li key={person.profileId} className="flex items-center gap-3">
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
                <p className="truncate text-[11px] text-muted-foreground">
                  {person.matchLabel ||
                    (person.followsYou ? 'Follows you' : 'Active in feed')}
                </p>
              </div>
            </Link>
            <FollowButton
              profileId={person.profileId}
              isFollowing={person.isFollowing}
              followsYou={person.followsYou}
              isMe={person.isMe}
              size="sm"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
