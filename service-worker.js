const CACHE_NAME = 'tatehama-v1';
const urlsToCache = [
  'index.html',
  'stations.js',
  'app.js',
  'sounds/melody.mp3',
  'sounds/chime.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
