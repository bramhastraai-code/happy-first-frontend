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

  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;

  try {
    return await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
  } catch {
    return null;
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
  onPayload: (payload: { title: string; body: string; url: string }) => void
): Promise<() => void> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    let title =
      payload.notification?.title?.trim() ||
      payload.data?.title?.trim() ||
      'Happy First';
    let body =
      payload.notification?.body?.trim() ||
      payload.data?.body?.trim() ||
      '';
    if (!body) {
      body = 'Tap to open Happy First.';
    }
    const url = payload.data?.url || payload.fcmOptions?.link || '/feed';
    onPayload({ title, body, url });
  });
}
