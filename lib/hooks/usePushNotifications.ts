'use client';

import { useCallback, useEffect, useState } from 'react';
import { notificationsAPI } from '@/lib/api/notifications';
import { useAuthStore } from '@/lib/store/authStore';
import {
  getFcmDeviceToken,
  getFirebaseMessaging,
  getPushServiceWorker,
} from '@/lib/firebase/messaging';
import { firebaseVapidKey, isFirebaseWebConfigured } from '@/lib/firebase/config';

export type PushStatus =
  | 'unsupported'
  | 'loading'
  | 'denied'
  | 'subscribed'
  | 'unsubscribed';

const FCM_TOKEN_KEY = 'hf-fcm-token';

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

async function subscribeWebPush(registration: ServiceWorkerRegistration) {
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const publicKey = await getVapidPublicKey();
    if (!publicKey) {
      throw new Error('Push notifications are not configured on the server.');
    }
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }
  await notificationsAPI.pushSubscribe(subscription.toJSON());
}

/**
 * Manages browser / PWA push so alerts still arrive when the app is in the
 * background or closed. Prefers Firebase Cloud Messaging, with Web Push fallback.
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
      const stored = window.localStorage.getItem(FCM_TOKEN_KEY);
      if (stored) {
        setStatus('subscribed');
        return;
      }
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

  useEffect(() => {
    if (!isHydrated || !accessToken) return;
    if (!isPushSupported() || Notification.permission !== 'granted') return;
    if (!isFirebaseWebConfigured() || !firebaseVapidKey) return;

    let cancelled = false;
    void (async () => {
      try {
        const token = await getFcmDeviceToken();
        if (!token || cancelled) return;
        const stored = window.localStorage.getItem(FCM_TOKEN_KEY);
        if (token === stored) return;
        await notificationsAPI.pushSubscribeFcm(token);
        window.localStorage.setItem(FCM_TOKEN_KEY, token);
        setStatus('subscribed');
      } catch {
        // Keep existing Web Push subscription if FCM refresh fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, accessToken]);

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

      const registration = await getPushServiceWorker();
      if (!registration) {
        setError('Could not register a service worker for notifications.');
        return;
      }

      await navigator.serviceWorker.ready.catch(() => registration);

      const canUseFcm = isFirebaseWebConfigured() && Boolean(firebaseVapidKey);
      if (canUseFcm) {
        try {
          if (!(await getFirebaseMessaging())) {
            throw new Error('This browser does not support Firebase Messaging.');
          }
          const token = await getFcmDeviceToken();
          if (token) {
            await notificationsAPI.pushSubscribeFcm(token);
            window.localStorage.setItem(FCM_TOKEN_KEY, token);
            setStatus('subscribed');
            return;
          }
        } catch (fcmError) {
          const message =
            fcmError instanceof Error ? fcmError.message : 'Firebase messaging failed';
          console.warn('FCM subscribe failed, trying Web Push', message);
        }
      }

      await subscribeWebPush(registration);
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
      const stored = window.localStorage.getItem(FCM_TOKEN_KEY);
      if (stored) {
        await notificationsAPI.pushUnsubscribeFcm(stored).catch(() => {});
        window.localStorage.removeItem(FCM_TOKEN_KEY);
      }

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
