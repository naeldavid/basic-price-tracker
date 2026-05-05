const CACHE_NAME = 'price-tracker-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/setup.html',
    '/static/style.css',
    '/static/core.js',
    '/static/app.js',
    '/static/logger.js',
    '/static/favicon.ico',
    '/static/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Skip external API calls (always fetch fresh)
    if (request.url.includes('coingecko.com') || 
        request.url.includes('exchangerate-api.com') ||
        request.url.includes('rss2json.com')) {
        event.respondWith(fetch(request));
        return;
    }
    
    // Network-first strategy for app files
    event.respondWith(
        fetch(request)
            .then(response => {
                // Clone response before caching
                const responseClone = response.clone();
                
                // Update cache with fresh content
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(request, responseClone);
                });
                
                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(request)
                    .then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        
                        // Return offline page if available
                        return caches.match('/index.html');
                    });
            })
    );
});

// Background sync support
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-prices') {
        event.waitUntil(syncPrices());
    }
});

async function syncPrices() {
    // Background sync placeholder
    return Promise.resolve();
}

// Push notification support
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'Price alert triggered!',
        icon: '/static/favicon.ico',
        badge: '/static/favicon.ico',
        vibrate: [200, 100, 200]
    };
    
    event.waitUntil(
        self.registration.showNotification('Price Tracker', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow('/'));
});
