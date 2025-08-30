const CACHE_NAME = 'cmmc-assessment-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/assessment.html',
  '/styles.css',
  '/script.js',
  '/data.js',
  '/html2pdf.bundle.min.js',
  '/icons/favicon.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
