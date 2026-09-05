'use client';

import { useEffect } from 'react';
import { listenForForegroundFcm } from '@/lib/firebase/messaging';
import { useAuthStore } from '@/lib/store/authStore';

/**
 * When the tab is in the background but the page is still loaded, FCM delivers
 * via onMessage instead of the service worker. Show a system notification so it
 * still feels like a native app alert.
 */
export function useFcmForegroundNotifications() {
  const { isHydrated, accessToken } = useAuthStore();

  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void listenForForegroundFcm(({ title, body, url, notificationId }) => {
      if (document.visibilityState === 'visible') return;
      const origin = window.location.origin;
      const notification = new Notification(title, {
        body,
        icon: `${origin}/icons/icon-192.png`,
        badge: `${origin}/icons/icon-192.png`,
        tag: `hf-${notificationId}`,
      });
      notification.onclick = () => {
        window.focus();
        if (url) window.location.assign(url);
        notification.close();
      };
    }).then((unsub) => {
      if (cancelled) unsub();
      else unsubscribe = unsub;
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isHydrated, accessToken]);
}
