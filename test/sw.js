// Corn Souls TEST is an independent install; NEVER control or clear the live app.
const CACHE = 'corn-souls-test-shell-v43';
const APP_PATH = '/corn-souls/test/';
const PRECACHE = ['./index.html', './game.html', './note-sharing.js', './inbox.js', './inbox-config.json', './sound-settings.js', './acid-liquid.js', './cooler-door-audio.js', './developer-inbox.html', './manifest.webmanifest', './icon-192-blue-psx.png', './icon-512-blue-psx.png'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(PRECACHE.map(async path => {
      try {
        const res = await fetch(path + '?sw=' + CACHE + '&t=' + Date.now(), {cache: 'no-store'});
        if (res.ok) await cache.put(path, res);
      } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('corn-souls-test-shell-') && name !== CACHE)
      .map(name => caches.delete(name)));
    await self.clients.claim();
    // Automatically reload any open TEST PWA window still showing a previous build.
    const clients = await self.clients.matchAll({type: 'window'});
    for (const client of clients) {
      if (client.url.includes(APP_PATH) && !client.url.includes('sw=' + CACHE) && 'navigate' in client) {
        client.navigate(APP_PATH + 'index.html?sw=' + CACHE + '&t=' + Date.now()).catch(() => {});
      }
    }
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const url = new URL(req.url);
  if (!url.pathname.startsWith(APP_PATH) || url.searchParams.has('check')) return;
  // Online-first: use a string URL (not the navigate Request object) with a timestamp
  // so Chromium does not throw on RequestInit and GitHub Pages CDN never serves a stale shell.
  event.respondWith((async () => {
    try {
      const bustUrl = req.mode === 'navigate'
        ? url.pathname + '?sw=' + CACHE + '&t=' + Date.now()
        : req.url;
      const response = await fetch(bustUrl, {cache: 'no-store'});
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(url.pathname, response.clone());
      }
      return response;
    } catch (err) {
      if (req.mode === 'navigate') return new Response(
        '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>TEST update needs internet</title><body style="font:18px system-ui;background:#06111f;color:white;padding:2rem"><h2>Corn Souls TEST needs a connection</h2><p>Reconnect to the internet and reopen TEST to get the latest build.</p><a style="color:#9cf" href="/corn-souls/test/refresh.html">Refresh TEST</a></body>',
        {headers:{'Content-Type':'text/html;charset=utf-8'},status:503}
      );
      const hit = await caches.match(url.pathname, {ignoreSearch:true}) || await caches.match(req, {ignoreSearch:true});
      if (hit) return hit;
      throw err;
    }
  })());
});
