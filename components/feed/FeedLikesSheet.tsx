'use client';

import Link from 'next/link';
import { Heart, Loader2, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { feedAPI, type FeedLikePerson } from '@/lib/api/feed';
import { FollowButton } from '@/components/feed/FollowButton';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';

interface FeedLikesSheetProps {
  open: boolean;
  onClose: () => void;
  photoId: string;
}

function PersonRow({ person }: { person: FeedLikePerson }) {
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
          {person.isMe ? (
            <p className="text-[11px] text-muted-foreground">You</p>
          ) : person.followsYou ? (
            <p className="text-[11px] text-muted-foreground">Follows you</p>
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

export function FeedLikesSheet({ open, onClose, photoId }: FeedLikesSheetProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['photoLikes', photoId],
    enabled: open && !!photoId,
    queryFn: async () => {
      const res = await feedAPI.getLikes(photoId);
      return res.data.data.people;
    },
  });

  if (!open) return null;

  const people = data || [];

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
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 fill-primary text-primary" />
            <p className="text-sm font-semibold text-foreground">Likes</p>
            {people.length > 0 ? (
              <span className="text-xs text-muted-foreground">{people.length}</span>
            ) : null}
          </div>
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
              <p className="text-sm text-muted-foreground">Couldn&apos;t load likes</p>
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
              No likes yet
            </p>
          ) : (
            people.map((person) => <PersonRow key={person.profileId} person={person} />)
          )}
        </div>
      </div>
    </div>
  );
}
