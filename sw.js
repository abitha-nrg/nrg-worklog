// App shell cache (opens instantly) + reminder notifications.
const CACHE = 'worklog-v2';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});

// Notification sent by Apps Script (Push.gs) through Firebase
self.addEventListener('push', e => {
  let j = {};
  try { j = e.data ? e.data.json() : {}; } catch (x) { j = { data: { body: e.data ? e.data.text() : '' } }; }
  const d = j.data || j.notification || j;
  e.waitUntil(self.registration.showNotification(d.title || 'Daily Work Log', {
    body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png',
    tag: d.tag || 'worklog', renotify: true, data: { link: d.link || '' }
  }));
});

// Tap → open the app (form pre-filled) or the person's sheet
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const scope = self.registration.scope;
  const link = new URL((e.notification.data && e.notification.data.link) || './', scope).href;
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const app = list.find(c => c.url.startsWith(scope));
    if (app && link.startsWith(scope)) {
      return app.focus().then(c => (c || app).navigate(link)).catch(() => clients.openWindow(link));
    }
    return clients.openWindow(link);
  }));
});
