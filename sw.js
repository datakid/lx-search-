const CACHE = 'lx-search-v3-2';
const SHELL = [
  './',
  './index.html',
  './src/original.html',
  './js/v3-patches.js',
  './js/bootstrap.js',
  './js/search-engine.js',
  './js/data-store.js',
  './js/v3-ui.js',
  './vendor/fuse.min.js',
  './css/polish.css',
  './css/v3.css',
  './manifest.json',
  './favicon.svg',
  './icon-spring.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.all(SHELL.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => null)))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.endsWith('/data/formulary.json')) return;
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
