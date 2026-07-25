'use client';

import Link from 'next/link';
import { Loader2, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { followAPI, type FollowPerson } from '@/lib/api/follow';
import { FollowButton } from '@/components/feed/FollowButton';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';

interface FollowListSheetProps {
  open: boolean;
  onClose: () => void;
  profileId: string;
  mode: 'followers' | 'following';
  title?: string;
}

function PersonRow({ person }: { person: FollowPerson }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
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
          {person.followsYou && !person.isMe ? (
            <p className="text-[11px] text-muted-foreground">Follows you</p>
          ) : person.isMe ? (
            <p className="text-[11px] text-muted-foreground">You</p>
          ) : null}
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

export function FollowListSheet({
  open,
  onClose,
  profileId,
  mode,
  title,
}: FollowListSheetProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [mode, profileId],
    enabled: open && !!profileId,
    queryFn: async () => {
      const res =
        mode === 'followers'
          ? await followAPI.getFollowers(profileId, { limit: 60 })
          : await followAPI.getFollowing(profileId, { limit: 60 });
      return res.data.data;
    },
  });

  if (!open) return null;

  const people = data?.people || [];
  const heading = title || (mode === 'followers' ? 'Followers' : 'Following');

  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[var(--shadow-float)] sm:mx-4 sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{heading}</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto py-1">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-muted-foreground">Couldn&apos;t load list</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="mt-3 text-sm font-semibold text-primary"
              >
                Try again
              </button>
            </div>
          ) : people.length === 0 ? (
            <p className="px-4 py-14 text-center text-sm text-muted-foreground">
              {mode === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
            </p>
          ) : (
            people.map((person) => <PersonRow key={person.profileId} person={person} />)
          )}
        </div>
      </div>
    </div>
  );
}
