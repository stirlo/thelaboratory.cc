// service-worker.js
const CACHE_VERSION = 'v1';
const CACHE_NAME = `laboratory-${CACHE_VERSION}`;

const CACHED_ASSETS = [
    '/',
    '/index.html',
    '/status.html',
    '/css/style.css',
    '/js/main.js',
    '/js/sites.js',
    '/js/status.js',
    '/assets/images/apple-touch-icon.png'
];

const RUNTIME_CACHE = 'laboratory-runtime';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CACHED_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name.startsWith('laboratory-') && name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
});

self.addEventListener('fetch', event => {
    if (event.request.url.startsWith('https://api.github.com')) {
        handleApiRequest(event);
        return;
    }

    if (event.request.url.includes('shields.io')) {
        handleBadgeRequest(event);
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

function handleApiRequest(event) {
    event.respondWith(
        caches.open(RUNTIME_CACHE).then(cache => {
            return fetch(event.request).then(response => {
                cache.put(event.request, response.clone());
                return response;
            }).catch(() => {
                return cache.match(event.request);
            });
        })
    );
}

function handleBadgeRequest(event) {
    event.respondWith(
        caches.open(RUNTIME_CACHE).then(cache => {
            return cache.match(event.request).then(response => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
                return response || fetchPromise;
            });
        })
    );
}
