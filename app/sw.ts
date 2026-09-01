/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from '@serwist/turbopack/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { firebaseConfig } from '@/lib/firebase/config';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();

try {
  const firebaseApp = initializeApp(firebaseConfig);
  const messaging = getMessaging(firebaseApp);
  onBackgroundMessage(messaging, (payload) => {
    void showPushNotification(payload as PushPayload);
  });
} catch {
  // Firebase is optional; Web Push `push` events still work.
}

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  notificationId?: string;
  type?: string;
  notification?: { title?: string; body?: string };
  data?: Record<string, string>;
  from?: string;
  fcmMessageId?: string;
}

function resolvePushContent(payload: PushPayload) {
  const title =
    payload.notification?.title?.trim() ||
    payload.data?.title?.trim() ||
    payload.title?.trim() ||
    'Happy First';
  let body =
    payload.notification?.body?.trim() ||
    payload.data?.body?.trim() ||
    payload.body?.trim() ||
    '';
  if (!body) {
    body = 'Tap to open Happy First.';
  }
  const url = payload.data?.url || payload.url || '/feed';
  const tag = payload.data?.notificationId || payload.notificationId || undefined;
  return { title, body, url, tag };
}

function showPushNotification(payload: PushPayload) {
  const { title, body, url, tag } = resolvePushContent(payload);

  return self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192',
    badge: '/icons/icon-192',
    tag,
    data: { url },
  });
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: PushPayload = {};
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { body: event.data.text() };
  }

  // FCM background messages are handled by onBackgroundMessage.
  if (payload.from || payload.fcmMessageId) return;

  event.waitUntil(showPushNotification(payload));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetPath: string = event.notification.data?.url || '/feed';
  const targetUrl = /^https?:\/\//i.test(targetPath)
    ? targetPath
    : new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin)) {
          void client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
          return undefined;
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
