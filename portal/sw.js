// Девелопер service worker: instant repeat visits without ever serving stale game logic.
// Art (SVG) is cache-first; HTML/JS/CSS are network-first with offline fallback; the room API is never touched.
const VERSION = 'portal-1';
const ART = 'developer-art-' + VERSION;
const SHELL = 'developer-shell-' + VERSION;
const SHELL_FILES = ['./', 'portal/portal.css?v=1', 'portal/app.js?v=1', 'portal/data.js', 'portal/api.js', 'portal/store.js', 'portal/progress.js', 'portal/qr.js', 'portal/icon.svg'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).catch(() => {}));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (!key.endsWith(VERSION)) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.includes('/api/')) return;
  if (url.pathname.includes('/assets/svg/')) {
    event.respondWith(caches.open(ART).then(async cache => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }));
    return;
  }
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok && (req.mode === 'navigate' || /\.(?:js|css|svg|png|webmanifest)$/.test(url.pathname))) {
        const cache = await caches.open(SHELL);
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (hit) return hit;
      if (req.mode === 'navigate') return caches.match('./');
      throw e;
    }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then(list => {
    const open = list.find(c => 'focus' in c);
    return open ? open.focus() : self.clients.openWindow('./#games');
  }));
});
