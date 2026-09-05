'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAppSocket } from '@/lib/realtime/socketClient';
import type { AppNotification } from '@/lib/api/notifications';
import { useAuthStore } from '@/lib/store/authStore';

function removeNotificationsFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  notificationIds: string[]
) {
  if (!notificationIds?.length) return;
  const idSet = new Set(notificationIds.map(String));
  queryClient.setQueryData<{ notifications: AppNotification[]; unread: number }>(
    ['notifications'],
    (old) => {
      if (!old) return old;
      const next = old.notifications.filter((n) => !idSet.has(String(n.id)));
      if (next.length === old.notifications.length) return old;
      const removedUnread = old.notifications.filter(
        (n) => idSet.has(String(n.id)) && !n.readAt
      ).length;
      return {
        notifications: next,
        unread: Math.max(0, (old.unread || 0) - removedUnread),
      };
    }
  );
}

/**
 * Keep the notifications query updated app-wide (not only on /feed).
 * Mentions and other in-app alerts emit `notification:new` to the user room.
 */
export function useNotificationRealtime() {
  const queryClient = useQueryClient();
  const { isHydrated, accessToken, user } = useAuthStore();
  const enabled = isHydrated && Boolean(accessToken) && Boolean(user?._id);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let cleanup: (() => void) | undefined;

    void getAppSocket().then((socket) => {
      if (!active) return;

      const onNotification = (notification: AppNotification) => {
        queryClient.setQueryData<{ notifications: AppNotification[]; unread: number }>(
          ['notifications'],
          (old) => {
            if (!old) {
              return { notifications: [notification], unread: 1 };
            }
            if (old.notifications.some((n) => n.id === notification.id)) {
              return old;
            }
            return {
              notifications: [notification, ...old.notifications],
              unread: old.unread + 1,
            };
          }
        );
      };

      const onNotificationRemoved = (payload: { notificationIds?: string[] }) => {
        removeNotificationsFromCache(queryClient, payload?.notificationIds || []);
      };

      socket.on('notification:new', onNotification);
      socket.on('notification:removed', onNotificationRemoved);
      cleanup = () => {
        socket.off('notification:new', onNotification);
        socket.off('notification:removed', onNotificationRemoved);
      };
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [enabled, queryClient]);
}
