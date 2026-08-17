// KamaiPlus Production PWA Service Worker
const CACHE_NAME = 'kamaiplus-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/auth',
  '/billing',
  '/products',
  '/khata',
  '/transactions'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA Precache partial fail (normal during dev):', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignore chrome extensions and non-http(s) schemes
  if (!url.protocol.startsWith('http')) return;

  // Stale-while-revalidate for local assets and HTML navigation
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and requesting a page navigation, return cached home/auth
          if (event.request.mode === 'navigate') {
            return caches.match('/') || caches.match('/auth');
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
