const CACHE_NAME = 'laboratory-v3';
const OFFLINE_URL = '/offline.html';

// Static assets that rarely change
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/status.html',
    '/thankyou.html',
    '/offline.html',
    '/assets/css/style.css',
    '/assets/js/sites.js',
    '/assets/js/status.js',
    '/assets/js/thankyou.js',
    '/site.webmanifest',
    '/assets/images/icons/favicon.ico',
    '/assets/images/icons/apple-touch-icon.png'
];

// Fast cache-first patterns
const CACHE_FIRST_PATTERNS = [
    '/assets/images/',
    '/assets/css/',
    '.ico',
    '.png',
    '.jpg',
    '.webp',
    '.css',
    '.woff2'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                // Fast parallel caching
                return Promise.allSettled(
                    STATIC_ASSETS.map(url => 
                        cache.add(url).catch(err => 
                            console.warn(`[SW] Failed to cache ${url}:`, err)
                        )
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.all([
            // Clean old caches
            caches.keys()
                .then(keys => Promise.all(
                    keys.filter(key => key !== CACHE_NAME)
                        .map(key => caches.delete(key))
                )),
            self.clients.claim()
        ])
    );
});

function shouldCacheFirst(url) {
    return CACHE_FIRST_PATTERNS.some(pattern => url.includes(pattern));
}

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    if (!url.protocol.startsWith('http')) return;

    // Handle different strategies based on URL
    if (shouldCacheFirst(url.pathname)) {
        // Cache-first for static assets
        event.respondWith(
            caches.match(event.request)
                .then(response => response || 
                    fetch(event.request)
                        .then(response => {
                            if (response.ok) {
                                caches.open(CACHE_NAME)
                                    .then(cache => cache.put(event.request, response.clone()));
                            }
                            return response;
                        })
                )
        );
    } else {
        // Network-first for everything else
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response.ok) {
                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(event.request, response.clone()));
                    }
                    return response;
                })
                .catch(() => 
                    caches.match(event.request)
                        .then(response => response || 
                            (event.request.mode === 'navigate' ? 
                                caches.match(OFFLINE_URL) : 
                                new Response('Network error', {status: 408}))
                        )
                )
        );
    }
});

// Handle updates
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') self.skipWaiting();
});

// Error handling
self.addEventListener('error', event => {
    console.warn('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.warn('[SW] Unhandled rejection:', event.reason);
});
