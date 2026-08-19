'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, UserMinus, UserPlus } from 'lucide-react';
import { followAPI, type FollowActionResult } from '@/lib/api/follow';
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
  /** Public profile uses Connect instead of Follow. */
  verb?: 'follow' | 'connect';
}

export function FollowButton({
  profileId,
  isFollowing,
  followsYou = false,
  isMe = false,
  size = 'default',
  className,
  onChanged,
  verb = 'follow',
}: FollowButtonProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        const res = await followAPI.unfollow(profileId);
        return res.data.data;
      }
      const res = await followAPI.follow(profileId);
      return res.data.data;
    },
    onSuccess: (result) => {
      onChanged?.(result);
      void queryClient.invalidateQueries({ queryKey: ['publicProfile', profileId] });
      void queryClient.invalidateQueries({ queryKey: ['followers'] });
      void queryClient.invalidateQueries({ queryKey: ['following'] });
      void queryClient.invalidateQueries({ queryKey: ['followSuggestions'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.setQueriesData<{ pages?: Array<{ posts: Array<{ author: { profileId: string; isFollowing?: boolean } }> }> }>(
        { queryKey: ['feed'] },
        (old) => {
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
        }
      );
    },
  });

  if (isMe) return null;

  const label =
    verb === 'connect'
      ? isFollowing
        ? 'Connected'
        : followsYou
          ? 'Connect back'
          : 'Connect'
      : isFollowing
        ? 'Following'
        : followsYou
          ? 'Follow back'
          : 'Follow';

  return (
    <Button
      type="button"
      size={size}
      disabled={mutation.isPending}
      variant={isFollowing ? 'outline' : 'default'}
      className={cn(
        isFollowing ? 'border-border text-foreground' : '',
        size === 'sm' ? 'h-8 px-3 text-xs' : '',
        className
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        mutation.mutate();
      }}
    >
      {mutation.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isFollowing ? (
        <UserMinus className="h-3.5 w-3.5" />
      ) : (
        <UserPlus className="h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  );
}
