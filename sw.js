const CACHE_NAME = 'zick-bubble-v1';
const assets = [
  './',
  './index.html',
  './home.html',
  './home.css',
  './home.js',
  './game.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(assets))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});

