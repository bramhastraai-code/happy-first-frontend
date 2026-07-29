'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAppSocket } from '@/lib/realtime/socketClient';
import type { AppNotification } from '@/lib/api/notifications';
import { useAuthStore } from '@/lib/store/authStore';

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

      socket.on('notification:new', onNotification);
      cleanup = () => {
        socket.off('notification:new', onNotification);
      };
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [enabled, queryClient]);
}
