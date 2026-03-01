// Baseline Service Worker — stale-while-revalidate for app shell, cache-first for hashed assets

const CACHE_NAME = 'baseline';

// App shell: pre-cached on install
const APP_SHELL = [
  '/baseline/app/',
  '/baseline/app/nhanes_percentiles.json',
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: claim clients, notify them of the update
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
      });
    })
  );
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests (API POSTs, form submissions)
  if (event.request.method !== 'GET') return;

  // Network-first for external origins (Cloudflare Worker, Formspree, CDN)
  if (url.hostname !== self.location.hostname) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Hashed assets (Vite output like index-DjJk0C95.js) — cache-first, immutable
  // New builds produce new filenames, so these never go stale
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else (HTML, nhanes JSON, manifest, icons) — stale-while-revalidate
  // Serve cached version immediately, fetch fresh copy in background
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });

      return cached || fetchPromise;
    })
  );
});
