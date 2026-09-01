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

function showPushNotification(payload) {
  const { title, body, url, tag } = resolvePushContent(payload);
  return self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192',
    badge: '/icons/icon-192',
    tag,
    data: { url },
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
