'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, UserMinus, UserPlus } from 'lucide-react';
import {
  followAPI,
  type FollowActionResult,
  type FollowPerson,
  type PublicProfileData,
} from '@/lib/api/follow';
import { dailyMoodInvalidationKeys } from '@/lib/api/dailyMood';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  profileId: string;
  isFollowing: boolean;
  followsYou?: boolean;
  isMe?: boolean;
  size?: 'sm' | 'default';
  className?: string;
  onChanged?: (result: FollowActionResult) => void;
}

function patchPersonList<T extends { people?: FollowPerson[] } | FollowPerson[] | undefined>(
  old: T,
  profileId: string,
  isFollowing: boolean
): T {
  if (!old) return old;
  if (Array.isArray(old)) {
    return old.map((person) =>
      person.profileId === profileId ? { ...person, isFollowing } : person
    ) as T;
  }
  if (old.people) {
    return {
      ...old,
      people: old.people.map((person) =>
        person.profileId === profileId ? { ...person, isFollowing } : person
      ),
    };
  }
  return old;
}

export function FollowButton({
  profileId,
  isFollowing,
  followsYou = false,
  isMe = false,
  size = 'default',
  className,
  onChanged,
}: FollowButtonProps) {
  const queryClient = useQueryClient();
  const [following, setFollowing] = useState(isFollowing);

  useEffect(() => {
    setFollowing(isFollowing);
  }, [isFollowing, profileId]);

  const mutation = useMutation({
    mutationFn: async (nextFollowing: boolean) => {
      if (nextFollowing) {
        const res = await followAPI.follow(profileId);
        return res.data.data;
      }
      const res = await followAPI.unfollow(profileId);
      return res.data.data;
    },
    onMutate: (nextFollowing) => {
      const previous = following;
      setFollowing(nextFollowing);
      return { previous };
    },
    onError: (_error, _vars, context) => {
      setFollowing(context?.previous ?? isFollowing);
    },
    onSuccess: (result) => {
      setFollowing(result.isFollowing);
      onChanged?.(result);

      queryClient.setQueryData<PublicProfileData>(['publicProfile', profileId], (old) => {
        if (!old) return old;
        return {
          ...old,
          isFollowing: result.isFollowing,
          followsYou: result.followsYou,
          followersCount: result.followersCount ?? old.followersCount,
          followingCount: result.followingCount ?? old.followingCount,
          profile: {
            ...old.profile,
            isFollowing: result.isFollowing,
            followsYou: result.followsYou,
          },
        };
      });

      queryClient.setQueriesData({ queryKey: ['followers'] }, (old) =>
        patchPersonList(old as { people?: FollowPerson[] } | FollowPerson[] | undefined, profileId, result.isFollowing)
      );
      queryClient.setQueriesData({ queryKey: ['following'] }, (old) =>
        patchPersonList(old as { people?: FollowPerson[] } | FollowPerson[] | undefined, profileId, result.isFollowing)
      );
      queryClient.setQueriesData({ queryKey: ['followSuggestions'] }, (old) =>
        patchPersonList(old as FollowPerson[] | undefined, profileId, result.isFollowing)
      );
      queryClient.setQueriesData({ queryKey: ['followSearch'] }, (old) =>
        patchPersonList(old as { people?: FollowPerson[] } | undefined, profileId, result.isFollowing)
      );

      void queryClient.invalidateQueries({ queryKey: ['publicProfile', profileId] });
      void queryClient.invalidateQueries({ queryKey: ['followers'] });
      void queryClient.invalidateQueries({ queryKey: ['following'] });
      void queryClient.invalidateQueries({ queryKey: ['followSuggestions'] });
      void queryClient.invalidateQueries({ queryKey: ['followSearch'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      for (const key of dailyMoodInvalidationKeys(profileId)) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
      queryClient.setQueriesData<{
        pages?: Array<{ posts: Array<{ author: { profileId: string; isFollowing?: boolean } }> }>;
      }>({ queryKey: ['feed'] }, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) =>
              post.author.profileId === profileId
                ? {
                    ...post,
                    author: { ...post.author, isFollowing: result.isFollowing },
                  }
                : post
            ),
          })),
        };
      });
    },
  });

  if (isMe) return null;

  const label = following ? 'Following' : followsYou ? 'Follow back' : 'Follow';

  return (
    <Button
      type="button"
      size={size}
      disabled={mutation.isPending}
      variant={following ? 'outline' : 'default'}
      className={cn(
        following ? 'border-border text-foreground' : '',
        size === 'sm' ? 'h-8 px-3 text-xs' : '',
        className
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        mutation.mutate(!following);
      }}
    >
      {mutation.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : following ? (
        <UserMinus className="h-3.5 w-3.5" />
      ) : (
        <UserPlus className="h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  );
}
