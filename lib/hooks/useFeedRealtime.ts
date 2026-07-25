'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAppSocket } from '@/lib/realtime/socketClient';
import type { FeedPost } from '@/lib/api/feed';
import type { AppNotification } from '@/lib/api/notifications';
import type { FeedChatMessage } from '@/lib/api/messages';

type FeedPages = {
  pages: { posts: FeedPost[]; nextCursor: string | null }[];
  pageParams: unknown[];
};

export function useFeedRealtime(enabled: boolean, profileId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const run = async () => {
      const socket = await getAppSocket();
      if (!active) return;

      socket.emit('feed:join');

      const onNewPost = (payload: { post: FeedPost }) => {
        queryClient.setQueryData<FeedPages>(['feed', profileId], (old) => {
          if (!old?.pages?.length) return old;
          const exists = old.pages.some((p) => p.posts.some((post) => post.id === payload.post.id));
          if (exists) return old;
          const [first, ...rest] = old.pages;
          return {
            ...old,
            pages: [{ ...first, posts: [payload.post, ...first.posts] }, ...rest],
          };
        });
        void queryClient.invalidateQueries({ queryKey: ['feedStories'] });
      };

      const onLike = (payload: {
        photoId: string;
        likeCount: number;
        likedByMe?: boolean;
        actorProfileId?: string;
      }) => {
        queryClient.setQueryData<FeedPages>(['feed', profileId], (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((post) => {
                if (post.id !== payload.photoId) return post;
                return {
                  ...post,
                  likeCount: payload.likeCount,
                  likedByMe:
                    payload.actorProfileId && payload.actorProfileId === profileId
                      ? Boolean(payload.likedByMe)
                      : post.likedByMe,
                };
              }),
            })),
          };
        });
      };

      const onComment = (payload: {
        photoId: string;
        commentCount: number;
        comment: unknown;
      }) => {
        queryClient.setQueryData<FeedPages>(['feed', profileId], (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((post) =>
                post.id === payload.photoId
                  ? { ...post, commentCount: payload.commentCount }
                  : post
              ),
            })),
          };
        });
        void queryClient.invalidateQueries({ queryKey: ['feedComments', payload.photoId] });
      };

      const onNotification = (notification: AppNotification) => {
        queryClient.setQueryData<{ notifications: AppNotification[]; unread: number }>(
          ['notifications'],
          (old) => {
            if (!old) {
              return { notifications: [notification], unread: 1 };
            }
            return {
              notifications: [notification, ...old.notifications],
              unread: old.unread + 1,
            };
          }
        );
      };

      const onNewStory = () => {
        void queryClient.invalidateQueries({ queryKey: ['feedStories'] });
      };

      const onDm = (message: FeedChatMessage) => {
        queryClient.setQueryData<FeedChatMessage[]>(
          ['messages', message.conversationId],
          (old) => {
            if (!old) return [message];
            if (old.some((m) => m.id === message.id)) return old;
            return [...old, message];
          }
        );
        void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      };

      socket.on('feed:new_story', onNewStory);
      socket.on('feed:new_post', onNewPost);
      socket.on('feed:like_updated', onLike);
      socket.on('feed:comment_added', onComment);
      socket.on('notification:new', onNotification);
      socket.on('dm:message', onDm);

      return () => {
        socket.off('feed:new_story', onNewStory);
        socket.off('feed:new_post', onNewPost);
        socket.off('feed:like_updated', onLike);
        socket.off('feed:comment_added', onComment);
        socket.off('notification:new', onNotification);
        socket.off('dm:message', onDm);
      };
    };

    let cleanup: (() => void) | undefined;
    void run().then((fn) => {
      cleanup = fn;
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [enabled, profileId, queryClient]);
}
