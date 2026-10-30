// Corn Souls TEST is an independent install; NEVER control or clear the live app.
const CACHE = 'corn-souls-test-shell-v36';
const APP_PATH = '/corn-souls/test/';
const PRECACHE = ['./index.html', './game.html', './note-sharing.js', './inbox.js', './inbox-config.json', './sound-settings.js', './acid-liquid.js', './cooler-door-audio.js', './manifest.webmanifest', './icon-192-blue-psx.png', './icon-512-blue-psx.png'];
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
      // Never silently launch a cached older TEST build for a navigation.
      // Keep assets available offline, but prompt users to reconnect to update the game.
      if (req.mode === 'navigate') return new Response(
        '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>TEST update needs internet</title><body style="font:18px system-ui;background:#06111f;color:white;padding:2rem"><h2>Corn Souls TEST needs a connection</h2><p>Reconnect to the internet and reopen TEST to get the latest build.</p><a style="color:#9cf" href="/corn-souls/test/refresh.html">Refresh TEST</a></body>',
        {headers:{'Content-Type':'text/html;charset=utf-8'},status:503}
      );
      const hit = await caches.match(req, {ignoreSearch:true});
      if (hit) return hit;
      throw err;
    }
  })());
});
