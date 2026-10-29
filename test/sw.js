// Corn Souls TEST is an independent install; NEVER control or clear the live app.
const CACHE = 'corn-souls-test-shell-v1';
const APP_PATH = '/corn-souls/test/';
const PRECACHE = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('corn-souls-test-shell-') && name !== CACHE)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const url = new URL(req.url);
  if (!url.pathname.startsWith(APP_PATH)) return;
  // Online-first: opening the icon always requests the newest test build.
  // Keep the last successful shell only as a fallback when disconnected.
  event.respondWith((async () => {
    try {
      const response = await fetch(req, {cache:'no-store'});
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(req, response.clone());
      }
      return response;
    } catch (err) {
      const hit = await caches.match(req, {ignoreSearch:true});
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
