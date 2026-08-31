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

messaging.onBackgroundMessage((payload) => {
  if (payload.notification?.title) return;

  const title = payload.data?.title || 'Happy First';
  const body = payload.data?.body || '';
  const url = payload.data?.url || '/feed';

  return self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192',
    badge: '/icons/icon-192',
    tag: payload.data?.notificationId || undefined,
    data: { url },
  });
});

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
