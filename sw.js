const CACHE_NAME = 'perf-dash-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Install - cache app shell
self.addEventListener('install', (evt) => {
  self.skipWaiting();
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE.map(url => new Request(url, {cache: 'reload'}))))
  );
});

// Activate - cleanup old caches
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Fetch - Cache-first for same-origin requests, network fallback, and stale-while-revalidate for navigation
self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') return;
  // navigation requests: try network first, fallback to cache
  if (evt.request.mode === 'navigate') {
    evt.respondWith(
      fetch(evt.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(evt.request, copy));
        return resp;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }
  // other requests: try cache, then network, update cache
  evt.respondWith(
    caches.match(evt.request).then(cached => {
      if (cached) {
        // update cache in background
        fetch(evt.request).then(resp => {
          if (!resp || resp.status !== 200) return;
          caches.open(CACHE_NAME).then(cache => cache.put(evt.request, resp.clone()));
        }).catch(()=>{});
        return cached;
      }
      return fetch(evt.request).then(resp => {
        if (!resp || resp.status !== 200) return resp;
        const respClone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(evt.request, respClone));
        return resp;
      }).catch(() => new Response('', {status: 503, statusText: 'Offline'}));
    })
  );
});
