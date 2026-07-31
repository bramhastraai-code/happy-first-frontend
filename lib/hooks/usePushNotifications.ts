'use client';

import { useCallback, useEffect, useState } from 'react';
import { notificationsAPI } from '@/lib/api/notifications';
import { useAuthStore } from '@/lib/store/authStore';

export type PushStatus =
  | 'unsupported'
  | 'loading'
  | 'denied'
  | 'subscribed'
  | 'unsubscribed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function getVapidPublicKey(): Promise<string | null> {
  const envKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (envKey) return envKey;
  try {
    const res = await notificationsAPI.pushPublicKey();
    return res.data.data.publicKey;
  } catch {
    return null;
  }
}

/**
 * Manages the browser push subscription for background (PWA) notifications.
 * Note: the service worker is disabled in development, so push only works
 * in production builds.
 */
export function usePushNotifications() {
  const { isHydrated, accessToken } = useAuthStore();
  const [status, setStatus] = useState<PushStatus>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!isPushSupported()) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      setStatus(subscription ? 'subscribed' : 'unsubscribed');
    } catch {
      setStatus('unsubscribed');
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    void refresh();
  }, [isHydrated, accessToken, refresh]);

  const subscribe = useCallback(async () => {
    if (busy || !isPushSupported()) return;
    setBusy(true);
    setError('');

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'unsubscribed');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const publicKey = await getVapidPublicKey();
        if (!publicKey) {
          setError('Push notifications are not configured on the server.');
          return;
        }
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }

      await notificationsAPI.pushSubscribe(subscription.toJSON());
      setStatus('subscribed');
    } catch {
      setError('Could not enable push notifications. Please try again.');
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [busy, refresh]);

  const unsubscribe = useCallback(async () => {
    if (busy || !isPushSupported()) return;
    setBusy(true);
    setError('');

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await notificationsAPI.pushUnsubscribe(endpoint).catch(() => {});
      }
      setStatus('unsubscribed');
    } catch {
      setError('Could not disable push notifications. Please try again.');
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [busy, refresh]);

  return { status, busy, error, subscribe, unsubscribe };
}
