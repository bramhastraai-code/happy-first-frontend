'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging';
import { firebaseConfig, firebaseVapidKey, isFirebaseWebConfigured } from './config';

function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseWebConfigured()) return null;
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;
  if (!isFirebaseWebConfigured()) return null;
  if (!(await isSupported())) return null;
  const app = getFirebaseApp();
  if (!app) return null;
  return getMessaging(app);
}

export async function getPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;

  const existing =
    (await navigator.serviceWorker.getRegistration('/')) ||
    (await navigator.serviceWorker.getRegistration('/serwist/sw.js'));
  if (existing) return existing;

  try {
    return await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
  } catch {
    try {
      return await navigator.serviceWorker.ready;
    } catch {
      return null;
    }
  }
}

export async function getFcmDeviceToken(): Promise<string | null> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;

  const registration = await getPushServiceWorker();
  if (!registration) return null;

  const permission = Notification.permission;
  if (permission !== 'granted') return null;

  if (!firebaseVapidKey) {
    throw new Error('Firebase Web Push certificate (VAPID key) is not configured.');
  }

  return getToken(messaging, {
    vapidKey: firebaseVapidKey,
    serviceWorkerRegistration: registration,
  });
}

export async function listenForForegroundFcm(
  onPayload: (payload: {
    title: string;
    body: string;
    url: string;
    notificationId: string;
  }) => void
): Promise<() => void> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    const title =
      payload.notification?.title?.trim() ||
      payload.data?.title?.trim() ||
      'Happy First';
    const body =
      payload.notification?.body?.trim() ||
      payload.data?.body?.trim() ||
      title;
    const url = payload.data?.url || payload.fcmOptions?.link || '/feed';
    const notificationId =
      payload.data?.notificationId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    onPayload({ title, body, url, notificationId });
  });
}
