/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCkugMa97PMq-L4F5EoRs-N1PivpTTINt0',
  authDomain: 'happy-first-project.firebaseapp.com',
  projectId: 'happy-first-project',
  storageBucket: 'happy-first-project.firebasestorage.app',
  messagingSenderId: '787437398168',
  appId: '1:787437398168:web:db9bf2385bebd89141c8ed',
  measurementId: 'G-YTDSDM9B50',
});

const messaging = firebase.messaging();

function resolvePushContent(payload) {
  const title =
    payload.notification?.title?.trim() ||
    payload.data?.title?.trim() ||
    payload.title?.trim() ||
    'Happy First';
  const body =
    payload.notification?.body?.trim() ||
    payload.data?.body?.trim() ||
    payload.body?.trim() ||
    title;
  const url = payload.data?.url || payload.url || '/feed';
  const tag = `hf-${
    payload.data?.notificationId ||
    payload.notificationId ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }`;
  return { title, body, url, tag };
}

function assetUrl(path) {
  try {
    return new URL(path, self.location.origin).href;
  } catch {
    return path;
  }
}

function showPushNotification(payload) {
  const { title, body, url, tag } = resolvePushContent(payload);
  const icon = payload.data?.icon || payload.icon || assetUrl('/icons/icon-192.png');
  const badge = payload.data?.badge || payload.badge || assetUrl('/icons/icon-192.png');

  return self.registration.showNotification(title, {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    lang: 'en',
    timestamp: Date.now(),
    data: {
      url,
      type: payload.data?.type || payload.type || '',
      notificationId: payload.data?.notificationId || payload.notificationId || '',
    },
  });
}

messaging.onBackgroundMessage((payload) => showPushNotification(payload));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPath = event.notification.data?.url || '/feed';
  const targetUrl = /^https?:\/\//i.test(targetPath)
    ? targetPath
    : new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin)) {
          void client.focus();
          if ('navigate' in client) return client.navigate(targetUrl);
          return undefined;
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
