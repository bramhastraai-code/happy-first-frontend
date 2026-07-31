'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { followAPI, type FollowPerson } from '@/lib/api/follow';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { FollowButton } from '@/components/feed/FollowButton';

const CHUNK_SIZE = 5;
const TOTAL_SUGGESTIONS = 15;

interface FeedSuggestedPeopleProps {
  /** Which slice of suggestions to show, so repeated blocks in the feed show different people. */
  chunkIndex?: number;
}

export function FeedSuggestedPeople({ chunkIndex = 0 }: FeedSuggestedPeopleProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['followSuggestions'],
    queryFn: async () => {
      const res = await followAPI.getSuggestions(TOTAL_SUGGESTIONS);
      return res.data.data.people;
    },
  });

  const all = (data ?? []).filter((person) => !person.isMe);
  const people = all
    .slice(chunkIndex * CHUNK_SIZE, chunkIndex * CHUNK_SIZE + CHUNK_SIZE)
    .filter((person) => !dismissed.has(person.profileId));

  if (isLoading || people.length === 0) return null;

  const dismiss = (profileId: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(profileId);
      return next;
    });
  };

  return (
    <section className="border-b border-border/60 py-3 sm:rounded-2xl sm:border sm:border-border sm:bg-surface sm:p-4 sm:shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center justify-between gap-2 px-3 sm:px-0">
        <p className="text-sm font-semibold text-foreground">Suggested for you</p>
        <Link
          href="/feed/explore"
          className="text-xs font-semibold text-primary hover:underline"
        >
          See all
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto px-3 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-0">
        {people.map((person) => (
          <SuggestedPersonCard
            key={person.profileId}
            person={person}
            onDismiss={() => dismiss(person.profileId)}
          />
        ))}
      </div>
    </section>
  );
}

function SuggestedPersonCard({
  person,
  onDismiss,
}: {
  person: FollowPerson;
  onDismiss: () => void;
}) {
  return (
    <div className="relative flex w-40 shrink-0 flex-col items-center rounded-xl border border-border bg-surface px-3 pb-3 pt-7 text-center sm:bg-background/40">
      <button
        type="button"
        onClick={onDismiss}
        aria-label={`Dismiss ${person.name}`}
        className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <Link
        href={`/feed/profile/${person.profileId}`}
        className="flex w-full min-w-0 flex-col items-center"
      >
        <ProfileAvatar
          name={person.name}
          avatarUrl={person.avatarUrl}
          avatarSeed={person.avatarSeed}
          avatarStyle={person.avatarStyle}
          size="xl"
          className="h-16 w-16"
        />
        <p className="mt-2.5 line-clamp-2 min-h-10 w-full break-words text-sm font-semibold leading-5 text-foreground">
          {person.name}
        </p>
      </Link>
      <FollowButton
        profileId={person.profileId}
        isFollowing={person.isFollowing}
        followsYou={person.followsYou}
        isMe={person.isMe}
        size="sm"
        className="mt-1.5 w-full"
      />
    </div>
  );
}
