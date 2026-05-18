// Minimal service worker for offline shell.
// Strategy: network-first for the app shell so deploys are picked up fast;
// cache fallback when offline. Socket.IO and API requests are NEVER cached.

const CACHE_NAME = 'munchkin-v2';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.svg', '/icon-512.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never touch real-time + API endpoints.
  if (url.pathname.startsWith('/socket.io')) return;
  if (event.request.method !== 'GET') return;

  // Network-first for navigations, cache-first for static assets.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(event.request).then((cached) => cached ?? caches.match('/')!)),
    );
    return;
  }

  // Other GETs: try cache, fall back to network and populate the cache.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy)).catch(() => {});
        }
        return res;
      });
    }),
  );
});
