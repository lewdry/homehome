const CACHE_NAME = 'homehomehome-20260502';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/main.js',
  '/utils.js',
  '/book.js',
  '/bonk.js',
  '/blok.js',
  '/calc.js',
  '/draw.js',
  '/note.js',
  '/fav.png',
  '/sounds/click.mp3',
  '/fonts/ChiKareGo2.woff2',
  '/fonts/ChiKareGo2.woff',
  '/fonts/FindersKeepers.woff2',
  '/fonts/FindersKeepers.woff'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
    .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) return cachedResponse;

        return fetch(event.request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
              return networkResponse;
            }

            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
            return networkResponse;
          })
          .catch(() => {
            if (event.request.destination === 'document' || event.request.destination === '') {
              return caches.match('/index.html');
            }
            return new Response('Offline', { status: 503, statusText: 'Offline' });
          });
      })
  );
});
