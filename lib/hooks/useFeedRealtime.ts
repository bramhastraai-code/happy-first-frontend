'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAppSocket } from '@/lib/realtime/socketClient';
import type { FeedComment, FeedPost } from '@/lib/api/feed';
import type { AppNotification } from '@/lib/api/notifications';
import type { FeedChatMessage } from '@/lib/api/messages';

type FeedPages = {
  pages: { posts: FeedPost[]; nextCursor: string | null }[];
  pageParams: unknown[];
};

function feedQueryKey(profileId?: string, communityId?: string | null) {
  return communityId ? (['feed', profileId, communityId] as const) : (['feed', profileId] as const);
}

/**
 * Realtime updates for global Feed and optional Community Feed.
 * - Global: only posts without communityId
 * - Community: only posts for that communityId (+ joins community socket room)
 */
export function useFeedRealtime(
  enabled: boolean,
  profileId?: string,
  communityId?: string | null
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const queryKey = feedQueryKey(profileId, communityId);

    const run = async () => {
      const socket = await getAppSocket();
      if (!active) return;

      socket.emit('feed:join');
      if (communityId) {
        socket.emit('community:join', { communityId });
      }

      const matchesScope = (postCommunityId?: string | null) => {
        if (communityId) return postCommunityId === communityId;
        return !postCommunityId;
      };

      const onNewPost = (payload: { post: FeedPost }) => {
        if (!matchesScope(payload.post.communityId)) return;
        queryClient.setQueryData<FeedPages>(queryKey, (old) => {
          if (!old?.pages?.length) return old;
          const exists = old.pages.some((p) => p.posts.some((post) => post.id === payload.post.id));
          if (exists) return old;
          const [first, ...rest] = old.pages;
          return {
            ...old,
            pages: [{ ...first, posts: [payload.post, ...first.posts] }, ...rest],
          };
        });
        if (!communityId) {
          void queryClient.invalidateQueries({ queryKey: ['feedStories'] });
        }
      };

      const onLike = (payload: {
        photoId: string;
        likeCount: number;
        likedByMe?: boolean;
        actorProfileId?: string;
        communityId?: string | null;
      }) => {
        if (communityId && payload.communityId && payload.communityId !== communityId) return;
        if (!communityId && payload.communityId) return;
        queryClient.setQueryData<FeedPages>(queryKey, (old) => {
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
        communityId?: string | null;
      }) => {
        if (communityId && payload.communityId && payload.communityId !== communityId) return;
        if (!communityId && payload.communityId) return;
        queryClient.setQueryData<FeedPages>(queryKey, (old) => {
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

      const onCommentDeleted = (payload: {
        photoId: string;
        commentCount: number;
        deletedIds: string[];
        communityId?: string | null;
      }) => {
        if (communityId && payload.communityId && payload.communityId !== communityId) return;
        if (!communityId && payload.communityId) return;
        queryClient.setQueryData<FeedPages>(queryKey, (old) => {
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
        queryClient.setQueryData<FeedComment[]>(
          ['feedComments', payload.photoId],
          (prev) => {
            if (!prev) return prev;
            const remove = new Set(payload.deletedIds);
            return prev
              .filter((comment) => !remove.has(comment.id))
              .map((comment) => ({
                ...comment,
                replies: (comment.replies || []).filter((reply) => !remove.has(reply.id)),
              }));
          }
        );
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
        if (communityId) return;
        void queryClient.invalidateQueries({ queryKey: ['feedStories'] });
      };

      const onPostUpdated = (payload: { post: FeedPost }) => {
        if (!matchesScope(payload.post.communityId)) return;
        queryClient.setQueryData<FeedPages>(queryKey, (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.map((post) =>
                post.id === payload.post.id
                  ? { ...post, caption: payload.post.caption }
                  : post
              ),
            })),
          };
        });
      };

      const onPostDeleted = (payload: { photoId: string; communityId?: string | null }) => {
        if (communityId && payload.communityId && payload.communityId !== communityId) return;
        if (!communityId && payload.communityId) return;
        queryClient.setQueryData<FeedPages>(queryKey, (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              posts: page.posts.filter((post) => post.id !== payload.photoId),
            })),
          };
        });
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

      const onDmDeleted = (payload: {
        conversationId: string;
        messageIds: string[];
        scope: 'me' | 'everyone';
      }) => {
        queryClient.setQueryData<FeedChatMessage[]>(
          ['messages', payload.conversationId],
          (old) => {
            if (!old) return old;
            if (payload.scope === 'everyone') {
              return old.map((msg) =>
                payload.messageIds.includes(msg.id)
                  ? {
                      ...msg,
                      text: '',
                      mediaUrl: null,
                      mediaType: null,
                      deletedForEveryone: true,
                    }
                  : msg
              );
            }
            return old.filter((msg) => !payload.messageIds.includes(msg.id));
          }
        );
        void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      };

      const onDmCleared = (payload: { conversationId: string }) => {
        queryClient.setQueryData<FeedChatMessage[]>(['messages', payload.conversationId], []);
        void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      };

      const onDmChatDeleted = (payload: { conversationId: string }) => {
        queryClient.setQueryData<FeedChatMessage[]>(['messages', payload.conversationId], []);
        void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      };

      socket.on('feed:new_story', onNewStory);
      socket.on('feed:new_post', onNewPost);
      socket.on('feed:like_updated', onLike);
      socket.on('feed:comment_added', onComment);
      socket.on('feed:comment_deleted', onCommentDeleted);
      socket.on('feed:post_updated', onPostUpdated);
      socket.on('feed:post_deleted', onPostDeleted);
      socket.on('notification:new', onNotification);
      socket.on('dm:message', onDm);
      socket.on('dm:messages_deleted', onDmDeleted);
      socket.on('dm:chat_cleared', onDmCleared);
      socket.on('dm:chat_deleted', onDmChatDeleted);

      return () => {
        socket.off('feed:new_story', onNewStory);
        socket.off('feed:new_post', onNewPost);
        socket.off('feed:like_updated', onLike);
        socket.off('feed:comment_added', onComment);
        socket.off('feed:comment_deleted', onCommentDeleted);
        socket.off('feed:post_updated', onPostUpdated);
        socket.off('feed:post_deleted', onPostDeleted);
        socket.off('notification:new', onNotification);
        socket.off('dm:message', onDm);
        socket.off('dm:messages_deleted', onDmDeleted);
        socket.off('dm:chat_cleared', onDmCleared);
        socket.off('dm:chat_deleted', onDmChatDeleted);
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
  }, [enabled, profileId, communityId, queryClient]);
}
